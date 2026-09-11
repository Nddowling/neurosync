import Stripe from 'stripe';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
import { readJson } from '../api/app.js';
export class Billing {
 constructor(private runtime:Pool,private commerce:Pool,private stripe:Stripe,private origin:string,private webhookSecret:string,private prices:Record<string,string>){}
 async checkout(request:Request,identity:Identity){
  const input=z.object({plan:z.enum(['professional','enterprise']),promoCode:z.string().min(1).max(100).optional()}).strict().parse(await readJson(request));
  const price=this.prices[input.plan];if(!price)throw new ApiError(503,'service_unavailable');
  const customer=await withIdentity(this.runtime,identity,async client=>{
   const profile=(await client.query('select tos_accepted_at from neurosync.clinicians where uid=$1',[identity.subject])).rows[0];
   if(!profile?.tos_accepted_at)throw new ApiError(403,'forbidden');
   await client.query('select pg_advisory_xact_lock(hashtextextended($1,1))',[identity.subject]);
   const existing=(await client.query('select stripe_customer_id from neurosync.billing_customers where owner_uid=$1',[identity.subject])).rows[0];
   if(existing)return String(existing.stripe_customer_id);
   // Only an opaque billing identifier reaches Stripe. Never send patient/chart data.
   const created=await this.stripe.customers.create({}, {idempotencyKey:`neurosync-customer-${identity.subject}`});
   await client.query('insert into neurosync.billing_customers(owner_uid,stripe_customer_id) values($1,$2)',[identity.subject,created.id]);return created.id;
  });
  let promotion:string|undefined;
  if(input.promoCode){const result=await this.stripe.promotionCodes.list({code:input.promoCode,active:true,limit:1});promotion=result.data[0]?.id;if(!promotion)throw new ApiError(400,'invalid_request');}
  const session=await this.stripe.checkout.sessions.create({mode:'subscription',customer,line_items:[{price,quantity:1}],success_url:`${this.origin}/Subscription?success=true`,cancel_url:`${this.origin}/Subscription?canceled=true`,...(promotion?{discounts:[{promotion_code:promotion}]}:{})});
  if(!session.url)throw new ApiError(503,'service_unavailable');return Response.json({url:session.url});
 }
 async webhook(request:Request):Promise<Response|null>{
  if(new URL(request.url).pathname!=='/api/billing/webhook')return null;
  if(request.method!=='POST')throw new ApiError(405,'method_not_allowed');
  const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'invalid_request');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>65536){await reader.cancel();throw new ApiError(413,'payload_too_large');}chunks.push(part.value);}}finally{reader.releaseLock();}
  let event:Stripe.Event;try{event=this.stripe.webhooks.constructEvent(Buffer.concat(chunks),request.headers.get('stripe-signature')??'',this.webhookSecret,300);}catch{throw new ApiError(400,'invalid_request');}
  let subscriptionId:string|undefined;
  if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted')subscriptionId=event.data.object.id;
  if(event.type==='checkout.session.completed'){const sub=event.data.object.subscription;subscriptionId=typeof sub==='string'?sub:sub?.id;}
  if(!subscriptionId)return Response.json({received:true});
  const client=await this.commerce.connect();
  try{
   const role=(await client.query("select current_user='neurosync_billing' and not rolsuper and not rolbypassrls and not rolcreaterole from pg_roles where rolname=current_user")).rows[0];
   if(!role||!Object.values(role)[0])throw new Error('Invalid commerce role');
   await client.query('begin');await client.query('select pg_advisory_xact_lock(hashtextextended($1,2))',[subscriptionId]);
   if((await client.query('select event_id from neurosync_auth.stripe_events where event_id=$1',[event.id])).rowCount){await client.query('commit');return Response.json({received:true});}
   // Fetch canonical state while serialized; old webhook delivery cannot downgrade newer state.
   const subscription=await this.stripe.subscriptions.retrieve(subscriptionId);
   const customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer.id;
   const mapping=(await client.query('select owner_uid from neurosync.billing_customers where stripe_customer_id=$1',[customer])).rows[0];
   if(!mapping)throw new Error('Unknown billing customer');
   const price=subscription.items.data[0]?.price.id;
   const plan=Object.entries(this.prices).find(([,id])=>id===price)?.[0]??'free';
   const status=['active','trialing'].includes(subscription.status)?'active':subscription.status==='canceled'?'canceled':'past_due';
   await client.query(`insert into neurosync.user_subscriptions(owner_uid,plan,status,stripe_customer_id,stripe_subscription_id) values($1,$2,$3,$4,$5) on conflict(owner_uid) do update set plan=excluded.plan,status=excluded.status,stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id`,[mapping.owner_uid,plan,status,customer,subscription.id]);
   await client.query('insert into neurosync_auth.stripe_events(event_id) values($1)',[event.id]);await client.query('commit');return Response.json({received:true});
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
 }
}
