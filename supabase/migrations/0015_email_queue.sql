create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  recipient_id text not null,
  recipient_email text not null,
  recipient_name text,
  verification_token text,
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);

create index if not exists email_queue_pending_idx
  on public.email_queue (scheduled_at)
  where status = 'pending';
