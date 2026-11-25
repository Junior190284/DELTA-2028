-- ==============================================================================
-- DELTA 2018 GM — UI.6C PRE-PRODUCTION FIX (DO NOT RUN WITHOUT PREFLIGHT REVIEW)
-- Target: Supabase Staging (tdlsxamxtygojxhmjjvp) first; Production forbidden here.
-- File: supabase/migrations/20261111_ui6c_oauth_profile_bootstrap.sql
--
-- Cel:
-- 1. Idempotentny trigger auth.users -> public.profiles (role zawsze 'parent').
-- 2. ZERO nadpisywania istniejacych profili i rol (ON CONFLICT (id) DO NOTHING).
-- 3. Pelna kompatybilnosc z trg_prevent_role_self_escalation() oraz RLS profiles.
-- ==============================================================================

-- PREFLIGHT (URUCHOM TYLKO DO ODCZYTU PRZED MIGRACJA):
-- SELECT COUNT(*) AS auth_users_total FROM auth.users;
-- SELECT role, COUNT(*) FROM public.profiles GROUP BY role ORDER BY role;
-- SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  v_display_name := NULLIF(
    BTRIM(
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
      )
    ),
    ''
  );

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(LEFT(v_display_name, 80), 'Rodzic DELTA'),
    'parent'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Idempotentne uzupelnienie ewentualnych brakujacych profili (bez ruszania istniejacych)
INSERT INTO public.profiles (id, display_name, role)
SELECT
  u.id,
  COALESCE(
    NULLIF(
      BTRIM(
        COALESCE(
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          u.raw_user_meta_data->>'display_name',
          SPLIT_PART(COALESCE(u.email, ''), '@', 1)
        )
      ),
      ''
    ),
    'Rodzic DELTA'
  ),
  'parent'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ==============================================================================
-- ROLLBACK PLAN (wycofanie samego triggera/funkcji bez usuwania public.profiles):
-- BEGIN;
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
-- COMMIT;
-- (Wiersze public.profiles istniejacych uzytkownikow pozostaja nietkniete.)
-- ==============================================================================
