# Product specification

## Target customer

Bootstrapped SaaS companies, digital publishers, and agencies with recurring Stripe Billing revenue and limited dedicated revenue-operations capacity.

## Core user outcomes

- Know which recurring payments are at risk and why.
- Recover eligible invoices with safe, policy-driven workflows.
- Prompt customers to update payment details or complete authentication.
- Send timely, respectful reminders through permitted channels.
- Attribute recovered revenue and understand campaign effectiveness.

## Primary workflows

1. Connect Stripe account and map existing customers.
2. Receive failed-payment event and create an auditable recovery case.
3. Classify the failure and select a permitted action.
4. Schedule communication using customer locale/timezone and preferences.
5. Send secure customer action link or reminder.
6. Reconcile later Stripe success/failure events.
7. Stop the workflow on recovery, cancellation, or opt-out.
8. Report recovered revenue and workflow outcomes.

## Functional requirements

- Multi-tenant data model and strict tenant isolation.
- Stripe webhook verification, deduplication, replay handling, and event reconciliation.
- Versioned decline classification and explainable policy decisions.
- Retry orchestration that respects Stripe Billing Smart Retries and subscription settings.
- Email dunning workflow; extensible SMS and WhatsApp channels.
- Per-customer communication preferences, consent, unsubscribe, suppression, locale, and timezone.
- Customer self-service through Stripe Billing Portal.
- Dashboard for invoices at risk, recovery rate, recovered amount, communication outcomes, and time to recovery.
- Full audit log for every policy decision and action.

## Non-functional requirements

- Idempotent processing and safe handling of duplicate/out-of-order webhook delivery.
- Tenant isolation at API and database layers.
- Secrets stored outside source control.
- Observability without sensitive payment/customer data in logs.
- Horizontal worker scaling with leases and concurrency controls.
- Accessible and responsive operator dashboard (planned).
- Configurable retention and deletion policy.

## MVP exclusions

- Storing or processing raw card data.
- Unsupervised retries for hard declines or fraud signals.
- Guaranteed prediction of issuer/bank clearance time.
- Sending SMS/WhatsApp before consent, provider integration, and compliance are implemented.
- AI-generated financial or legal claims presented as authoritative.
