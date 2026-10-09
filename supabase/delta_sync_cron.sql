-- DELTA Sync — Harmonogram produkcyjny: co 10 minut (pg_cron + pg_net + Supabase Vault)
-- 1. Sekret jest bezpiecznie przechowywany w Supabase Vault (vault.decrypted_secrets).
-- 2. Funkcja public.trigger_delta_sync_cron() odczytuje sekret w runtime.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

SELECT cron.unschedule('delta-sync-every-minute')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname='delta-sync-every-minute'
);

SELECT cron.schedule(
  'delta-sync-every-minute',
  '*/10 * * * *',
  'SELECT public.trigger_delta_sync_cron();'
);
