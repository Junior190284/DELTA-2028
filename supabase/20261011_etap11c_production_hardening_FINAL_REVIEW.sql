-- DELTA COLLECTION 3D — ETAP 11C
-- REVIEW-ONLY: DO NOT APPLY TO PRODUCTION WITHOUT APPROVAL AND STAGING TESTS.
-- Based on user-provided draft; not independently checked against live DB/repository.
BEGIN;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO public.app_settings (key, value, description) VALUES
 ('maintenance_mode', '{"enabled":false,"message":"Trwają planowane prace serwisowe. Zapraszamy wkrótce."}'::jsonb, 'Tryb serwisowy aplikacji'),
 ('feature_flags', '{"card_battles":true,"cinematic_walkouts":true,"typer":true,"daily_missions":true,"knowledge_corner":true,"photo_booth":true}'::jsonb, 'Flagi modułów gry i funkcji'),
 ('collection_3d_pilot', '{"enabled":false,"kill_switch":true,"allowed_user_ids":[]}'::jsonb, 'Pilotaż Walkout 3D — domyślnie wyłączony')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;

-- Important: audit ALL existing policies before execution; the following drops
-- are from the supplied draft and do not cover arbitrarily named policies.
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public read safe app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin write app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Service role manage app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all for users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for users" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all" ON public.app_settings;

CREATE POLICY "Public read safe app_settings" ON public.app_settings
FOR SELECT TO PUBLIC USING (
  key IN ('maintenance_mode', 'feature_flags')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  )
);
CREATE POLICY "Admin write app_settings" ON public.app_settings
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));
CREATE POLICY "Service role manage app_settings" ON public.app_settings
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Deny dangerous table-level privileges, including those inherited via PUBLIC.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
-- Explicitly revoke previously granted column UPDATE rights as well.
-- REVOKE of table privileges does not remove independent column-level grants.
REVOKE UPDATE (id, display_name, role, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
-- Clients may SELECT per existing RLS. Only display_name is mutable by authenticated.
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;
-- Keep server-side admin operations through the existing service-role client.
GRANT ALL ON TABLE public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL THEN NEW.role := 'parent'; END IF;
    IF NEW.role IS DISTINCT FROM 'parent' THEN
      IF COALESCE(auth.role(), '') <> 'service_role' AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Niedozwolone utworzenie profilu z podwyższoną rolą'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF COALESCE(auth.role(), '') <> 'service_role' AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Niedozwolona zmiana roli systemowej'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_role_self_escalation() TO authenticated, service_role;
DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

COMMIT;
