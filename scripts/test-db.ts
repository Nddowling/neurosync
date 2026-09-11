import { mkdtemp, mkdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';

const candidates = [process.env.PG_BIN, '/opt/homebrew/opt/postgresql@17/bin', ...(process.env.PATH ?? '').split(delimiter)].filter((path): path is string => !!path);
let bin: string | undefined;
for (const path of candidates) {
  try { await access(join(path, 'initdb')); await access(join(path, 'pg_ctl')); bin = path; break; } catch { /* try next installed path */ }
}
if (!bin) throw new Error('Install PostgreSQL 17+ and set PG_BIN to its bin directory. Tests use a new synthetic cluster only.');
const root = await mkdtemp(join(tmpdir(), 'neurosync-test-'));
const data = join(root, 'data');
const socket = join(root, 'socket');
await mkdir(socket, { mode: 0o700 });
let started = false;
function command(name: string, args: string[]) {
  const result = spawnSync(join(bin!, name), args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr || 'PostgreSQL tools unavailable'}`);
}
try {
  command('initdb', ['-D', data, '-U', 'test_owner', '--auth-local=trust', '--auth-host=reject', '--encoding=UTF8', '--locale=C']);
  command('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-o', `-k ${socket} -c listen_addresses=''`, '-w', 'start']);
  started = true;
  command('createdb', ['-h', socket, '-U', 'test_owner', 'neurosync_test']);
  const database = `postgresql://app_rw@localhost/neurosync_test?host=${encodeURIComponent(socket)}`;
  const migration = `postgresql://test_owner@localhost/neurosync_test?host=${encodeURIComponent(socket)}`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'tests/api.test.ts', 'tests/ai.test.ts', 'tests/database.test.ts'], {
    stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: database, TEST_MIGRATION_DATABASE_URL: migration },
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (started) command('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  await rm(root, { recursive: true, force: true });
}
