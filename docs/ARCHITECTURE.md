# NeuroSync — target architecture & migration plan

NeuroSync is an AI clinical decision-support + documentation tool for psychiatrists /
PMHNPs. It handles **PHI** (patients, notes, meds, billing) and mental-health data, so
it runs on a **HIPAA-eligible, BAA-covered** stack. This document is the source of
truth for the Base44 → Google Cloud migration.

## Why we're moving off Base44

Base44 **does not sign a BAA**, so it cannot legally hold production PHI. The whole app
is being lifted onto Google Cloud, where a **single GCP BAA** covers the database, the
backend, the AI model, auth, and hosting.

## Target stack (all under one Google Cloud BAA)

| Layer | Service | Notes |
|---|---|---|
| Frontend | React (Vite) on **Firebase Hosting** / Cloud Run | The existing Base44 UI, re-pointed |
| Auth | **Identity Platform** (email/password + **MFA**) | Replaces `base44.auth` |
| Backend API | **Cloud Run** (Node/TypeScript) | Sets `app.uid` per request; enforces RLS |
| Database | **Cloud SQL** (PostgreSQL) | PHI store; RLS + audit (see `/db`) |
| AI agent | **Vertex AI (Gemini)** | Replaces the Base44 `clinicalAssistant` agent + `InvokeLLM` |
| Secrets | **Secret Manager** | DB password, Stripe keys |
| Audit | **Cloud Audit Logs** + app `audit_log` | Infra + application trail |
| Billing | **Stripe** (NOT under the BAA) | Conduit only — never receives PHI |

> Model choice: **Vertex AI Gemini** is the default because it keeps everything under
> the one GCP BAA. Swappable to **Claude** via the Anthropic API (Anthropic signs a BAA
> with a DPA + zero-retention) — that just adds one more BAA to manage.

## The migration strategy: a drop-in `base44` shim

The existing React frontend calls a `base44` client:
`base44.auth.me()`, `base44.entities.X.list/create/update`,
`base44.integrations.Core.InvokeLLM()`, `base44.agents.*`.

Rather than rewrite every page, we replace **one file** — `src/api/base44Client.js` —
with a compatibility client exposing the **same surface**, backed by our Cloud Run API +
Identity Platform + Vertex AI. The UI keeps working; only the backend changes. This is
the lowest-risk path and preserves all the existing pages/components.

## Ownership split

**Claude builds:** the Cloud SQL schema + RLS + audit (done, see `/db`), the Cloud Run
backend, the `base44` compatibility shim, the Vertex AI agent, PHI-free Stripe billing,
the Terraform IaC, CI/CD, and the compliance document pack.

**Only you can do (Claude provides exact steps):**
1. Create + fund the GCP account and **sign the Google Cloud BAA** (legal signature).
2. Run `terraform apply` + first deploy with your credentials (Claude has no access to
   your cloud).
3. Get a **healthcare-regulatory attorney** to review before real patient data flows.

## Compliance obligations (tracked in `/docs`)

- **HIPAA** Privacy + Security Rules — BAAs down the chain, encryption, access control,
  MFA, audit logging, written risk analysis.
- **FDA CDS** — the AI gives suggestions only; keep within the non-device criteria
  (physician independently reviews; sources shown). Not solved by infra.
- **FTC Health Breach Notification Rule** + **state laws** (e.g. WA My Health My Data) —
  breach notice, opt-in consent, **no ad-tracking pixels/SDKs on PHI pages**.

This is engineering, not legal advice — the attorney review gate is real.
