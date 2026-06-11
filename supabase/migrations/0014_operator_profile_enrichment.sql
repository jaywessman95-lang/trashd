-- Migration: 0014_operator_profile_enrichment
-- Adds the 10 profile data fields for junk/mover profiles
-- scrapable by Zyte and editable by verified vendors.

ALTER TABLE service_operators
  -- 2. Response time (auto-scraped from Google Business)
  ADD COLUMN IF NOT EXISTS google_response_time     text,

  -- 3. Service area ZIPs (vendor-editable, pre-filled by scraper)
  ADD COLUMN IF NOT EXISTS service_area_zips        text[]        DEFAULT '{}',

  -- 4. Pricing tiers: [{label, price, note}] (vendor-editable, pre-filled)
  ADD COLUMN IF NOT EXISTS pricing_tiers            jsonb,

  -- 5. Hours of operation: {monday: "7am–7pm", ...} (auto-scraped, overridable)
  ADD COLUMN IF NOT EXISTS hours_json               jsonb,

  -- 6. Before/after photo URLs (vendor-editable, pre-filled by scraper)
  ADD COLUMN IF NOT EXISTS photo_urls               text[]        DEFAULT '{}',

  -- 7. Certifications: ["Licensed Waste Hauler", "EPA Certified", ...]
  ADD COLUMN IF NOT EXISTS certifications           text[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license_number           text,
  ADD COLUMN IF NOT EXISTS license_state            text,

  -- 8. Customer testimonials: [{text, author, jobType, date}]
  ADD COLUMN IF NOT EXISTS testimonials             jsonb,

  -- 9. Jobs completed (scraped from website or vendor-set)
  ADD COLUMN IF NOT EXISTS jobs_completed           integer,

  -- 10. Fleet & equipment description
  ADD COLUMN IF NOT EXISTS fleet_description        text;

-- Vendor-editable self-reported fields (added with profile_fields migration
-- but captured here for completeness if not already present)
ALTER TABLE service_operators
  ADD COLUMN IF NOT EXISTS tagline              text,
  ADD COLUMN IF NOT EXISTS is_licensed         boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_insured          boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS years_in_business   integer,
  ADD COLUMN IF NOT EXISTS crew_size           integer,
  ADD COLUMN IF NOT EXISTS num_trucks          integer,
  ADD COLUMN IF NOT EXISTS services_offered    text[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_areas       text[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_job_size        text,
  ADD COLUMN IF NOT EXISTS pricing_info        text,
  ADD COLUMN IF NOT EXISTS has_referral_program boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_commission  numeric(5,2),
  ADD COLUMN IF NOT EXISTS eco_friendly        boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_url       text;

-- Index for enrichment cron job (finds verified operators needing scrape)
CREATE INDEX IF NOT EXISTS idx_service_operators_verified_enrichment
  ON service_operators (profile_status, last_scored_at)
  WHERE profile_status = 'verified';
