-- ==============================================================================
-- DELTA INFERNO — ETAP V7F.3A.1
-- MINIMAL DATABASE SCHEMA & RLS: PERMANENT STADIUM UNLOCKS
--
--  ██████╗  ██████╗     ███╗   ██╗ ██████╗ ████████╗    ██████╗ ██╗   ██╗███╗   ██╗
--  ██╔══██╗██╔═══██╗    ████╗  ██║██╔═══██╗╚══██╔══╝    ██╔══██╗██║   ██║████╗  ██║
--  ██║  ██║██║   ██║    ██╔██╗ ██║██║   ██║   ██║       ██████╔╝██║   ██║██╔██╗ ██║
--  ██║  ██║██║   ██║    ██║╚██╗██║██║   ██║   ██║       ██╔══██╗██║   ██║██║╚██╗██║
--  ██████╔╝╚██████╔╝    ██║ ╚████║╚██████╔╝   ██║       ██║  ██║╚██████╔╝██║ ╚████║
--  ╚═════╝  ╚═════╝     ╚═╝  ╚═══╝ ╚═════╝    ╚═╝       ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
--
--  ====================== AWAIT APPROVAL — DO NOT RUN ==========================
--  TRYB: STRICT DESIGN ONLY.
--  NINIEJSZY PLIK JEST DOKUMENTEM PROJEKTOWYM DLA MIGRACJI SCHEMATU V7F.3A.1.
--  BEZWZGLĘDNY ZAKAZ AUTOMATYCZNEGO URUCHAMIANIA NA BAZIE PRODUKCYJNEJ LUB STAGINGU!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DEFINICJI PROGÓW STADIONOWYCH (stadium_tier_definitions)
-- Tworzona w pierwszej kolejności, stanowi cel klucza obcego dla odblokowań.
-- Wersjonowanie reguł, ochrona praw nabytych zawodników.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stadium_tier_definitions (
  stadium_key text NOT NULL,
  rules_version text NOT NULL DEFAULT 'v7f',
  name text NOT NULL,
  min_xp integer NOT NULL CHECK (min_xp >= 0),
  sort_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_stadium_tier_definitions PRIMARY KEY (stadium_key, rules_version)
);

CREATE INDEX IF NOT EXISTS idx_stadium_tier_lookup 
ON public.stadium_tier_definitions(rules_version, is_active, min_xp ASC);

-- ------------------------------------------------------------------------------
-- UWAGA DOTYCZĄCA ZAMIERZONEGO DML KATALOGU REGULAMINOWEGO:
-- Poniższy INSERT inicjalizuje wyłącznie słownik konfiguracji (stadium_tier_definitions).
-- Jest to zamierzona, statyczna operacja DML katalogu reguł wersji 'v7f'.
-- W żadnym wypadku NIE TWORZY ona rekordów dla zawodników (tabele player_stadium_unlocks
-- oraz player_stadium_audit_log pozostają w 100% puste i bez danych graczy).
-- ------------------------------------------------------------------------------
INSERT INTO public.stadium_tier_definitions (stadium_key, rules_version, name, min_xp, sort_order, is_active)
VALUES
  ('debiutant', 'v7f', 'Debiutant', 0, 1, true),
  ('mlody_talent', 'v7f', 'Młody Talent', 400, 2, true),
  ('wschodzaca_gwiazda', 'v7f', 'Wschodząca Gwiazda', 1200, 3, true),
  ('gwiazda_akademii', 'v7f', 'Gwiazda Akademii', 2400, 4, true),
  ('legenda_delty', 'v7f', 'Legenda DELTY', 4000, 5, true)
ON CONFLICT (stadium_key, rules_version) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 2. GŁÓWNA TABELA TRWAŁYCH ODBLOKOWAŃ ZAWODNIKA (player_stadium_unlocks)
-- player_id powiązany z players.id (FK ON DELETE CASCADE)
-- Złożony klucz obcy (stadium_key, rules_version) -> stadium_tier_definitions (ON DELETE RESTRICT)
-- Spójność statusu: unlocked (brak cofnięcia) vs revoked (wymagane revoked_at i reason)
-- Zabezpieczenie przed usunięciem konta admina: revoked_by ON DELETE SET NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_stadium_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  stadium_key text NOT NULL,
  rules_version text NOT NULL DEFAULT 'v7f',
  status text NOT NULL DEFAULT 'unlocked' CHECK (status IN ('unlocked', 'revoked')),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  required_xp_threshold integer NOT NULL CHECK (required_xp_threshold >= 0),
  achieved_xp integer NOT NULL CHECK (achieved_xp >= required_xp_threshold),
  unlocked_by_trigger text NOT NULL DEFAULT 'attendance_sync' CHECK (
    unlocked_by_trigger IN ('attendance_sync', 'backfill_migration', 'manual_coach_grant')
  ),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Ograniczenie unikalności: zawodnik może mieć tylko jeden rekord danego stadionu
  CONSTRAINT uq_player_stadium UNIQUE (player_id, stadium_key),
  -- Złożony klucz obcy do słownika definicji (ON DELETE RESTRICT chroni definicje przed skasowaniem)
  CONSTRAINT fk_player_stadium_tier_def FOREIGN KEY (stadium_key, rules_version)
    REFERENCES public.stadium_tier_definitions (stadium_key, rules_version)
    ON DELETE RESTRICT,
  -- Ograniczenie spójności statusu:
  -- 1) 'unlocked': brak aktywnego cofnięcia (wszystkie pola cofnięcia muszą być NULL)
  -- 2) 'revoked': wymaga revoked_at oraz niepustego revocation_reason (revoked_by dopuszcza NULL po usunięciu konta admina)
  -- 3) Pełna zgodność z przyszłą procedurą przywrócenia (RESTORED zeruje pola do NULL i ustawia 'unlocked')
  CONSTRAINT chk_player_stadium_unlock_status_consistency CHECK (
    (
      status = 'unlocked'
      AND revoked_at IS NULL
      AND revocation_reason IS NULL
      AND revoked_by IS NULL
    )
    OR
    (
      status = 'revoked'
      AND revoked_at IS NOT NULL
      AND revocation_reason IS NOT NULL
      AND length(trim(revocation_reason)) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_player_stadium_unlocks_player 
ON public.player_stadium_unlocks(player_id);

CREATE INDEX IF NOT EXISTS idx_player_stadium_unlocks_status 
ON public.player_stadium_unlocks(player_id, status);

CREATE INDEX IF NOT EXISTS idx_player_stadium_unlocks_tier_fk 
ON public.player_stadium_unlocks(stadium_key, rules_version);


-- ------------------------------------------------------------------------------
-- 3. BEZPIECZNA TABELA AUDYTU PRZYZNAŃ I COFNIĘĆ (player_stadium_audit_log)
-- player_id jako czysty identyfikator skalarny (brak kaskady FK chroni historię audytu)
-- Przygotowanie pod przyszłą prawną procedurę anonimizacji (is_anonymized)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_stadium_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  stadium_key text NOT NULL,
  action text NOT NULL CHECK (
    action IN ('UNLOCKED', 'REVOKED', 'RESTORED', 'BACKFILL', 'ANONYMIZED')
  ),
  previous_xp integer,
  new_xp integer,
  reason text NOT NULL,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_anonymized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stadium_audit_player 
ON public.player_stadium_audit_log(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stadium_audit_action 
ON public.player_stadium_audit_log(action, created_at DESC);


-- ------------------------------------------------------------------------------
-- 4. POLITYKI ROW LEVEL SECURITY (RLS) DLA WSZYSTKICH TRZECH TABEL
-- ------------------------------------------------------------------------------
ALTER TABLE public.stadium_tier_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stadium_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stadium_audit_log ENABLE ROW LEVEL SECURITY;

-- 4A. stadium_tier_definitions: odczyt publiczny dla zalogowanych użytkowników
DROP POLICY IF EXISTS "public_read_stadium_definitions" ON public.stadium_tier_definitions;
CREATE POLICY "public_read_stadium_definitions"
ON public.stadium_tier_definitions
FOR SELECT
TO authenticated
USING (true);

-- 4B. player_stadium_unlocks:
-- Rodzic może czytać WYŁĄCZNIE odblokowane stadiony SWOICH DZIECI (is_parent_of)
DROP POLICY IF EXISTS "parents_read_children_stadium_unlocks" ON public.player_stadium_unlocks;
CREATE POLICY "parents_read_children_stadium_unlocks"
ON public.player_stadium_unlocks
FOR SELECT
TO authenticated
USING (
  public.is_parent_of(player_id)
  AND status = 'unlocked'
);

-- Sztab (trenerzy, admini) może czytać stadiony wszystkich zawodników (w tym status 'revoked')
DROP POLICY IF EXISTS "staff_read_all_stadium_unlocks" ON public.player_stadium_unlocks;
CREATE POLICY "staff_read_all_stadium_unlocks"
ON public.player_stadium_unlocks
FOR SELECT
TO authenticated
USING (public.is_staff());

-- 4C. player_stadium_audit_log:
-- Wyłącznie sztab (trenerzy, administratorzy) ma prawo wglądu w dziennik audytu
DROP POLICY IF EXISTS "staff_read_stadium_audit_log" ON public.player_stadium_audit_log;
CREATE POLICY "staff_read_stadium_audit_log"
ON public.player_stadium_audit_log
FOR SELECT
TO authenticated
USING (public.is_staff());


-- ------------------------------------------------------------------------------
-- 5. JAWNE UPRAWNIENIA DATA API (GRANT / REVOKE)
-- Całkowita blokada INSERT / UPDATE / DELETE dla ról anon oraz authenticated
-- ------------------------------------------------------------------------------

-- stadium_tier_definitions
REVOKE ALL ON public.stadium_tier_definitions FROM PUBLIC, anon;
GRANT SELECT ON public.stadium_tier_definitions TO authenticated;
GRANT ALL ON public.stadium_tier_definitions TO service_role;

-- player_stadium_unlocks
REVOKE ALL ON public.player_stadium_unlocks FROM PUBLIC, anon;
GRANT SELECT ON public.player_stadium_unlocks TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_stadium_unlocks FROM authenticated;
GRANT ALL ON public.player_stadium_unlocks TO service_role;

-- player_stadium_audit_log
REVOKE ALL ON public.player_stadium_audit_log FROM PUBLIC, anon;
GRANT SELECT ON public.player_stadium_audit_log TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_stadium_audit_log FROM authenticated;
GRANT ALL ON public.player_stadium_audit_log TO service_role;


-- ------------------------------------------------------------------------------
-- 6. NIEDESTRUKCYJNY PLAN WYCOFANIA (BEZ DROP TABLE CASCADE)
-- ------------------------------------------------------------------------------
/*
-- W razie konieczności wycofania schematu V7F.3A.1 z aktywnego użycia:
-- NIGDY NIE STOSOWAĆ DROP TABLE CASCADE!
-- Tabele zachowujemy w stanie nienaruszonym poprzez zmianę nazw na archiwalne:
-- ALTER TABLE IF EXISTS public.player_stadium_unlocks RENAME TO archive_player_stadium_unlocks_v7f;
-- ALTER TABLE IF EXISTS public.player_stadium_audit_log RENAME TO archive_player_stadium_audit_log_v7f;
-- ALTER TABLE IF EXISTS public.stadium_tier_definitions RENAME TO archive_stadium_tier_definitions_v7f;
*/
