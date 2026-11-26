-- ==============================================================================
-- DELTA DEV LAB — SYNTHETIC QA DATASET (SEED_DEV_LAB_QA.SQL)
-- 100% FIKCYJNE DANE TESTOWE (ZERO DANYCH OSOBOWYCH / ZERO REALNYCH DZIECI)
-- ==============================================================================

-- 1. PROFILE UŻYTKOWNIKÓW I ROLE (FIKCYJNE KONTA TESTOWE)
insert into public.profiles (id, display_name, role, created_at)
values
  ('11111111-1111-4111-a111-000000000001', 'Jan Testowy (Rodzic A)', 'parent', now()),
  ('22222222-2222-4222-a222-000000000002', 'Anna Testowa (Rodzic B)', 'parent', now()),
  ('33333333-3333-4333-a333-000000000003', 'Młody Zawodnik (Konto Gracza)', 'player', now()),
  ('44444444-4444-4444-a444-000000000004', 'Trener Tomasz (Drużyna A)', 'coach', now()),
  ('55555555-5555-4555-a555-000000000005', 'Trener Michał (Drużyna B)', 'coach', now()),
  ('66666666-6666-4666-a666-000000000006', 'Administrator QA', 'admin', now())
on conflict (id) do nothing;

-- 2. DRUŻYNY TESTOWE (2 DRUŻYNY)
insert into public.teams (id, name, cohort_year, slug, category, active)
values
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'DELTA 2018 Czerwoni (A)', 2018, 'delta-2018-czerwoni-qa', 'U-8', true),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'DELTA 2018 Biali (B)', 2018, 'delta-2018-biali-qa', 'U-8', true)
on conflict (slug) do nothing;

-- 3. 16 SYNTETYCZNYCH ZAWODNIKÓW (PO 8 W DRUŻYNIE)
insert into public.players (id, display_name, shirt_number, position, active)
values
  -- Drużyna A (1-8)
  ('a0000001-0000-4000-a000-000000000001', 'Kacper Fikcyjny', '1', 'Bramkarz', true),
  ('a0000002-0000-4000-a000-000000000002', 'Oliwier Syntetyczny', '4', 'Obrońca', true),
  ('a0000003-0000-4000-a000-000000000003', 'Antoni Fikcyjny', '7', 'Pomocnik', true),
  ('a0000004-0000-4000-a000-000000000004', 'Ignacy Syntetyczny', '9', 'Napastnik', true),
  ('a0000005-0000-4000-a000-000000000005', 'Leon Fikcyjny', '10', 'Napastnik', true),
  ('a0000006-0000-4000-a000-000000000006', 'Stanisław Syntetyczny', '14', 'Pomocnik', true),
  ('a0000007-0000-4000-a000-000000000007', 'Tymon Fikcyjny', '21', 'Obrońca', true),
  ('a0000008-0000-4000-a000-000000000008', 'Maksymilian Syntetyczny', '99', 'Bramkarz', true),
  -- Drużyna B (9-16)
  ('b0000001-0000-4000-b000-000000000009', 'Franciszek Fikcyjny', '1', 'Bramkarz', true),
  ('b0000002-0000-4000-b000-000000000010', 'Jakub Syntetyczny', '5', 'Obrońca', true),
  ('b0000003-0000-4000-b000-000000000011', 'Szymon Fikcyjny', '8', 'Pomocnik', true),
  ('b0000004-0000-4000-b000-000000000012', 'Filip Syntetyczny', '11', 'Napastnik', true),
  ('b0000005-0000-4000-b000-000000000013', 'Nikodem Fikcyjny', '17', 'Napastnik', true),
  ('b0000006-0000-4000-b000-000000000014', 'Aleksander Syntetyczny', '23', 'Pomocnik', true),
  ('b0000007-0000-4000-b000-000000000015', 'Wojciech Fikcyjny', '77', 'Obrońca', true),
  ('b0000008-0000-4000-b000-000000000016', 'Krzysztof Syntetyczny', '12', 'Bramkarz', true)
on conflict (id) do nothing;

-- 4. PRZYPISANIE ZAWODNIKÓW DO DRUŻYN
insert into public.team_players (team_id, player_id, roster_role, status)
values
  -- Drużyna A
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000001-0000-4000-a000-000000000001', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000002-0000-4000-a000-000000000002', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000003-0000-4000-a000-000000000003', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000004-0000-4000-a000-000000000004', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000005-0000-4000-a000-000000000005', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000006-0000-4000-a000-000000000006', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000007-0000-4000-a000-000000000007', 'primary', 'active'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-000000000001', 'a0000008-0000-4000-a000-000000000008', 'primary', 'active'),
  -- Drużyna B
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000001-0000-4000-b000-000000000009', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000002-0000-4000-b000-000000000010', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000003-0000-4000-b000-000000000011', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000004-0000-4000-b000-000000000012', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000005-0000-4000-b000-000000000013', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000006-0000-4000-b000-000000000014', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000007-0000-4000-b000-000000000015', 'primary', 'active'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-000000000002', 'b0000008-0000-4000-b000-000000000016', 'primary', 'active')
on conflict do nothing;

-- 5. RELACJE RODZIC - DZIECKO (PARENT_PLAYERS)
insert into public.parent_players (parent_id, player_id)
values
  -- Rodzic A ma dzieci Kacpra (1) i Antoniego (3) w Drużynie A
  ('11111111-1111-4111-a111-000000000001', 'a0000001-0000-4000-a000-000000000001'),
  ('11111111-1111-4111-a111-000000000001', 'a0000003-0000-4000-a000-000000000003'),
  -- Rodzic B ma dziecko Jakuba (10) w Drużynie B
  ('22222222-2222-4222-a222-000000000002', 'b0000002-0000-4000-b000-000000000010')
on conflict do nothing;

-- 6. SESJA TRENINGOWA I GRY KONTROLNE
insert into public.training_sessions (id, training_date, start_time, end_time, location, title, notes, created_by)
values (
  'c0000001-0000-4000-c000-000000000001',
  '2026-11-25',
  '17:00:00',
  '18:30:00',
  'Warszawianka Boisko A',
  'Trening Taktyczny U-8',
  'Przygotowanie do derbów',
  '44444444-4444-4444-a444-000000000004'
) on conflict (id) do nothing;

-- 7. OBECNOŚĆ NA TRENINGU
insert into public.training_attendance (training_id, player_id, status, updated_by)
values
  ('c0000001-0000-4000-c000-000000000001', 'a0000001-0000-4000-a000-000000000001', 'present', '44444444-4444-4444-a444-000000000004'),
  ('c0000001-0000-4000-c000-000000000001', 'a0000002-0000-4000-a000-000000000002', 'present', '44444444-4444-4444-a444-000000000004'),
  ('c0000001-0000-4000-c000-000000000001', 'a0000003-0000-4000-a000-000000000003', 'absent', '44444444-4444-4444-a444-000000000004')
on conflict (training_id, player_id) do nothing;

-- 8. GRA KONTROLNA
insert into public.training_games (id, training_id, team_a_name, team_b_name, team_a_score, team_b_score, created_by)
values (
  'd0000001-0000-4000-d000-000000000001',
  'c0000001-0000-4000-c000-000000000001',
  'Czerwoni (A)',
  'Złoci (B)',
  2,
  1,
  '44444444-4444-4444-a444-000000000004'
) on conflict (id) do nothing;

-- 9. WYDARZENIA W SMART CALENDAR
insert into public.team_events (
  id, team_id, title, event_type, event_date, start_time, end_time, location, details, visibility, status, is_approved, created_by
)
values
  -- Oficjalny mecz ligowy (publiczny drużynowy Drużyny A)
  (
    'e0000001-0000-4000-e000-000000000001',
    'aaaaaaaa-aaaa-4aaa-aaaa-000000000001',
    'Mecz Ligowy DELTA vs SEMP',
    'match',
    '2026-11-28',
    '10:00:00',
    '11:30:00',
    'ul. Jeziorna 2',
    'Zbiórka 9:15',
    'public',
    'scheduled',
    true,
    '44444444-4444-4444-a444-000000000004'
  ),
  -- Wydarzenie prywatne Rodzica A
  (
    'e0000002-0000-4000-e000-000000000002',
    null,
    'Fizjoterapeuta Kacpra',
    'medical',
    '2026-11-29',
    '15:00:00',
    '16:00:00',
    'Klinika Sportowa',
    'Kontrola kolana',
    'private',
    'scheduled',
    false,
    '11111111-1111-4111-a111-000000000001'
  ),
  -- Wydarzenie prywatne Rodzica B
  (
    'e0000003-0000-4000-e000-000000000003',
    null,
    'Urodziny Rodzina B',
    'family_event',
    '2026-11-30',
    '16:00:00',
    '19:00:00',
    'Dom',
    'Prywatne',
    'private',
    'scheduled',
    false,
    '22222222-2222-4222-a222-000000000002'
  )
on conflict (id) do nothing;
