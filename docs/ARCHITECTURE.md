# Architecture

## Event flow
Stripe sends a billing event to the webhook endpoint. The API verifies the signature against raw bytes, stores the event idempotently, resolves the Stripe customer to one tenant, and transactionally updates invoice state and audit records. Recovery jobs coordinate communications and reconciliation. Stripe Billing remains authoritative for charging and retries.

## Services
- Webhook/API ingress and Stripe customer/account mapping
- Billing lifecycle processor and versioned decline classifier
- Recovery policy engine and durable scheduler/queue
- Email adapter first; SMS and WhatsApp adapters are opt-in extensions
- Dashboard, reporting, audit, and observability

## Decline policy
Normalize PaymentIntent, Charge, and Invoice processor fields. Customer action required (authentication/3DS or payment method update) should use a secure Billing Portal link. Temporary declines follow Stripe Billing retry settings. Hard declines and fraud/risk signals stop automated attempts. Unknown outcomes are handled conservatively. Preserve original codes, normalized category, source field, classifier version, and decision reason.

## Scheduling
Store timestamps in UTC and customer timezone as an IANA identifier. Derive local delivery windows at dispatch time. Business calendars may inform suggested follow-up timing but are not guaranteed banking clearance windows.

## Idempotency and ordering
Use Stripe event ID for webhook idempotency and tenant + invoice + workflow step + channel for communications. Payment operations must use Stripe idempotency keys and must not race with Smart Retries. Reconcile canonical Stripe state for out-of-order events. Queue jobs need leases, bounded attempts, jittered backoff, and dead-letter handling.

## Tenant isolation
Tenant identity comes from verified server-side membership and Stripe account mappings, never request-body or webhook-supplied tenant claims. Scope every query by tenant and validate PostgreSQL RLS policies.
