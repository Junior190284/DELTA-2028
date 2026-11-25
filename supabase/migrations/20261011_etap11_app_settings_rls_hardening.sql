-- ==============================================================================
-- DELTA COLLECTION 3D ENGINE — ETAP 11B
-- FINAL HARDENED SUPABASE MIGRATION: APP_SETTINGS RLS & PROFILE ESCALATION SHIELD
-- File: supabase/migrations/20261011_etap11_app_settings_rls_hardening.sql
-- ==============================================================================
-- 
-- OGRANICZENIE: NIE URUCHAMIAĆ NA PRODUKCJI BEZ JAWNEJ ZGODY UŻYTKOWNIKA.
-- 
-- Niniejsza migracja rozwiązuje kluczowe wektory podatności:
-- 1. Tworzy tabelę app_settings (jeśli nie istnieje) i natychmiast aktywuje RLS.
-- 2. Ogranicza SELECT dla anon/authenticated WYŁĄCZNIE do publicznych flag ('maintenance_mode', 'feature_flags').
-- 3. Całkowicie blokuje odczyt wrażliwego klucza 'collection_3d_pilot' i listy 'allowed_user_ids' dla zwykłych graczy.
-- 4. Ogranicza modyfikacje (INSERT/UPDATE/DELETE) wyłącznie do zweryfikowanych administratorów (profiles.role = 'admin').
-- 5. Wdraża zabezpieczony trigger SECURITY DEFINER z ustalonym search_path chroniący kolumnę profiles.role.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA APP_SETTINGS & UPRAWNIENIA PODSTAWOWE (GRANT / REVOKE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- Wstawienie domyślnych bezpiecznych flag jeśli nie istnieją
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('maintenance_mode', '{"enabled": false, "message": "Trwają planowane prace serwisowe. Zapraszamy wkrótce."}'::jsonb, 'Tryb serwisowy aplikacji'),
    ('feature_flags', '{"card_battles": true, "cinematic_walkouts": true, "typer": true, "daily_missions": true, "knowledge_corner": true, "photo_booth": true}'::jsonb, 'Flagi modułów gry i funkcji')
ON CONFLICT (key) DO NOTHING;

-- Aktywacja Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Wycofanie niebezpiecznych uprawnień zapisu od roli anon
REVOKE ALL ON public.app_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.app_settings FROM authenticated;

-- Nadanie kontrolowanych uprawnień (podlegających RLS)
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- ------------------------------------------------------------------------------
-- 2. CZYSZCZENIE ISTNIEJĄCYCH POLITYK RLS (IDEMPOTENCJA)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public read safe app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin write app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Service role manage app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all for users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for users" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all" ON public.app_settings;

-- ------------------------------------------------------------------------------
-- 3. POLITYKI RLS DLA APP_SETTINGS (SELEKTYWNY ODCZYT I ŚCISŁY ZAPIS)
-- ------------------------------------------------------------------------------

-- POLISA 1 (SELECT): 
-- Zwykli gracze (anon / authenticated) widzą WYŁĄCZNIE bezpieczne flagi publiczne.
-- Wrażliwy klucz 'collection_3d_pilot' (z listą testerów) widzą WYŁĄCZNIE administratorzy!
CREATE POLICY "Public read safe app_settings" 
ON public.app_settings 
FOR SELECT 
TO public 
USING (
    key IN ('maintenance_mode', 'feature_flags')
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
    )
);

-- POLISA 2 (INSERT / UPDATE / DELETE):
-- Tylko zweryfikowani administratorzy mogą zmieniać jakiekolwiek ustawienia.
CREATE POLICY "Admin write app_settings" 
ON public.app_settings 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
    )
);

-- POLISA 3 (SERVICE_ROLE):
-- Pełny dostęp dla wewnętrznych procesów serwerowych (Next.js server-side / crony).
CREATE POLICY "Service role manage app_settings" 
ON public.app_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. OCHRONA ROLI ADMINISTRATORA W PROFILES (ANTY-ESKALACJA SECURITY DEFINER)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Jeśli operacja próbuje zmodyfikować kolumnę 'role'
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Pozwól wyłącznie jeśli wywołujący to service_role LUB zweryfikowany administrator
        IF COALESCE(auth.role(), '') <> 'service_role' AND NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE public.profiles.id = auth.uid() 
            AND public.profiles.role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Niedozwolona operacja: Brak uprawnień do zmiany roli systemowej (42501).'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Ograniczenie uprawnień do wykonywania funkcji triggera
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_role_self_escalation() TO authenticated, service_role;

-- Podpięcie triggera przed aktualizacją rekordu w profiles
DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
