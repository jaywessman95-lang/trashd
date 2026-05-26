-- Unschedule if previously registered
select cron.unschedule(jobname)
from cron.job
where jobname = 'trashd-scrape-operators-hourly';

-- Run 15 minutes past each hour (offset from the main scrape at :00 and contacts at :30)
select cron.schedule(
  'trashd-scrape-operators-hourly',
  '15 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_app_url') || '/api/cron/scrape-operators',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_cron_secret')
    )
  );
  $$
);
