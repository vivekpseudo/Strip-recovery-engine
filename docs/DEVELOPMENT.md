# Development guide

## Prerequisites
- Node.js 20+
- npm
- Docker Engine and Docker Compose
- Stripe CLI for local webhook testing

## Run locally
```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run dev
```

In a separate terminal:
```bash
npm run worker
```

## Test Stripe webhooks
Use Stripe test mode and the Stripe CLI to forward events to the local API. Copy the CLI-generated webhook signing secret into `STRIPE_WEBHOOK_SECRET`. Never use a live secret in local development.

## Quality gates
```bash
npm run typecheck
npm test
npm run build
```

## Contribution conventions
- Add tests for policy decisions, duplicate events, out-of-order events, and tenant boundaries.
- Keep Stripe event ingestion small and push side effects to durable jobs.
- Persist decision reasons and policy versions.
- Treat provider callbacks as untrusted input and verify signatures where supported.
- Never commit `.env`, API keys, access tokens, customer exports, or production payloads.
