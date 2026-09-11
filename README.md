# NeuroSync

Owned React/Vite clinical workspace with a TypeScript API, PostgreSQL authorization and persistence, provider-neutral AI orchestration, and replaceable authentication/commerce adapters.

Production: https://neurosync-navy.vercel.app

The owned runtime is deployed. **Live email authentication, AI and payments still require account/provider activation.** This repository does not claim healthcare regulatory compliance. See [production status](docs/PRODUCTION_STATUS.md) and [feature parity](docs/FEATURE_PARITY_MATRIX.md) before treating a workflow as validated.

## Development and checks

Use Node 24 and PostgreSQL 17. Copy `.env.example` to ignored `.env.local`; configure separate runtime and offline migration connections. No Base44 credentials are required.

```sh
npm ci
npm run db:migrate
npm run dev:api
# In another terminal:
npm run dev
```

```sh
npm run build
npm run lint
npm run typecheck
npm test
```

`npm test` uses a private, temporary synthetic PostgreSQL cluster and refuses existing or remote database targets. Full setup: [local development](docs/LOCAL_DEVELOPMENT.md). Configuration: [environment variables](docs/ENVIRONMENT_VARIABLES.md).

## Ownership boundaries

- `server/`: authentication, owned API, transactions, records, conversations, SOAP, knowledge and billing.
- `server/ai/`: versioned prompts, runtime output schemas, provider adapters and vector boundary.
- `db/migrations/`: authoritative additive SQL; original migrations remain immutable. Deployed schemas are `neurosync`, `neurosync_auth` and `neurosync_migrations`.
- `src/`: existing React/Vite product and same-origin owned API client.
- `api/`: Vercel Fetch entry point; `server/index.ts` is the portable Node HTTP entry point.
- `tests/`: actual PostgreSQL isolation, HTTP/session tests and deterministic AI/Stripe fixtures.
- `docs/`: baseline, architecture, extraction inventory, decisions and verification evidence.

Historical `base44/` source remains for migration provenance and is excluded from production deployment. Neither the SDK nor the build plugin is installed. Browser and backend runtime source contain no Base44 dependency.
