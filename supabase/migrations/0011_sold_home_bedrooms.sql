-- Add bedrooms to realtor_sold_listings
alter table public.realtor_sold_listings
  add column if not exists bedrooms integer;
