# Local development — foundation milestone

The owned backend and tests require no Base44 credentials. The existing UI has **not** been cut over; end-to-end local independence is not yet achieved.

1. `npm ci` (baseline Node 26.7.0; deployment Node version must be pinned/verified later).
2. Install PostgreSQL 17 locally. On macOS: `brew install postgresql@17`. Set `PG_BIN` if PostgreSQL executables are not on PATH or in `/opt/homebrew/opt/postgresql@17/bin`.
3. `npm test` creates a private temporary PostgreSQL cluster, applies migrations, tests synthetic data, and stops/removes that cluster. It never uses DATABASE_URL or an existing database. No Docker, credentials, cloud services or PHI are required. The test harness uses a Unix socket in a private temporary directory, with TCP connections disabled. Windows needs a Linux/WSL environment for this harness.
4. `npm run typecheck:server` checks the new code with strict settings. `npm run typecheck` also runs the original frontend check; its 381 pre-existing errors remain visible. `npm run lint` similarly retains 16 pre-existing UI errors. `npm run test:unit` runs only HTTP/schema tests without PostgreSQL and is **not** the isolation gate.

## Run the foundation API

Use a separate **synthetic local** database. Copy `.env.example` to `.env.local`; provide private connection credentials via URLs or `.pgpass`. The API uses DATABASE_URL as app_rw; migrations use MIGRATION_DATABASE_URL as the owner. Never use the migration identity to run the API.

Optional PostgreSQL container: set a private POSTGRES_PASSWORD in .env.local, then `docker compose --env-file .env.local up -d postgres`. No container/cloud was started by the migration work. The Compose volume persists; do not delete a volume containing real data. The local owner role is neurosync_migrator; the API still uses app_rw. Provision its password separately using psql's interactive `\password app_rw` as the local owner **after** migrations. Do not put a password into a shell command or commit it.

Run `npm run db:migrate` to apply pending SQL with an atomic, advisory-locked checksum ledger. This refuses to adopt an existing untracked schema: reconcile deployed schema/provenance before marking migrations applied. It never auto-imports or deletes records. Additive tenant constraints can reject inconsistent existing relationships; repair must be planned before real-data migration.

Run `npm run dev:api`. The foundation listener binds only to 127.0.0.1:3001. `GET /api/health` reports process liveness. **All patient routes return 401 until a verified auth adapter is wired in phase 4.** There is no magic test-user header in production code. Tests inject a verifier privately and seed synthetic clinicians using the migration role; normal runtime cannot create clinicians, assign roles or change subscriptions.

`npm run dev` still starts the legacy Vite frontend. These commands are deliberately separate until the facade and authentication contracts have been implemented. No local auth, AI or payment simulation is presented as real functionality.

## Runtime/security limits

Current request guard: 32 KiB bodies, bounded SQL/pagination, API validation, no-store/security headers, generic errors and allowlisted completion logging. Rate limiting is per process/per verified subject, not yet a distributed or anonymous perimeter control. HTTPS termination, verified auth sessions/CSRF, deployment connection TLS, distributed limits and readiness checks remain release work. Server code is not a production-healthcare readiness claim.

The database migration uses FORCE RLS on clinical tables. A non-superuser migration owner may need explicitly approved provisioning/migration policies or a separate privileged maintenance process for data operations. Routine app_rw must remain unprivileged. Audit trigger owner bypass is narrow and intentional; the runtime has no such bypass.
