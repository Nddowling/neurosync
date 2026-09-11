import { SupabaseLogin } from './supabase.js';
import * as oidc from 'openid-client';
import type { Pool } from 'pg';
import { z } from 'zod';
import { Sessions,cookie,digest,secret,sameSecret } from './session.js';
import { verifyLocalLogin } from './local.js';
import { Identity } from './identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
import { readJson } from '../api/app.js';
import { RateLimit } from '../security/rate-limit.js';

export interface AuthConfig { mode: 'local'|'oidc'|'supabase'; environment: string; origin: string; issuer?: string; clientId?: string; clientSecret?: string; supabaseUrl?:string; supabaseKey?:string }
export class AuthRouter {
  readonly sessions: Sessions;
  private supabase?: SupabaseLogin;
  private configPromise?: Promise<oidc.Configuration>;
  private attempts=new RateLimit(20,60000);
  constructor(private pool: Pool,private settings: AuthConfig) {
    if(settings.mode==='local' && (settings.environment!=='development' || !['localhost','127.0.0.1'].includes(new URL(settings.origin).hostname))) throw new Error('Local authentication is restricted to loopback development');
    if(settings.mode==='oidc' && (!settings.issuer?.startsWith('https://') || !settings.clientId)) throw new Error('OIDC configuration required');
    this.sessions=new Sessions(pool,settings.origin,settings.environment!=='development');
    if(settings.mode==='supabase')this.supabase=new SupabaseLogin(pool,this.sessions,settings.supabaseUrl??'',settings.supabaseKey??'');
  }
  private configuration() {
    if(!this.configPromise) this.configPromise=oidc.discovery(new URL(this.settings.issuer!),this.settings.clientId!,this.settings.clientSecret);
    return this.configPromise;
  }
  private async establish(subject:string,assurance:string,redirect=false) {
    const tokens=await this.sessions.create(subject,assurance);
    const headers=new Headers();headers.append('set-cookie',tokens.cookie);headers.append('set-cookie',tokens.csrfCookie);
    if(redirect) { headers.set('location','/Dashboard'); return new Response(null,{status:303,headers}); }
    return Response.json({ok:true},{headers});
  }
  async route(request:Request):Promise<Response|null> {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/auth/')) return null;
    if(url.pathname==='/api/auth/config' && request.method==='GET') return Response.json({mode:this.settings.mode});
    if(url.pathname==='/api/auth/email' && request.method==='POST' && this.supabase) {
      if(!this.attempts.allow('email'))throw new ApiError(429,'rate_limited');
      return this.supabase.start(request);
    }
    if(url.pathname==='/api/auth/supabase-callback' && request.method==='GET' && this.supabase) {
      const response=await this.establish(await this.supabase.finish(request),'supabase-email',true);
      response.headers.append('set-cookie',this.sessions.setCookie('neurosync_login','',0));return response;
    }
    if(url.pathname==='/api/auth/login' && request.method==='POST') {
      this.sessions.assertOrigin(request);
      if(this.settings.mode!=='local') throw new ApiError(404,'not_found');
      if(!this.attempts.allow('login')) throw new ApiError(429,'rate_limited');
      const input=z.object({email:z.string().email().max(320),password:z.string().min(1).max(256)}).strict().parse(await readJson(request));
      const subject=await verifyLocalLogin(this.pool,input.email,input.password);
      if(!subject) throw new ApiError(401,'unauthorized');
      return this.establish(subject,'local-password');
    }
    if(url.pathname==='/api/auth/start' && request.method==='GET') {
      if(this.settings.mode!=='oidc') throw new ApiError(404,'not_found');
      if(!this.attempts.allow('oidc-start')) throw new ApiError(429,'rate_limited');
      const configuration=await this.configuration();const state=secret();const nonce=secret();const verifier=oidc.randomPKCECodeVerifier();
      await this.pool.query('select neurosync_auth.state_save($1,$2)',[digest(state),JSON.stringify({nonce,verifier})]);
      const destination=oidc.buildAuthorizationUrl(configuration,{redirect_uri:`${this.settings.origin}/api/auth/callback`,scope:'openid profile email',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256'});
      return new Response(null,{status:303,headers:{location:destination.href,'set-cookie':this.sessions.setCookie('neurosync_login',state,300)}});
    }
    if(url.pathname==='/api/auth/callback' && request.method==='GET') {
      if(this.settings.mode!=='oidc') throw new ApiError(404,'not_found');
      const state=url.searchParams.get('state');const expected=cookie(request,'neurosync_login');
      if(!state || !expected || !sameSecret(state,expected)) throw new ApiError(401,'unauthorized');
      const result=await this.pool.query<{state_consume:unknown}>('select neurosync_auth.state_consume($1)',[digest(state)]);
      const pending=z.object({nonce:z.string(),verifier:z.string()}).safeParse(result.rows[0]?.state_consume);
      if(!pending.success) throw new ApiError(401,'unauthorized');
      let claims;
      try {
        const tokens=await oidc.authorizationCodeGrant(await this.configuration(),new URL(`/api/auth/callback${url.search}`,this.settings.origin),{expectedState:state,expectedNonce:pending.data.nonce,pkceCodeVerifier:pending.data.verifier,idTokenExpected:true});
        claims=tokens.claims();
      } catch { throw new ApiError(401,'unauthorized'); }
      if(!claims?.sub) throw new ApiError(401,'unauthorized');
      const mapped=await this.pool.query<{owner_uid:string}>('select * from neurosync_auth.identity_lookup($1,$2)',[this.settings.issuer,claims.sub]);
      const subject=mapped.rows[0]?.owner_uid;
      if(!subject) throw new ApiError(403,'forbidden');
      const response=await this.establish(subject,String(claims.acr ?? 'oidc'),true);
      response.headers.append('set-cookie',this.sessions.setCookie('neurosync_login','',0));return response;
    }
    const identity=await Identity.authenticate(request,this.sessions);
    if(url.pathname==='/api/auth/me' && request.method==='GET') {
      const profile=await withIdentity(this.pool,identity,async client => (await client.query('select uid as id,email,full_name,credentials,role,tos_accepted_at from neurosync.clinicians where uid=$1',[identity.subject])).rows[0]);
      if(!profile) throw new ApiError(403,'forbidden');return Response.json(profile);
    }
    if(url.pathname==='/api/auth/me' && request.method==='PATCH') {
      const data=z.object({full_name:z.string().max(200).optional(),credentials:z.string().max(200).optional(),tos_accepted_at:z.string().datetime().optional()}).strict().parse(await readJson(request));
      const result=await withIdentity(this.pool,identity,client=>client.query(`update neurosync.clinicians set full_name=coalesce($2,full_name), credentials=coalesce($3,credentials),tos_accepted_at=case when $4::boolean then now() else tos_accepted_at end where uid=$1 returning uid as id,email,full_name,credentials,role,tos_accepted_at`,[identity.subject,data.full_name??null,data.credentials??null,!!data.tos_accepted_at]));
      return Response.json(result.rows[0]);
    }
    if(url.pathname==='/api/auth/logout' && request.method==='POST') {
      const headers=new Headers();for(const value of await this.sessions.logout(request,identity)) headers.append('set-cookie',value);
      return Response.json({ok:true},{headers});
    }
    throw new ApiError(404,'not_found');
  }
}
