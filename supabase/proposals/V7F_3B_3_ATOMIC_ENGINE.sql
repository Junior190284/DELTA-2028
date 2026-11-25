-- ==============================================================================
-- DELTA INFERNO — ETAP V7F.3B.3a
-- HARDENED ATOMIC STADIUM UNLOCK ENGINE & AUTHORITATIVE XP CALCULATION
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
--  PROJEKT MIGRACJI PROCEDURALNEJ DLA ETAPU V7F.3B.3a.
--  BEZWZGLĘDNY ZAKAZ AUTOMATYCZNEGO URUCHAMIANIA NA BAZIE PRODUKCYJNEJ LUB STAGINGU!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ZABEZPIECZENIE DEFINICJI PROGÓW STADIONOWYCH (ADNOTACJA DO OSOBNEJ AKCEPTACJI)
-- Całkowite odebranie uprawnień modyfikacyjnych dla authenticated
-- ------------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON TABLE public.stadium_tier_definitions FROM authenticated;


-- ------------------------------------------------------------------------------
-- 2. AUTORYTATYWNY SERWEROWY KALKULATOR SPORTOWEGO XP (calculate_verified_player_xp)
-- 
-- Zabezpieczenia V7F.3B.3a:
-- - Porównywanie pełnych znaczników czasu (timestamptz) zamiast samych godzin
-- - Precyzyjna konwersja strefy czasowej Europe/Warsaw (wsparcie CET UTC+1 / CEST UTC+2)
-- - Obsługa treningów przechodzących przez północ (start_time > end_time)
-- - Bezpieczna zasada odmowy XP dla trwających lub niejednoznacznych jednostek dzisiejszych bez zdefiniowanych godzin
-- - +40 XP: training_attendance.status = 'present' na zakończonym treningu
-- - +60 XP: match_attendance.status = 'present' przy matches.status = 'played'
-- - Statusy 'yes', 'no', 'maybe', 'undecided', 'absent' = 0 XP
-- - Sam wpis w match_events (gol/asysta/mvp) NIE stanowi dowodu obecności
-- - Deduplikacja przez count(DISTINCT training_id) oraz count(DISTINCT match_id)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_verified_player_xp(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_training_count integer := 0;
  v_match_count integer := 0;
  v_now_timestamptz timestamptz := now();
  v_today_warsaw date := (now() AT TIME ZONE 'Europe/Warsaw')::date;
BEGIN
  IF p_player_id IS NULL THEN
    RETURN 0;
  END IF;

  -- 1. Treningi (+40 XP): wyłącznie status 'present' i jednostka zakończona w strefie Europe/Warsaw
  SELECT count(DISTINCT ta.training_id)
  INTO v_training_count
  FROM public.training_attendance ta
  JOIN public.training_sessions ts ON ts.id = ta.training_id
  WHERE ta.player_id = p_player_id
    AND ta.status = 'present'
    AND (
      -- Wariant A: Zdefiniowana godzina zakończenia (z obsługą przejścia przez północ)
      (
        ts.end_time IS NOT NULL
        AND v_now_timestamptz >= (
          (
            ts.training_date 
            + CASE 
                WHEN ts.start_time IS NOT NULL AND ts.end_time < ts.start_time 
                THEN interval '1 day' 
                ELSE interval '0 day' 
              END
            + ts.end_time
          ) AT TIME ZONE 'Europe/Warsaw'
        )
      )
      OR
      -- Wariant B: Brak end_time, ale jest start_time (szacunek 90 min)
      (
        ts.end_time IS NULL
        AND ts.start_time IS NOT NULL
        AND v_now_timestamptz >= (
          (ts.training_date + ts.start_time + interval '90 minutes') AT TIME ZONE 'Europe/Warsaw'
        )
      )
      OR
      -- Wariant C: Brak godzin - bezpieczna zasada: wyłącznie minione dni (dzisiejszy bez godzin = 0 XP)
      (
        ts.end_time IS NULL
        AND ts.start_time IS NULL
        AND ts.training_date < v_today_warsaw
      )
    );

  -- 2. Mecze ligowe (+60 XP): wyłącznie rozegrany mecz (status = 'played') i obecność 'present'
  -- Sam wpis w match_events NIE wystarcza do zaliczenia meczu
  SELECT count(DISTINCT ma.match_id)
  INTO v_match_count
  FROM public.match_attendance ma
  JOIN public.matches m ON m.id = ma.match_id
  WHERE ma.player_id = p_player_id
    AND ma.status = 'present'
    AND m.status = 'played';

  RETURN (coalesce(v_training_count, 0) * 40) + (coalesce(v_match_count, 0) * 60);
END;
$$;

-- Ograniczenie uprawnień kalkulatora XP (brak dostępu dla anon / rodziców eliminuje ryzyko IDOR/BOLA)
REVOKE ALL ON FUNCTION public.calculate_verified_player_xp(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_verified_player_xp(uuid) TO service_role;


-- ------------------------------------------------------------------------------
-- 3. ATOMOWY SILNIK ODBLOKOWAŃ STADIONÓW (sync_player_stadium_unlocks)
-- 
-- Architektura transakcyjna:
-- 1) Walidacja uprawnień wykonawcy: wyłącznie zaufana warstwa serwerowa (service_role)
--    lub uprawniony sztab klubowy (public.is_staff) bez polegania na przestarzałym auth.role()
-- 2) Blokada wiersza (FOR UPDATE) na tabeli players eliminuje współbieżne race-conditions
-- 3) Autorytatywne wyliczenie bieżącego sportowego XP na serwerze (calculate_verified_player_xp)
-- 4) Pobranie aktywnych progów wersji rules_version = 'v7f'
-- 5) Zapis do player_stadium_unlocks z klauzulą ON CONFLICT (player_id, stadium_key) DO NOTHING
--    - Stadion raz zdobyty pozostaje w tabeli ze statusem 'unlocked' (prawa nabyte)
--    - Spadek bieżącego XP nie usuwa ani nie modyfikuje odblokowanego rekordu
--    - Istniejące rekordy ze statusem 'revoked' są chronione przed automatycznym nadpisaniem
-- 6) Wpis w player_stadium_audit_log tworzony WYŁĄCZNIE dla faktycznie nowo wstawionych wierszy z CTE RETURNING
-- 7) Pełna atomowość: błąd audytu powoduje natychmiastowy rollback odblokowań
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_player_stadium_unlocks(
  p_player_id uuid,
  p_trigger_source text DEFAULT 'attendance_sync'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_xp integer;
  v_new_unlocks_count integer := 0;
  v_unlocked_keys text[] := ARRAY[]::text[];
  v_now timestamptz := now();
  v_caller_id uuid;
BEGIN
  -- 1. Kontrola uprawnień wykonawcy (Defense-in-Depth bez auth.role())
  IF coalesce(current_setting('request.jwt.claim.role', true), '') NOT IN ('service_role', 'supabase_admin')
     AND current_user NOT IN ('service_role', 'postgres')
     AND NOT coalesce(public.is_staff(), false) THEN
    RAISE EXCEPTION '42501: Access denied: stadium synchronization requires trusted server role or staff privileges'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Walidacja poprawności p_player_id oraz blokada wiersza zawodnika (FOR UPDATE)
  IF p_player_id IS NULL THEN
    RAISE EXCEPTION 'P0002: player_id cannot be null'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM public.players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P0002: Player not found: %', p_player_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Walidacja źródła wywołania (zgodność z CHECK constraint na player_stadium_unlocks)
  IF p_trigger_source NOT IN ('attendance_sync', 'backfill_migration', 'manual_coach_grant') THEN
    p_trigger_source := 'attendance_sync';
  END IF;

  v_caller_id := auth.uid();

  -- 3. Autorytatywne wyliczenie sportowego XP po stronie serwera
  v_current_xp := public.calculate_verified_player_xp(p_player_id);

  -- 4. Atomowa operacja CTE:
  --    a) newly_inserted: pobiera kwalifikujące się progi 'v7f' i wykonuje INSERT ... ON CONFLICT DO NOTHING
  --    b) inserted_audit: rejestruje zdarzenie 'UNLOCKED' w player_stadium_audit_log TYLKO dla faktycznie nowych rekordów
  WITH qualifying_tiers AS (
    SELECT stadium_key, rules_version, min_xp
    FROM public.stadium_tier_definitions
    WHERE rules_version = 'v7f'
      AND is_active = true
      AND v_current_xp >= min_xp
  ),
  newly_inserted AS (
    INSERT INTO public.player_stadium_unlocks (
      player_id,
      stadium_key,
      rules_version,
      status,
      unlocked_at,
      required_xp_threshold,
      achieved_xp,
      unlocked_by_trigger
    )
    SELECT
      p_player_id,
      q.stadium_key,
      q.rules_version,
      'unlocked',
      v_now,
      q.min_xp,
      v_current_xp,
      p_trigger_source
    FROM qualifying_tiers q
    ON CONFLICT (player_id, stadium_key) DO NOTHING
    RETURNING player_id, stadium_key, rules_version, required_xp_threshold, achieved_xp
  ),
  inserted_audit AS (
    INSERT INTO public.player_stadium_audit_log (
      player_id,
      stadium_key,
      action,
      previous_xp,
      new_xp,
      reason,
      performed_by,
      metadata,
      is_anonymized
    )
    SELECT
      n.player_id,
      n.stadium_key,
      'UNLOCKED',
      NULL,
      n.achieved_xp,
      'Automatyczne odblokowanie stadionu po weryfikacji obecności (próg ' || n.required_xp_threshold || ' XP)',
      v_caller_id,
      jsonb_build_object(
        'trigger_source', p_trigger_source,
        'rules_version', n.rules_version,
        'required_xp_threshold', n.required_xp_threshold,
        'achieved_xp', n.achieved_xp
      ),
      false
    FROM newly_inserted n
    RETURNING id, stadium_key
  )
  SELECT 
    count(*),
    coalesce(array_agg(stadium_key), ARRAY[]::text[])
  INTO 
    v_new_unlocks_count,
    v_unlocked_keys
  FROM newly_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'sports_xp', v_current_xp,
    'new_unlocks_count', v_new_unlocks_count,
    'newly_unlocked_keys', v_unlocked_keys
  );
END;
$$;

-- Bezpieczne uprawnienia: funkcja nie może być bezpośrednio wywoływana przez public/anon/authenticated
REVOKE ALL ON FUNCTION public.sync_player_stadium_unlocks(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_player_stadium_unlocks(uuid, text) TO service_role;


-- ------------------------------------------------------------------------------
-- 4. PLAN WYCOFANIA (ROLLBACK PLAN)
-- ------------------------------------------------------------------------------
/*
-- W razie konieczności wycofania procedur silnika odblokowań V7F.3B.3a:
DROP FUNCTION IF EXISTS public.sync_player_stadium_unlocks(uuid, text);
DROP FUNCTION IF EXISTS public.calculate_verified_player_xp(uuid);

-- Opcjonalne przywrócenie uprawnień na stadium_tier_definitions (jeśli zachodzi taka potrzeba):
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.stadium_tier_definitions TO authenticated;
*/
