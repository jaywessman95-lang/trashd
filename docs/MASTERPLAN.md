# Master Plan

Build an AI Lead Finder for Junk Removal Companies, not a scraper.

The SaaS finds high-intent cleanout opportunities, ranks them by likelihood of becoming paid junk removal jobs, and delivers them to local operators through a dashboard and Gmail alerts.

## Final Stack

| Layer | Tool |
|---|---|
| Frontend / App Hosting | Vercel |
| Database / Auth / Storage | Supabase |
| Scraping | Zyte |
| AI Scoring | Infermatic |
| Billing | Stripe |
| Alerts | Gmail API or SMTP |
| Repo | GitHub |
| MVP Logs | Vercel + Supabase + Stripe logs |

## Product Goal

Build a SaaS lead engine for junk removal companies that:

- Scrapes high-intent sources.
- AI ranks best jobs.
- Sends Gmail alerts.
- Lets users manage filters.
- Charges monthly subscriptions.

## Core Source Ranking

| Rank | Source | Role | Why |
|---:|---|---|---|
| 1 | Craigslist | MVP volume engine | Highest daily local volume and urgent language |
| 2 | OfferUp | Local liquidation / moving item engine | Strong local seller intent for furniture, appliances, bulk items, and moving leftovers |
| 3 | EstateSales.net | Estate sale lead engine | Strong cleanout intent, photos, end dates |
| 4 | StorageTreasures | Big junk-density engine | Storage units often need fast full cleanouts |
| 5 | AuctionZip | Auction/liquidation engine | Estate, business, and household liquidation signals |
| 6 | EstateSales.org | Estate sale expansion | Similar to EstateSales.net, useful supplemental source |
| 7 | MovingSales / garage sale aggregators | Residential turnover expansion | Helpful but lower priority |

## Source Details

### Craigslist

Sections:

- `/search/zip` free
- `/search/gms` garage sales
- `/search/fua` furniture optional

Search terms:

- moving
- must go
- free
- everything
- take all
- garage sale
- estate
- cleanout
- curb alert
- leftovers
- need gone today
- downsizing

Extract:

```json
{
  "source": "craigslist",
  "title": "",
  "description": "",
  "price": "",
  "city": "",
  "posted_at": "",
  "url": "",
  "image_count": 0
}
```

Expected Orange County output:

- 50-100 scraped/day.
- 15-40 usable leads/day.
- 5-12 strong leads/day.

### OfferUp

OfferUp is useful for moving, downsizing, and cleanout signals from local sellers with bulky items.

Prioritize:

- Free furniture.
- Multiple furniture items.
- Garage cleanout posts.
- Moving sale posts.
- Appliance bundles.
- Bulk household items.
- Very low price items.
- Sellers with many active bulky listings.

Deprioritize:

- Single collectible.
- Single small item.
- Electronics only.
- Clothing only.
- Dealer inventory.
- High-priced resale items.
- Shipping-only listings.
- New retail items.

Extract:

```json
{
  "source": "offerup",
  "title": "",
  "description": "",
  "price": "",
  "city": "",
  "seller_name": "",
  "seller_profile_url": "",
  "posted_at": "",
  "url": "",
  "image_count": 0,
  "category": "",
  "is_local_pickup": true
}
```

Important: OfferUp may have stronger anti-bot controls than Craigslist. Do not let OfferUp block the MVP launch.

### EstateSales.net

High quality leads, structured listings, large home cleanouts, and predictable end dates.

Extract:

```json
{
  "source": "estatesales_net",
  "sale_title": "",
  "description": "",
  "city": "",
  "end_date": "",
  "photo_count": 0,
  "company_name": "",
  "url": ""
}
```

### StorageTreasures

Highest junk-density source. Storage units often need full cleanouts and can produce higher average ticket size.

Extract:

```json
{
  "source": "storagetreasures",
  "unit_size": "10x20",
  "city": "",
  "photo_count": 0,
  "auction_end": "",
  "url": ""
}
```

### AuctionZip

Useful for estate auctions, business liquidations, household liquidation events, and potential large cleanout jobs.

Extract:

```json
{
  "source": "auctionzip",
  "auction_title": "",
  "category": "",
  "location": "",
  "lot_count": 0,
  "end_date": "",
  "url": ""
}
```

### EstateSales.org

Use the same parser style and scoring logic as EstateSales.net.

### MovingSales / Garage Sale Aggregators

Supplemental local volume for residential turnover, moving sales, and garage sale leftovers.

## Master AI Scoring Engine

Normalize every listing into:

```json
{
  "source": "",
  "title": "",
  "description": "",
  "city": "",
  "state": "",
  "url": "",
  "images": 0,
  "price": "",
  "event_start": "",
  "event_end": "",
  "posted_at": "",
  "raw_data": {}
}
```

Final formula:

```text
Life Event Score
+ Urgency Score
+ Volume Score
+ Contactability Score
+ Value Drop Score
+ Location Match Score
+ Source Confidence Boost
- Spam / Duplicate / Low Intent Penalty
= Final ICP Score
```

Source confidence boost:

| Source | Bonus |
|---|---:|
| Craigslist | +10 |
| OfferUp | +15 |
| EstateSales.net | +20 |
| StorageTreasures | +25 |
| AuctionZip | +20 |
| EstateSales.org | +18 |
| MovingSales aggregators | +15 |

Final tiers:

| Score | Tier | App Behavior |
|---:|---|---|
| 90+ | HOT NOW | Instant alert |
| 80-89 | Strong Lead | Show high in dashboard |
| 70-79 | Good Lead | Show if user allows |
| <70 | Hidden | Store but suppress |

## User Controls

Users should control:

- Cities.
- Radius.
- Minimum score.
- Minimum job size.
- Enabled sources.
- Urgency preference.
- Lead type.
- Alert frequency.
- Excluded keywords.
- Included keywords.
- Max leads per day.
- Instant alert threshold.
- Blacklisted URLs/domains.
- Hide duplicates.
- Preferred job types.

## Dashboard

Main dashboard:

- 14 New Leads Today.
- 5 Hot Leads.
- 2 Large Jobs.

Lead card:

- Score.
- Source.
- City.
- Type.
- Job size.
- Why.

Actions:

- View Listing.
- Copy Message.
- Mark Contacted.
- Mark Booked.
- Dismiss.
- Not A Fit.

## Stripe Pricing

All paid plans include all websites.

| Plan | Price | Includes |
|---|---:|---|
| Starter | $49/mo | All sources, dashboard, basic filters, daily Gmail summary |
| Pro | $99/mo | All sources, advanced filters, instant hot lead alerts, lead actions, saved settings |
| Elite | $199/mo | All sources, priority territories, concierge setup, higher lead limits, premium support |

Plan differences are based on number of territories, lead volume limit, alert frequency, advanced filters, team seats, concierge setup, and support level.

Use a 7-day free trial. Do not offer a free forever plan.

## Build Timeline

### Week 1

- Frontend UI.
- Supabase auth.
- Supabase schema.
- Dashboard shell.
- User settings.
- Stripe setup.

### Week 2

- Craigslist scraper.
- Lead normalization.
- Infermatic AI scoring.
- Lead database.
- Dashboard lead cards.

### Week 3

- Gmail alerts.
- Lead actions.
- Duplicate detection.
- Saved filters.
- Production cleanup for MVP.

### Week 4

- OfferUp.
- EstateSales.net.
- EstateSales.org.

### Week 5

- AuctionZip.
- StorageTreasures.
- MovingSales aggregators.
- Source performance analytics.
- Final production cleanup.

## MVP Launch Definition

Launch once there are:

- User accounts.
- Company settings.
- Craigslist scraper.
- Infermatic AI scoring.
- Lead dashboard.
- Gmail alerts.
- Stripe billing.

## Positioning

Sell as:

```text
AI Lead Finder for Junk Removal Companies
```

Best sales promise:

```text
We find local cleanout opportunities before your competitors see them, rank the best jobs, and alert you when there is money nearby.
```
