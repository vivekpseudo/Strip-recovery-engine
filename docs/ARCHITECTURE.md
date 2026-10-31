# Architecture

## High-level flow

1. Stripe emits an invoice/payment event to `POST /webhooks/stripe`.
2. API verifies the signature using the exact raw request bytes.
3. Event is durably inserted under its Stripe event ID; duplicate delivery is detected.
4. Event processor resolves the Stripe customer to exactly one tenant. Unknown mappings are retained for reconciliation.
5. Invoice state and recovery audit records are committed transactionally.
6. A recovery job is scheduled for orchestration/communication. Stripe Billing remains authoritative for payment retry execution.
7. Scheduler dispatches due communication and reconciliation tasks. Each dispatch must be idempotent and re-check invoice/subscription/customer state immediately before sending.
8. Delivery and payment events update the timeline and dashboard metrics.

## Logical services

- API and webhook ingress
- Stripe account/customer mapping
- Billing lifecycle processor
- Decline classifier
- Recovery policy engine
- Queue/scheduler
- Communication adapters (email first; SMS and WhatsApp extensible)
- Dashboard/reporting
- Audit and observability

## Decline classification and recovery policy

Normalize the source fields from Stripe PaymentIntent/Charge/Invoice data into a versioned internal classification. Suggested groups:

- **Customer action required:** authentication/3DS, update payment method, or confirm payment. Send a secure Billing Portal/customer action link; do not blindly retry.
- **Temporary/soft decline:** insufficient funds or issuer unavailable. Use Stripe Billing retry configuration and a bounded, configurable follow-up window.
- **Hard decline / account invalid:** stop automated retry and request a new payment method or contact support.
- **Fraud/risk signal:** stop automated attempts and route to risk review.
- **Unknown:** conservative handling and operator review; do not infer retryability from missing data.

The classifier must preserve original processor codes, normalized category, source field, classifier version, and decision reason for auditability. The current `decideRetry` helper is a starter policy, not a complete processor classifier.

## Scheduling

Store timestamps in UTC. Also store the customer timezone (IANA name) and communication policy. Derive local delivery windows at dispatch time and re-check the timezone and preferences before sending. A configurable business calendar can influence suggested follow-up times, but must never be presented as a guaranteed banking clearance window.

## Idempotency and ordering

- Stripe event ID is the unique idempotency key for webhook ingestion.
- Communication dispatch requires a unique key such as tenant + invoice + workflow step + channel.
- Payment operations must use Stripe idempotency keys and must not race with Stripe Smart Retries.
- Events can arrive out of order. Use object timestamps/version-aware updates and retrieve canonical Stripe state when required.
- Worker jobs need leases/visibility timeouts, bounded attempts, exponential backoff with jitter, and a dead-letter state.

## Tenant isolation

Every business record is tenant scoped. Tenant identity comes from authenticated server-side mappings, never from a request body or webhook-supplied tenant field. Use tenant-scoped repository methods and PostgreSQL RLS policies. Service roles with RLS bypass must remain server-side and narrowly scoped.
