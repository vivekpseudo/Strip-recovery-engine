# Stripe Recovery Engine

A multi-tenant MVP for Stripe failed-payment recovery: verified webhooks, idempotent event processing, retry scheduling, dunning email hooks, and recovery analytics.

> **Status:** MVP scaffold. Before handling live billing traffic, configure secrets, apply migrations, test Stripe webhook signatures, and complete the security checklist below.

## Stack

- Node.js 20+ / TypeScript / Express
- PostgreSQL (Supabase-compatible)
- Stripe SDK for signature verification and Billing Portal sessions
- Resend-ready email adapter (provider integration behind an interface)
- Docker Compose for local PostgreSQL
- Vitest for unit tests

## MVP scope

- `POST /webhooks/stripe`: verifies signature against the raw request body, stores Stripe events idempotently, and acknowledges duplicate event IDs.
- Worker endpoint / scheduler: processes due recovery jobs with bounded retries and idempotent state transitions.
- Tenant-aware Postgres schema with RLS-ready tenant IDs and audit history.
- Health endpoint and summary API for dashboard metrics.
- Passwordless payment method updates through Stripe Billing Portal; this application never stores PAN/CVC.
- Configurable dunning email provider adapter.
- CI for type-checking and tests.

## Quick start

1. Copy `.env.example` to `.env` and fill in local values.
2. Start PostgreSQL: `docker compose up -d db`.
3. Install dependencies: `npm install`.
4. Apply schema: `npm run db:migrate`.
5. Start the API: `npm run dev`.
6. Forward Stripe test events to `/webhooks/stripe` using the Stripe CLI and set `STRIPE_WEBHOOK_SECRET`.

## Environment

See `.env.example`. Never commit credentials or production webhook secrets.

## API

- `GET /health` — liveness check
- `POST /webhooks/stripe` — Stripe webhook endpoint (Stripe signature required)
- `GET /api/dashboard/summary` — aggregated recovery metrics (requires bearer API token in this starter)
- `POST /api/billing-portal` — create a Stripe-hosted customer billing portal session (requires configured Stripe customer ID)

## Deployment notes

- Put the API behind HTTPS and a rate limiter.
- Use a separate worker process for scheduled retries; don't perform long jobs in the webhook request.
- Set a queue such as BullMQ/Redis or a managed task queue before production scale. The starter's database-backed queue is appropriate only for an MVP.
- Enable database backups, monitoring, alerting, and tenant isolation tests.
- Configure Supabase RLS policies for every tenant-scoped table before using Supabase client credentials from a browser.
- Use Stripe test mode until recovery, refund, cancellation, and webhook replay flows have been validated.
- Decline-code logic is advisory only: respect Stripe's retry settings, card network guidance, local regulations, and customer consent. Never retry hard declines blindly.
- Discounts/downgrades must be explicit tenant-configured actions, with limits and audit events. Not enabled automatically by default.

## Pricing hypothesis

- Starter: $29/month (up to $10k MRR)
- Growth: $79/month (up to $50k MRR)
- Scale: $149/month (up to $200k MRR)

Pricing is a hypothesis; validate it with customer interviews.

## Security checklist

- [ ] Replace starter bearer-token auth with Supabase Auth / OIDC and role-based access.
- [ ] Enforce tenant membership on every query and enable verified PostgreSQL RLS policies.
- [ ] Rotate all secrets and store them in your deployment secret manager.
- [ ] Verify webhook signatures and test replay/idempotency handling.
- [ ] Implement unsubscribe/consent, suppression lists, and email/SMS compliance.
- [ ] Add rate limits, request-size limits, structured redacted logs, and monitoring.
- [ ] Review privacy, retention, tax, and consumer-protection requirements in launch markets.
