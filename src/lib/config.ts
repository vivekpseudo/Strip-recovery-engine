import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  APP_API_TOKEN: z.string().min(24),
  APP_BASE_URL: z.string().url().default("http://localhost:3000")
});

export const config = schema.parse(process.env);
