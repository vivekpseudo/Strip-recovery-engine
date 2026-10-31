# Security and compliance

This platform handles customer identifiers, subscription status, invoice metadata, and recovery communications. Treat production data as sensitive.

## Required before production
- Replace the starter global bearer token with trusted tenant-aware identity and RBAC.
- Derive tenant identity from verified server-side membership and Stripe account mappings.
- Scope every query and mutation by tenant; test cross-tenant access attempts.
- Validate explicit PostgreSQL RLS policies. Never expose service credentials to browsers.
- Do not store card numbers, CVC, or raw payment credentials; use Stripe-hosted payment collection and Billing Portal.
- Verify webhook signatures against raw bodies; enforce request-size limits and durable idempotency.
- Redact secrets, email addresses, payment details, and tokens from logs.
- Enforce consent, unsubscribe, suppression, quiet hours, and regional communications rules.
- Encrypt network traffic and managed database storage; rotate credentials.
- Establish retention, deletion, access logging, incident response, and backup/restore procedures.

## Payment retry safety
Stripe Billing settings and issuer/network rules govern payment retries. Do not run a parallel direct-charge scheduler that conflicts with Smart Retries. Re-check invoice, subscription, and payment-method state before contact or scheduling. Hard declines and fraud/risk signals must not be retried automatically. Route ambiguous cases to review.

## Communications
Email must support unsubscribe and suppression. SMS and WhatsApp must be opt-in and provider/jurisdiction compliant. Stop communication after payment, cancellation, opt-out, or account closure. Audit the policy and template version used for each message.
