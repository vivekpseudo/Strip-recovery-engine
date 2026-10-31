# Product roadmap

## Phase 1 — MVP foundation
- [x] Node.js/TypeScript API, PostgreSQL schema, Stripe webhook signature verification and event deduplication.
- [x] Invoice lifecycle persistence, audit trail, retry helper, worker scaffold, dashboard summary, Billing Portal endpoint, CI.
- [ ] Tenant-aware authentication and RBAC.
- [ ] Explicit RLS policies and isolation tests.
- [ ] Stripe integration fixtures and webhook replay tests.

## Phase 2 — Recovery orchestration
- [ ] Decline classifier based on PaymentIntent/Charge and invoice context.
- [ ] Durable queue with leases, concurrency limits, jitter, and dead-letter queue.
- [ ] Stripe account/customer onboarding and reconciliation.
- [ ] Revalidate invoice/subscription state before every action.
- [ ] Customer timezone, locale, quiet hours, and business calendar policy.

## Phase 3 — Dunning communications
- [ ] Branded email templates, provider adapter, delivery callbacks, suppression and unsubscribe.
- [ ] Secure Billing Portal links for payment method updates and authentication.
- [ ] SMS adapter with explicit opt-in and regional compliance.
- [ ] WhatsApp Business adapter with approved templates and opt-in.

## Phase 4 — Analytics and optimization
- [ ] Recovery funnel, cohort, MRR at risk, recovered revenue, and time-to-recovery.
- [ ] Experiment framework for message and schedule variants.
- [ ] Configurable business-calendar scheduling heuristic.
- [ ] Per-tenant policy editor and audit log.

## Phase 5 — Production operations
- [ ] OIDC/Supabase Auth and granular RBAC.
- [ ] RLS verification, threat model, penetration test, and retention controls.
- [ ] Metrics, traces, redacted logs, alerting, backups, restore drills, incident playbooks.
