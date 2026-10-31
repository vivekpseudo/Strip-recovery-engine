# Product roadmap

## Phase 1 — MVP foundation
- [x] Node.js/TypeScript API and PostgreSQL schema.
- [x] Stripe webhook signature validation and event deduplication.
- [x] Invoice lifecycle persistence and recovery audit trail.
- [x] Conservative retry-policy helper and worker scaffold.
- [x] Basic dashboard summary and Stripe Billing Portal endpoint.
- [x] CI type-check and unit test workflow.
- [ ] Tenant-aware authentication and RBAC.
- [ ] Explicit RLS policy suite and isolation tests.
- [ ] Canonical Stripe test fixtures and integration tests.

## Phase 2 — Recovery orchestration
- [ ] Decline classifier based on PaymentIntent/Charge and invoice context.
- [ ] Durable queue with leases, concurrency limits, retries, jitter, and dead-letter queue.
- [ ] Stripe account/customer onboarding and reconciliation.
- [ ] Invoice/subscription state revalidation before each action.
- [ ] Customer timezone, locale, quiet hours, and calendar policy.

## Phase 3 — Dunning communications
- [ ] Email templates with per-tenant branding and localization.
- [ ] Email provider adapter, webhook delivery status, retries, and suppression.
- [ ] Unsubscribe and consent management.
- [ ] Customer payment update / authentication links via Stripe Billing Portal.
- [ ] SMS adapter with explicit opt-in and regional compliance.
- [ ] WhatsApp Business adapter with approved templates and opt-in.

## Phase 4 — Analytics and optimization
- [ ] Recovery funnel, cohort, MRR at risk, recovered revenue, and time-to-recovery analytics.
- [ ] Experiment framework for messaging and schedule variants.
- [ ] Configurable business-calendar scheduling heuristic.
- [ ] Per-tenant policy editor with audit log and safe defaults.
- [ ] Export/API integrations and operator alerts.

## Phase 5 — Production operations
- [ ] OIDC/Supabase Auth integration and granular RBAC.
- [ ] RLS verification, threat model, penetration test, and data retention controls.
- [ ] Metrics, traces, structured redacted logs, alerting, backups, and restore drills.
- [ ] Deployment manifests, secret rotation, incident response, and disaster recovery.
