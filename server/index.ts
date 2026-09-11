import { createHttpServer } from './api/http.js';
import { createPool, assertRuntimeRole } from './db/pool.js';
import { Patients } from './repositories/patients.js';
import { createApp } from './api/app.js';

const pool = createPool(process.env.DATABASE_URL ?? '');
pool.on('error', () => process.stderr.write('Database pool unavailable\n'));
const connection = await pool.connect();
try { await assertRuntimeRole(connection); } finally { connection.release(); }
const app = createApp({ patients: new Patients(pool) });
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const server = createHttpServer(app);
server.listen(port, '127.0.0.1', () => process.stdout.write(`NeuroSync foundation API listening on port ${port}; authentication disabled pending adapter\n`));
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => {
  server.close(() => { void pool.end(); });
  server.closeIdleConnections();
});
