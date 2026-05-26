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
- [x] Supabase Cron route for scheduled hourly ingestion.

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

## Phase 6: Realtor / Sold-Home Contact Scraping

- [x] Zyte probe v1 — 10 candidate sources (2026-05-22).
- [x] Zyte probe v2 — 28 additional sources including HAR, Homes.com, all major brokerages (2026-05-22).
- [x] Zyte probe v3 — volume+sold-date+contact deep check, 21 sites (2026-05-22).
- [x] Zyte probe v4 — detail page investigation: Redfin, HomeFinder, Zillow (2026-05-22).
- [x] **Final verdict: no single page has volume + sold dates + agent contact simultaneously.**
- [x] **9 confirmed usable contact sources. Full master list in `docs/CONTACT-SOURCES-MASTER.md`.**
- [x] Build contact scrapers for Tier 1 sources (FastExpert, Coldwell Banker Homes, Seven Gables, HomeFinder).
- [x] Build contact scrapers for Tier 2 sources (YellowPages OC/Irvine/Anaheim/Santa Ana, First Team, EZlocal).
- [ ] Fix Zillow scraper to extract sold dates from `Sold MM/DD/YY` slash format in HTML.
- [ ] Fix Redfin scraper URL — use `/zipcode/{ZIP}/recently-sold`; extract `SOLD APR 29, 2026` from card text.
- [x] Supabase migration 0006_realtor_contacts.sql — realtor_contacts table.
- [x] /api/cron/scrape-contacts route — runs all 7 contact scrapers, upserts to realtor_contacts.
- [ ] Realtor.com permanently banned by Zyte — do not attempt.

### Final Source Matrix — Volume + Sold Dates + Contact (2026-05-22, ~70 sites, ~120 Zyte calls)

| Source | Volume | Sold Dates | Agent Contact | Verdict |
|---|---|---|---|---|
| **Zillow** `/orange-county-ca/sold/` | ✅ **70,926 OC** / 7,303 Irvine | ✅ `Sold 05/22/26` in HTML | ❌ `"Unknown Listed By"` on list | Dates + volume only |
| **Redfin** `/zipcode/92620/recently-sold` | ✅ 73+ per zip | ✅ `SOLD APR 29, 2026` on cards | ⚠️ Agent name in JSON, no phone | Dates + name only |
| **HomeFinder** `/CA/Irvine/recently-sold` | ⚠️ Medium | ❌ Zero (shows for-sale, not sold) | ✅ 7 phones + 8 emails (CRMLS) | Contact only |
| **FastExpert** OC agent directory | ❌ Agent dir | ❌ None | ✅ **89 emails + 134 phones** | Best contact source |
| **Seven Gables** `/agents/` | ❌ Agent dir | ❌ None | ✅ 33 phones + 32 emails (OC) | Good contact source |
| Realtor.com | BANNED | — | — | ❌ Zyte 520 ban |
| Estately | ✅ 260+ cards | ❌ Dynamic load | ❌ 1 support phone | ❌ Unusable |
| All others (60+ sites) | — | — | — | ❌ Unusable |

### Recommended Two-Source Strategy

**Step 1 — Get sold addresses + dates:** Scrape Zillow (`/orange-county-ca/sold/`) via HTTP (fast, free, 70K+ OC transactions). Extract `soldDate`, `address`, `price` from `__NEXT_DATA__` JSON. Alternatively use Redfin zip pages for `SOLD APR 29, 2026` format + agent name.

**Step 2 — Get agent contact:** Scrape FastExpert OC agent directory pages for email + phone. Match agent names that appear in both Redfin JSON and FastExpert listings.

**Why this works:** Zillow/Redfin give us who sold recently. FastExpert gives us who to call. Name-match connects them.

## Deployment Notes

- [x] Vercel project linked.
- [x] Vercel production deployment.
- [x] Use Supabase Cron for hourly scraping and hourly instant alerts while keeping Vercel on Hobby.

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
