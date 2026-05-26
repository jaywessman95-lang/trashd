create table if not exists public.service_operators (
  id text primary key,
  name text,
  company text,
  phone text,
  email text,
  address text,
  city text,
  state text not null default 'CA',
  zip text,
  service_type text not null default 'junk_removal', -- 'junk_removal' | 'movers' | 'both'
  website_url text,
  source text not null,
  score integer not null default 0,
  priority text not null default 'good',             -- 'hot_now' | 'strong' | 'good'
  profile_status text not null default 'unverified',
  ai_bio text,
  image_url text,
  outreach_sent_at timestamptz,
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_operators_score_idx
  on public.service_operators (score desc);

create index if not exists service_operators_city_idx
  on public.service_operators (city);

create index if not exists service_operators_email_idx
  on public.service_operators (email)
  where email is not null;

create index if not exists service_operators_service_type_idx
  on public.service_operators (service_type);
