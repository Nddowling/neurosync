import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { migrate } from '../server/db/migrate.js';
import { assertRuntimeRole } from '../server/db/pool.js';
import { withIdentity } from '../server/db/transaction.js';
import { Identity, type IdentityVerifier } from '../server/auth/identity.js';
import { Patients } from '../server/repositories/patients.js';
import { createApp } from '../server/api/app.js';

const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
const runtimeUrl = process.env.TEST_DATABASE_URL;
if (!migrationUrl || !runtimeUrl) throw new Error('Use npm test: creates an isolated synthetic PostgreSQL cluster');
for (const value of [migrationUrl, runtimeUrl]) {
  const url = new URL(value);
  if (url.pathname !== '/neurosync_test' || !url.searchParams.get('host')?.includes('neurosync-test-')) {
    throw new Error('Tests may only use the generated synthetic cluster');
  }
}
const verifier: IdentityVerifier = { verify: async request => {
  const token = request.headers.get('authorization');
  return token === 'Bearer test-a' ? { subject: 'synthetic-a' } : token === 'Bearer test-b' ? { subject: 'synthetic-b' } : null;
} };
const identify = (token: string) => Identity.authenticate(new Request('http://localhost', { headers: { authorization: `Bearer ${token}` } }), verifier);

test('actual PostgreSQL migrations, non-owner isolation and HTTP ownership', async t => {
  const owner = new Pool({ connectionString: migrationUrl, max: 1 });
  const runtime = new Pool({ connectionString: runtimeUrl, max: 1 });
  const scratch = await mkdtemp(join(tmpdir(), 'neurosync-migrations-'));
  const directory = pathToFileURL(scratch + '/');
  t.after(async () => { await runtime.end(); await owner.end(); await rm(scratch, { recursive: true, force: true }); });
  const original = ['0001_schema.sql','0002_rls.sql','0003_audit.sql'];
  for (const name of original) await copyFile(new URL(`../db/migrations/${name}`, import.meta.url), new URL(name, directory));
  await migrate(owner, directory);

  await t.test('reproduces original audit flaw before applying hardening', async () => {
    const result = await owner.query(`select has_table_privilege('app_rw','neurosync.audit_log','UPDATE') as can_update,
      has_table_privilege('app_rw','neurosync.audit_log','DELETE') as can_delete,
      (select relrowsecurity from pg_class where oid='neurosync.audit_log'::regclass) as rls`);
    assert.deepEqual(result.rows[0], { can_update: true, can_delete: true, rls: false });
  });
  assert.ok((await migrate(owner)).includes('0004_runtime_security.sql'));
  await owner.query(`insert into neurosync.clinicians(uid,email) values
    ('synthetic-a','a@example.invalid'),('synthetic-b','b@example.invalid')`);
  const a = await identify('test-a'); const b = await identify('test-b');
  const patients = new Patients(runtime);
  const patientA = await patients.create(a, { first_name: 'Synthetic A', dob: '2000-02-29' });
  const patientB = await patients.create(b, { first_name: 'Synthetic B' });

  await t.test('migration replay is no-op, checksum changes rejected atomically', async () => {
    assert.deepEqual(await migrate(owner), []);
    for (const name of (await (await import('node:fs/promises')).readdir(new URL('../db/migrations/', import.meta.url))).filter(n => !original.includes(n))) {
      await copyFile(new URL(`../db/migrations/${name}`, import.meta.url), new URL(name, directory));
    }
    const file = new URL('0001_schema.sql', directory);
    await writeFile(file, (await readFile(file, 'utf8')) + '\n-- tampered\n');
    await assert.rejects(migrate(owner, directory), /checksum mismatch/);
    assert.deepEqual(await migrate(owner), []);
  });
  await t.test('real application login is non-owner, cannot SET ROLE or bypass RLS', async () => {
    const client = await runtime.connect();
    try {
      await assertRuntimeRole(client);
      assert.equal((await client.query('select current_user')).rows[0].current_user, 'app_rw');
      await assert.rejects(client.query('set role test_owner'), { code: '42501' });
      await assert.rejects(client.query('alter role app_rw bypassrls'), { code: '42501' });
      await client.query('set row_security = off');
      await assert.rejects(client.query('select * from neurosync.patients'), { code: '42501' });
      await client.query('reset row_security');
      await assert.rejects(client.query('create table neurosync.unsafe(id integer)'), { code: '42501' });
    } finally { client.release(); }
    const ownerClient = await owner.connect();
    try { await assert.rejects(assertRuntimeRole(ownerClient), /Unsafe database runtime role/); }
    finally { ownerClient.release(); }
  });
  await t.test('guard rejects privileged role membership and BYPASSRLS configuration', async () => {
    await owner.query('grant test_owner to app_rw');
    await assert.rejects(withIdentity(runtime, a, async () => 1), /Unsafe database runtime role/);
    await owner.query('revoke test_owner from app_rw');
    await owner.query('alter role app_rw bypassrls');
    await assert.rejects(withIdentity(runtime, a, async () => 1), /Unsafe database runtime role/);
    await owner.query('alter role app_rw nobypassrls');
  });
  await t.test('A cannot read/update/delete B via repository; own CRUD remains usable', async () => {
    assert.equal(await patients.get(a, patientB.id), null);
    assert.equal(await patients.update(a, patientB.id, { first_name: 'forged' }), null);
    assert.equal(await patients.delete(a, patientB.id), false);
    assert.equal((await patients.get(b, patientB.id))?.first_name, 'Synthetic B');
    assert.equal((await patients.update(a, patientA.id, { notes: 'SYNTHETIC_SECRET_BODY' }))?.notes, 'SYNTHETIC_SECRET_BODY');
    const extra = await patients.create(a, { first_name: 'Synthetic removable' });
    assert.equal(await patients.delete(a, extra.id), true);
  });
  await t.test('missing identity returns zero protected rows, including profile/audit', async () => {
    for (const table of ['patients','patient_notes','patient_medications','patient_appointments','patient_sessions','patient_goals','patient_billing','knowledge_base','user_subscriptions','clinicians','audit_log']) {
      assert.equal((await runtime.query(`select * from neurosync.${table}`)).rowCount, 0, table);
    }
    await assert.rejects(patients.list({ subject: 'synthetic-a' } as Identity), /unauthorized/);
  });
  await t.test('forged owner fields and SQL injection subjects cannot grant access', async () => {
    await assert.rejects(patients.create(a, { first_name: 'Forgery', owner_uid: 'synthetic-b' }));
    await assert.rejects(patients.update(a, patientA.id, { owner_uid: 'synthetic-b' }));
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into neurosync.patients(owner_uid,first_name) values ('synthetic-b','forged')`)), { code: '42501' });
    await assert.rejects(withIdentity(runtime, a, client => client.query(`update neurosync.patients set owner_uid='synthetic-b' where id=$1`, [patientA.id])), { code: '42501' });
    const injection = await Identity.authenticate(new Request('http://localhost'), { verify: async () => ({ subject: "x'; SET app.uid='synthetic-b'; --" }) });
    assert.deepEqual(await patients.list(injection), []);
  });
  const related = [
    { table: 'patient_notes', fields: 'body', value: 'Synthetic note' },
    { table: 'patient_medications', fields: 'name', value: 'Synthetic medication' },
    { table: 'patient_appointments', fields: 'notes', value: 'Synthetic appointment' },
    { table: 'patient_sessions', fields: 'title', value: 'Synthetic session' },
    { table: 'patient_goals', fields: 'goal', value: 'Synthetic goal' },
    { table: 'patient_billing', fields: 'cpt_code', value: 'synthetic' },
  ];
  for (const { table, fields, value } of related) {
    await t.test(`${table}: direct SQL without owner filters remains isolated; parent forgery denied`, async () => {
      const row = await withIdentity(runtime, b, client => client.query(`insert into neurosync.${table}(owner_uid,patient_id,${fields}) values ($1,$2,$3) returning id`, [b.subject, patientB.id, value]));
      const id: string = row.rows[0].id;
      await withIdentity(runtime, a, async client => {
        assert.equal((await client.query(`select * from neurosync.${table} where id=$1`, [id])).rowCount, 0);
        assert.equal((await client.query(`update neurosync.${table} set ${fields}=$2 where id=$1`, [id, 'forged'])).rowCount, 0);
        assert.equal((await client.query(`delete from neurosync.${table} where id=$1`, [id])).rowCount, 0);
      });
      await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into neurosync.${table}(owner_uid,patient_id,${fields}) values ($1,$2,$3)`, [a.subject, patientB.id, value])), { code: '23503' });
      const own = await withIdentity(runtime, a, client => client.query(`insert into neurosync.${table}(owner_uid,patient_id,${fields}) values ($1,$2,$3) returning id`, [a.subject, patientA.id, value]));
      await assert.rejects(withIdentity(runtime, a, client => client.query(`update neurosync.${table} set patient_id=$1 where id=$2`, [patientB.id, own.rows[0].id])), { code: '23503' });
    });
  }
  await t.test('clinical notes cannot link to another clinician session', async () => {
    const session = await withIdentity(runtime, b, client => client.query('select id from neurosync.patient_sessions limit 1'));
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into neurosync.patient_notes(owner_uid,session_id) values ($1,$2)`, [a.subject, session.rows[0].id])), { code: '23503' });
  });
  await t.test('knowledge content isolation and audit coverage', async () => {
    const kb = await withIdentity(runtime, b, client => client.query(`insert into neurosync.knowledge_base(owner_uid,title,content) values ($1,'Synthetic source','SYNTHETIC_SECRET_BODY') returning id`, [b.subject]));
    const id: string = kb.rows[0].id;
    await withIdentity(runtime, a, async client => {
      assert.equal((await client.query('select * from neurosync.knowledge_base where id=$1', [id])).rowCount, 0);
      assert.equal((await client.query("update neurosync.knowledge_base set title='forged' where id=$1", [id])).rowCount, 0);
      assert.equal((await client.query('delete from neurosync.knowledge_base where id=$1', [id])).rowCount, 0);
    });
    await withIdentity(runtime, b, async client => {
      assert.equal((await client.query("select * from neurosync.audit_log where row_id=$1 and table_name='knowledge_base'", [id])).rowCount, 1);
    });
  });
  await t.test('app.role=admin cannot widen access; profiles and subscriptions cannot escalate', async () => {
    await withIdentity(runtime, a, async client => {
      await client.query("select set_config('app.role','admin',true)");
      assert.equal((await client.query('select * from neurosync.patients where id=$1', [patientB.id])).rowCount, 0);
      assert.equal((await client.query("select * from neurosync.clinicians where uid='synthetic-b'")).rowCount, 0);
    });
    await assert.rejects(withIdentity(runtime, a, client => client.query("update neurosync.clinicians set role='admin' where uid=$1", [a.subject])), { code: '42501' });
    await owner.query("insert into neurosync.user_subscriptions(owner_uid) values ('synthetic-a'),('synthetic-b')");
    await withIdentity(runtime, a, async client => {
      assert.equal((await client.query('select * from neurosync.user_subscriptions')).rowCount, 1);
      await client.query("update neurosync.clinicians set full_name='Synthetic clinician' where uid=$1", [a.subject]);
    });
    await assert.rejects(withIdentity(runtime, a, client => client.query("update neurosync.user_subscriptions set plan='enterprise' where owner_uid=$1", [a.subject])), { code: '42501' });
  });
  await t.test('audit is append-only, actor-scoped and excludes clinical values', async () => {
    await patients.get(a, patientA.id);
    await withIdentity(runtime, a, async client => {
      const rows = await client.query('select * from neurosync.audit_log');
      assert.ok(rows.rows.length > 0); assert.ok(rows.rows.every(row => row.actor_uid === a.subject));
      assert.ok(rows.rows.some(row => row.action === 'read'));
      assert.ok(!JSON.stringify(rows.rows).includes('SYNTHETIC_SECRET_BODY'));
    });
    for (const query of ["update neurosync.audit_log set action='forged'", 'delete from neurosync.audit_log', 'truncate neurosync.audit_log']) {
      await assert.rejects(withIdentity(runtime, a, client => client.query(query)), { code: '42501' });
    }
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into neurosync.audit_log(actor_uid,action,table_name,row_id) values ('synthetic-b','read','patients','forged')`)), { code: '42501' });
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into neurosync.audit_log(actor_uid,action,detail) values ('synthetic-a','read','{"phi":"bad"}')`)), { code: '42501' });
  });
  await t.test('temporary table cannot divert SECURITY DEFINER audit writes', async () => {
    await withIdentity(runtime, a, async client => {
      await client.query('create temporary table audit_log (like neurosync.audit_log including defaults)');
      await client.query("insert into neurosync.patients(owner_uid,first_name) values ($1,'Synthetic shadow test')", [a.subject]);
      assert.equal((await client.query('select * from pg_temp.audit_log')).rowCount, 0);
      await client.query('drop table pg_temp.audit_log');
    });
  });
  await t.test('rollback and pool reuse do not leak identity or uncommitted rows', async () => {
    await assert.rejects(withIdentity(runtime, a, async client => {
      await client.query("insert into neurosync.patients(owner_uid,first_name) values ($1,'Synthetic rollback')", [a.subject]);
      throw new Error('rollback requested');
    }), /rollback requested/);
    assert.equal((await owner.query("select * from neurosync.patients where first_name='Synthetic rollback'")).rowCount, 0);
    assert.equal((await runtime.query('select * from neurosync.patients')).rowCount, 0);
    assert.deepEqual((await patients.list(b)).map(row => row.id), [patientB.id]);
    assert.equal((await runtime.query('select * from neurosync.audit_log')).rowCount, 0);
  });
  await t.test('HTTP CRUD is authenticated and cannot cross ownership or reflect sensitive errors', async () => {
    const app = createApp({ patients, verifier, logger: () => {} });
    const call = (path: string, method = 'GET', body?: unknown, token = 'test-a') => app(new Request(`http://localhost${path}`, {
      method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
    assert.equal((await call('/api/patients', 'GET', undefined, 'invalid')).status, 401);
    for (const method of ['GET','PATCH','DELETE']) {
      assert.equal((await call(`/api/patients/${patientB.id}`, method, method === 'PATCH' ? { notes: 'forged' } : undefined)).status, 404);
    }
    assert.equal((await call('/api/patients', 'POST', { first_name: 'Forgery', owner_uid: b.subject })).status, 400);
    const response = await call('/api/patients', 'POST', { first_name: 'Synthetic HTTP' });
    assert.equal(response.status, 201);
    const payload = await response.json() as { data: { id: string } };
    assert.equal((await call(`/api/patients/${payload.data.id}`)).status, 200);
    assert.equal((await call(`/api/patients/${payload.data.id}`, 'PATCH', { notes: 'Synthetic update' })).status, 200);
    assert.equal((await call(`/api/patients/${payload.data.id}`, 'DELETE')).status, 204);
  });
  await t.test('real local password login, server sessions, CSRF, expiry, logout and isolation', async () => {
    const { AuthRouter } = await import('../server/auth/router.js');
    const { hashPassword } = await import('../server/auth/local.js');
    const hash=await hashPassword('synthetic-test-password');
    await owner.query("insert into neurosync_auth.identities(provider,external_subject,owner_uid,password_hash) values ('local','a@example.invalid','synthetic-a',$1)",[hash]);
    const auth=new AuthRouter(runtime,{mode:'local',environment:'development',origin:'http://localhost'});
    const app=createApp({patients,auth,verifier:auth.sessions,logger:()=>{}});
    const login=async (password:string,origin='http://localhost')=>app(new Request('http://localhost/api/auth/login',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({email:'a@example.invalid',password})}));
    assert.equal((await login('wrong-password')).status,401);
    assert.equal((await login('synthetic-test-password','https://attacker.invalid')).status,403);
    const signedIn=await login('synthetic-test-password'); assert.equal(signedIn.status,200);
    const cookies=signedIn.headers.getSetCookie(); assert.equal(cookies.length,2);
    assert.ok(cookies[0]?.includes('HttpOnly'));
    const header=cookies.map(value=>value.split(';')[0]).join('; ');
    const csrf=cookies.find(value=>value.startsWith('neurosync_csrf='))!.split(';')[0]!.split('=')[1]!;
    const call=(path:string,method='GET',body?:unknown,csrfValue=csrf)=>app(new Request('http://localhost'+path,{method,headers:{cookie:header,origin:'http://localhost','content-type':'application/json','x-csrf-token':csrfValue},...(body===undefined?{}:{body:JSON.stringify(body)})}));
    const me=await call('/api/auth/me'); assert.equal(me.status,200); assert.equal((await me.json()).id,'synthetic-a');
    assert.equal((await call('/api/patients/'+patientB.id)).status,404);
    assert.equal((await call('/api/auth/me','PATCH',{role:'admin'})).status,400);
    assert.equal((await call('/api/auth/me','PATCH',{full_name:'Updated synthetic'},'invalid')).status,403);
    assert.equal((await call('/api/auth/me','PATCH',{tos_accepted_at:new Date().toISOString()})).status,200);
    assert.equal((await call('/api/auth/logout','POST',{})).status,200);
    assert.equal((await call('/api/auth/me')).status,401);
    await assert.rejects(runtime.query('select * from neurosync_auth.sessions'),{code:'42501'});
    const second=await login('synthetic-test-password');assert.equal(second.status,200);
    await owner.query("update neurosync_auth.sessions set expires_at=now()-interval '1 second'");
    assert.equal((await app(new Request('http://localhost/api/auth/me',{headers:{cookie:second.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')}}))).status,401);
    assert.throws(()=>new AuthRouter(runtime,{mode:'local',environment:'production',origin:'https://example.invalid'}));
  });

  await t.test('owned record mappings, note immutability, retrieval and AI persistence', async () => {
    const { Records } = await import('../server/compat/records.js');
    const { Knowledge } = await import('../server/domain/knowledge.js');
    const { AIGateway } = await import('../server/ai/gateway.js');
    const { Conversations } = await import('../server/domain/conversations.js');
    const { Soap } = await import('../server/domain/soap.js');
    const { randomUUID } = await import('node:crypto');
    const records = new Records(runtime);
    const goal=(await records.execute(a,{table:'patient_goals',action:'insert',data:{patient_id:patientA.id,title:'Synthetic goal',status:'achieved'}}))[0]!;
    assert.equal(goal.title,'Synthetic goal'); assert.equal(goal.status,'achieved');
    await assert.rejects(records.execute(a,{table:'patient_goals',action:'insert',data:{patient_id:patientB.id,title:'Forged parent'}}),{code:'23503'});
    const billing=(await records.execute(a,{table:'patient_billing',action:'insert',data:{fee:'125.25',insurance_paid:'100.00'}}))[0]!;
    assert.equal(billing.fee,125.25);assert.equal(billing.amount_cents,12525);
    await records.execute(b,{table:'knowledge_base',action:'insert',data:{title:'Other tenant',content:'SYNTHETIC_PRIVATE_RARETERM other tenant only'}});
    const knowledge=new Knowledge(runtime);
    assert.deepEqual(await knowledge.retrieve(a,'SYNTHETIC_PRIVATE_RARETERM'),[]);
    const entry=(await records.execute(a,{table:'knowledge_base',action:'insert',data:{title:'Owned reference',content:'Synthetic sleep monitoring protocol and sleep assessment.'}}))[0]!;
    assert.equal((await knowledge.retrieve(a,'sleep monitoring'))[0]?.title,'Owned reference');
    let requests=0;
    const output={subjective:'Synthetic supplied history',objective:'Not assessed',assessment:'Draft formulation',risk_assessment:'Not assessed',plan:'Clinician review',icd_codes:'',cpt_codes:''};
    const provider={generate:async(input:{structured:boolean})=>{requests++;return input.structured?JSON.stringify(output):'Synthetic consultation response';}};
    const route={provider,providerName:'synthetic-test',model:'deterministic-test'};
    const gateway=new AIGateway({clinical:route,soap:route});
    const conversations=new Conversations(runtime,gateway);
    const conversation=await conversations.create(a,{});const id=String(conversation.id);
    await assert.rejects(conversations.get(b,id),{status:404});
    const message={content:'Synthetic sleep question',request_id:randomUUID()};
    const answered=await conversations.add(a,id,message);assert.equal(answered.messages.length,2);
    assert.equal((await conversations.add(a,id,message)).messages.length,2);assert.equal(requests,1);
    const another=await conversations.create(a,{});
    await assert.rejects(conversations.add(a,String(another.id),message),{status:409});
    assert.equal(requests,1,'request ID cannot bypass quota in a different conversation');
    const soap=new Soap(runtime,gateway);
    await assert.rejects(soap.generate(a,{transcript:'Synthetic',patient_id:patientB.id,request_id:randomUUID()}),{status:404});
    assert.equal(requests,1,'foreign parent rejected before provider invocation');
    const input={transcript:'Synthetic supplied facts',session_id:conversation.metadata.session_id,request_id:randomUUID()};
    const note=await soap.generate(a,input);assert.equal(note.subjective,output.subjective);
    assert.equal((await soap.generate(a,input)).id,note.id);assert.equal(requests,2);
    await assert.rejects(soap.generate(a,{...input,transcript:'Different payload'}),{status:409});
    await records.execute(a,{table:'patient_notes',action:'update',query:{id:note.id},data:{status:'finalized'}});
    await assert.rejects(records.execute(a,{table:'patient_notes',action:'update',query:{id:note.id},data:{plan:'overwrite'}}),{status:409});
    const removableInput={transcript:'Synthetic removable draft',request_id:randomUUID()};
    const removable=await soap.generate(a,removableInput);
    await records.execute(a,{table:'patient_notes',action:'delete',query:{id:removable.id}});
    await assert.rejects(soap.generate(a,removableInput),{status:409});
    const bad=new Soap(runtime,new AIGateway({soap:{...route,provider:{generate:async()=>'{"invalid":true}'}}}));
    const failedId=randomUUID();await assert.rejects(bad.generate(a,{transcript:'Synthetic',request_id:failedId}),{status:503});
    assert.equal((await owner.query('select status from neurosync.usage_events where request_id=$1',[failedId])).rows[0].status,'released');
    assert.equal((await owner.query('select count(*)::int as n from neurosync.patient_notes where generation_request_id=$1',[failedId])).rows[0].n,0);
    await records.execute(a,{table:'knowledge_base',action:'delete',query:{id:entry.id}});
    assert.deepEqual(await knowledge.retrieve(a,'sleep monitoring'),[]);
  });


  await t.test('concurrent reservations cannot exceed the monthly plan limit',async()=>{
   const {Usage}=await import('../server/plans/usage.js');const {randomUUID}=await import('node:crypto');
   const concurrent=new Pool({connectionString:runtimeUrl,max:2});
   try{const usage=new Usage(concurrent);const before=await usage.subscription(a);assert.equal(before.soap_notes_used,2);
    const results=await Promise.allSettled([1,2].map(()=>withIdentity(concurrent,a,client=>usage.reserve(client,a,randomUUID(),'soap_note'))));
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    const rejection=results.find(result=>result.status==='rejected');assert.ok(rejection?.status==='rejected');assert.equal(rejection.reason.code,'limit_reached');
    assert.equal((await usage.subscription(a)).soap_notes_used,3);
   }finally{await concurrent.end();}
  });
  await t.test('commerce authority cannot read clinical data and runtime cannot write entitlements',async()=>{
   const client=await owner.connect();
   try{await client.query('begin');await client.query('set local role neurosync_billing');
    await assert.rejects(client.query('select * from neurosync.patients'),{code:'42501'});
   }finally{await client.query('rollback');client.release();}
   await assert.rejects(withIdentity(runtime,a,client=>client.query("insert into neurosync.user_subscriptions(owner_uid,plan) values($1,'enterprise')",[a.subject])),{code:'42501'});
  });

  await t.test('Stripe signatures, event replay and canonical out-of-order state are enforced',async()=>{
   const {default:Stripe}=await import('stripe');const {Billing}=await import('../server/billing/service.js');
   await owner.query('alter role neurosync_billing login');
   const url=new URL(runtimeUrl!);url.username='neurosync_billing';const commerce=new Pool({connectionString:url.href});
   try{
    await withIdentity(runtime,a,client=>client.query("insert into neurosync.billing_customers(owner_uid,stripe_customer_id) values($1,'cus_synthetic')",[a.subject]));
    let canonicalStatus='active';let retrieveCount=0;
    const transport:typeof fetch=async()=>{retrieveCount++;return Response.json({id:'sub_synthetic',object:'subscription',customer:'cus_synthetic',status:canonicalStatus,items:{data:[{price:{id:'price_synthetic'}}]}});};
    const stripe=new Stripe('sk_test_synthetic',{httpClient:Stripe.createFetchHttpClient(transport),maxNetworkRetries:0});
    const billing=new Billing(runtime,commerce,stripe,'https://example.invalid','whsec_synthetic',{professional:'price_synthetic'});
    const payload=JSON.stringify({id:'evt_synthetic_1',type:'customer.subscription.updated',data:{object:{id:'sub_synthetic',status:'past_due'}}});
    const signature=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_synthetic'});
    const send=(body:string,header:string)=>billing.webhook(new Request('https://example.invalid/api/billing/webhook',{method:'POST',headers:{'stripe-signature':header},body}));
    await assert.rejects(send(payload,'invalid'),{status:400});assert.equal(retrieveCount,0);
    assert.equal((await send(payload,signature))?.status,200);assert.equal(retrieveCount,1);
    assert.equal((await owner.query('select status from neurosync.user_subscriptions where owner_uid=$1',[a.subject])).rows[0].status,'active','canonical state wins over event payload');
    assert.equal((await send(payload,signature))?.status,200);assert.equal(retrieveCount,1,'replayed event is not reprocessed');
    canonicalStatus='canceled';const older=payload.replace('evt_synthetic_1','evt_synthetic_old');
    await send(older,stripe.webhooks.generateTestHeaderString({payload:older,secret:'whsec_synthetic'}));
    assert.equal((await owner.query('select status from neurosync.user_subscriptions where owner_uid=$1',[a.subject])).rows[0].status,'canceled');
   }finally{await commerce.end();await owner.query('alter role neurosync_billing nologin');}
  });

});
