alter table public.user_settings
  add column if not exists scrape_coverage text not null default 'standard',
  add column if not exists max_listings_per_source integer,
  add column if not exists max_pages_per_source integer,
  add column if not exists lookback_hours integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_scrape_coverage_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_scrape_coverage_check
      check (scrape_coverage in ('conservative', 'standard', 'deep', 'maximum')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_max_listings_per_source_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_max_listings_per_source_check
      check (max_listings_per_source is null or (max_listings_per_source >= 1 and max_listings_per_source <= 1000)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_max_pages_per_source_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_max_pages_per_source_check
      check (max_pages_per_source is null or (max_pages_per_source >= 1 and max_pages_per_source <= 25)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_lookback_hours_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_lookback_hours_check
      check (lookback_hours is null or (lookback_hours >= 1 and lookback_hours <= 720)) not valid;
  end if;
end $$;
