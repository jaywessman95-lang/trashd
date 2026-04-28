# Secrets And Access

Never commit credentials to Git.

Use these locations:

- Local development: `.env.local`
- Vercel production: Project Settings -> Environment Variables
- Supabase production secrets: Supabase dashboard where needed
- Browser-based platform login: use the normal browser session when OAuth or dashboard setup is needed

## Required For Live MVP

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ZYTE_API_KEY
INFERMATIC_API_KEY
INFERMATIC_MODEL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_STARTER_PRICE_ID
STRIPE_PRO_PRICE_ID
STRIPE_ELITE_PRICE_ID
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN
GMAIL_FROM_EMAIL
CRON_SECRET
```

## Login Moments

The build will require third-party setup at these points:

- Supabase: create project, copy public URL, anon key, service role key, and apply migrations.
- Zyte: create API key for scraping.
- Infermatic: create API key and choose the scoring model.
- Stripe: create products/prices and webhook secret.
- Gmail/Google Cloud: create OAuth credentials and refresh token for alerts with Gmail send scope.
- Google sign-in: enable Google provider in Supabase Auth and add the Supabase callback URL to the Google OAuth client.
- Vercel: connect GitHub repo and add environment variables.

When a platform requires a browser login, keep that session in the browser. When an API key is created, put it in `.env.local` for local dev and Vercel environment variables for production.

## Rotation Note

Any credential pasted into chat should be treated as temporary. Keep using the current keys during MVP setup if needed, then rotate Supabase, Zyte, Infermatic, and Vercel tokens before a paid launch.

The current Gmail OAuth app is in Google's testing mode. Testing-mode refresh tokens can expire, so move the OAuth app to production or choose a permanent sending provider before relying on automated alerts for customers.

For Google sign-in, the Google OAuth client must include this authorized redirect URI:

```text
https://ybpfzfqfoyvzusytnlfy.supabase.co/auth/v1/callback
```

The production app origin should be included as an authorized JavaScript origin:

```text
https://trashd.vercel.app
```
