import { AuthClient } from '@supabase/auth-js';
import { z } from 'zod';
import type { Pool } from 'pg';
import { ApiError } from '../api/errors.js';
import { readJson } from '../api/app.js';
import { cookie,digest,secret,type Sessions } from './session.js';

export class SupabaseLogin {
 constructor(private pool:Pool,private sessions:Sessions,private url:string,private key:string){
  if(new URL(url).protocol!=='https:'||!key)throw new Error('Supabase authentication configuration required');
 }
 private client(storage:Record<string,string>){return new AuthClient({url:`${this.url}/auth/v1`,headers:{apikey:this.key},flowType:'pkce',autoRefreshToken:false,persistSession:true,detectSessionInUrl:false,storage:{getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=value;},removeItem:key=>{delete storage[key];}}});}
 async start(request:Request){
  this.sessions.assertOrigin(request);
  const {email}=z.object({email:z.string().email().max(320).transform(v=>v.trim().toLowerCase())}).strict().parse(await readJson(request));
  const invited=await this.pool.query('select owner_uid from neurosync_auth.identity_lookup($1,$2)',['supabase-email',email]);
  // Same response for uninvited addresses; the provider owns email delivery limits.
  if(!invited.rowCount)return Response.json({ok:true});
  const state=secret();const storage:Record<string,string>={};
  const {error}=await this.client(storage).signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:`${this.sessions.origin}/api/auth/supabase-callback`}});
  if(error)throw new ApiError(503,'service_unavailable');
  await this.pool.query('select neurosync_auth.state_save($1,$2)',[digest(state),JSON.stringify({email,storage})]);
  return Response.json({ok:true},{headers:{'set-cookie':this.sessions.setCookie('neurosync_login',state,300)}});
 }
 async finish(request:Request){
  const code=new URL(request.url).searchParams.get('code');const state=cookie(request,'neurosync_login');
  if(!code||!state)throw new ApiError(401,'unauthorized');
  const result=await this.pool.query('select neurosync_auth.state_consume($1)',[digest(state)]);
  const pending=z.object({email:z.string().email(),storage:z.record(z.string())}).safeParse(result.rows[0]?.state_consume);
  if(!pending.success)throw new ApiError(401,'unauthorized');
  const client=this.client(pending.data.storage);
  const {data,error}=await client.exchangeCodeForSession(code);
  if(error||!data.session)throw new ApiError(401,'unauthorized');
  const verified=await client.getUser(data.session.access_token);
  const user=verified.data.user;
  if(verified.error||!user?.email_confirmed_at||user.email?.toLowerCase()!==pending.data.email)throw new ApiError(401,'unauthorized');
  const mapped=await this.pool.query('select owner_uid from neurosync_auth.identity_lookup($1,$2)',['supabase-email',pending.data.email]);
  if(!mapped.rows[0]?.owner_uid)throw new ApiError(403,'forbidden');
  return String(mapped.rows[0].owner_uid);
 }
}
