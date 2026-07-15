# NeuroSync database (Cloud SQL / PostgreSQL)

This is the **PHI store**. It runs on **Cloud SQL for PostgreSQL** under the Google
Cloud BAA. Isolation between clinicians is enforced by the database itself via
Row-Level Security — not just application code.

## Migrations

Apply in order, as the **owner/migration** role (not `app_rw`):

```
0001_schema.sql   -- tables, indexes, updated_at triggers
0002_rls.sql      -- app_rw role + Row-Level Security policies
0003_audit.sql    -- append-only audit_log + write-triggers
```

e.g. `psql "$MIGRATION_DATABASE_URL" -f db/migrations/0001_schema.sql` (repeat per file),
or via the Cloud SQL Auth Proxy. The Terraform in `/infra` provisions the instance;
these run against it once it exists.

## The security contract (read this before touching the API)

1. **The API connects as `app_rw`** — a non-owner role, so RLS applies to it. Its
   password lives in Secret Manager, never in code.
2. **Every request transaction must set the identity** before any query:

   ```sql
   SET LOCAL app.uid = '<Identity Platform sub>';   -- required
   SET LOCAL app.role = 'admin';                     -- only for admin users
   ```

   `SET LOCAL` is transaction-scoped, so it can't leak across pooled connections.
3. **If `app.uid` is unset, every policy fails closed** (`current_setting(...,true)`
   returns NULL, which never matches `owner_uid`) → zero rows. A missing identity can
   never return another clinician's data.
4. **`owner_uid` is stamped server-side** from the verified JWT on insert — never
   trusted from the client (mirrors the safe pattern the Base44 function already used).

## Audit trail

- **Writes** (insert/update/delete) on PHI tables are logged automatically by trigger
  into `audit_log`, recording *which columns changed* — never their values, so the
  trail carries no PHI.
- **Reads** are logged by the API (Postgres can't trigger on SELECT): the backend
  writes a `read` row per PHI fetch.
- `audit_log` is append-only to `app_rw` (INSERT/SELECT only; no UPDATE/DELETE).

## Note on encryption

Cloud SQL encrypts at rest by default; `/infra` additionally configures a
customer-managed key (CMEK) and enforces TLS in transit. Field-level encryption isn't
used because it would break search/indexing; at-rest + CMEK + RLS + TLS + audit is the
baseline. Revisit if a specific column ever needs sealing beyond that.
