import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/api/app.js';
import { Identity, type IdentityVerifier } from '../server/auth/identity.js';
import { RateLimit } from '../server/security/rate-limit.js';
import { patientCreate } from '../server/domain/patient.js';
import type { SafeEvent } from '../server/security/log.js';

// Test-only verifier. No import from tests exists in server code.
const verifier: IdentityVerifier = { verify: async request => request.headers.get('authorization') === 'Bearer synthetic'
  ? { subject: 'synthetic-a' } : null };
const repositories = {
  list: async () => [], get: async () => null, create: async () => { throw new Error('synthetic PHI must not escape'); },
  update: async () => null, delete: async () => false,
};
const request = (path = '/api/patients', options: RequestInit = {}) => new Request(`http://localhost${path}`, options);
const noLog = () => {};

test('default authentication denies missing identity and forged browser headers', async () => {
  let called = false;
  const app = createApp({ patients: { ...repositories, list: async () => { called = true; return []; } }, logger: noLog });
  const response = await app(request('/api/patients', { headers: { 'x-user-id': 'synthetic-a', 'x-role': 'admin', authorization: 'Bearer invented' } }));
  assert.equal(response.status, 401); assert.equal(called, false);
});
test('health is liveness-only and does not access patient storage', async () => {
  const response = await createApp({ patients: repositories, logger: noLog })(request('/api/health'));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok', service: 'neurosync-api' });
});
test('safe errors and logs never include upstream content, query text or headers', async () => {
  const logs: SafeEvent[] = [];
  const app = createApp({ patients: repositories, verifier, logger: event => logs.push(event) });
  const response = await app(request('/api/patients', { method: 'POST', headers: { authorization: 'Bearer synthetic', 'content-type': 'application/json' }, body: '{"first_name":"synthetic private name"}' }));
  assert.equal(response.status, 500);
  const body = await response.text(); assert.ok(!body.includes('PHI')); assert.ok(!JSON.stringify(logs).includes('private name'));
  assert.deepEqual(Object.keys(logs[0]!).sort(), ['event','requestId','status']);
});
test('request size and media restrictions, invalid IDs, strict pagination', async () => {
  const app = createApp({ patients: repositories, verifier, logger: noLog });
  const headers = { authorization: 'Bearer synthetic', 'content-type': 'application/json' };
  assert.equal((await app(request('/api/patients', { method: 'POST', headers, body: 'x'.repeat(32769) }))).status, 413);
  assert.equal((await app(request('/api/patients', { method: 'POST', headers: { authorization: 'Bearer synthetic' }, body: '{}' }))).status, 415);
  assert.equal((await app(request('/api/patients', { method: 'POST', headers, body: '{' }))).status, 400);
  for (const path of ['/api/patients/bad','/api/patients?owner_uid=forged','/api/patients?limit=1000','/api/patients?offset=-1']) {
    assert.equal((await app(request(path, { headers }))).status, 400);
  }
});
test('patient schemas reject owner fields, arbitrary updates, impossible dates and invalid email', () => {
  for (const data of [{ first_name: 'Synthetic', owner_uid: 'b' }, { first_name: 'Synthetic', user_id: 'b' },
    { first_name: 'Synthetic', role: 'admin' }, { first_name: 'Synthetic', dob: '2025-02-30' }, { first_name: 'Synthetic', email: 'broken' }]) {
    assert.equal(patientCreate.safeParse(data).success, false);
  }
});
test('rate limit fails closed at capacity and resets after expiration', async () => {
  const limiter = new RateLimit(1, 10);
  assert.equal(limiter.allow('a', 0), true); assert.equal(limiter.allow('a', 1), false); assert.equal(limiter.allow('a', 10), true);
  const app = createApp({ patients: repositories, verifier, logger: noLog, limiter: new RateLimit(1) });
  assert.equal((await app(request('/api/patients', { headers: { authorization: 'Bearer synthetic' } }))).status, 200);
  assert.equal((await app(request('/api/patients', { headers: { authorization: 'Bearer synthetic' } }))).status, 429);
});
test('plain objects cannot impersonate verified identity at repository boundary', () => {
  assert.throws(() => Identity.require({ subject: 'a' }));
  assert.throws(() => Identity.require(Object.create(Identity.prototype)));
  assert.throws(() => Identity.require(undefined));
});

test('real HTTP transport serves health and rejects oversized bodies without credentials', async t => {
  const { createHttpServer } = await import('../server/api/http.js');
  const { request: httpRequest } = await import('node:http');
  const server = createHttpServer(createApp({ patients: repositories, logger: noLog }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  }));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok');
  assert.equal((await fetch(`${origin}/api/patients`, { headers: { 'x-user-id': 'a' } })).status, 401);
  const oversized = await new Promise<number>(resolve => {
    const req = httpRequest(`${origin}/api/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, response => {
      response.resume(); resolve(response.statusCode ?? 0);
    });
    req.on('error', () => resolve(0)); req.end('x'.repeat(40000));
  });
  assert.equal(oversized, 413);
});
