-- Add agent profile fields to realtor_sold_listings
alter table public.realtor_sold_listings
  add column if not exists agent_image_url text,
  add column if not exists agent_ai_bio text,
  add column if not exists agent_profile_status text not null default 'unverified';

-- Add profile fields to realtor_contacts
alter table public.realtor_contacts
  add column if not exists image_url text,
  add column if not exists ai_bio text,
  add column if not exists profile_status text not null default 'unverified',
  add column if not exists onboarding_email_sent_at timestamptz;

create index if not exists realtor_sold_listings_profile_status_idx
  on public.realtor_sold_listings (agent_profile_status);

create index if not exists realtor_contacts_profile_status_idx
  on public.realtor_contacts (profile_status);
