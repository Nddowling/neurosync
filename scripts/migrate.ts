import { createPool } from '../server/db/pool.js';
import { migrate } from '../server/db/migrate.js';
const pool = createPool(process.env.MIGRATION_DATABASE_URL ?? '');
try {
  const files = await migrate(pool);
  process.stdout.write(files.length ? `Applied: ${files.join(', ')}\n` : 'Migrations up to date\n');
} catch {
  process.stderr.write('Migration failed. Inspect schema provenance and migration configuration in an authorized environment.\n');
  process.exitCode = 1;
} finally { await pool.end(); }
