import {Embeddings} from '../ai/embeddings.js';
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
const text=z.string().max(20000).nullable().optional();
const short=z.string().max(400).nullable().optional();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return !isNaN(d.getTime())&&d.toISOString().startsWith(v);}).nullable().optional();
const uuid=z.string().uuid().nullable().optional();
const money=z.union([z.number(),z.string().regex(/^\d{1,8}(\.\d{1,2})?$/)]).transform(Number).refine(v=>Number.isFinite(v)&&v>=0&&v<=10000000).optional();
const schemas={
 patients:z.object({first_name:short,last_name:short,date_of_birth:date,sex:short,mrn:short,patient_code:short,phone:short,email:z.string().email().max(320).nullable().optional(),address:text,emergency_contact:text,insurance_info:text,ec_name:short,ec_relationship:short,ec_phone:short,insurance_carrier:short,insurance_plan:short,insurance_member_id:short,insurance_group:short,notes:text}),
 patient_notes:z.object({patient_id:uuid,session_id:uuid,note_type:z.enum(['soap','progress','intake','discharge','medication_change']).optional(),status:z.enum(['draft','finalized','amended']).optional(),subjective:text,objective:text,assessment:text,risk_assessment:text,plan:text,body:text,icd_codes:short,cpt_code:short,session_duration:short,provider_name:short,patient_info:short}),
 patient_medications:z.object({patient_id:uuid,name:short,dose:short,frequency:short,prescribing_provider:short,start_date:date,status:z.enum(['active','discontinued','completed','inactive']).optional(),notes:text}),
 patient_appointments:z.object({patient_id:uuid,appointment_date:date,appointment_time:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),duration_minutes:z.coerce.number().int().min(1).max(1440).optional(),type:short,location:text,notes:text,status:z.enum(['scheduled','completed','cancelled','no_show']).optional(),timezone:z.string().max(80).optional()}),
 patient_goals:z.object({patient_id:uuid,title:short,description:text,target_date:date,status:z.enum(['active','achieved','discontinued']).optional(),domain:short}),
 patient_billing:z.object({patient_id:uuid,service_date:date,cpt_code:short,icd_codes:short,description:text,notes:text,fee:money,insurance_billed:money,insurance_paid:money,patient_responsibility:money,status:z.enum(['draft','pending','submitted','paid','denied','partial','void']).optional()}),
 patient_sessions:z.object({patient_id:uuid,title:short,session_type:z.enum(['initial_evaluation','follow_up','crisis','medication_management','therapy_session']).optional(),status:z.enum(['active','completed','archived']).optional(),summary:text}),
 knowledge_base:z.object({title:short,content:text,category:z.enum(['cpt_codes','clinical_reference','protocol','medication','billing','other']).optional(),tags:short,source:short,file_url:short}),
};
export const tableName=z.enum(['patients','patient_notes','patient_medications','patient_appointments','patient_goals','patient_billing','patient_sessions','knowledge_base']);
export type RecordTable=z.infer<typeof tableName>;
const aliases:Partial<Record<RecordTable,Record<string,string>>>={patients:{date_of_birth:'dob'},patient_medications:{start_date:'started_on'},patient_goals:{title:'goal'},patient_billing:{fee:'amount_cents',insurance_billed:'insurance_billed_cents',insurance_paid:'insurance_paid_cents',patient_responsibility:'patient_responsibility_cents'}};
export function recordDto(table:RecordTable,row:Record<string,unknown>) {
 const result:Record<string,unknown>={...row,created_date:row.created_at,updated_date:row.updated_at};delete result.owner_uid;
 for(const [ui,db] of Object.entries(aliases[table]??{})) result[ui]=table==='patient_billing'?Number(row[db]??0)/100:row[db];
 if(table==='patient_goals'&&row.status==='met') result.status='achieved';
 if(table==='patient_appointments'&&row.status==='canceled') result.status='cancelled';
 if(table==='patients') {result.emergency_contact ||= [row.ec_name,row.ec_relationship,row.ec_phone].filter(Boolean).join(' · ');result.insurance_info ||= [row.insurance_carrier,row.insurance_plan].filter(Boolean).join(' · ');}
 if(table==='patient_sessions') {result.session_date=row.started_at;result.chief_complaint=row.title;}
 return result;
}
function mapped(table:RecordTable,input:unknown):Record<string,unknown> {
 const object=z.record(z.unknown()).parse(input);
 // Empty optional date/numeric form inputs mean null; text remains explicitly clearable.
 const cleaned=Object.fromEntries(Object.entries(object).map(([key,value])=>[key,value==='' ? (['fee','insurance_billed','insurance_paid','patient_responsibility','appointment_time'].includes(key)?undefined:null):value]));
 const parsed:Record<string,unknown>=schemas[table].strict().parse(cleaned);
 const result:Record<string,unknown>={};
 for(const [key,value]of Object.entries(parsed)) if(value!==undefined) result[aliases[table]?.[key]??key]=table==='patient_billing'&&['fee','insurance_billed','insurance_paid','patient_responsibility'].includes(key)?Math.round(Number(value)*100):value;
 if(table==='patient_goals'&&result.status==='achieved')result.status='met';
 if(table==='patient_appointments'&&result.status==='cancelled')result.status='canceled';
 return result;
}
export class Records {
 constructor(readonly pool:Pool){}
 async execute(identity:Identity,input:unknown) {
  const request=z.object({action:z.enum(['select','insert','update','delete']),table:tableName,query:z.object({id:z.string().uuid().optional(),patient_id:z.string().uuid().optional()}).strict().default({}),data:z.unknown().optional(),limit:z.number().int().min(1).max(1000).default(1000),offset:z.number().int().min(0).max(100000).default(0)}).strict().parse(input);
  const {table,action,query}=request;
  if(query.patient_id && ['patients','knowledge_base'].includes(table)) throw new ApiError(400,'invalid_request');
  if(['update','delete'].includes(action)&&!query.id)throw new ApiError(400,'invalid_request');
  const rows=await withIdentity(this.pool,identity,async client=>{
   const params:unknown[]=[identity.subject];const conditions=['owner_uid=$1'];
   for(const [field,value]of Object.entries(query)){params.push(value);conditions.push(`${field}=$${params.length}`);}
   const where=conditions.join(' and ');
   if(action==='select') {
    const result=await client.query(`select *,${table==='patients'?'dob::text,':''}${table==='patient_medications'?'started_on::text,stopped_on::text,':''}${table==='patient_appointments'?'appointment_date::text,appointment_time::text,':''}${table==='patient_goals'?'target_date::text,':''}${table==='patient_billing'?'service_date::text,':''} created_at from neurosync.${table} where ${where} order by created_at desc,id desc limit $${params.length+1} offset $${params.length+2}`,[...params,request.limit,request.offset]);
    await this.auditRead(client,identity,table,result.rows.map(row=>String(row.id)));
    return result.rows.map(row=>recordDto(table,row));
   }
   if(table==='patient_notes' && query.id) {
    const existing=await client.query(`select status from neurosync.patient_notes where ${where} for update`,params);
    if(existing.rows[0]?.status==='finalized') throw new ApiError(409,'conflict');
   }
   if(action==='delete'){const result=await client.query(`delete from neurosync.${table} where ${where} returning *`,params);return result.rows.map(row=>recordDto(table,row));}
   const data=mapped(table,request.data);
   if(action==='insert') {
    const required:Partial<Record<RecordTable,string[]>>={patient_medications:['name'],patient_goals:['goal'],knowledge_base:['title','content']};
    if((required[table]??[]).some(key=>typeof data[key]!=='string'||!String(data[key]).trim())) throw new ApiError(400,'invalid_request');
   }
   if(action==='insert' && table==='patient_notes' && data.status==='finalized')throw new ApiError(400,'invalid_request');
   if(table==='patient_notes'&&data.status==='finalized') {
    await client.query(`insert into neurosync.note_versions(owner_uid,note_id,body) select owner_uid,id,to_jsonb(n) from neurosync.patient_notes n where ${where}`,params);
   }
   const keys=Object.keys(data);if(!keys.length)throw new ApiError(400,'invalid_request');
   if(action==='insert') {
    const result=await client.query(`insert into neurosync.${table}(owner_uid,${keys.join(',')}) values($1,${keys.map((_,i)=>'$'+(i+2)).join(',')}) returning *`,[identity.subject,...keys.map(key=>data[key])]);return result.rows.map(row=>recordDto(table,row));
   }
   const result=await client.query(`update neurosync.${table} set ${keys.map((key,i)=>`${key}=$${params.length+i+1}`).join(',')} where ${where} returning *`,[...params,...keys.map(key=>data[key])]);return result.rows.map(row=>recordDto(table,row));
  });
  if(table==='knowledge_base' && ['insert','update'].includes(action))for(const row of rows)await new Embeddings(this.pool).index(identity,String(row.id));
  return rows;
 }
 async auditRead(client:PoolClient,identity:Identity,table:string,ids:string[]) {
  await client.query(`insert into neurosync.audit_log(actor_uid,action,table_name,row_id) select $1,'read',$2,unnest($3::text[])`,[identity.subject,table,ids.length?ids:['collection']]);
 }
}
