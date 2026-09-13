-- V8.9.1 — Team Calendar
create table if not exists public.team_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'info',
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  details text,
  important boolean not null default false,
  player_id uuid references public.players(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_events_date
on public.team_events(event_date, start_time);

alter table public.team_events enable row level security;

drop policy if exists "team events authenticated select" on public.team_events;
create policy "team events authenticated select"
on public.team_events for select to authenticated
using (true);

drop policy if exists "team events staff insert" on public.team_events;
create policy "team events staff insert"
on public.team_events for insert to authenticated
with check (public.is_staff());

drop policy if exists "team events staff update" on public.team_events;
create policy "team events staff update"
on public.team_events for update to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "team events staff delete" on public.team_events;
create policy "team events staff delete"
on public.team_events for delete to authenticated
using (public.is_staff());

select 'TEAM CALENDAR READY' as status;
