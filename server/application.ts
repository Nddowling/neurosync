import Stripe from 'stripe';
import {Billing} from './billing/service.js';
import {createPool} from './db/pool.js';
import { Knowledge } from './domain/knowledge.js';
import { z } from 'zod';
import type { Pool } from 'pg';
import { createApp, readJson } from './api/app.js';
import { ApiError } from './api/errors.js';
import { AuthRouter, type AuthConfig } from './auth/router.js';
import { Patients } from './repositories/patients.js';
import { Records } from './compat/records.js';
import { Conversations } from './domain/conversations.js';
import { Soap } from './domain/soap.js';
import { Usage } from './plans/usage.js';
import { configuredGateway, type AIGateway } from './ai/gateway.js';

export function application(pool: Pool, settings: AuthConfig, ai: AIGateway = configuredGateway(process.env)) {
 const auth = new AuthRouter(pool, settings);
 const records = new Records(pool);
 const conversations = new Conversations(pool, ai);
 const soap = new Soap(pool, ai);
 const usage = new Usage(pool);
 const knowledge = new Knowledge(pool);
 const env=process.env;
 const billing=env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET&&env.BILLING_DATABASE_URL?new Billing(pool,createPool(env.BILLING_DATABASE_URL),new Stripe(env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1}),settings.origin,env.STRIPE_WEBHOOK_SECRET,{professional:env.STRIPE_PROFESSIONAL_PRICE_ID??'',enterprise:env.STRIPE_ENTERPRISE_PRICE_ID??''}):null;
 return createApp({ patients: new Patients(pool), auth:{route: async request=>{if(new URL(request.url).pathname==='/api/billing/webhook'){if(!billing)throw new ApiError(503,'service_unavailable');return billing.webhook(request);}return auth.route(request);}}, verifier: auth.sessions, route: async (request, identity) => {
  const path = new URL(request.url).pathname;
  if(path === '/api/billing/checkout' && request.method==='POST'){if(!billing)throw new ApiError(503,'service_unavailable');return billing.checkout(request,identity);}
  if(path === '/api/knowledge/upload' && request.method === 'POST') return Response.json(await knowledge.ingest(identity,await readJson(request,3000000)));
  const document=/^\/api\/documents\/([^/]+)$/.exec(path);
  if(document && request.method==='GET')return knowledge.download(identity,z.string().uuid().parse(document[1]));
  if (path === '/api/records' && request.method === 'POST') return Response.json({data: await records.execute(identity, await readJson(request))});
  if (path === '/api/subscription' && request.method === 'GET') return Response.json(await usage.subscription(identity));
  if (path === '/api/ai/soap' && request.method === 'POST') return Response.json(await soap.generate(identity, await readJson(request, 512000)));
  if (path === '/api/ai/reference' && request.method === 'POST') {
   const input = z.object({task: z.enum(['medication','diagnostic','cpt']), query: z.string().min(1).max(20000)}).strict().parse(await readJson(request));
   return Response.json({content: await ai.reference(input.task, input.query)});
  }
  if (path === '/api/conversations') {
   if (request.method === 'GET') return Response.json(await conversations.list(identity));
   if (request.method === 'POST') return Response.json(await conversations.create(identity, await readJson(request)), {status:201});
   throw new ApiError(405,'method_not_allowed');
  }
  const match = /^\/api\/conversations\/([^/]+)(\/messages)?$/.exec(path);
  if (match) {
   const id = z.string().uuid().parse(match[1]);
   if (!match[2] && request.method === 'GET') return Response.json(await conversations.get(identity,id));
   if (match[2] && request.method === 'POST') return Response.json(await conversations.add(identity,id,await readJson(request)));
   throw new ApiError(405,'method_not_allowed');
  }
  return null;
 }});
}
