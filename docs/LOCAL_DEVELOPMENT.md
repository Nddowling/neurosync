# Local development

The React/Vite frontend and owned API require no Base44 credentials. Production runs on Node 24; local baseline was reproduced on Node 26.7.0. Use Node 24 for closest deployment parity.

1. Run `npm ci`.
2. Install PostgreSQL 17 (macOS: `brew install postgresql@17`). `npm test` creates and destroys a private Unix-socket-only temporary cluster with synthetic data. It refuses existing/remote database targets. Set `PG_BIN` if needed.
3. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`. Full typecheck now passes; historical error counts remain in BASELINE_STATUS.md. `test:unit` alone is not the database isolation gate.
4. To run the app, copy `.env.example` to ignored `.env.local`. Use an owned local PostgreSQL database and separate migration/runtime identities. Optional Docker: set POSTGRES_PASSWORD, then `docker compose --env-file .env.local up -d postgres`. No additional cloud/staging app is required.
5. Run `npm run db:migrate` using MIGRATION_DATABASE_URL. The checksum ledger refuses unknown existing schemas and changed historical migrations. Provision app_rw's password with the database administrator's interactive password command; never put it into shell history.
6. Set DATABASE_URL to app_rw. Run `npm run dev:api` and `npm run dev`; Vite proxies `/api` to 127.0.0.1:3001. APP_ORIGIN must match the Vite origin exactly.

Production Supabase uses the `neurosync`, `neurosync_auth` and `neurosync_migrations` schemas in the existing database. Local migrations use the same namespaces.

## Authentication

Supabase and OIDC adapters require real external provider configuration. Approved identities are provisioned offline; the runtime cannot create clinicians or grant itself roles. `scripts/provision-user.ts <email>` creates Supabase email invitation eligibility with MIGRATION_DATABASE_URL; it sends no email.

For local-only password testing, AUTH_MODE=local is accepted only when NODE_ENV=development and APP_ORIGIN is localhost/127.0.0.1. Use `hashPassword()` in server/auth/password.ts to generate a scrypt hash, then insert a clinician and a `local` identity with that hash using the offline operator connection. Never deploy this mode. The automated test suite exercises this process without creating persistent development accounts.

## AI, knowledge and commerce

Unconfigured providers return service_unavailable. Automated tests inject deterministic provider fixtures; the production code never serves fixtures. PDF extraction and default lexical knowledge retrieval run without external AI credentials. Models and keys are configured centrally as documented in ENVIRONMENT_VARIABLES.md.

Stripe uses separate commerce authority and credentials. Do not grant the ordinary API role subscription-write privileges. Use provider test credentials and signed webhook fixtures when validating billing; no live charges are required for tests.

## Operational limits

Per-process request throttles supplement provider limits but are not a distributed perimeter. Uploads are bounded and parsed but are not malware-scanned or OCR'd. Local lexical embeddings are not learned semantic search. Backups, restore drills, retention, external identity disablement propagation and healthcare deployment agreements remain explicit operator responsibilities; security controls do not establish compliance.

Production Supabase mode also accepts operator-provisioned `password` identities through `/api/auth/login`. Password hashes use the shared scrypt helper; this path issues normal secure production sessions and does not enable local development mode. Public password registration is not enabled.
