# Customer communication channels

## Email (first channel)
- Use a provider adapter so delivery can be moved between vendors without changing recovery orchestration.
- Provide branded templates for payment failure, authentication required, payment method update, and final notice.
- Include a secure Stripe-hosted Billing Portal link rather than requesting card details by email.
- Store message idempotency key, template version, provider message ID, delivery state, timestamps, and failure reason.
- Implement unsubscribe, suppression, bounce/complaint handling, and per-tenant sender configuration.

## SMS (planned)
- Only message customers with explicit, recorded consent.
- Respect country-specific sender registration, opt-out keywords, quiet hours, and rate limits.
- Never include full payment details or sensitive invoice data in message content.

## WhatsApp (planned)
- Use the official WhatsApp Business Platform or an approved provider.
- Require opt-in and approved templates for business-initiated messages.
- Track template version, delivery status, and opt-out state.

## Dispatch safety
Immediately before sending, re-check invoice state, subscription status, customer preference, consent, suppression, and quiet hours. Cancel queued messages if the invoice is paid, the subscription is cancelled, or consent is withdrawn.
