# Stripe Recovery Engine

A multi-tenant involuntary-churn recovery platform for SaaS companies, digital publishers, and agencies using Stripe Billing.

> **Status: MVP foundation.** This repository has a Node.js/TypeScript API, PostgreSQL persistence, Stripe webhook signature verification, event idempotency, invoice lifecycle processing, a retry-policy helper, a worker scaffold, a Billing Portal endpoint, tests, and CI. It is not yet a production-ready dunning platform.

## Stack
- Node.js 20+, TypeScript, Express
- PostgreSQL (Docker Compose locally; managed PostgreSQL compatible)
- Stripe SDK (webhook verification and Billing Portal)
- Email adapter planned as the first customer communication channel
- Vitest and GitHub Actions

## Current capabilities
- `POST /webhooks/stripe`: verifies the Stripe signature against the raw body and stores events idempotently.
- Invoice payment failure/success lifecycle persistence and audit records.
- Tenant mapping from Stripe customer IDs; unknown mappings are retained for reconciliation rather than assigned to a guessed tenant.
- Conservative retry-policy helper.
- Database-backed worker scaffold. Stripe Billing remains authoritative for actual payment retries.
- `GET /health`, protected dashboard summary, and `POST /api/billing-portal`.
- PostgreSQL schema with tenant identifiers and RLS enabled on tenant-scoped operational tables.

## Important payment-safety boundary
The worker currently records a hand-off to Stripe Billing; it does **not** independently charge cards. Do not introduce a parallel direct-charge scheduler that conflicts with Stripe Smart Retries or subscription settings. Hard declines and fraud/risk signals must not be retried automatically. Banking calendars are optimization signals only, not guaranteed clearance windows.

## Quick start
1. Copy `.env.example` to `.env` and configure local/test credentials.
2. Start PostgreSQL: `docker compose up -d db`.
3. Install dependencies: `npm install`.
4. Apply schema: `npm run db:migrate`.
5. Start API: `npm run dev`.
6. Start worker separately: `npm run worker`.
7. Forward Stripe test events to `/webhooks/stripe` with the Stripe CLI and configure `STRIPE_WEBHOOK_SECRET`.

## API
- `GET /health` — liveness check.
- `POST /webhooks/stripe` — verified Stripe webhook endpoint.
- `GET /api/dashboard/summary` — starter dashboard metrics (bearer token).
- `POST /api/billing-portal` — create a Stripe-hosted Billing Portal session.

The current bearer-token authentication and dashboard query are scaffolding only. Do not expose this API to paying customers until tenant identity is derived from verified authentication and all queries are tenant-scoped.

## Documentation
- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Security and compliance](docs/SECURITY.md)
- [Communication channels](docs/CHANNELS.md)
- [Development guide](docs/DEVELOPMENT.md)

## Roadmap highlights
1. Tenant-aware authentication, RBAC, explicit RLS policies, and isolation tests.
2. Complete decline classification from PaymentIntent/Charge data and a durable queue with leases/dead-letter handling.
3. Email dunning templates, provider delivery callbacks, unsubscribe/suppression, and quiet-hour enforcement.
4. Opt-in SMS and WhatsApp Business integrations.
5. Recovery analytics, schedule experimentation, monitoring, and production operations.

## Development commands
- `npm run dev` — API with watch mode.
- `npm run worker` — worker loop.
- `npm run build` — TypeScript build.
- `npm run typecheck` — type-check.
- `npm test` — unit tests.
- `npm run db:migrate` — apply database schema.

## Production launch checklist
- [ ] Replace starter bearer token with tenant-aware OIDC/Supabase Auth and RBAC.
- [ ] Add and test explicit RLS policies for every tenant-scoped table.
- [ ] Validate Stripe account/customer ownership mappings.
- [ ] Test signature verification, duplicate delivery, replay, and out-of-order events.
- [ ] Implement leased queue processing, bounded retries, and dead-letter handling.
- [ ] Implement customer timezone, consent, unsubscribe, suppression, and quiet-hour enforcement.
- [ ] Configure email delivery; add SMS/WhatsApp only with explicit opt-in and compliant providers.
- [ ] Add rate limits, secret management, redacted logs, monitoring, alerts, backups, and restore drills.
- [ ] Validate all payment behavior in Stripe test mode before enabling live mode.
