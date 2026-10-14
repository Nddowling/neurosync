import type { Pool,PoolClient } from 'pg';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
export const PLANS={free:{consult:5,soap_note:3},professional:{consult:null,soap_note:null},enterprise:{consult:null,soap_note:null},promo_justin:{consult:null,soap_note:null}} as const;
export type UsageAction='consult'|'soap_note';
export class Usage {
 constructor(private pool:Pool){}
 async subscription(identity:Identity){return withIdentity(this.pool,identity,client=>this.status(client,identity));}
 async status(client:PoolClient,identity:Identity){
  const sub=(await client.query('select plan,status from neurosync.user_subscriptions where owner_uid=$1',[identity.subject])).rows[0];
  const plan: keyof typeof PLANS=sub?.status==='active' && Object.hasOwn(PLANS,sub.plan)?sub.plan:'free';
  const counts=(await client.query(`select action,count(*)::int as used from neurosync.usage_events where owner_uid=$1 and (status='complete' or (status='reserved' and created_at>now()-interval '5 minutes')) and created_at >= (date_trunc('month',now() at time zone 'UTC') at time zone 'UTC') group by action`,[identity.subject])).rows;
  return {plan,status:sub?.status??'active',consults_used:counts.find(r=>r.action==='consult')?.used??0,soap_notes_used:counts.find(r=>r.action==='soap_note')?.used??0};
 }
 async reserve(client:PoolClient,identity:Identity,requestId:string,action:UsageAction){
  await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[identity.subject]);
  await client.query("update neurosync.usage_events set status='released' where owner_uid=$1 and status='reserved' and created_at<now()-interval '5 minutes'",[identity.subject]);
  const previous=(await client.query('select status from neurosync.usage_events where owner_uid=$1 and request_id=$2 and action=$3',[identity.subject,requestId,action])).rows[0];
  if(previous?.status==='complete')return false;
  if(previous?.status==='reserved')throw new ApiError(409,'conflict');
  const sub=await this.status(client,identity);const limit=PLANS[sub.plan][action];const used=action==='consult'?sub.consults_used:sub.soap_notes_used;
  if(limit!==null&&used>=limit)throw new ApiError(403,'limit_reached');
  await client.query(`insert into neurosync.usage_events(owner_uid,request_id,action) values($1,$2,$3) on conflict(owner_uid,request_id,action) do update set status='reserved',created_at=now()`,[identity.subject,requestId,action]);return true;
 }
 async finish(client:PoolClient,identity:Identity,requestId:string,action:UsageAction,success:boolean){
  await client.query('update neurosync.usage_events set status=$4 where owner_uid=$1 and request_id=$2 and action=$3',[identity.subject,requestId,action,success?'complete':'released']);
 }
}
