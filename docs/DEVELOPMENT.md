# Development guide

## Prerequisites
Node.js 20+, npm, Docker Engine/Compose, and Stripe CLI.

## Local setup
```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run dev
```
Run the worker in a separate terminal with `npm run worker`.

## Stripe webhooks
Use Stripe test mode and the Stripe CLI to forward events to the local API. Put the CLI-generated signing secret in `STRIPE_WEBHOOK_SECRET`. Never use a live secret locally.

## Quality gates
```bash
npm run typecheck
npm test
npm run build
```

Add tests for policy decisions, duplicate/out-of-order events, and tenant boundaries. Keep webhook ingress fast and push side effects to durable jobs. Persist decision reasons and policy versions. Verify provider callbacks. Never commit .env files, keys, access tokens, customer exports, or production payloads.
