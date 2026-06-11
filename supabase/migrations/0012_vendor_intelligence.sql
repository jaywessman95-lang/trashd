-- Vendor intelligence: 3-pillar scoring + Google Maps data
alter table public.service_operators
  add column if not exists google_place_id        text unique,
  add column if not exists google_maps_rating     decimal(2,1),
  add column if not exists google_review_count    int,
  add column if not exists google_last_review_at  date,
  add column if not exists google_response_rate   text,        -- 'most' | 'some' | 'none'
  add column if not exists hours_description      text,        -- raw hours from Maps
  add column if not exists availability_score     int not null default 0,
  add column if not exists reliability_score      int not null default 0,
  add column if not exists professionalism_score  int not null default 0,
  add column if not exists confidence_tier        text,        -- 'elite'|'verified'|'strong'|'good'|'not_shown'
  add column if not exists last_scored_at         timestamptz,
  add column if not exists maps_rank              int,
  add column if not exists review_snippet         text;

-- Update priority to support new tiers
-- existing values: 'hot_now' | 'strong' | 'good'
-- new values add:  'elite'  | 'verified'

create index if not exists service_operators_confidence_idx
  on public.service_operators (confidence_tier, score desc)
  where confidence_tier is not null;

create index if not exists service_operators_google_place_idx
  on public.service_operators (google_place_id)
  where google_place_id is not null;

create index if not exists service_operators_phone_norm_idx
  on public.service_operators (regexp_replace(phone, '\D', '', 'g'))
  where phone is not null;
