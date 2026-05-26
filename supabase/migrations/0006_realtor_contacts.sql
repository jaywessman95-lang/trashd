create table if not exists public.realtor_contacts (
  id text primary key,                   -- "{source}::{email|normalized_phone}"
  name text,
  phone text,
  email text,
  brokerage text,
  profile_url text,
  source text not null,                  -- "fastexpert" | "coldwellbankerhomes" | etc.
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists realtor_contacts_source_idx
  on public.realtor_contacts (source);

create index if not exists realtor_contacts_email_idx
  on public.realtor_contacts (email)
  where email is not null;

create index if not exists realtor_contacts_phone_idx
  on public.realtor_contacts (phone)
  where phone is not null;
