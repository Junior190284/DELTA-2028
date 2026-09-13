-- V9.0 — Training Center

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_date date not null,
  start_time time,
  end_time time,
  location text,
  title text not null default 'Trening',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_sessions_date
on public.training_sessions(training_date, start_time);

create table if not exists public.training_attendance (
  training_id uuid not null references public.training_sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'present',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (training_id, player_id)
);

create table if not exists public.training_games (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.training_sessions(id) on delete cascade,
  team_a_name text not null default 'Czerwoni',
  team_b_name text not null default 'Złoci',
  team_a_score integer not null default 0,
  team_b_score integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
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
  game_id uuid not null references public.training_games(id) on delete cascade,
  event_type text not null check (event_type in ('goal')),
  player_id uuid references public.players(id) on delete set null,
  assist_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.training_sessions enable row level security;
alter table public.training_attendance enable row level security;
alter table public.training_games enable row level security;
alter table public.training_game_players enable row level security;
alter table public.training_events enable row level security;

drop policy if exists "training sessions authenticated select" on public.training_sessions;
create policy "training sessions authenticated select"
on public.training_sessions for select to authenticated using (true);

drop policy if exists "training attendance authenticated select" on public.training_attendance;
create policy "training attendance authenticated select"
on public.training_attendance for select to authenticated using (true);

drop policy if exists "training games authenticated select" on public.training_games;
create policy "training games authenticated select"
on public.training_games for select to authenticated using (true);

drop policy if exists "training game players authenticated select" on public.training_game_players;
create policy "training game players authenticated select"
on public.training_game_players for select to authenticated using (true);

drop policy if exists "training events authenticated select" on public.training_events;
create policy "training events authenticated select"
on public.training_events for select to authenticated using (true);

drop policy if exists "training sessions staff all" on public.training_sessions;
create policy "training sessions staff all"
on public.training_sessions for all to authenticated
using (public.is_staff()) with check (public.is_staff());

drop policy if exists "training attendance staff all" on public.training_attendance;
create policy "training attendance staff all"
on public.training_attendance for all to authenticated
using (public.is_staff()) with check (public.is_staff());

drop policy if exists "training games staff all" on public.training_games;
create policy "training games staff all"
on public.training_games for all to authenticated
using (public.is_staff()) with check (public.is_staff());

drop policy if exists "training game players staff all" on public.training_game_players;
create policy "training game players staff all"
on public.training_game_players for all to authenticated
using (public.is_staff()) with check (public.is_staff());

drop policy if exists "training events staff all" on public.training_events;
create policy "training events staff all"
on public.training_events for all to authenticated
using (public.is_staff()) with check (public.is_staff());

select 'TRAINING CENTER READY' as status;
