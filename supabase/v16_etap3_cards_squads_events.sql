-- ==========================================================================
-- ETAP 3 — DELTA 2018 GM: SQUADS, SPECIAL CARDS, GOALKEEPERS, EVENTS & CHALLENGES
-- Safe, additive, idempotent schema migration
-- ==========================================================================

-- 1. card_definitions — Allow player_id to be NULL for non-player cards (Coaches, Stadium, Crest)
alter table if exists public.card_definitions 
  alter column player_id drop not null;

alter table if exists public.card_definitions 
  add column if not exists category_type text not null default 'player';

-- 2. user_cards — Add protection (lock), in_squad flag and acquisition source
alter table if exists public.user_cards 
  add column if not exists is_locked boolean not null default false;

alter table if exists public.user_cards 
  add column if not exists in_squad boolean not null default false;

alter table if exists public.user_cards 
  add column if not exists acquisition_source text not null default 'pack';

-- 3. user_squads — Custom squad builder storage
create table if not exists public.user_squads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  squad_name text not null default 'Moja 11 DELTA',
  formation text not null default '2-3-1',
  slots jsonb not null default '[]'::jsonb,
  captain_card_id uuid references public.card_definitions(id) on delete set null,
  coach_card_id uuid references public.card_definitions(id) on delete set null,
  stadium_card_id uuid references public.card_definitions(id) on delete set null,
  crest_card_id uuid references public.card_definitions(id) on delete set null,
  squad_rating integer not null default 70,
  attack_rating integer not null default 70,
  midfield_rating integer not null default 70,
  defense_rating integer not null default 70,
  goalkeeper_rating integer not null default 70,
  chemistry_score integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_squad unique (user_id)
);

create index if not exists idx_user_squads_user on public.user_squads(user_id);

-- 4. goalkeeper_match_stats — Goalkeeper specific performance stats
create table if not exists public.goalkeeper_match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  minutes_played integer not null default 60,
  goals_conceded integer not null default 0,
  saves integer not null default 0,
  clean_sheet boolean not null default false,
  penalty_saves integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint uq_gk_match_player unique (match_id, player_id)
);

create index if not exists idx_gk_stats_match on public.goalkeeper_match_stats(match_id);
create index if not exists idx_gk_stats_player on public.goalkeeper_match_stats(player_id);

-- 5. custom_team_events — Extra events created by admin (mini-games, tournaments, team trips)
create table if not exists public.custom_team_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'mini_game',
  event_date date not null,
  start_time text,
  end_time text,
  location text,
  image_url text,
  max_participants integer,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_events_date on public.custom_team_events(event_date);

-- 6. user_claimed_challenges — Panini / Collection challenge claims
create table if not exists public.user_claimed_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text not null,
  claimed_at timestamptz not null default now(),
  reward_summary jsonb not null default '{}'::jsonb,
  constraint uq_user_claimed_challenge unique (user_id, challenge_id)
);

create index if not exists idx_claimed_challenges_user on public.user_claimed_challenges(user_id);

-- 7. admin_card_grants — Audit log for admin granted special cards
create table if not exists public.admin_card_grants (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.card_definitions(id) on delete cascade,
  reason text not null,
  granted_at timestamptz not null default now()
);

-- 8. Enable RLS
alter table public.user_squads enable row level security;
alter table public.goalkeeper_match_stats enable row level security;
alter table public.custom_team_events enable row level security;
alter table public.user_claimed_challenges enable row level security;
alter table public.admin_card_grants enable row level security;

-- 9. RLS Policies
-- user_squads
drop policy if exists user_squads_read_all on public.user_squads;
create policy user_squads_read_all on public.user_squads for select to authenticated using (true);

drop policy if exists user_squads_manage_own on public.user_squads;
create policy user_squads_manage_own on public.user_squads for all to authenticated using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

-- goalkeeper_match_stats
drop policy if exists gk_stats_read_all on public.goalkeeper_match_stats;
create policy gk_stats_read_all on public.goalkeeper_match_stats for select to authenticated using (true);

drop policy if exists gk_stats_staff_manage on public.goalkeeper_match_stats;
create policy gk_stats_staff_manage on public.goalkeeper_match_stats for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- custom_team_events
drop policy if exists custom_events_read_all on public.custom_team_events;
create policy custom_events_read_all on public.custom_team_events for select to authenticated using (true);

drop policy if exists custom_events_staff_manage on public.custom_team_events;
create policy custom_events_staff_manage on public.custom_team_events for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- user_claimed_challenges
drop policy if exists challenges_read_own on public.user_claimed_challenges;
create policy challenges_read_own on public.user_claimed_challenges for select to authenticated using (user_id = auth.uid() or public.is_staff());

drop policy if exists challenges_insert_own on public.user_claimed_challenges;
create policy challenges_insert_own on public.user_claimed_challenges for insert to authenticated with check (user_id = auth.uid() or public.is_staff());

-- admin_card_grants
drop policy if exists card_grants_read on public.admin_card_grants;
create policy card_grants_read on public.admin_card_grants for select to authenticated using (user_id = auth.uid() or public.is_staff());

drop policy if exists card_grants_staff_all on public.admin_card_grants;
create policy card_grants_staff_all on public.admin_card_grants for all to authenticated using (public.is_staff()) with check (public.is_staff());
