-- Extended profile fields for realtors and operators

alter table public.realtor_contacts
  add column if not exists license_number        text,
  add column if not exists years_in_real_estate  int,
  add column if not exists service_areas         text[] not null default '{}',
  add column if not exists specialties           text[] not null default '{}',
  add column if not exists preferred_contact     text,
  add column if not exists website_url           text,
  add column if not exists instagram_url         text,
  add column if not exists linkedin_url          text;

alter table public.service_operators
  add column if not exists is_licensed           boolean not null default false,
  add column if not exists is_insured            boolean not null default false,
  add column if not exists years_in_business     int,
  add column if not exists crew_size             int,
  add column if not exists num_trucks            int,
  add column if not exists services_offered      text[] not null default '{}',
  add column if not exists service_areas         text[] not null default '{}',
  add column if not exists max_job_size          text,
  add column if not exists pricing_info          text,
  add column if not exists has_referral_program  boolean not null default false,
  add column if not exists referral_commission   int,
  add column if not exists eco_friendly          boolean not null default false,
  add column if not exists instagram_url         text,
  add column if not exists tagline               text;
