-- OPTIONAL — V10 Smart Reminders cron
-- 1. Replace YOUR_DELTA_SYNC_SECRET with the same DELTA_SYNC_SECRET set in Vercel.
-- 2. Run once in Supabase SQL Editor.
-- Checks reminders hourly. The API itself prevents duplicates.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists(select 1 from cron.job where jobname='delta-v10-smart-reminders') then
    perform cron.unschedule('delta-v10-smart-reminders');
  end if;
end $$;

select cron.schedule(
  'delta-v10-smart-reminders',
  '15 * * * *',
  $$
    select net.http_post(
      url := 'https://delta-2028.vercel.app/api/reminders/run',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer YOUR_DELTA_SYNC_SECRET'
      ),
      body := '{}'::jsonb
    );
  $$
);

select 'SMART REMINDERS CRON READY' as status;
