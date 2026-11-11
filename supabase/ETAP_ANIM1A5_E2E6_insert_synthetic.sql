-- ==============================================================================
-- DELTA INFERNO 3.0 — ANIM-1A.5 E2E.6 FINAL: INSERT DANYCH SYNTETYCZNYCH (STAGING)
-- ==============================================================================
-- Docelowe środowisko: WYŁĄCZNIE Supabase Staging (tdlsxamxtygojxhmjjvp).
-- Zawartość:
--   - 1 fikcyjny gracz: E2E TEST PLAYER (active = false, izolowany przez parent_players)
--   - 5 syntetycznych kart tego gracza (po 1 dla każdej rarity: common, rare, epic, legendary, inferno)
-- Zasady:
--   - Brak modyfikacji 3 istniejących zawodników.
--   - Pełne UUID RFC 4122 v4 oraz unikalność (player_id, season, card_type).
--   - Weryfikacja stanu przed i po INSERT wewnątrz transakcji.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_base_players INTEGER := 0;
  v_existing_cards INTEGER := 0;
  v_existing_synth_player INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_base_players FROM public.players;
  IF v_base_players <> 3 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: Oczekiwano dokładnie 3 bazowych zawodników w public.players, znaleziono %.',
      v_base_players;
  END IF;

  SELECT COUNT(*) INTO v_existing_cards FROM public.card_definitions;
  IF v_existing_cards <> 0 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: Oczekiwano 0 rekordów w public.card_definitions, znaleziono %.',
      v_existing_cards;
  END IF;

  SELECT COUNT(*) INTO v_existing_synth_player
  FROM public.players
  WHERE id = 'e2e57000-0000-4e2e-8000-000000000001'::uuid;
  IF v_existing_synth_player <> 0 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: Fikcyjny gracz E2E (e2e57000-0000-4e2e-8000-000000000001) już istnieje.';
  END IF;
END $$;

INSERT INTO public.players (id, display_name, active)
VALUES (
  'e2e57000-0000-4e2e-8000-000000000001'::uuid,
  'E2E TEST PLAYER',
  false
);

INSERT INTO public.card_definitions (
  id,
  player_id,
  season,
  card_type,
  card_name,
  title,
  rarity,
  is_active
) VALUES
  (
    'e2e57000-0001-4e2e-8000-000000000001'::uuid,
    'e2e57000-0000-4e2e-8000-000000000001'::uuid,
    '2026/27',
    'base',
    'E2E TEST PLAYER — BASE',
    'BASE',
    'common',
    true
  ),
  (
    'e2e57000-0002-4e2e-8000-000000000002'::uuid,
    'e2e57000-0000-4e2e-8000-000000000001'::uuid,
    '2026/27',
    'matchday',
    'E2E TEST PLAYER — MATCHDAY',
    'MATCHDAY',
    'rare',
    true
  ),
  (
    'e2e57000-0003-4e2e-8000-000000000003'::uuid,
    'e2e57000-0000-4e2e-8000-000000000001'::uuid,
    '2026/27',
    'goal_hunter',
    'E2E TEST PLAYER — GOAL HUNTER',
    'GOAL HUNTER',
    'epic',
    true
  ),
  (
    'e2e57000-0004-4e2e-8000-000000000004'::uuid,
    'e2e57000-0000-4e2e-8000-000000000001'::uuid,
    '2026/27',
    'mvp',
    'E2E TEST PLAYER — MVP',
    'MVP',
    'legendary',
    true
  ),
  (
    'e2e57000-0005-4e2e-8000-000000000005'::uuid,
    'e2e57000-0000-4e2e-8000-000000000001'::uuid,
    '2026/27',
    'inferno',
    'E2E TEST PLAYER — INFERNO',
    'INFERNO',
    'inferno',
    true
  );

DO $$
DECLARE
  v_synth_player_cnt INTEGER := 0;
  v_total_players_cnt INTEGER := 0;
  v_synth_cards_cnt INTEGER := 0;
  v_total_cards_cnt INTEGER := 0;
  v_distinct_rarities INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_synth_player_cnt
  FROM public.players
  WHERE id = 'e2e57000-0000-4e2e-8000-000000000001'::uuid
    AND display_name = 'E2E TEST PLAYER'
    AND active = false;

  SELECT COUNT(*) INTO v_total_players_cnt FROM public.players;
  SELECT COUNT(*) INTO v_total_cards_cnt FROM public.card_definitions;

  SELECT COUNT(*), COUNT(DISTINCT rarity)
  INTO v_synth_cards_cnt, v_distinct_rarities
  FROM public.card_definitions
  WHERE id IN (
    'e2e57000-0001-4e2e-8000-000000000001'::uuid,
    'e2e57000-0002-4e2e-8000-000000000002'::uuid,
    'e2e57000-0003-4e2e-8000-000000000003'::uuid,
    'e2e57000-0004-4e2e-8000-000000000004'::uuid,
    'e2e57000-0005-4e2e-8000-000000000005'::uuid
  )
    AND player_id = 'e2e57000-0000-4e2e-8000-000000000001'::uuid
    AND season = '2026/27'
    AND is_active = true
    AND rarity IN ('common', 'rare', 'epic', 'legendary', 'inferno');

  IF v_synth_player_cnt <> 1 OR v_total_players_cnt <> 4 THEN
    RAISE EXCEPTION 'VERIFY_FAILED: synth_player=%, total_players=% (oczekiwano 1 i 4).',
      v_synth_player_cnt, v_total_players_cnt;
  END IF;

  IF v_synth_cards_cnt <> 5 OR v_total_cards_cnt <> 5 OR v_distinct_rarities <> 5 THEN
    RAISE EXCEPTION 'VERIFY_FAILED: synth_cards=%, total_cards=%, distinct_rarities=% (oczekiwano 5, 5, 5).',
      v_synth_cards_cnt, v_total_cards_cnt, v_distinct_rarities;
  END IF;
END $$;

COMMIT;

-- Podgląd odczytowy po COMMIT (zero PII):
SELECT id, display_name, active
FROM public.players
WHERE id = 'e2e57000-0000-4e2e-8000-000000000001'::uuid;

SELECT id, player_id, season, card_type, card_name, title, rarity, is_active
FROM public.card_definitions
WHERE player_id = 'e2e57000-0000-4e2e-8000-000000000001'::uuid
ORDER BY rarity;
