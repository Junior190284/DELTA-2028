-- DELTA Sync - uruchamianie co minutę przez Supabase Cron.
-- 1. Najpierw ustaw w Vercel zmienną DELTA_SYNC_SECRET.
-- 2. Wstaw ten sam sekret niżej.
-- 3. Uruchom ten skrypt w Supabase SQL Editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Jeśli zadanie już istnieje, usuń je przed ponownym utworzeniem:
select cron.unschedule('delta-sync-every-minute')
where exists (
  select 1 from cron.job where jobname='delta-sync-every-minute'
);

select cron.schedule(
  'delta-sync-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://delta-2028.vercel.app/api/delta-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-delta-sync-secret','WPISZ_TUTAJ_TEN_SAM_SEKRET_CO_W_VERCEL'
    ),
    body := '{}'::jsonb
  );
  $$
);
