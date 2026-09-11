# Environment variables

Never expose server credentials with VITE_. No real values were read or recorded during audit. Existing README examples are vendor templates, not verified deployment settings.

| Variable | Location | Purpose / status |
|---|---|---|
| VITE_BASE44_APP_ID | Legacy browser build | Required legacy app identity |
| VITE_BASE44_APP_BASE_URL | Legacy browser/dev proxy | Hosted API origin |
| VITE_BASE44_FUNCTIONS_VERSION | Legacy browser | Optional hosted function version |
| BASE44_LEGACY_SDK_IMPORTS | Legacy build | Legacy import transformation flag |
| BASE44_APP_ID | Legacy Deno checkout | Commerce metadata; remove |
| SUPABASE_URL | Legacy Deno function | REST service origin |
| SUPABASE_SERVICE_ROLE_KEY | Legacy Deno function secret | Privileged REST access; replace |
| STRIPE_SECRET_KEY | Server only | Commerce adapter, never browser |
| STRIPE_WEBHOOK_SECRET | Server only | Raw webhook signature verification |
| DATABASE_URL | Owned API secret | Non-owner app_rw connection only |
| MIGRATION_DATABASE_URL | Offline migration secret | Owner connection; never runtime |
| TEST_DATABASE_URL / TEST_MIGRATION_DATABASE_URL | Synthetic tests | Explicit isolated database; never production |
| PORT | Owned API | Local port, planned default 3001 |
| NODE_ENV | Server | Environment; production must reject development auth |
| APP_ORIGIN | Server, planned | Allowed origin and checkout/redirect base |
| OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET | Auth adapter, planned | Issuer identity and confidential client |
| AI_CLINICAL_PROVIDER / AI_CLINICAL_MODEL | AI config, planned | Task routing |
| AI_SOAP_PROVIDER / AI_SOAP_MODEL | AI config, planned | SOAP task routing |
| AI_REFERENCE_PROVIDER / AI_REFERENCE_MODEL | AI config, planned | Reference task routing |
| OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY | Adapter secrets, planned | Only chosen/approved providers |
| STRIPE_PRICE_PROFESSIONAL / STRIPE_PRICE_ENTERPRISE / STRIPE_PRICE_PROMO | Server, planned | Configured existing prices; no dynamic creation |
| STORAGE_ADAPTER / STORAGE_ROOT | Server, planned | Private local or replaceable storage |

Target .env.local is gitignored. Proposed variables are not yet promises of implemented behavior. PHI deployment also requires TLS/certificate/retention and contractual configuration, documented separately. No Base44 variables in final target runtime.
