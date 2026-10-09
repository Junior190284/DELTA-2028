-- ==============================================================================
-- DELTA 2018 GM — CONSOLIDATED STAGING BOOTSTRAP MIGRATION (ETAP 8)
-- Project target: delta-2018-gm-staging
-- Execute once in Supabase SQL Editor on staging project.
-- ==============================================================================

-- 1. BASE TABLES & PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'parent' check (role in ('admin','coach','parent','player','guest')),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  shirt_number text,
  position text,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_players (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, player_id)
);

-- Helper security functions
create or replace function public.is_staff()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin','coach')
  );
$$;

create or replace function public.is_parent_of(target_player_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.parent_players
    where parent_id = (select auth.uid()) and player_id = target_player_id
  );
$$;

-- 2. MATCHES & ATTENDANCE & LINEUP
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  round_no int,
  match_date date not null,
  match_time text,
  venue text,
  home_team text not null default 'K.S. Delta Warszawa',
  away_team text not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled','played','cancelled','postponed','changed')),
  created_at timestamptz not null default now()
);

create table if not exists public.match_attendance (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('yes','no','maybe','present','absent','undecided')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create table if not exists public.match_lineup (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_starter boolean not null default false,
  is_captain boolean not null default false,
  primary key (match_id, player_id)
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null check (event_type in ('goal','assist','mvp','card_yellow','card_red')),
  player_id uuid references public.players(id) on delete cascade,
  assist_player_id uuid references public.players(id) on delete set null,
  minute int,
  created_at timestamptz not null default now()
);

-- 3. TRAINING CENTER
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_date date not null,
  start_time text,
  end_time text,
  location text not null default 'Górny Mokotów',
  title text not null default 'Trening rocznika 2018',
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.training_attendance (
  training_id uuid not null references public.training_sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'undecided' check (status in ('present','absent','undecided','yes','no','maybe')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (training_id, player_id)
);

create table if not exists public.training_games (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.training_sessions(id) on delete cascade,
  team_a_name text not null default 'Czerwoni',
  team_b_name text not null default 'Czarni',
  team_a_score int not null default 0,
  team_b_score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.training_game_players (
  game_id uuid not null references public.training_games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team text not null check (team in ('A','B')),
  primary key (game_id, player_id)
);

create table if not exists public.training_events (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.training_sessions(id) on delete cascade,
  game_id uuid references public.training_games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  event_type text not null check (event_type in ('goal','assist')),
  assist_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. CARDS, BOOSTERS & COLLECTIONS
create table if not exists public.card_definitions (
  id text primary key,
  player_id text,
  card_type text not null,
  rarity text not null default 'common',
  edition text not null default '2026/2027',
  ovr int not null default 75,
  title text not null,
  subtitle text,
  description text,
  theme text not null default 'base',
  is_animated boolean not null default false,
  is_secret boolean not null default false,
  image_url text,
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pack_types (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  cards_count int not null default 3,
  cost_dp int not null default 0,
  guaranteed_rarity text,
  drop_rates jsonb not null default '{}'::jsonb,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_unopened_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_type_id text not null references public.pack_types(id) on delete cascade,
  source text not null default 'free_reward',
  is_opened boolean not null default false,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null references public.card_definitions(id) on delete cascade,
  duplicates_count int not null default 0,
  is_locked boolean not null default false,
  acquired_at timestamptz not null default now(),
  constraint uq_user_card unique(user_id, card_id)
);

create table if not exists public.user_delta_points (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  points_balance int not null default 0,
  total_earned int not null default 0,
  total_spent int not null default 0,
  updated_at timestamptz not null default now()
);

-- 5. ACHIEVEMENTS SYSTEM
create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  granted_by text not null default 'SYSTEM',
  metadata jsonb default '{}'::jsonb,
  constraint uq_player_achievement unique(player_id, achievement_id)
);

-- 6. CENTRAL SYSTEM EVENTS & CHANGE DETECTOR
create table if not exists public.delta_system_events (
  id text primary key,
  type text not null,
  title text not null,
  message text not null,
  source text not null default 'DELTA_SYSTEM',
  importance text not null default 'NORMAL' check (importance in ('INFO','NORMAL','IMPORTANT','URGENT')),
  related_entity_type text,
  related_entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.delta_change_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  field_name text not null,
  old_value text,
  new_value text,
  source text not null default 'DELTA_SYNC',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_event_reads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id text not null,
  seen_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_user_event_read unique(user_id, event_id)
);

-- 7. CLUB UPDATES & DELTA SYNC LOGS
create table if not exists public.club_updates (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null default 'K.S. Delta Warszawa',
  source_url text not null,
  title text not null,
  body text,
  priority int not null default 0,
  published_at timestamptz not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.delta_sync_log (
  id bigint generated always as identity primary key,
  status text not null,
  items_found int not null default 0,
  items_inserted int not null default 0,
  items_updated int not null default 0,
  changes_detected int not null default 0,
  duration_ms int not null default 0,
  details text,
  created_at timestamptz not null default now()
);

-- 8. PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  preferences jsonb default '{"matches":true,"schedule_changes":true,"trainings":true,"lineup":true,"results":true,"fantasy":true,"achievements":true,"gallery":true,"tv":true,"club_news":true}'::jsonb,
  last_used_at timestamptz default now(),
  created_at timestamptz not null default now()
);

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.parent_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendance enable row level security;
alter table public.match_lineup enable row level security;
alter table public.match_events enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_attendance enable row level security;
alter table public.card_definitions enable row level security;
alter table public.pack_types enable row level security;
alter table public.user_unopened_packs enable row level security;
alter table public.user_cards enable row level security;
alter table public.user_delta_points enable row level security;
alter table public.player_achievements enable row level security;
alter table public.delta_system_events enable row level security;
alter table public.delta_change_history enable row level security;
alter table public.user_event_reads enable row level security;
alter table public.club_updates enable row level security;
alter table public.delta_sync_log enable row level security;
alter table public.push_subscriptions enable row level security;

-- Basic Read Policies
create policy "Public read players" on public.players for select using (true);
create policy "Public read matches" on public.matches for select using (true);
create policy "Public read attendance" on public.match_attendance for select using (true);
create policy "Public read training" on public.training_sessions for select using (true);
create policy "Public read training attendance" on public.training_attendance for select using (true);
create policy "Public read card definitions" on public.card_definitions for select using (true);
create policy "Public read pack types" on public.pack_types for select using (true);
create policy "Public read system events" on public.delta_system_events for select using (true);
create policy "Public read club updates" on public.club_updates for select using (true);
create policy "Public read event reads" on public.user_event_reads for select using (true);

-- User-specific Policies
create policy "Own profile select" on public.profiles for select using (id = (select auth.uid()));
create policy "Own cards select" on public.user_cards for select using (user_id = (select auth.uid()));
create policy "Own packs select" on public.user_unopened_packs for select using (user_id = (select auth.uid()));
create policy "Own points select" on public.user_delta_points for select using (user_id = (select auth.uid()));
create policy "Own push select" on public.push_subscriptions for select using (user_id = (select auth.uid()));
create policy "Own push manage" on public.push_subscriptions for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Staff-only management
create policy "Staff manage matches" on public.matches for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage training" on public.training_sessions for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage training attendance" on public.training_attendance for all using (public.is_staff()) with check (public.is_staff());

select 'DELTA STAGING BOOTSTRAP READY' as status;
