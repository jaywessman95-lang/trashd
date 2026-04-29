create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select cron.unschedule(jobname)
from cron.job
where jobname in (
  'trashd-scrape-hourly',
  'trashd-instant-alerts-hourly',
  'trashd-scrape-every-2-hours',
  'trashd-instant-alerts-every-2-hours'
);

select cron.schedule(
  'trashd-scrape-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_app_url') || '/api/cron/scrape',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_cron_secret')
    )
  );
  $$
);

select cron.schedule(
  'trashd-instant-alerts-hourly',
  '30 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_app_url') || '/api/cron/instant-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_cron_secret')
    )
  );
  $$
);
