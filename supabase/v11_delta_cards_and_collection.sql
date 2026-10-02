-- ==========================================================================
-- DELTA CARDS & COLLECTION — V11.0 DATABASE MIGRATION
-- Safe, additive, idempotent schema migration
-- ==========================================================================

-- 1. Definicje typów paczek (Katalog paczek)
create table if not exists public.pack_definitions (
  id text primary key,
  name text not null,
  description text,
  cards_count integer not null default 3,
  drop_rates jsonb not null default '{"common": 60, "rare": 25, "epic": 10, "legendary": 4, "inferno": 1}'::jsonb,
  min_rarity text default 'common',
  theme text not null default 'gold',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Definicje wzorów kart (Katalog kart)
create table if not exists public.card_definitions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season text not null default '2026/27',
  card_type text not null,
  card_name text not null,
  title text not null,
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary', 'inferno')),
  artwork_url text,
  artwork_pose text default 'standard',
  frame_theme text default 'gold',
  card_number integer,
  is_active boolean not null default true,
  is_limited boolean not null default false,
  edition_size integer,
  description text,
  lore text,
  match_id uuid references public.matches(id) on delete set null,
  special_event_id text,
  created_at timestamptz not null default now(),
  constraint uq_card_definition unique (player_id, season, card_type)
);

create index if not exists idx_card_definitions_player on public.card_definitions(player_id);
create index if not exists idx_card_definitions_season on public.card_definitions(season);
create index if not exists idx_card_definitions_rarity on public.card_definitions(rarity);

-- 3. Punkty Delta Points (DP)
create table if not exists public.user_delta_points (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  points_balance integer not null default 0,
  total_earned integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 4. Oczekujące (nieotwarte) paczki użytkownika
create table if not exists public.user_unopened_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_type_id text not null references public.pack_definitions(id) on delete cascade,
  source_reason text,
  is_opened boolean not null default false,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_unopened_packs_user on public.user_unopened_packs(user_id, is_opened);

-- 5. Posiadane karty w kolekcji użytkownika
create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.card_definitions(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  duplicates_count integer not null default 0,
  is_favorite boolean not null default false,
  constraint uq_user_card unique (user_id, card_id)
);

create index if not exists idx_user_cards_user on public.user_cards(user_id);
create index if not exists idx_user_cards_card on public.user_cards(card_id);

-- 6. Logi i historia otwierania paczek
create table if not exists public.pack_opening_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_type_id text not null,
  cards_drawn jsonb not null,
  delta_points_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pack_opening_logs_user on public.pack_opening_logs(user_id, created_at desc);

-- 7. Włączenie RLS dla wszystkich tabel
alter table public.pack_definitions enable row level security;
alter table public.card_definitions enable row level security;
alter table public.user_delta_points enable row level security;
alter table public.user_unopened_packs enable row level security;
alter table public.user_cards enable row level security;
alter table public.pack_opening_logs enable row level security;

-- 8. Bezpieczne polityki RLS
do $$
begin
  -- pack_definitions
  drop policy if exists "pack_definitions_read_all" on public.pack_definitions;
  create policy "pack_definitions_read_all" on public.pack_definitions for select to authenticated using (true);

  drop policy if exists "pack_definitions_staff_all" on public.pack_definitions;
  create policy "pack_definitions_staff_all" on public.pack_definitions for all to authenticated using (public.is_staff()) with check (public.is_staff());

  -- card_definitions
  drop policy if exists "card_definitions_read_all" on public.card_definitions;
  create policy "card_definitions_read_all" on public.card_definitions for select to authenticated using (true);

  drop policy if exists "card_definitions_staff_all" on public.card_definitions;
  create policy "card_definitions_staff_all" on public.card_definitions for all to authenticated using (public.is_staff()) with check (public.is_staff());

  -- user_delta_points
  drop policy if exists "user_delta_points_read_own" on public.user_delta_points;
  create policy "user_delta_points_read_own" on public.user_delta_points for select to authenticated using (user_id = auth.uid() or public.is_staff());

  drop policy if exists "user_delta_points_upsert_own" on public.user_delta_points;
  create policy "user_delta_points_upsert_own" on public.user_delta_points for all to authenticated using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

  -- user_unopened_packs
  drop policy if exists "user_unopened_packs_read_own" on public.user_unopened_packs;
  create policy "user_unopened_packs_read_own" on public.user_unopened_packs for select to authenticated using (user_id = auth.uid() or public.is_staff());

  drop policy if exists "user_unopened_packs_modify_own" on public.user_unopened_packs;
  create policy "user_unopened_packs_modify_own" on public.user_unopened_packs for all to authenticated using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

  -- user_cards
  drop policy if exists "user_cards_read_own" on public.user_cards;
  create policy "user_cards_read_own" on public.user_cards for select to authenticated using (user_id = auth.uid() or public.is_staff());

  drop policy if exists "user_cards_modify_own" on public.user_cards;
  create policy "user_cards_modify_own" on public.user_cards for all to authenticated using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

  -- pack_opening_logs
  drop policy if exists "pack_opening_logs_read_own" on public.pack_opening_logs;
  create policy "pack_opening_logs_read_own" on public.pack_opening_logs for select to authenticated using (user_id = auth.uid() or public.is_staff());

  drop policy if exists "pack_opening_logs_insert_own" on public.pack_opening_logs;
  create policy "pack_opening_logs_insert_own" on public.pack_opening_logs for insert to authenticated with check (user_id = auth.uid() or public.is_staff());
end $$;

-- 9. Seed domyślnych typów paczek
insert into public.pack_definitions (id, name, description, cards_count, drop_rates, min_rarity, theme)
values
  ('standard_pack', 'Paczka Standardowa', '3 karty zawodników DELTA GM. Gwarantowana min. 1 karta Common.', 3, '{"common": 70, "rare": 22, "epic": 6, "legendary": 1.8, "inferno": 0.2}'::jsonb, 'common', 'gold'),
  ('matchday_booster', 'Matchday Booster', '4 karty zawodników DELTA GM. Zwiększona szansa na karty meczowe!', 4, '{"common": 50, "rare": 35, "epic": 11, "legendary": 3.5, "inferno": 0.5}'::jsonb, 'rare', 'gold'),
  ('gold_booster', 'Gold Booster', '5 kart zawodników DELTA GM. Gwarantowana min. 1 karta Rare!', 5, '{"common": 40, "rare": 42, "epic": 14, "legendary": 3.5, "inferno": 0.5}'::jsonb, 'rare', 'gold'),
  ('inferno_booster', '🔥 Inferno Booster', '5 kart z podwyższoną szansą na ognistą kartę INFERNO!', 5, '{"common": 20, "rare": 40, "epic": 28, "legendary": 9, "inferno": 3}'::jsonb, 'epic', 'inferno'),
  ('legend_booster', '👑 Legend Pack', '6 kart mistrzowskich. Gwarantowana min. 1 karta Legendary!', 6, '{"common": 10, "rare": 35, "epic": 35, "legendary": 17, "inferno": 3}'::jsonb, 'legendary', 'legend')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cards_count = excluded.cards_count,
  drop_rates = excluded.drop_rates,
  min_rarity = excluded.min_rarity,
  theme = excluded.theme;
