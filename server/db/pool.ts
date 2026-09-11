import { Pool, types, type PoolClient } from 'pg';

// DATE is a calendar date, not a timestamp in the server timezone.
types.setTypeParser(1082, value => value);

export function createPool(connectionString: string): Pool {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const ca = process.env.DATABASE_SSL_CA_BASE64;
  if (ca) { const url=new URL(connectionString); url.searchParams.delete('sslmode'); connectionString=url.href; }
  return new Pool({ connectionString, ...(ca ? {ssl:{ca:Buffer.from(ca,'base64').toString('utf8'),rejectUnauthorized:true}} : {}), max: 5, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000, statement_timeout: 10000, application_name: 'neurosync-api' });
}
export async function assertRuntimeRole(client: PoolClient): Promise<void> {
  // Reject owner membership too: NOINHERIT is not a barrier to SET ROLE.
  const { rows } = await client.query<{ safe: boolean }>(`
    select r.rolname = 'app_rw' and not r.rolsuper and not r.rolbypassrls
      and not r.rolcreaterole and not r.rolcreatedb and not r.rolreplication
      and not exists (select 1 from pg_auth_members m where m.member = r.oid)
      and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                      where c.relowner=r.oid and n.nspname='neurosync')
      and not exists (select 1 from pg_database d where d.datname=current_database() and d.datdba=r.oid)
      and not has_schema_privilege(current_user, 'neurosync', 'CREATE') as safe
    from pg_roles r where r.rolname = current_user`);
  if (!rows[0]?.safe) throw new Error('Unsafe database runtime role');
  const { rows: tables } = await client.query<{ safe: boolean }>(`
    select count(*) = 18 and bool_and(c.relrowsecurity and c.relforcerowsecurity) as safe
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='neurosync' and c.relname = any($1::text[])`, [[
      'clinicians','patients','patient_notes','patient_medications','patient_appointments',
      'patient_sessions','patient_goals','patient_billing','knowledge_base','user_subscriptions',
      'conversations','messages','usage_events','note_versions','documents','knowledge_chunks','billing_customers','document_versions',
    ]]);
  if (!tables[0]?.safe) throw new Error('Required database isolation is missing');
}
