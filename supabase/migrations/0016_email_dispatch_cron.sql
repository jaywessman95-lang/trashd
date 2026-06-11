select cron.unschedule(jobname)
from cron.job
where jobname = 'trashd-email-dispatch';

-- Fire every 10 minutes; sends at most 2 queued emails per run
select cron.schedule(
  'trashd-email-dispatch',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_app_url') || '/api/cron/email-dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trashd_cron_secret')
    )
  );
  $$
);
