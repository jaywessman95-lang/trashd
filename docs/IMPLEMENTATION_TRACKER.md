# Implementation Tracker

## Phase 1: SaaS Foundation

- [x] Supabase project setup.
- [x] Auth pages.
- [x] Google OAuth login/signup route and UI.
- [x] App shell.
- [x] User settings page.
- [x] Stripe checkout route.
- [x] Stripe webhook route.

## Phase 2: Craigslist MVP

- [x] Zyte client.
- [x] Craigslist connector search parser.
- [x] Lead normalizer.
- [x] Duplicate detection key helper.
- [x] Infermatic scoring boundary with fallback scoring.
- [x] Lead dashboard scaffold.
- [x] Vercel cron route for scheduled Craigslist ingestion.

## Phase 3: Alerts and Actions

- [x] Gmail integration boundary.
- [x] Gmail OAuth credentials configured and test email verified.
- [x] Daily summary alert builder.
- [x] Instant hot lead alerts.
- [x] Mark contacted/booked/dismissed/not a fit API route.
- [x] Saved filters API route.

## Phase 4: Expansion Sources

- [x] OfferUp connector.
- [x] EstateSales.net connector.
- [x] EstateSales.org connector.
- [x] AuctionZip connector.
- [x] StorageTreasures connector.
- [x] MovingSales connector.

## Phase 5: Production Cleanup

- [ ] Source performance analytics.
- [x] Admin scrape status endpoint.
- [x] Protect credit-spending and lead-data API routes.
- [ ] Error handling and retries.
- [x] Documentation pass.
- [x] Production environment variables.

## Deployment Notes

- [x] Vercel project linked.
- [x] Vercel production deployment.
- [ ] Upgrade Vercel to Pro for every-4-hours scraping and hourly instant alerts. Hobby cron is daily only.

## Latest End-To-End Test

- [x] Production auth login with confirmed Supabase test user.
- [x] Settings save and reload.
- [x] Protected dashboard, leads, and settings pages.
- [x] Manual Craigslist scrape through Zyte.
- [x] Infermatic scoring and Supabase persistence.
- [x] Lead API retrieval.
- [x] Lead action workflow after adding persisted lead IDs to display leads.
- [x] Gmail daily summary test send.
- [x] Admin scrape status endpoint.
