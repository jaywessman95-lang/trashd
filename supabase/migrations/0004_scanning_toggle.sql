alter table public.user_settings
  add column if not exists scanning_enabled boolean not null default true;
