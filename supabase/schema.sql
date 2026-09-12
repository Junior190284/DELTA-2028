
-- DELTA 2018 GM - initial production schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','coach','parent');
create type public.match_status as enum ('scheduled','played','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'parent',
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  shirt_number text,
  position text,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.parent_players (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key(parent_id,player_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  round_no int,
  match_date date not null,
  match_time time,
  venue text,
  home_team text not null,
  away_team text not null,
  home_score int,
  away_score int,
  status public.match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.match_attendance (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('yes','no','maybe','present')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key(match_id,player_id)
);

create table public.match_lineup (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_starter boolean not null default false,
  is_captain boolean not null default false,
  primary key(match_id,player_id)
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null check (event_type in ('goal','mvp')),
  player_id uuid references public.players(id) on delete set null,
  assist_player_id uuid references public.players(id) on delete set null,
  minute int,
  created_at timestamptz not null default now()
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'organizacja',
  title text not null,
  body text,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Private player photo bucket
insert into storage.buckets(id,name,public)
values ('player-photos','player-photos',false)
on conflict (id) do update set public=false;

-- Helper functions
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path=public
as $$
  select role from public.profiles where id=(select auth.uid())
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(public.current_role() in ('admin','coach'),false)
$$;

create or replace function public.is_parent_of(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.parent_players
    where parent_id=(select auth.uid()) and player_id=target_player
  )
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.parent_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendance enable row level security;
alter table public.match_lineup enable row level security;
alter table public.match_events enable row level security;
alter table public.news enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles
create policy "profiles self select" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "staff profiles select" on public.profiles for select to authenticated using (public.is_staff());
create policy "profiles self update" on public.profiles for update to authenticated using ((select auth.uid())=id);

-- Players: staff all; parents only own linked children
create policy "staff players all" on public.players for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "parents linked players select" on public.players for select to authenticated using (public.is_parent_of(id));

-- Parent-player links
create policy "staff links all" on public.parent_players for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "parents own links select" on public.parent_players for select to authenticated using (parent_id=(select auth.uid()));

-- Matches/news readable by authenticated users, writable by staff
create policy "authenticated matches select" on public.matches for select to authenticated using (true);
create policy "staff matches all" on public.matches for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "authenticated news select" on public.news for select to authenticated using (true);
create policy "staff news all" on public.news for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Attendance: parents can manage own child, staff all
create policy "staff attendance all" on public.match_attendance for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "parent attendance select" on public.match_attendance for select to authenticated using (public.is_parent_of(player_id));
create policy "parent attendance insert" on public.match_attendance for insert to authenticated with check (public.is_parent_of(player_id));
create policy "parent attendance update" on public.match_attendance for update to authenticated using (public.is_parent_of(player_id)) with check (public.is_parent_of(player_id));

-- Lineup/events readable to authenticated, writable by staff
create policy "authenticated lineup select" on public.match_lineup for select to authenticated using (true);
create policy "staff lineup all" on public.match_lineup for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "authenticated events select" on public.match_events for select to authenticated using (true);
create policy "staff events all" on public.match_events for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Push subscriptions: each user owns theirs, admin service role can read all server-side
create policy "push own select" on public.push_subscriptions for select to authenticated using (user_id=(select auth.uid()));
create policy "push own insert" on public.push_subscriptions for insert to authenticated with check (user_id=(select auth.uid()));
create policy "push own update" on public.push_subscriptions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "push own delete" on public.push_subscriptions for delete to authenticated using (user_id=(select auth.uid()));

-- Storage policies: private child photos
create policy "staff player photos all"
on storage.objects for all to authenticated
using (bucket_id='player-photos' and public.is_staff())
with check (bucket_id='player-photos' and public.is_staff());

create policy "parents linked player photo select"
on storage.objects for select to authenticated
using (
  bucket_id='player-photos'
  and exists (
    select 1 from public.players p
    where p.photo_path=name and public.is_parent_of(p.id)
  )
);

-- Create profile row on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id,display_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.email),'parent');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Seed current public roster
insert into public.players(display_name,position) values
('Gomez Lange Leopold','Zawodnik'),
('Gowin Franciszek','Zawodnik'),
('Grochowski Leon','Zawodnik'),
('Kempisty Jan','Zawodnik'),
('Kupryjańczyk Michał','Zawodnik'),
('Odarych Davyd','Zawodnik'),
('Rybacki Ryszard','Zawodnik'),
('Rzeszowski Igor','Zawodnik'),
('Skowronek Tomasz','Zawodnik'),
('Wrzosek Filip','Zawodnik'),
('Zieliński Stefan','Zawodnik');
