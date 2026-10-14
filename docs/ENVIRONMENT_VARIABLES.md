# Environment variables

`.env.example` is the current template. All credentials belong only in server/offline configuration; never use `VITE_` for secrets. The browser uses same-origin API calls and HttpOnly session cookies. No Base44 variable is required.

| Variables | Boundary | Purpose |
|---|---|---|
| DATABASE_URL | Web API | Nonowner `app_rw` connection. Supabase production uses the IPv4 transaction pooler. |
| DATABASE_SSL_CA_BASE64 | Database transport | Base64 PEM CA. Certificate and hostname verification stay enabled. |
| MIGRATION_DATABASE_URL | Offline operator only | Schema migrations and clinician invitation provisioning. Never deploy this credential. |
| APP_ORIGIN | Server | Exact permitted browser origin, authentication callback base, checkout return URLs. Production: `https://neurosync-navy.vercel.app`. |
| NODE_ENV, PORT | Server | Production security behavior; local listener port (3001 default). |
| AUTH_MODE | Authentication | `supabase` or `oidc` in production; `local` is restricted to loopback development. |
| SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY | Supabase auth adapter | Public project key is used server-side for PKCE email authentication. No privileged Supabase service-role key is needed by the runtime. |
| OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET | OIDC adapter | Alternative external identity provider. Map approved issuer/subject identities offline. |
| AI_CLINICAL_PROVIDER, AI_CLINICAL_MODEL | AI config | Clinical consultation route. |
| AI_SOAP_PROVIDER, AI_SOAP_MODEL | AI config | Structured note generation route. |
| AI_REFERENCE_PROVIDER, AI_REFERENCE_MODEL | AI config | Medication, diagnostic and CPT reference route. |
| OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY | Provider adapter | Configure only the selected vendors. Models are centralized in server environment settings. |
| BILLING_DATABASE_URL | Commerce adapter | Dedicated `neurosync_billing` login; has no clinical-table access. |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Stripe adapter | Checkout API and raw-body webhook verification. |
| STRIPE_PROFESSIONAL_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID | Stripe adapter | Existing approved recurring prices; browser cannot supply an arbitrary price or return URL. |
| TEST_DATABASE_URL, TEST_MIGRATION_DATABASE_URL | Test harness only | Automatically generated private temporary cluster; rejects existing/remote database targets. |
| POSTGRES_PASSWORD | Optional local Docker | Local development owner password; not used by hosted runtime. |

Blank AI/payment settings leave those operations explicitly unavailable. Do not put fake responses in the production adapter to make readiness appear successful. Supabase's redirect allowlist and email delivery are external settings, not these environment variables.
