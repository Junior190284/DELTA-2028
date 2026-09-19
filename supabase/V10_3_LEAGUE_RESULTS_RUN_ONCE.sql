-- DELTA 2018 GM: V10.3. Wykonaj raz w Supabase SQL Editor.
-- Dane wyłącznie drużynowe: terminarz i wyniki, bez danych dzieci.
create table if not exists public.league_fixture_updates (
 fixture_id text primary key check (fixture_id ~ '^[1-7][a-d]$'),
 match_date date not null,
 home_score integer check (home_score between 0 and 99),
 away_score integer check (away_score between 0 and 99),
 status text not null default 'scheduled' check (status in ('scheduled','played','postponed','cancelled')),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 constraint league_scores_complete check (
 (status='played' and home_score is not null and away_score is not null)
 or (status<>'played' and home_score is null and away_score is null))
);
create or replace function public.league_fixture_audit() returns trigger
language plpgsql set search_path=public as $$
begin new.updated_at=now();new.updated_by=auth.uid();return new;end $$;
drop trigger if exists league_fixture_audit_trigger on public.league_fixture_updates;
create trigger league_fixture_audit_trigger before insert or update on public.league_fixture_updates
for each row execute function public.league_fixture_audit();
alter table public.league_fixture_updates enable row level security;
drop policy if exists "league fixture public read" on public.league_fixture_updates;
create policy "league fixture public read" on public.league_fixture_updates
for select to anon,authenticated using (true);
drop policy if exists "league fixture admin insert" on public.league_fixture_updates;
create policy "league fixture admin insert" on public.league_fixture_updates
for insert to authenticated with check (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
drop policy if exists "league fixture admin update" on public.league_fixture_updates;
create policy "league fixture admin update" on public.league_fixture_updates
for update to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
) with check (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
grant select on public.league_fixture_updates to anon, authenticated;
grant insert,update on public.league_fixture_updates to authenticated;
-- Trzy wyniki pierwszej kolejki. Nie zastępuj ręcznych poprawek administratora.
insert into public.league_fixture_updates(fixture_id,match_date,home_score,away_score,status)
values ('1a','2026-09-12',11,10,'played'),('1c','2026-09-12',8,5,'played'),('1d','2026-09-12',4,6,'played')
on conflict (fixture_id) do nothing;
