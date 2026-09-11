import {Embeddings,cosine} from '../ai/embeddings.js';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
import { Records,recordDto } from '../compat/records.js';
export class Knowledge {
 private records:Records;
 constructor(private pool:Pool){this.records=new Records(pool);}
 async ingest(identity:Identity,input:unknown){
  const file=z.object({name:z.string().min(1).max(200).regex(/\.pdf$/i),data:z.string().min(1).max(2796204).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).strict().parse(input);
  const bytes=Buffer.from(file.data,'base64');
  if(bytes.length>2097152)throw new ApiError(413,'payload_too_large');
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw new ApiError(415,'unsupported_media_type');
  const {PDFParse}=await import('pdf-parse');
  const parser=new PDFParse({data:new Uint8Array(bytes),isEvalSupported:false});
  let content:string;
  try {const info=await parser.getInfo();if(info.total>100)throw new ApiError(413,'payload_too_large');content=(await parser.getText()).text.trim();}
  catch(error){if(error instanceof ApiError)throw error;throw new ApiError(400,'invalid_request');}
  finally {await parser.destroy();}
  if(!content||content.length>500000)throw new ApiError(400,'invalid_request');
  const record=await withIdentity(this.pool,identity,async client=>{
   const row=(await client.query(`insert into neurosync.knowledge_base(owner_uid,title,content,category,source) values($1,$2,$3,'other',$4) returning *`,[identity.subject,file.name.replace(/\.pdf$/i,''),content,file.name])).rows[0];
   const doc=(await client.query(`insert into neurosync.documents(owner_uid,knowledge_id,filename,media_type,bytes,sha256) values($1,$2,$3,'application/pdf',$4,$5) returning id`,[identity.subject,row.id,file.name,bytes,createHash('sha256').update(bytes).digest('hex')])).rows[0];
   const url=`/api/documents/${doc.id}`;await client.query('update neurosync.knowledge_base set file_url=$1 where id=$2',[url,row.id]);return recordDto('knowledge_base',{...row,file_url:url});
  });
  await new Embeddings(this.pool).index(identity,String(record.id));return record;
 }
 async download(identity:Identity,id:string){z.string().uuid().parse(id);return withIdentity(this.pool,identity,async client=>{
  const row=(await client.query('select bytes,filename from neurosync.documents where id=$1 and owner_uid=$2',[id,identity.subject])).rows[0];
  if(!row)throw new ApiError(404,'not_found');await this.records.auditRead(client,identity,'documents',[id]);
  return new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(row.filename)}`}});
 });}
 async retrieve(identity:Identity,query:string){const embedding=new Embeddings(this.pool);const vector=await embedding.provider.embed(query);return withIdentity(this.pool,identity,async client=>{
  const terms=query.match(/[\p{L}\p{N}]{3,}/gu)?.slice(-80).join(' OR ')??'';
  const rows=(await client.query(`select c.id,c.content,k.title,k.id as source_id from neurosync.knowledge_chunks c join neurosync.knowledge_base k on k.id=c.knowledge_id where c.owner_uid=$1 and c.search_vector @@ websearch_to_tsquery('english',$2) order by ts_rank(c.search_vector,websearch_to_tsquery('english',$2)) desc,c.id limit 5`,[identity.subject,terms])).rows;
  const candidates=(await client.query(`select c.id,c.content,c.embedding,k.title,k.id as source_id from neurosync.knowledge_chunks c join neurosync.knowledge_base k on k.id=c.knowledge_id where c.owner_uid=$1 and c.embedding_model=$2 order by c.id limit 2000`,[identity.subject,embedding.provider.model])).rows;
  const ranked=candidates.map(row=>({...row,score:cosine(vector,row.embedding)})).filter(row=>row.score>0.25).sort((a,b)=>b.score-a.score).slice(0,5);
  for(const row of ranked)if(!rows.some(existing=>existing.id===row.id)&&rows.length<5)rows.push(row);
  await this.records.auditRead(client,identity,'knowledge_chunks',rows.map(r=>String(r.id)));
  return rows.map(r=>({sourceId:r.source_id,title:r.title,excerpt:r.content}));
 });}
}
