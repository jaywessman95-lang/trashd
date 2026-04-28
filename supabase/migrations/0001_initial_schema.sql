create extension if not exists "pgcrypto";

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cities text[] not null default '{}',
  radius integer not null default 25,
  min_score integer not null default 80,
  min_job_size text not null default 'medium',
  enabled_sources text[] not null default array[
    'craigslist',
    'offerup',
    'estatesales_net',
    'storagetreasures',
    'auctionzip',
    'estatesales_org',
    'movingsales'
  ],
  urgency_preference text not null default 'this_week',
  lead_types text[] not null default '{}',
  included_keywords text[] not null default '{}',
  excluded_keywords text[] not null default '{}',
  max_leads_per_day integer not null default 50,
  instant_alert_threshold integer not null default 90,
  hide_duplicates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id text primary key,
  label text not null,
  rank integer not null,
  confidence_boost integer not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null references public.sources(id),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  listings_found integer not null default 0,
  error_message text
);

create table public.raw_listings (
  id uuid primary key default gen_random_uuid(),
  source text not null references public.sources(id),
  source_listing_id text,
  url text not null,
  raw_data jsonb not null default '{}',
  content_hash text,
  scrape_run_id uuid references public.scrape_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(source, url)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  raw_listing_id uuid references public.raw_listings(id) on delete set null,
  source text not null references public.sources(id),
  title text not null,
  description text,
  city text,
  state text,
  url text not null,
  price text,
  image_count integer not null default 0,
  event_start timestamptz,
  event_end timestamptz,
  posted_at timestamptz,
  score integer not null default 0,
  priority text not null default 'hidden',
  job_size text not null default 'unknown',
  lead_type text not null default 'unknown',
  ai_reason text,
  scoring_version text,
  created_at timestamptz not null default now(),
  unique(source, url)
);

create table public.lead_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  contacted boolean not null default false,
  booked boolean not null default false,
  dismissed boolean not null default false,
  not_a_fit boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lead_id)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  alert_type text not null,
  status text not null default 'pending',
  subject text,
  body text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'starter',
  status text not null default 'trialing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.user_settings enable row level security;
alter table public.sources enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.raw_listings enable row level security;
alter table public.leads enable row level security;
alter table public.lead_actions enable row level security;
alter table public.alerts enable row level security;
alter table public.subscriptions enable row level security;

create policy "Users can read own companies"
  on public.companies for select
  using (auth.uid() = owner_id);

create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own lead actions"
  on public.lead_actions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can read sources"
  on public.sources for select
  to authenticated
  using (true);

create policy "Authenticated users can read qualified leads"
  on public.leads for select
  to authenticated
  using (true);

create policy "Users can read own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

insert into public.sources (id, label, rank, confidence_boost) values
  ('craigslist', 'Craigslist', 1, 10),
  ('offerup', 'OfferUp', 2, 15),
  ('estatesales_net', 'EstateSales.net', 3, 20),
  ('storagetreasures', 'StorageTreasures', 4, 25),
  ('auctionzip', 'AuctionZip', 5, 20),
  ('estatesales_org', 'EstateSales.org', 6, 18),
  ('movingsales', 'MovingSales / Aggregators', 7, 15);
