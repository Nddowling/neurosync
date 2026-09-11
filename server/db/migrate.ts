import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

export async function migrate(pool: Pool, directory = new URL('../../db/migrations/', import.meta.url)): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('BEGIN');
    await client.query("select pg_advisory_xact_lock(723451918)");
    await client.query('create schema if not exists migration_private');
    await client.query('revoke all on schema migration_private from public');
    await client.query(`create table if not exists migration_private.schema_migrations (
      name text primary key, sha256 text not null, applied_at timestamptz not null default now())`);
    // Do not silently adopt existing databases with unknown migration provenance.
    const count = await client.query<{ count: string }>('select count(*) from migration_private.schema_migrations');
    const existing = await client.query<{ present: boolean }>("select to_regclass('public.patients') is not null as present");
    if (count.rows[0]?.count === '0' && existing.rows[0]?.present) {
      throw new Error('Existing schema requires reviewed migration-ledger adoption');
    }
    const files = (await readdir(directory)).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
    const recorded = await client.query<{ name: string; sha256: string }>('select name, sha256 from migration_private.schema_migrations order by name');
    if (recorded.rows.some((row, i) => files[i] !== row.name)) throw new Error('Migration history is not a prefix of available files');
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const previous = recorded.rows.find(row => row.name === name);
      if (previous) {
        if (previous.sha256 !== hash) throw new Error(`Migration checksum mismatch: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('insert into migration_private.schema_migrations (name, sha256) values ($1,$2)', [name, hash]);
      applied.push(name);
    }
    await client.query('COMMIT');
    return applied;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
