-- ==============================================================================
-- DELTA INFERNO 3.0 — ETAP ANIM-1A.3: STAGING READ-ONLY PRE-FLIGHT CHECKS
-- Target ONLY: STAGING (tdlsxamxtygojxhmjjvp) — NIGDY nie uruchamiaj zapisów.
-- Skrypt zawiera wyłącznie zapytania SELECT (100% READ ONLY).
-- ==============================================================================

-- 1. Tabele i kolumny krytyczne dla otwierania paczek i ekonomii
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'user_unopened_packs',
    'user_cards',
    'user_delta_points',
    'delta_points_transactions',
    'pack_opening_logs',
    'card_definitions',
    'pack_definitions',
    'pack_types'
  )
ORDER BY table_name, ordinal_position;

-- 2. Klucze obce (Foreign Keys)
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'user_unopened_packs',
    'user_cards',
    'user_delta_points',
    'delta_points_transactions',
    'pack_opening_logs'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- 3. Ograniczenia UNIQUE, PRIMARY KEY i CHECK oraz indeksy unikalne
SELECT
  t.relname AS table_name,
  c.conname AS constraint_name,
  c.contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN (
    'user_unopened_packs',
    'user_cards',
    'user_delta_points',
    'delta_points_transactions',
    'pack_opening_logs',
    'card_definitions'
  )
ORDER BY t.relname, c.contype, c.conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_cards', 'user_unopened_packs', 'pack_opening_logs', 'delta_points_transactions')
ORDER BY tablename, indexname;

-- 4. Istniejące funkcje RPC oraz uprawnienia EXECUTE
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('apply_delta_points_transaction', 'purchase_pack_atomic', 'open_pack_atomic', 'is_staff');

SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('apply_delta_points_transaction', 'purchase_pack_atomic', 'open_pack_atomic')
ORDER BY routine_name, grantee;

-- 5. Status RLS oraz aktualne polityki na tabelach paczek, kart i punktów
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('user_cards', 'user_unopened_packs', 'user_delta_points', 'delta_points_transactions', 'pack_opening_logs')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_cards', 'user_unopened_packs', 'user_delta_points', 'delta_points_transactions', 'pack_opening_logs')
ORDER BY tablename, policyname;

-- 6. Weryfikacja definicji stawek w purchase_pack_atomic (zgodność z Scenario B: 60/100/150/300/450)
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'purchase_pack_atomic';

-- 7. Podsumowanie istniejących definicji kart i paczek (wyłącznie agregaty — zero PII)
SELECT rarity, COUNT(*) AS card_count
FROM public.card_definitions
GROUP BY rarity
ORDER BY rarity;

SELECT id, name, cards_count, min_rarity, is_active
FROM public.pack_definitions
ORDER BY cards_count, id;
