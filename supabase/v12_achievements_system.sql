-- ==========================================================================
-- DELTA 2018 GM — V12.0 SYSTEM OSIĄGNIĘĆ I PROGRESU (ACHIEVEMENTS & BADGES)
-- Idempotent, safe additive migration
-- ==========================================================================

-- 1. Tabela definicji osiągnięć
create table if not exists public.achievement_definitions (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('match', 'training', 'collection', 'parent', 'special')),
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'diamond')),
  target_value integer not null default 1,
  unit text not null default 'szt',
  icon_name text not null default 'Award',
  reward_dp integer not null default 50,
  reward_pack_type text,
  for_entity text not null default 'player' check (for_entity in ('player', 'user', 'both')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Tabela postępów i odblokowanych osiągnięć użytkowników / zawodników
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id) on delete cascade,
  current_value integer not null default 0,
  is_unlocked boolean not null default false,
  unlocked_at timestamptz,
  claimed_reward boolean not null default false,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint uq_user_achievement unique (user_id, player_id, achievement_id)
);

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);
create index if not exists idx_user_achievements_player on public.user_achievements(player_id);
create index if not exists idx_user_achievements_unlocked on public.user_achievements(is_unlocked, claimed_reward);

-- 3. RLS Policies
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "achievement defs select all" on public.achievement_definitions;
create policy "achievement defs select all" on public.achievement_definitions
for select to authenticated using (true);

drop policy if exists "user achievements own select" on public.user_achievements;
create policy "user achievements own select" on public.user_achievements
for select to authenticated using (true);

drop policy if exists "user achievements admin all" on public.user_achievements;
create policy "user achievements admin all" on public.user_achievements
for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 4. PRE-POPULATE 30 OFICJALNYCH OSIĄGNIĘĆ DELTA 2018
insert into public.achievement_definitions (id, title, description, category, tier, target_value, unit, icon_name, reward_dp, reward_pack_type, for_entity, sort_order)
values
  -- MECZE & WYSTĘPY
  ('first_match', 'Debiut w Barwach DELTY', 'Rozegraj swój pierwszy oficjalny mecz w roczniku 2018.', 'match', 'bronze', 1, 'mecz', 'ShieldCheck', 50, null, 'player', 10),
  ('match_veteran_10', 'Meczowy Bojownik', 'Rozegraj 10 meczów w koszulce DELTY.', 'match', 'silver', 10, 'meczów', 'Flame', 100, null, 'player', 20),
  ('match_veteran_25', 'Filar Drużyny', 'Zagraj w 25 meczach klubowych rocznika 2018.', 'match', 'gold', 25, 'meczów', 'Crown', 250, 'matchday_booster', 'player', 30),
  ('first_goal', 'Pierwszy Błysk', 'Zdobądź swoją pierwszą oficjalną bramkę w meczu.', 'match', 'bronze', 1, 'gol', 'Target', 50, null, 'player', 40),
  ('scorer_5', 'Młody Snajper', 'Strzel łącznie 5 goli w meczach DELTY.', 'match', 'bronze', 5, 'goli', 'Zap', 100, null, 'player', 50),
  ('scorer_15', 'Postrach Bramkarzy', 'Strzel 15 goli w meczach DELTY.', 'match', 'silver', 15, 'goli', 'Flame', 200, null, 'player', 60),
  ('scorer_30', 'Król Strzelców DELTY', 'Zdobądź imponujące 30 goli w rozgrywkach meczowych.', 'match', 'diamond', 30, 'goli', 'Trophy', 400, 'gold_booster', 'player', 70),
  ('first_hattrick', 'Klasyczny Hat-trick!', 'Strzel 3 lub więcej goli w jednym spotkaniu.', 'match', 'gold', 1, 'hat-trick', 'Sparkles', 300, 'matchday_booster', 'player', 80),
  ('first_assist', 'Zespołowy Gracz', 'Zanotuj swoją pierwszą asystę przy bramce kolegi.', 'match', 'bronze', 1, 'asysta', 'Compass', 50, null, 'player', 90),
  ('assist_master_10', 'Magister Asyst', 'Wypracuj 10 asyst otwierających drogę do bramki.', 'match', 'silver', 10, 'asyst', 'Star', 200, null, 'player', 100),
  ('captain_armband', 'Prawdziwy Lider', 'Wyjdź na boisko z opaską kapitana drużyny DELTY.', 'match', 'silver', 1, 'mecz', 'Shield', 150, null, 'player', 110),
  ('starter_lineup_5', 'W Pierwszej Szóstce', 'Zagraj w wyjściowym składzie w 5 meczach.', 'match', 'bronze', 5, 'meczów', 'Users', 100, null, 'player', 120),

  -- TRENINGI & ZAANGAŻOWANIE
  ('first_training', 'Pierwszy Gwizdek', 'Zamelduj się na pierwszym treningu rocznika 2018.', 'training', 'bronze', 1, 'trening', 'CheckCircle2', 40, null, 'player', 130),
  ('training_regular_10', 'Treningowa Rutyna', 'Weź udział w 10 treningach klubowych.', 'training', 'bronze', 10, 'treningów', 'Activity', 100, null, 'player', 140),
  ('training_warrior_25', 'Żelazny Treningowiec', 'Zalicz 25 treningów z drużyną DELTY.', 'training', 'silver', 25, 'treningów', 'Dumbbell', 250, null, 'player', 150),
  ('training_legend_50', 'Mistrz Dyscypliny', 'Osiągnij pułap 50 odbytych treningów.', 'training', 'diamond', 50, 'treningów', 'Medal', 500, 'inferno_booster', 'player', 160),
  ('training_goal_5', 'Treningowy Egzekutor', 'Strzel 5 goli w treningowych gierkach wewnętrznych.', 'training', 'bronze', 5, 'goli', 'Crosshair', 75, null, 'player', 170),
  ('training_goal_20', 'Bombardier z Treningów', 'Strzel 20 goli w gierkach treningowych A vs B.', 'training', 'silver', 20, 'goli', 'Zap', 200, null, 'player', 180),
  ('training_game_winner_5', 'Zwycięska Drużyna', 'Wygraj 5 gierek treningowych z zespołem.', 'training', 'bronze', 5, 'wygranych', 'Flag', 100, null, 'player', 190),
  ('training_streak_5', '100% Frekwencji', 'Bądź obecny na 5 treningach z rzędu bez żadnej nieobecności.', 'training', 'gold', 5, 'treningów', 'Flame', 250, 'matchday_booster', 'player', 200),

  -- KOLEKCJONER KART & PACZKI
  ('open_first_pack', 'Otwarcie Sezonu', 'Otwórz swoją pierwszą paczkę kart DELTA CARDS.', 'collection', 'bronze', 1, 'paczka', 'Gift', 50, null, 'user', 210),
  ('collector_10_cards', 'Młody Kolekcjoner', 'Zbierz 10 unikalnych kart zawodników w swoim albumie.', 'collection', 'bronze', 10, 'kart', 'Layers', 100, null, 'user', 220),
  ('collector_team_complete', 'Cała DELTA 2018', 'Zbierz karty wszystkich aktywnych zawodników drużyny!', 'collection', 'diamond', 1, 'komplet', 'Award', 600, 'legend_booster', 'user', 230),
  ('pull_epic_or_better', 'Czyste Złoto', 'Traf w paczce rzadką kartę: Epic, Legendary lub Inferno!', 'collection', 'gold', 1, 'karta', 'Sparkles', 200, null, 'user', 240),
  ('daily_spin_streak_3', 'Koło w Ruchu', 'Zakręć Daily Inferno Spin przez 3 dni.', 'collection', 'bronze', 3, 'kręcenia', 'RotateCw', 100, null, 'user', 250),
  ('first_trade', 'Klubowy Kupiec', 'Wymień się kartą z innym rodzicem na DELTA Trade Hub.', 'collection', 'silver', 1, 'wymiana', 'ArrowLeftRight', 150, null, 'user', 260),

  -- KLUB & RODZIC
  ('parent_link_active', 'Oficjalny Opiekun', 'Połącz konto rodzica z profilem swojego zawodnika.', 'parent', 'bronze', 1, 'profil', 'Heart', 100, null, 'user', 270),
  ('push_notifications_on', 'Zawsze na Bieżąco', 'Włącz powiadomienia push o meczach i zbiórkach.', 'parent', 'bronze', 1, 'zgoda', 'Bell', 50, null, 'user', 280),
  ('match_rsvp_ahead_5', 'Wzorowy Rodzic', 'Potwierdź obecność na 5 meczach z wyprzedzeniem.', 'parent', 'silver', 5, 'potwierdzeń', 'CalendarCheck', 150, null, 'user', 290),
  ('delta_points_tycoon_1000', 'Klubowy Milioner', 'Zdobądź łącznie 1000 punktów Delta Points (DP).', 'parent', 'diamond', 1000, 'DP', 'Coins', 500, 'gold_booster', 'user', 300)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  tier = excluded.tier,
  target_value = excluded.target_value,
  unit = excluded.unit,
  icon_name = excluded.icon_name,
  reward_dp = excluded.reward_dp,
  reward_pack_type = excluded.reward_pack_type,
  for_entity = excluded.for_entity,
  sort_order = excluded.sort_order;

select 'V12 ACHIEVEMENTS SYSTEM READY' as status;
