-- ==============================================================================
-- DELTA COLLECTION 3D ENGINE — ETAP 11C
-- FINAL PRODUCTION SECURITY HARDENING MIGRATION: COLUMN-LEVEL DEFENSE
-- File: supabase/migrations/20261011_etap11c_production_hardening.sql
-- ==============================================================================
-- OGRANICZENIE: NIE URUCHAMIAĆ AUTOMATYCZNIE. WYMAGA WERYFIKACJI ADMINISTRATORA.
--
-- ZAKRES MIGRACJI:
-- 1. Atomowe wykonanie całości w transakcji BEGIN / COMMIT.
-- 2. Utworzenie public.app_settings wraz z domyślnymi flagami i rekordem collection_3d_pilot
--    (enabled: false, kill_switch: true, allowed_user_ids: []).
-- 3. Aktywacja RLS i selektywne uprawnienia SELECT ukrywające listę testerów przed zwykłymi graczami.
-- 4. Całkowite odcięcie uprawnień PUBLIC i anon do public.profiles.
-- 5. Odebranie ogólnego UPDATE do tabeli profiles od authenticated.
-- 6. Przyznanie authenticated prawa UPDATE WYŁĄCZNIE do kolumny display_name.
--    Kolumny 'role', 'id' i 'created_at' są nieedytowalne dla authenticated na poziomie silnika kolumnowego Postgres.
-- 7. Zachowanie triggera prevent_role_self_escalation() jako obrony w głąb (defense-in-depth).
-- 8. Pełne uprawnienia dla service_role (zarządzanie rolami z poziomu panelu administratora).
-- 9. Pełne zachowanie działania triggera rejestracji handle_new_user() (SECURITY DEFINER).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. STRUKTURA TABELI APP_SETTINGS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- Domyślne flagi systemowe oraz rekord pilotażu 3D w stanie wyłączonym / kill-switch aktywny
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('maintenance_mode', '{"enabled": false, "message": "Trwają planowane prace serwisowe. Zapraszamy wkrótce."}'::jsonb, 'Tryb serwisowy aplikacji'),
    ('feature_flags', '{"card_battles": true, "cinematic_walkouts": true, "typer": true, "daily_missions": true, "knowledge_corner": true, "photo_booth": true}'::jsonb, 'Flagi modułów gry i funkcji'),
    ('collection_3d_pilot', '{"enabled": false, "kill_switch": true, "allowed_user_ids": []}'::jsonb, 'Konfiguracja pilotażu Universal Walkout 3D (domyślnie wyłączony)')
ON CONFLICT (key) DO NOTHING;

-- Aktywacja Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PODSTAWOWE UPRAWNIENIA DLA APP_SETTINGS (GRANT / REVOKE)
-- ------------------------------------------------------------------------------

-- Usunięcie uprawnień domyślnych od pseudo-roli PUBLIC
REVOKE ALL ON public.app_settings FROM PUBLIC;

-- Rola anon: wyłącznie SELECT
REVOKE ALL ON public.app_settings FROM anon;
GRANT SELECT ON public.app_settings TO anon;

-- Rola authenticated: SELECT oraz zapis kontrolowany przez RLS
REVOKE ALL ON public.app_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;

-- Rola service_role: pełny dostęp administracyjny serwera
GRANT ALL ON public.app_settings TO service_role;

-- ------------------------------------------------------------------------------
-- 3. CZYSZCZENIE ISTNIEJĄCYCH POLITYK RLS DLA APP_SETTINGS (IDEMPOTENCJA)
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
-- 4. POLITYKI RLS DLA APP_SETTINGS
-- ------------------------------------------------------------------------------

-- POLISA 1: Zwykli użytkownicy (anon / authenticated) widzą wyłącznie bezpieczne flagi publiczne.
-- Wrażliwy klucz 'collection_3d_pilot' (zawierający whitelistę testerów) widzą WYŁĄCZNIE administratorzy.
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

-- POLISA 2: Wyłącznie zweryfikowany administrator (profiles.role = 'admin') może modyfikować wpisy.
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

-- POLISA 3: Pełny dostęp dla wewnętrznych zapytań serwerowych service_role.
CREATE POLICY "Service role manage app_settings" 
ON public.app_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. UPRAWNIENIA KOLUMNOWE DLA PROFILES (ŚCISŁA OCHRONA ROLE, ID, CREATED_AT)
-- ------------------------------------------------------------------------------

-- KROK 5.1: Usunięcie wszelkich uprawnień odziedziczonych przez pseudo-rolę PUBLIC
REVOKE ALL ON public.profiles FROM PUBLIC;

-- KROK 5.2: Całkowite odcięcie roli anon (niezalogowani nie mają żadnego dostępu bezpośredniego)
REVOKE ALL ON public.profiles FROM anon;

-- KROK 5.3: Całkowite cofnięcie ogólnych uprawnień tabelowych od authenticated (w tym INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES)
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- KROK 5.3b: Jawne wycofanie uprzednich uprawnień kolumnowych UPDATE (oczyszczenie pg_attribute.attacl)
REVOKE UPDATE (id, display_name, role, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- KROK 5.4: Nadanie dla authenticated uprawnienia SELECT (podlegającego RLS)
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- KROK 5.5: Nadanie dla authenticated uprawnienia UPDATE WYŁĄCZNIE do kolumny display_name
-- Kolumny 'role', 'id', 'created_at' pozostają BEZ UPRAWNIEŃ ZAPISU dla authenticated
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;

-- KROK 5.6: Nadanie pełnych uprawnień dla service_role (bezpieczne endpointy administracyjne)
GRANT ALL ON TABLE public.profiles TO service_role;

-- ------------------------------------------------------------------------------
-- 6. BLOKADA ESKALACJI W PROFILES — TRIGGER ANTY-ESKALACYJNY (OBRONA W GŁĄB)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Ścieżka 1: Próba utworzenia rekordu profilu (INSERT / UPSERT nowy wiersz)
    IF TG_OP = 'INSERT' THEN
        -- Rejestracja standardowa nadaje rolę 'parent'. Rola wyższa wymaga uprawnień service_role lub admina.
        IF NEW.role IS DISTINCT FROM 'parent' THEN
            IF COALESCE(auth.role(), '') <> 'service_role' AND NOT EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE public.profiles.id = auth.uid() 
                AND public.profiles.role = 'admin'
            ) THEN
                RAISE EXCEPTION 'Niedozwolona operacja: Brak uprawnień do utworzenia profilu z rolą inną niż domyślna (42501).'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
        
        -- Domyślne uzupełnienie jeśli rola byłaby NULL
        IF NEW.role IS NULL THEN
            NEW.role := 'parent';
        END IF;

    -- Ścieżka 2: Próba edycji istniejącego rekordu profilu (UPDATE / UPSERT istniejący wiersz)
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            IF COALESCE(auth.role(), '') <> 'service_role' AND NOT EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE public.profiles.id = auth.uid() 
                AND public.profiles.role = 'admin'
            ) THEN
                RAISE EXCEPTION 'Niedozwolona operacja: Brak uprawnień do zmiany roli systemowej (42501).'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Ochrona funkcji przed wywołaniem bezpośrednim przez rolę anon
REVOKE ALL ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_role_self_escalation() TO authenticated, service_role;

-- Podpięcie triggera dla INSERT oraz UPDATE
DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

COMMIT;
