-- Adds the "Get a Quote" photo-upload lead capture flow.
-- Run this in the Supabase SQL editor after 0001_initial_schema.sql.

insert into public.sources (id, label, rank, confidence_boost)
values ('website_quote', 'Website Quote Requests', 0, 40)
on conflict (id) do nothing;

alter table public.leads
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists photo_urls text[] not null default '{}';

-- Existing operators should see quote leads without having to revisit Settings.
update public.user_settings
set enabled_sources = array_append(enabled_sources, 'website_quote')
where not ('website_quote' = any(enabled_sources));

-- Storage bucket for the photos homeowners upload on the quote page.
insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public can read quote photos" on storage.objects;
create policy "Public can read quote photos"
  on storage.objects for select
  using (bucket_id = 'quote-photos');

-- Uploads happen server-side via the service role key (see /api/quotes),
-- so no anon insert policy is needed.
