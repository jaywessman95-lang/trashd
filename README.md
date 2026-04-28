# Trashd

Trashd is an AI lead finder for junk removal companies. It finds high-intent cleanout opportunities, scores them for fit, and alerts operators before competitors see the best jobs.

The master product plan lives in [docs/MASTERPLAN.md](docs/MASTERPLAN.md).
Current API contracts live in [docs/API.md](docs/API.md).
Secrets and login setup live in [docs/SECRETS.md](docs/SECRETS.md).

## Stack

- Next.js on Vercel
- Supabase for auth, database, and storage
- Zyte for scraping
- Infermatic for AI scoring
- Stripe for billing
- Gmail API or SMTP for alerts

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Build Order

1. Auth, schema, dashboard shell, settings, Stripe.
2. Craigslist scraper, normalization, scoring, lead dashboard.
3. Gmail alerts, lead actions, duplicate detection, saved filters.
4. OfferUp, EstateSales.net, EstateSales.org.
5. AuctionZip, StorageTreasures, MovingSales aggregators.
