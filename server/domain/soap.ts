import {createHash} from 'node:crypto';
import { ApiError } from '../api/errors.js';
import type { Pool } from 'pg';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { soapRequest } from '../ai/schemas.js';
import type { AIGateway } from '../ai/gateway.js';
import { Usage } from '../plans/usage.js';
import { recordDto } from '../compat/records.js';
export class Soap {
 private usage:Usage;
 constructor(private pool:Pool,private ai:AIGateway){this.usage=new Usage(pool);}
 async generate(identity:Identity,input:unknown){
  const request=soapRequest.parse(input);
  let inputHash='';
  const previous=await withIdentity(this.pool,identity,async client=>{
   for (const [table,id] of [['patients',request.patient_id],['patient_sessions',request.session_id]] as const) {
    if(id && !(await client.query(`select id from neurosync.${table} where id=$1 and owner_uid=$2`,[id,identity.subject])).rowCount) throw new ApiError(404,'not_found');
   }
   if(request.session_id){
    const session=(await client.query('select patient_id from neurosync.patient_sessions where id=$1 and owner_uid=$2',[request.session_id,identity.subject])).rows[0];
    if(session?.patient_id){if(request.patient_id && request.patient_id!==session.patient_id)throw new ApiError(400,'invalid_request');request.patient_id=String(session.patient_id);}
   }
   inputHash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
   const existing=(await client.query('select * from neurosync.patient_notes where owner_uid=$1 and generation_request_id=$2',[identity.subject,request.request_id])).rows[0];
   if(existing){if(existing.generation_input_hash!==inputHash)throw new ApiError(409,'conflict');return recordDto('patient_notes',existing);}
   if(!await this.usage.reserve(client,identity,request.request_id,'soap_note'))throw new ApiError(409,'conflict');return null;
  });
  if(previous)return previous;
  try{
   const generated=await this.ai.generateSoapNote(request);const r=generated.result;
   return await withIdentity(this.pool,identity,async client=>{
    const result=await client.query(`insert into neurosync.patient_notes(owner_uid,patient_id,session_id,note_type,subjective,objective,assessment,risk_assessment,plan,icd_codes,cpt_code,provider_name,patient_info,session_duration,prompt_version,ai_provider,ai_model,generation_request_id,generation_input_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) returning *`,[identity.subject,request.patient_id??null,request.session_id??null,request.form?.note_type??'soap',r.subjective,r.objective,r.assessment,r.risk_assessment,r.plan,r.icd_codes,r.cpt_codes,request.form?.provider_name??null,request.form?.patient_info??null,request.form?.session_duration??null,generated.promptVersion,generated.provider,generated.model,request.request_id,inputHash]);
    await this.usage.finish(client,identity,request.request_id,'soap_note',true);return recordDto('patient_notes',result.rows[0]);
   });
  }catch(error){await withIdentity(this.pool,identity,client=>this.usage.finish(client,identity,request.request_id,'soap_note',false));throw error;}
 }
}
