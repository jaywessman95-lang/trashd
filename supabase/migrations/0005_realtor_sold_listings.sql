create table if not exists public.realtor_sold_listings (
  id text primary key,                        -- "zillow-{zpid}"
  address text not null,
  city text not null,
  state text not null default 'CA',
  zip text,
  sale_price numeric not null,
  sold_date timestamptz not null,
  property_type text not null default 'single_family',
  sale_type text not null default 'standard',
  cash_sale boolean not null default false,
  score integer not null default 0,
  priority text not null default 'good',
  score_reason text,
  listing_url text,
  source text not null,
  agent_name text,
  agent_phone text,
  agent_email text,
  agent_brokerage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists realtor_sold_listings_sold_date_idx
  on public.realtor_sold_listings (sold_date desc);

create index if not exists realtor_sold_listings_score_idx
  on public.realtor_sold_listings (score desc);
