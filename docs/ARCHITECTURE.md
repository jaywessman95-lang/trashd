# Architecture

## Boundaries

- `src/app`: Next.js routes and screens.
- `src/components`: Reusable UI.
- `src/lib/scrapers`: Source connectors, Zyte fetch helpers, normalization, and scheduling.
- `src/lib/scoring`: Infermatic prompts, scoring schemas, and fallback deterministic scoring.
- `src/lib/integrations`: Stripe, Gmail, Supabase, Infermatic, and Zyte clients.
- `src/lib/validation`: API input schemas.
- `src/lib/messaging`: Outreach message templates.
- `supabase/migrations`: Database schema and row-level security.
- `docs`: Product plan, implementation order, source rules, and scoring rules.

## Data Flow

1. Scheduled job starts a scrape run for a source and territory.
2. Zyte fetches source pages.
3. Source connector extracts raw listings.
4. Normalizer maps raw listings into a common lead shape.
5. Deduper suppresses repeated URLs and near-duplicates.
6. Infermatic scores the normalized lead.
7. Qualified leads are stored in Supabase.
8. Dashboard and Gmail alerts show leads based on user settings.
9. User actions feed future ranking improvements.

## Reliability Rules

- Every scrape run writes a `scrape_runs` row.
- Every raw listing keeps its source URL and raw payload.
- Every scored lead stores the AI reason and scoring version.
- Source connectors must be isolated modules.
- User-visible lead filtering must come from `user_settings`, not hardcoded city logic.
- Protected app routes use Supabase middleware when Supabase environment variables exist.
