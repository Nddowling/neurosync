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
    const result = await owner.query(`select has_table_privilege('app_rw','public.audit_log','UPDATE') as can_update,
      has_table_privilege('app_rw','public.audit_log','DELETE') as can_delete,
      (select relrowsecurity from pg_class where oid='public.audit_log'::regclass) as rls`);
    assert.deepEqual(result.rows[0], { can_update: true, can_delete: true, rls: false });
  });
  assert.deepEqual(await migrate(owner), ['0004_runtime_security.sql']);
  await owner.query(`insert into public.clinicians(uid,email) values
    ('synthetic-a','a@example.invalid'),('synthetic-b','b@example.invalid')`);
  const a = await identify('test-a'); const b = await identify('test-b');
  const patients = new Patients(runtime);
  const patientA = await patients.create(a, { first_name: 'Synthetic A', dob: '2000-02-29' });
  const patientB = await patients.create(b, { first_name: 'Synthetic B' });

  await t.test('migration replay is no-op, checksum changes rejected atomically', async () => {
    assert.deepEqual(await migrate(owner), []);
    const name = '0004_runtime_security.sql';
    await copyFile(new URL(`../db/migrations/${name}`, import.meta.url), new URL(name, directory));
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
      await assert.rejects(client.query('select * from public.patients'), { code: '42501' });
      await client.query('reset row_security');
      await assert.rejects(client.query('create table public.unsafe(id integer)'), { code: '42501' });
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
      assert.equal((await runtime.query(`select * from public.${table}`)).rowCount, 0, table);
    }
    await assert.rejects(patients.list({ subject: 'synthetic-a' } as Identity), /unauthorized/);
  });
  await t.test('forged owner fields and SQL injection subjects cannot grant access', async () => {
    await assert.rejects(patients.create(a, { first_name: 'Forgery', owner_uid: 'synthetic-b' }));
    await assert.rejects(patients.update(a, patientA.id, { owner_uid: 'synthetic-b' }));
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into public.patients(owner_uid,first_name) values ('synthetic-b','forged')`)), { code: '42501' });
    await assert.rejects(withIdentity(runtime, a, client => client.query(`update public.patients set owner_uid='synthetic-b' where id=$1`, [patientA.id])), { code: '42501' });
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
      const row = await withIdentity(runtime, b, client => client.query(`insert into public.${table}(owner_uid,patient_id,${fields}) values ($1,$2,$3) returning id`, [b.subject, patientB.id, value]));
      const id: string = row.rows[0].id;
      await withIdentity(runtime, a, async client => {
        assert.equal((await client.query(`select * from public.${table} where id=$1`, [id])).rowCount, 0);
        assert.equal((await client.query(`update public.${table} set ${fields}=$2 where id=$1`, [id, 'forged'])).rowCount, 0);
        assert.equal((await client.query(`delete from public.${table} where id=$1`, [id])).rowCount, 0);
      });
      await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into public.${table}(owner_uid,patient_id,${fields}) values ($1,$2,$3)`, [a.subject, patientB.id, value])), { code: '23503' });
      const own = await withIdentity(runtime, a, client => client.query(`insert into public.${table}(owner_uid,patient_id,${fields}) values ($1,$2,$3) returning id`, [a.subject, patientA.id, value]));
      await assert.rejects(withIdentity(runtime, a, client => client.query(`update public.${table} set patient_id=$1 where id=$2`, [patientB.id, own.rows[0].id])), { code: '23503' });
    });
  }
  await t.test('clinical notes cannot link to another clinician session', async () => {
    const session = await withIdentity(runtime, b, client => client.query('select id from public.patient_sessions limit 1'));
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into public.patient_notes(owner_uid,session_id) values ($1,$2)`, [a.subject, session.rows[0].id])), { code: '23503' });
  });
  await t.test('knowledge content isolation and audit coverage', async () => {
    const kb = await withIdentity(runtime, b, client => client.query(`insert into public.knowledge_base(owner_uid,title,content) values ($1,'Synthetic source','SYNTHETIC_SECRET_BODY') returning id`, [b.subject]));
    const id: string = kb.rows[0].id;
    await withIdentity(runtime, a, async client => {
      assert.equal((await client.query('select * from public.knowledge_base where id=$1', [id])).rowCount, 0);
      assert.equal((await client.query("update public.knowledge_base set title='forged' where id=$1", [id])).rowCount, 0);
      assert.equal((await client.query('delete from public.knowledge_base where id=$1', [id])).rowCount, 0);
    });
    await withIdentity(runtime, b, async client => {
      assert.equal((await client.query("select * from public.audit_log where row_id=$1 and table_name='knowledge_base'", [id])).rowCount, 1);
    });
  });
  await t.test('app.role=admin cannot widen access; profiles and subscriptions cannot escalate', async () => {
    await withIdentity(runtime, a, async client => {
      await client.query("select set_config('app.role','admin',true)");
      assert.equal((await client.query('select * from public.patients where id=$1', [patientB.id])).rowCount, 0);
      assert.equal((await client.query("select * from public.clinicians where uid='synthetic-b'")).rowCount, 0);
    });
    await assert.rejects(withIdentity(runtime, a, client => client.query("update public.clinicians set role='admin' where uid=$1", [a.subject])), { code: '42501' });
    await owner.query("insert into public.user_subscriptions(owner_uid) values ('synthetic-a'),('synthetic-b')");
    await withIdentity(runtime, a, async client => {
      assert.equal((await client.query('select * from public.user_subscriptions')).rowCount, 1);
      await client.query("update public.clinicians set full_name='Synthetic clinician' where uid=$1", [a.subject]);
    });
    await assert.rejects(withIdentity(runtime, a, client => client.query("update public.user_subscriptions set plan='enterprise' where owner_uid=$1", [a.subject])), { code: '42501' });
  });
  await t.test('audit is append-only, actor-scoped and excludes clinical values', async () => {
    await patients.get(a, patientA.id);
    await withIdentity(runtime, a, async client => {
      const rows = await client.query('select * from public.audit_log');
      assert.ok(rows.rows.length > 0); assert.ok(rows.rows.every(row => row.actor_uid === a.subject));
      assert.ok(rows.rows.some(row => row.action === 'read'));
      assert.ok(!JSON.stringify(rows.rows).includes('SYNTHETIC_SECRET_BODY'));
    });
    for (const query of ["update public.audit_log set action='forged'", 'delete from public.audit_log', 'truncate public.audit_log']) {
      await assert.rejects(withIdentity(runtime, a, client => client.query(query)), { code: '42501' });
    }
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into public.audit_log(actor_uid,action,table_name,row_id) values ('synthetic-b','read','patients','forged')`)), { code: '42501' });
    await assert.rejects(withIdentity(runtime, a, client => client.query(`insert into public.audit_log(actor_uid,action,detail) values ('synthetic-a','read','{"phi":"bad"}')`)), { code: '42501' });
  });
  await t.test('temporary table cannot divert SECURITY DEFINER audit writes', async () => {
    await withIdentity(runtime, a, async client => {
      await client.query('create temporary table audit_log (like public.audit_log including defaults)');
      await client.query("insert into public.patients(owner_uid,first_name) values ($1,'Synthetic shadow test')", [a.subject]);
      assert.equal((await client.query('select * from pg_temp.audit_log')).rowCount, 0);
      await client.query('drop table pg_temp.audit_log');
    });
  });
  await t.test('rollback and pool reuse do not leak identity or uncommitted rows', async () => {
    await assert.rejects(withIdentity(runtime, a, async client => {
      await client.query("insert into public.patients(owner_uid,first_name) values ($1,'Synthetic rollback')", [a.subject]);
      throw new Error('rollback requested');
    }), /rollback requested/);
    assert.equal((await owner.query("select * from public.patients where first_name='Synthetic rollback'")).rowCount, 0);
    assert.equal((await runtime.query('select * from public.patients')).rowCount, 0);
    assert.deepEqual((await patients.list(b)).map(row => row.id), [patientB.id]);
    assert.equal((await runtime.query('select * from public.audit_log')).rowCount, 0);
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
});
