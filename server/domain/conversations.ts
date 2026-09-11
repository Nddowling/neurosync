import { Knowledge } from './knowledge.js';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
import { Records } from '../compat/records.js';
import { Usage } from '../plans/usage.js';
import type { AIGateway } from '../ai/gateway.js';
export class Conversations {
 private usage:Usage;private records:Records;
 constructor(private pool:Pool,private ai:AIGateway){this.usage=new Usage(pool);this.records=new Records(pool);}
 async create(identity:Identity,input:unknown){
  const data=z.object({name:z.string().min(1).max(200).default('Clinical consultation'),patient_id:z.string().uuid().optional()}).strict().parse(input);
  return withIdentity(this.pool,identity,async client=>{
   const session=(await client.query(`insert into neurosync.patient_sessions(owner_uid,title,patient_id) values($1,$2,$3) returning id`,[identity.subject,data.name,data.patient_id??null])).rows[0];
   const conv=(await client.query(`insert into neurosync.conversations(owner_uid,session_id,name) values($1,$2,$3) returning *`,[identity.subject,session.id,data.name])).rows[0];
   await client.query('update neurosync.patient_sessions set conversation_id=$1 where id=$2 and owner_uid=$3',[conv.id,session.id,identity.subject]);return this.dto(conv,[]);
  });
 }
 private dto(row:Record<string,unknown>,messages:unknown[]){return {id:row.id,created_date:row.created_at,metadata:{name:row.name,session_id:row.session_id},messages};}
 async list(identity:Identity){return withIdentity(this.pool,identity,async client=>{
  const result=await client.query('select * from neurosync.conversations where owner_uid=$1 order by created_at desc limit 200',[identity.subject]);
  await this.records.auditRead(client,identity,'conversations',result.rows.map(row=>String(row.id)));return result.rows.map(row=>this.dto(row,[]));
 });}
 async get(identity:Identity,id:string){z.string().uuid().parse(id);return withIdentity(this.pool,identity,async client=>{
  const row=(await client.query('select * from neurosync.conversations where id=$1 and owner_uid=$2',[id,identity.subject])).rows[0];if(!row)throw new ApiError(404,'not_found');
  const messages=(await client.query('select id,role,content,status,created_at,prompt_version,provider,model from neurosync.messages where conversation_id=$1 and owner_uid=$2 order by sequence',[id,identity.subject])).rows;
  await this.records.auditRead(client,identity,'conversations',[id]);return this.dto(row,messages);
 });}
 async add(identity:Identity,id:string,input:unknown){
  z.string().uuid().parse(id);const data=z.object({content:z.string().min(1).max(20000),request_id:z.string().uuid()}).strict().parse(input);
  const preparation=await withIdentity(this.pool,identity,async client=>{
   const conversation=(await client.query('select id from neurosync.conversations where id=$1 and owner_uid=$2 for update',[id,identity.subject])).rows[0];if(!conversation)throw new ApiError(404,'not_found');
   await client.query("update neurosync.messages set status='failed' where conversation_id=$1 and status='pending' and created_at<now()-interval '5 minutes'",[id]);
   const existing=(await client.query("select content,status from neurosync.messages where conversation_id=$1 and request_id=$2 and role='user'",[id,data.request_id])).rows[0];
   if(existing&&existing.content!==data.content)throw new ApiError(409,'conflict');
   if(existing?.status==='complete')return null;
   if((await client.query("select id from neurosync.messages where conversation_id=$1 and status='pending'",[id])).rowCount)throw new ApiError(409,'conflict');
   if(!await this.usage.reserve(client,identity,data.request_id,'consult'))throw new ApiError(409,'conflict');
   await client.query(`insert into neurosync.messages(owner_uid,conversation_id,role,content,request_id,status) values($1,$2,'user',$3,$4,'pending') on conflict(conversation_id,request_id,role) do update set status='pending',created_at=now()`,[identity.subject,id,data.content,data.request_id]);
   const messages=(await client.query("select role,content from neurosync.messages where conversation_id=$1 and status!='failed' order by sequence",[id])).rows;
   const transcript=messages.map(m=>`${m.role==='user'?'Clinician':'Assistant'}: ${m.content}`).join('\n\n');
   if(transcript.length>120000)throw new ApiError(413,'payload_too_large');return transcript;
  });
  if(preparation===null)return this.get(identity,id);
  try {
   const evidence=await new Knowledge(this.pool).retrieve(identity,data.content);
   const answer=await this.ai.clinicalConsult(preparation,JSON.stringify(evidence));
   await withIdentity(this.pool,identity,async client=>{
    await client.query(`insert into neurosync.messages(owner_uid,conversation_id,role,content,request_id,prompt_version,provider,model) values($1,$2,'assistant',$3,$4,$5,$6,$7)`,[identity.subject,id,answer.content,data.request_id,answer.promptVersion,answer.provider,answer.model]);
    await client.query("update neurosync.messages set status='complete' where conversation_id=$1 and request_id=$2",[id,data.request_id]);
    await this.usage.finish(client,identity,data.request_id,'consult',true);
   });
  }catch(error){await withIdentity(this.pool,identity,async client=>{await client.query("update neurosync.messages set status='failed' where conversation_id=$1 and request_id=$2 and role='user'",[id,data.request_id]);await this.usage.finish(client,identity,data.request_id,'consult',false);});throw error;}
  return this.get(identity,id);
 }
}
