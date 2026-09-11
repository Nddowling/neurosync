import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

export async function migrate(pool: Pool, directory = new URL('../../db/migrations/', import.meta.url)): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('BEGIN');
    await client.query("select pg_advisory_xact_lock(723451918)");
    await client.query('create schema if not exists neurosync');
    await client.query('set local search_path = neurosync, pg_catalog');
    await client.query('create schema if not exists neurosync_migrations');
    await client.query('revoke all on schema neurosync_migrations from public');
    await client.query(`create table if not exists neurosync_migrations.schema_migrations (
      name text primary key, sha256 text not null, applied_at timestamptz not null default now())`);
    // Do not silently adopt existing databases with unknown migration provenance.
    const count = await client.query<{ count: string }>('select count(*) from neurosync_migrations.schema_migrations');
    const existing = await client.query<{ present: boolean }>("select to_regclass('neurosync.patients') is not null as present");
    if (count.rows[0]?.count === '0' && existing.rows[0]?.present) {
      throw new Error('Existing schema requires reviewed migration-ledger adoption');
    }
    const files = (await readdir(directory)).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
    const recorded = await client.query<{ name: string; sha256: string }>('select name, sha256 from neurosync_migrations.schema_migrations order by name');
    if (recorded.rows.some((row, i) => files[i] !== row.name)) throw new Error('Migration history is not a prefix of available files');
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const previous = recorded.rows.find(row => row.name === name);
      if (previous) {
        if (previous.sha256 !== hash) throw new Error(`Migration checksum mismatch: ${name}`);
        continue;
      }
      // Historical 0001–0004 are immutable public-schema proposals. Render their
      // namespace at the infrastructure boundary; hashes retain original provenance.
      const rendered = renderMigration(sql);
      await client.query(rendered);
      await client.query('insert into neurosync_migrations.schema_migrations (name, sha256) values ($1,$2)', [name, hash]);
      applied.push(name);
    }
    await client.query('COMMIT');
    return applied;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export function renderMigration(sql: string): string {
  return sql.replace('alter role app_rw nosuperuser nocreatedb nocreaterole noreplication nobypassrls;', () => `do $$ begin
 if exists(select 1 from pg_roles where rolname='app_rw' and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication)) then
 raise exception 'app_rw must already be an unprivileged runtime role'; end if; end $$;`)
    .replace(/\b(from|to)\s+public\b(?!\.)/gi, '$1 PUBLIC')
    .replace(/\bpublic\b/g, 'neurosync').replace(/\bauth_private\b/g, 'neurosync_auth');
}
