-- ==============================================================================
-- DELTA INFERNO — ETAP V7F.2B
-- PROJEKT ARCHITEKTURY TRWAŁYCH ODBLOKOWAŃ STADIONÓW (PERMANENT STADIUM UNLOCKS)
-- FINAL SQL SECURITY SPECIFICATION & HARDENED LIFECYCLE LEDGER
-- ==============================================================================
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
--  NINIEJSZY PLIK JEST DOKUMENTEM PROJEKTOWYM.
--  BEZWZGLĘDNY ZAKAZ AUTOMATYCZNEGO URUCHAMIANIA NA BAZIE PRODUKCYJNEJ LUB STAGINGU!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA AUDYTU PRZYZNAŃ, COFNIĘĆ I PRZYWRÓCEŃ (player_stadium_audit_log)
-- Architektura WORM (Write Once, Read Many).
-- Bezpieczna izolacja od kaskad: player_id jest niemutowalnym identyfikatorem skalarnym.
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
  performed_by uuid, -- ID profilu administratora lub NULL dla automatycznego triggera
  metadata jsonb DEFAULT '{}'::jsonb,
  is_anonymized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stadium_audit_player 
ON public.player_stadium_audit_log(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stadium_audit_action
ON public.player_stadium_audit_log(action, created_at DESC);

-- Ochrona WORM: blokada nieautoryzowanych modyfikacji i usuwania
CREATE OR REPLACE FUNCTION public.trg_fn_prevent_audit_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Wyłącznie kontrolowany proces anonimizacji RODO ma prawo zmodyfikować flagę
  IF TG_OP = 'UPDATE' AND NEW.is_anonymized = true AND OLD.is_anonymized = false THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Dziennik audytu jest niezmienny (WORM Policy: zakaz modyfikacji i usuwania) (SQLSTATE 42501)'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_tamper_guard ON public.player_stadium_audit_log;
CREATE TRIGGER trg_audit_tamper_guard
BEFORE UPDATE OR DELETE ON public.player_stadium_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_prevent_audit_tampering();

ALTER TABLE public.player_stadium_audit_log ENABLE ROW LEVEL SECURITY;

-- Dostęp do audytu: wyłącznie sztab trenerski i administratorzy
DROP POLICY IF EXISTS "staff_read_stadium_audit_log" ON public.player_stadium_audit_log;
CREATE POLICY "staff_read_stadium_audit_log"
ON public.player_stadium_audit_log
FOR SELECT
TO authenticated
USING (public.is_staff());

-- Brak polityk INSERT, UPDATE, DELETE dla klientów zewnętrznych


-- ------------------------------------------------------------------------------
-- 2. DEFINICJE PROGÓW STADIONOWYCH I WERSJONOWANIE (stadium_tier_definitions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stadium_tier_definitions (
  stadium_key text NOT NULL,
  rules_version text NOT NULL DEFAULT 'v7f',
  name text NOT NULL,
  min_xp integer NOT NULL CHECK (min_xp >= 0),
  sort_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stadium_key, rules_version)
);

INSERT INTO public.stadium_tier_definitions (stadium_key, rules_version, name, min_xp, sort_order, is_active)
VALUES
  ('debiutant', 'v7f', 'Debiutant', 0, 1, true),
  ('mlody_talent', 'v7f', 'Młody Talent', 400, 2, true),
  ('wschodzaca_gwiazda', 'v7f', 'Wschodząca Gwiazda', 1200, 3, true),
  ('gwiazda_akademii', 'v7f', 'Gwiazda Akademii', 2400, 4, true),
  ('legenda_delty', 'v7f', 'Legenda DELTY', 4000, 5, true)
ON CONFLICT (stadium_key, rules_version) DO NOTHING;

ALTER TABLE public.stadium_tier_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_stadium_definitions"
ON public.stadium_tier_definitions
FOR SELECT
TO authenticated
USING (true);


-- ------------------------------------------------------------------------------
-- 3. GŁÓWNA TABELA TRWAŁYCH ODBLOKOWAŃ Z OBSŁUGĄ STATUSÓW (player_stadium_unlocks)
-- Status 'revoked' uniemożliwia automatyczne ponowne przyznanie po cofnięciu!
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_stadium_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  stadium_key text NOT NULL,
  status text NOT NULL DEFAULT 'unlocked' CHECK (status IN ('unlocked', 'revoked')),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  required_xp_threshold integer NOT NULL CHECK (required_xp_threshold >= 0),
  achieved_xp integer NOT NULL CHECK (achieved_xp >= required_xp_threshold),
  rules_version text NOT NULL DEFAULT 'v7f',
  unlocked_by_trigger text NOT NULL DEFAULT 'coach_attendance_sync' CHECK (
    unlocked_by_trigger IN ('coach_attendance_sync', 'backfill_migration', 'manual_coach_grant')
  ),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_player_stadium UNIQUE (player_id, stadium_key)
);

CREATE INDEX IF NOT EXISTS idx_player_stadium_unlocks_player 
ON public.player_stadium_unlocks(player_id);

CREATE INDEX IF NOT EXISTS idx_player_stadium_unlocks_status 
ON public.player_stadium_unlocks(player_id, status);

ALTER TABLE public.player_stadium_unlocks ENABLE ROW LEVEL SECURITY;

-- Odczyt rodzica: wyłącznie przypisane dzieci ORAZ wyłącznie status 'unlocked'
DROP POLICY IF EXISTS "parents_read_children_stadium_unlocks" ON public.player_stadium_unlocks;
CREATE POLICY "parents_read_children_stadium_unlocks"
ON public.player_stadium_unlocks
FOR SELECT
TO authenticated
USING (
  public.is_parent_of(player_id) 
  AND status = 'unlocked'
);

-- Odczyt sztabu: wszystkie rekordy (w tym cofnięte do celów administracyjnych)
DROP POLICY IF EXISTS "staff_read_all_stadium_unlocks" ON public.player_stadium_unlocks;
CREATE POLICY "staff_read_all_stadium_unlocks"
ON public.player_stadium_unlocks
FOR SELECT
TO authenticated
USING (public.is_staff());

-- BRAK polityk INSERT, UPDATE, DELETE dla authenticated oraz anon.


-- ------------------------------------------------------------------------------
-- 4. JEDNO ŹRÓDŁO PRAWDY DLA XP (STRICTLY PRIVATE ENGINE FUNCTION)
-- Ścisła semantyka DISTINCT: ts.id i m.id
-- CAŁKOWITY BRAK UPRAWNIEŃ DLA authenticated/anon (Eliminacja IDOR / data leak)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_verified_player_xp(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_training_count integer := 0;
  v_match_count integer := 0;
BEGIN
  -- 1. Treningi (+40 XP): unikalne sesje treningowe
  SELECT COUNT(DISTINCT ts.id)
  INTO v_training_count
  FROM public.training_attendance ta
  JOIN public.training_sessions ts ON ts.id = ta.training_id
  WHERE ta.player_id = p_player_id
    AND ta.status = 'present'
    AND ts.training_date <= CURRENT_DATE;

  -- 2. Mecze ligowe (+60 XP): unikalne rozegrane mecze
  -- Wykluczenie jawnego 'absent' od trenera (bezwzględny priorytet)
  SELECT COUNT(DISTINCT m.id)
  INTO v_match_count
  FROM public.matches m
  WHERE m.status = 'played'
    AND NOT EXISTS (
      SELECT 1 FROM public.match_attendance ma_abs
      WHERE ma_abs.match_id = m.id
        AND ma_abs.player_id = p_player_id
        AND ma_abs.status = 'absent'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.match_attendance ma_pres
        WHERE ma_pres.match_id = m.id
          AND ma_pres.player_id = p_player_id
          AND ma_pres.status = 'present'
      )
      OR EXISTS (
        SELECT 1 FROM public.match_events me
        WHERE me.match_id = m.id
          AND (me.player_id = p_player_id OR me.assist_player_id = p_player_id)
          AND me.event_type IN ('goal', 'mvp')
      )
    );

  RETURN (v_training_count * 40) + (v_match_count * 60);
END;
$$;

-- BEZWZGLĘDNA BLOKADA PRYWATNOŚCI:
-- Rodzic ani żaden klient HTTP nie ma dostępu do kalkulatora przez RPC!
REVOKE ALL ON FUNCTION public.calculate_verified_player_xp(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_verified_player_xp(uuid) TO service_role;


-- ------------------------------------------------------------------------------
-- 5. AUTORYTATYWNA SYNCHRONIZACJA PRZYZNAWAŃ (SERVER RPC / TRIGGER ONLY)
-- Dostępna WYŁĄCZNIE dla service_role i wewnętrznych triggerów bazy.
-- Blokada wiersza FOR UPDATE i atomowe wyrażenie CTE.
-- Ochrona przed ponownym przyznaniem unieważnionego stadionu.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_player_stadium_unlocks(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_verified_xp integer;
  v_unlocked_keys text[] := ARRAY[]::text[];
  v_newly_inserted_keys text[] := ARRAY[]::text[];
BEGIN
  -- 1. Blokada wiersza zawodnika w transakcji przeciwko wyścigom
  PERFORM 1 FROM public.players WHERE id = p_player_id FOR UPDATE;

  -- 2. Autorytatywne przeliczenie XP wewnątrz transakcji
  v_verified_xp := public.calculate_verified_player_xp(p_player_id);

  -- 3. Atomowe przyznanie za pomocą CTE (INSERT .. ON CONFLICT DO NOTHING RETURNING ..)
  -- Zauważ: Jeśli rekord istnieje ze statusem 'revoked', ON CONFLICT DO NOTHING powstrzymuje ponowne przyznanie!
  WITH eligible_tiers AS (
    SELECT stadium_key, min_xp, rules_version
    FROM public.stadium_tier_definitions
    WHERE is_active = true
      AND min_xp <= v_verified_xp
  ),
  inserted_unlocks AS (
    INSERT INTO public.player_stadium_unlocks (
      player_id,
      stadium_key,
      status,
      required_xp_threshold,
      achieved_xp,
      rules_version,
      unlocked_by_trigger
    )
    SELECT
      p_player_id,
      et.stadium_key,
      'unlocked',
      et.min_xp,
      v_verified_xp,
      et.rules_version,
      'coach_attendance_sync'
    FROM eligible_tiers et
    ON CONFLICT (player_id, stadium_key) DO NOTHING
    RETURNING stadium_key, required_xp_threshold, achieved_xp, rules_version
  ),
  audit_entry AS (
    INSERT INTO public.player_stadium_audit_log (
      player_id,
      stadium_key,
      action,
      previous_xp,
      new_xp,
      reason,
      performed_by,
      metadata
    )
    SELECT
      p_player_id,
      iu.stadium_key,
      'UNLOCKED',
      iu.required_xp_threshold,
      iu.achieved_xp,
      'Autorytatywne osiągnięcie progu XP po zatwierdzeniu frekwencji',
      NULL,
      jsonb_build_object('rules_version', iu.rules_version, 'trigger', 'coach_attendance_sync')
    FROM inserted_unlocks iu
    RETURNING stadium_key
  )
  SELECT coalesce(array_agg(stadium_key), ARRAY[]::text[])
  INTO v_newly_inserted_keys
  FROM inserted_unlocks;

  -- 4. Zwrócenie wyłącznie aktywnych odblokowanych stadionów
  SELECT coalesce(array_agg(stadium_key ORDER BY required_xp_threshold ASC), ARRAY[]::text[])
  INTO v_unlocked_keys
  FROM public.player_stadium_unlocks
  WHERE player_id = p_player_id AND status = 'unlocked';

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'verified_xp', v_verified_xp,
    'unlocked_stadiums', v_unlocked_keys,
    'newly_unlocked', v_newly_inserted_keys
  );
END;
$$;

-- BEZWZGLĘDNA IZOLACJA:
REVOKE ALL ON FUNCTION public.sync_player_stadium_unlocks(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_player_stadium_unlocks(uuid) TO service_role;


-- ------------------------------------------------------------------------------
-- 6. TRIGGER BAZODANOWY (AUTOMATYZACJA WYŁĄCZNIE NA OBECNOŚCI TRENERA)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_stadium_attendance_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Reaguje wyłącznie na 'present' lub 'absent'
  IF (TG_OP = 'INSERT' AND NEW.status IN ('present', 'absent'))
     OR (TG_OP = 'UPDATE' AND (NEW.status IN ('present', 'absent') OR OLD.status IN ('present', 'absent'))) THEN
    PERFORM public.sync_player_stadium_unlocks(NEW.player_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_attendance_stadium_sync ON public.training_attendance;
CREATE TRIGGER trg_training_attendance_stadium_sync
AFTER INSERT OR UPDATE ON public.training_attendance
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_stadium_attendance_sync();

DROP TRIGGER IF EXISTS trg_match_attendance_stadium_sync ON public.match_attendance;
CREATE TRIGGER trg_match_attendance_stadium_sync
AFTER INSERT OR UPDATE ON public.match_attendance
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_stadium_attendance_sync();


-- ------------------------------------------------------------------------------
-- 7. KONTROLOWANE COFNIĘCIE ODBLOKOWANIA (ADMIN ONLY — EXPLICIT IDENTITY)
-- Nie polega na ukrytym auth.uid() z service_role; weryfikuje profil administratora
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_stadium_unlock(
  p_admin_id uuid,
  p_player_id uuid,
  p_stadium_key text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_admin_role public.app_role;
  v_caller_uid uuid;
  v_updated_count integer := 0;
BEGIN
  v_caller_uid := auth.uid();

  -- 1. Weryfikacja formatu i minimalnej długości uzasadnienia
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Wymagane jest szczegółowe uzasadnienie decyzji o cofnięciu stadionu (min. 10 znaków)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. Sprawdzenie tożsamości administratora w tabeli profiles
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Użytkownik % nie posiada uprawnień administratora klubu (SQLSTATE 42501)', p_admin_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Jeśli wywołanie następuje w kontekście sesji JWT (auth.uid), sprawdzamy spójność tożsamości
  IF v_caller_uid IS NOT NULL AND v_caller_uid != p_admin_id THEN
    RAISE EXCEPTION 'Niezgodność tożsamości: token sesji nie odpowiada przekazanemu p_admin_id'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. Ochrona stadionu bazowego 'debiutant' (0 XP)
  IF p_stadium_key = 'debiutant' THEN
    RAISE EXCEPTION 'Stadion bazowy "debiutant" (0 XP) jest niezbywalnym statusem każdego zawodnika'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 5. Trwała modyfikacja statusu na 'revoked' (zamiast usuwania wiersza)
  UPDATE public.player_stadium_unlocks
  SET 
    status = 'revoked',
    revoked_at = now(),
    revoked_by = p_admin_id,
    revocation_reason = trim(p_reason),
    updated_at = now()
  WHERE player_id = p_player_id 
    AND stadium_key = p_stadium_key
    AND status = 'unlocked';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- 6. Zapis w niezmiennym dzienniku audytu
  IF v_updated_count > 0 THEN
    INSERT INTO public.player_stadium_audit_log (
      player_id,
      stadium_key,
      action,
      reason,
      performed_by,
      metadata
    )
    VALUES (
      p_player_id,
      p_stadium_key,
      'REVOKED',
      trim(p_reason),
      p_admin_id,
      jsonb_build_object('admin_id', p_admin_id, 'revoked_at', now())
    );
  END IF;

  RETURN jsonb_build_object(
    'success', (v_updated_count > 0),
    'player_id', p_player_id,
    'stadium_key', p_stadium_key,
    'revoked', (v_updated_count > 0),
    'reason', trim(p_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_stadium_unlock(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_stadium_unlock(uuid, uuid, text, text) TO service_role;


-- ------------------------------------------------------------------------------
-- 8. KONTROLOWANE PRZYWRÓCENIE ODBLOKOWANIA (ADMIN ONLY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_restore_stadium_unlock(
  p_admin_id uuid,
  p_player_id uuid,
  p_stadium_key text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_admin_role public.app_role;
  v_caller_uid uuid;
  v_updated_count integer := 0;
BEGIN
  v_caller_uid := auth.uid();

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Wymagane jest szczegółowe uzasadnienie przywrócenia stadionu (min. 10 znaków)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Użytkownik % nie posiada uprawnień administratora (SQLSTATE 42501)', p_admin_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_caller_uid IS NOT NULL AND v_caller_uid != p_admin_id THEN
    RAISE EXCEPTION 'Niezgodność tożsamości sesji administratora'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.player_stadium_unlocks
  SET 
    status = 'unlocked',
    revoked_at = NULL,
    revoked_by = NULL,
    revocation_reason = NULL,
    updated_at = now()
  WHERE player_id = p_player_id 
    AND stadium_key = p_stadium_key
    AND status = 'revoked';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    INSERT INTO public.player_stadium_audit_log (
      player_id,
      stadium_key,
      action,
      reason,
      performed_by,
      metadata
    )
    VALUES (
      p_player_id,
      p_stadium_key,
      'RESTORED',
      trim(p_reason),
      p_admin_id,
      jsonb_build_object('admin_id', p_admin_id, 'restored_at', now())
    );
  END IF;

  RETURN jsonb_build_object(
    'success', (v_updated_count > 0),
    'player_id', p_player_id,
    'stadium_key', p_stadium_key,
    'restored', (v_updated_count > 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_stadium_unlock(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_stadium_unlock(uuid, uuid, text, text) TO service_role;


-- ------------------------------------------------------------------------------
-- 9. PRAWNA ANONIMIZACJA AUDYTU DLA RODO / GDPR (ADMIN ONLY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_anonymize_player_audit(
  p_admin_id uuid,
  p_player_id uuid,
  p_gdpr_ticket_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_admin_role public.app_role;
  v_anonymized_count integer := 0;
BEGIN
  IF p_gdpr_ticket_ref IS NULL OR length(trim(p_gdpr_ticket_ref)) < 5 THEN
    RAISE EXCEPTION 'Wymagany jest oficjalny numer wniosku RODO/GDPR'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Wyłącznie administrator klubu może dokonywać anonimizacji RODO'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.player_stadium_audit_log
  SET 
    player_id = '00000000-0000-0000-0000-000000000000'::uuid,
    reason = 'Dane zanonimizowane zgodnie z procedurą RODO (Art. 17 GDPR)',
    metadata = jsonb_build_object('gdpr_ticket', p_gdpr_ticket_ref, 'anonymized_at', now()),
    is_anonymized = true
  WHERE player_id = p_player_id
    AND is_anonymized = false;

  GET DIAGNOSTICS v_anonymized_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'anonymized_rows', v_anonymized_count,
    'gdpr_ticket', p_gdpr_ticket_ref
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_anonymize_player_audit(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_anonymize_player_audit(uuid, uuid, text) TO service_role;


-- ------------------------------------------------------------------------------
-- 10. BEZPIECZNY PLAN WYCOFANIA (ZERO DATA LOSS ROLLBACK)
-- ------------------------------------------------------------------------------
/*
-- 1. Odcięcie wyzwalaczy automatycznych
DROP TRIGGER IF EXISTS trg_training_attendance_stadium_sync ON public.training_attendance;
DROP TRIGGER IF EXISTS trg_match_attendance_stadium_sync ON public.match_attendance;
DROP FUNCTION IF EXISTS public.trg_fn_stadium_attendance_sync();

-- 2. Odcięcie funkcji RPC
DROP FUNCTION IF EXISTS public.admin_anonymize_player_audit(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_restore_stadium_unlock(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_revoke_stadium_unlock(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.sync_player_stadium_unlocks(uuid);
DROP FUNCTION IF EXISTS public.calculate_verified_player_xp(uuid);

-- 3. Zachowanie tabel jako archiwalnych (ZAKAZ DROP TABLE CASCADE!)
-- ALTER TABLE public.player_stadium_unlocks RENAME TO archive_player_stadium_unlocks_v7f;
-- ALTER TABLE public.player_stadium_audit_log RENAME TO archive_player_stadium_audit_log_v7f;
-- ALTER TABLE public.stadium_tier_definitions RENAME TO archive_stadium_tier_definitions_v7f;
*/
