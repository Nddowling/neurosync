import { readdir,readFile,writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {renderMigration} from '../server/db/migrate.js';
const directory=new URL('../db/migrations/',import.meta.url);
let sql=`select pg_advisory_xact_lock(723451918);
create schema neurosync;
set local search_path=neurosync,pg_catalog;
create schema neurosync_migrations;
revoke all on schema neurosync_migrations from public;
create table neurosync_migrations.schema_migrations(name text primary key,sha256 text not null,applied_at timestamptz not null default now());\n`;
for(const name of (await readdir(directory)).filter(n=>/^\d{4}_[a-z0-9_]+\.sql$/.test(n)).sort()){
 const source=await readFile(new URL(name,directory),'utf8');
 sql+=renderMigration(source)+`\ninsert into neurosync_migrations.schema_migrations(name,sha256) values('${name}','${createHash('sha256').update(source).digest('hex')}');\n`;
}
await writeFile(new URL('../.local/managed-migration.sql',import.meta.url),sql);
console.log('Rendered fresh NeuroSync schema migration; refuses an existing namespace.');
