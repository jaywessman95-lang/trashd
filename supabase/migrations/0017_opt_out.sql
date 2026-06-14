alter table public.realtor_contacts
  add column if not exists opted_out_at timestamptz;

alter table public.service_operators
  add column if not exists opted_out_at timestamptz;
