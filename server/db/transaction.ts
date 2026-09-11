import type { Pool, PoolClient } from 'pg';
import { Identity } from '../auth/identity.js';
import { assertRuntimeRole } from './pool.js';

export async function withIdentity<T>(pool: Pool, identity: Identity,
  work: (client: PoolClient) => Promise<T>): Promise<T> {
  Identity.require(identity);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    await assertRuntimeRole(client);
    // Both values reset explicitly. Parameterization prevents SQL injection in subjects.
    await client.query("select set_config('app.uid', $1, true), set_config('app.role', '', true)", [identity.subject]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = true; }
    throw error;
  } finally {
    client.release(discard);
  }
}
