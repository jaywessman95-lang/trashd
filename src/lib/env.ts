import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  INFERMATIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  INFERMATIC_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  INFERMATIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  ZYTE_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_STARTER_PRICE_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_PRO_PRICE_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_ELITE_PRICE_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  GMAIL_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  GMAIL_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  GMAIL_REFRESH_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  GMAIL_FROM_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().optional())
});

export const env = envSchema.parse(process.env);
