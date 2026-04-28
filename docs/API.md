# API Contracts

## Health

`GET /api/health`

Returns app status, source count, and plan count.

## Google OAuth

`POST /api/auth/google`

Starts Supabase Google OAuth sign-in and redirects the user to Google.

`GET /auth/callback`

Exchanges the Supabase OAuth callback code for an app session and redirects to the dashboard.

## Scoring Preview

`POST /api/scoring/preview`

Scores a normalized lead candidate using the Infermatic integration boundary. This can spend Infermatic credits, so it requires:

```text
Authorization: Bearer $CRON_SECRET
```

## Scrape Seed URLs

`GET /api/scrape/seed-urls?source=craigslist&cities=Anaheim,Irvine&radius=25`

Returns planned seed URLs for the selected source connector.

## Scrape Runs

`GET /api/scrape/runs`

Returns the latest scrape run status rows when Supabase service credentials are configured. Requires a signed-in user session.

## Scrape Run

`POST /api/scrape/run`

Manual scrape runner for testing and operations. This can spend Zyte and Infermatic credits, so it requires:

```text
Authorization: Bearer $CRON_SECRET
```

Body:

```json
{
  "source": "craigslist",
  "cities": ["Anaheim", "Irvine", "Santa Ana"],
  "radiusMiles": 25,
  "maxSeedUrls": 3,
  "maxCandidates": 100,
  "persist": false
}
```

Runs the selected source connector through Zyte, extracts normalized candidates, scores them, and optionally persists them.

## Cron Scrape

`GET /api/cron/scrape`

Runs the scheduled Craigslist MVP scrape. Requires:

```text
Authorization: Bearer $CRON_SECRET
```

## Cron Instant Alerts

`GET /api/cron/instant-alerts`

Finds recent hot leads that match user settings and sends Gmail alerts. Requires:

```text
Authorization: Bearer $CRON_SECRET
```

## Settings

`GET /api/settings`

Returns the signed-in user's settings.

`PUT /api/settings`

Saves territory, source, quality, alert, keyword, and dedupe preferences.

## Lead Actions

`POST /api/leads/:leadId/actions`

Body:

```json
{
  "contacted": true,
  "booked": false,
  "dismissed": false,
  "notAFit": false,
  "notes": "Called and left voicemail"
}
```

Stores user-specific workflow state for a lead.

## Billing Checkout

`POST /api/billing/checkout`

Body:

```json
{
  "planId": "pro"
}
```

Creates a Stripe subscription checkout session with a 7-day trial.

## Billing Webhook

`POST /api/billing/webhook`

Receives Stripe webhook events, verifies `STRIPE_WEBHOOK_SECRET`, and stores subscription state in Supabase.

## Alert Preview

`GET /api/alerts/preview`

Builds the daily summary email body from current leads without sending it. Requires a signed-in user session.

## Send Test Alert

`POST /api/alerts/send-test`

Sends the current daily summary to the signed-in user's email through Gmail.

## Admin Scrape Status

`GET /api/admin/scrape-status`

Requires:

```text
Authorization: Bearer $CRON_SECRET
```

Returns recent scrape runs and source-level lead stats.
