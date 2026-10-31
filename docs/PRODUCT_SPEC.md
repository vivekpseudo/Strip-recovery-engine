# Product specification

## Target customers
Bootstrapped SaaS companies, digital publishers, and agencies with recurring Stripe Billing revenue and limited revenue-operations capacity.

## User outcomes
- Identify at-risk recurring payments and understand why they failed.
- Recover eligible invoices with safe, policy-driven workflows.
- Prompt customers to update payment details or complete authentication.
- Send respectful reminders through permitted channels.
- Attribute recovered revenue and measure campaign effectiveness.

## Primary workflow
1. Connect Stripe account and map customers.
2. Receive failed-payment event and create an auditable recovery case.
3. Classify failure and select a permitted action.
4. Schedule communication using customer locale/timezone and preferences.
5. Send a secure customer action link or reminder.
6. Reconcile subsequent Stripe success/failure events.
7. Stop on recovery, cancellation, or opt-out.
8. Report recovered revenue and workflow outcomes.

## Functional requirements
- Multi-tenant data model and strict tenant isolation.
- Verified Stripe webhooks, deduplication, replay handling, and reconciliation.
- Versioned decline classification and explainable policy decisions.
- Retry orchestration that respects Stripe Smart Retries and subscription settings.
- Email dunning with extensible SMS and WhatsApp channels.
- Consent, unsubscribe, suppression, locale, timezone, and quiet-hour preferences.
- Stripe-hosted Billing Portal for customer self-service.
- Dashboard for at-risk invoices, recovery rate, recovered amount, channel outcomes, and time to recovery.
- Full audit trail for policy decisions and actions.

## MVP exclusions
No raw card data storage, unsupervised retries for hard declines/fraud, guaranteed issuer clearance predictions, or SMS/WhatsApp before consent/provider compliance is implemented.
