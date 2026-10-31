# Security and compliance notes

This application handles customer identifiers, subscription status, invoice metadata, and payment recovery communications. Treat all production data as sensitive.

## Required controls before production

- Authenticate users with a trusted identity provider. The starter global API token is for local development only.
- Derive tenant identity from verified server-side membership and Stripe account mappings.
- Scope every query and mutation by tenant. Test cross-tenant access attempts.
- Enable and validate PostgreSQL RLS policies. Database service credentials must not be exposed to browsers.
- Do not store card numbers, CVC, or raw payment credentials. Use Stripe-hosted payment collection and Billing Portal flows.
- Verify webhook signatures using raw bodies; enforce request-size limits and durable idempotency.
- Redact secrets, email addresses, payment details, and tokens from application logs.
- Protect customer communications with consent, unsubscribe, suppression, quiet-hour, and regional legal requirements.
- Encrypt network traffic and managed database storage; rotate credentials.
- Establish data retention, deletion, access logging, incident response, and backup/restore procedures.

## Payment retry safety

Stripe Billing settings and issuer/network rules govern payment retries. Do not run a parallel direct-charge scheduler that conflicts with Stripe Smart Retries. Re-check invoice, subscription, and payment-method state before customer contact or scheduling. Hard declines and fraud/risk signals must not be retried automatically. Require human review for ambiguous cases.

## Communications

The email channel must support unsubscribe and suppression. SMS and WhatsApp must be opt-in, template/provider compliant, and jurisdiction-aware. Stop communication promptly after invoice payment, subscription cancellation, opt-out, or account closure. Keep an audit record of the policy and template version used for each message.
