-- ==========================================================================
-- DELTA DAILY SPINS & MINIGAME PROGRESS — V15.0 DATABASE MIGRATION
-- Safe, additive, idempotent schema migration
-- ==========================================================================

-- 1. Tabela stanu Koła Fortuny (Daily Inferno Spin)
create table if not exists public.user_daily_spins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_spin_at timestamptz not null default now(),
  last_streak_date date not null default current_date,
  streak_count integer not null default 1 check (streak_count between 1 and 7),
  total_spins integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_daily_spins_user on public.user_daily_spins(user_id);

-- 2. Tabela postępów w minigrach (Trening Celności, Refleks Bramkarza itp.)
create table if not exists public.user_minigame_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,
  max_level_reached integer not null default 1,
  high_score integer not null default 0,
  best_streak integer not null default 0,
  games_played integer not null default 0,
  last_played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_minigame unique (user_id, game_id)
);

create index if not exists idx_user_minigame_progress_user on public.user_minigame_progress(user_id, game_id);

-- 3. RLS Policies
alter table public.user_daily_spins enable row level security;
alter table public.user_minigame_progress enable row level security;

-- user_daily_spins policies
create policy "Users can view their own daily spin status"
  on public.user_daily_spins for select
  using (auth.uid() = user_id);

create policy "Users can insert/update their own daily spin status"
  on public.user_daily_spins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_minigame_progress policies
create policy "Users can view their own minigame progress"
  on public.user_minigame_progress for select
  using (auth.uid() = user_id);

create policy "Users can update their own minigame progress"
  on public.user_minigame_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
