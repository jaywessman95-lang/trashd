-- Add verification tokens for email-based profile activation
alter table public.realtor_contacts
  add column if not exists verification_token text unique;

alter table public.service_operators
  add column if not exists verification_token text unique;

create index if not exists realtor_contacts_verification_token_idx
  on public.realtor_contacts (verification_token)
  where verification_token is not null;

create index if not exists service_operators_verification_token_idx
  on public.service_operators (verification_token)
  where verification_token is not null;
