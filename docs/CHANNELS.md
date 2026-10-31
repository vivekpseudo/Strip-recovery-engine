# Customer communication channels

## Email — first channel
- Use a provider adapter so vendors can be changed without modifying orchestration.
- Provide branded templates for payment failure, authentication required, payment method update, and final notice.
- Include a secure Stripe Billing Portal link; never request card details by email.
- Store message idempotency key, template version, provider message ID, delivery state, timestamps, and failure reason.
- Implement unsubscribe, suppression, bounce/complaint handling, and per-tenant sender configuration.

## SMS — planned
Require explicit recorded consent. Respect regional sender registration, opt-out keywords, quiet hours, and rate limits. Never include full payment details or sensitive invoice data.

## WhatsApp — planned
Use the official WhatsApp Business Platform or approved provider. Require opt-in and approved templates for business-initiated messages. Track template version, delivery state, and opt-out.

## Dispatch safety
Immediately before sending, re-check invoice state, subscription status, customer preference, consent, suppression, and quiet hours. Cancel queued messages after payment, cancellation, or consent withdrawal.
