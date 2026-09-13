-- V10 MEGA PACK — delegated permissions for parents/helpers

create table if not exists public.user_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role_label text not null default 'Rodzic',
  can_manage_matches boolean not null default false,
  can_edit_match_events boolean not null default false,
  can_manage_training boolean not null default false,
  can_manage_training_attendance boolean not null default false,
  can_manage_calendar boolean not null default false,
  can_manage_news boolean not null default false,
  can_manage_players boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_permissions enable row level security;

drop policy if exists "permissions own select" on public.user_permissions;
create policy "permissions own select" on public.user_permissions
for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "permissions staff select" on public.user_permissions;
create policy "permissions staff select" on public.user_permissions
for select to authenticated using (public.is_staff());

drop policy if exists "permissions admin all" on public.user_permissions;
create policy "permissions admin all" on public.user_permissions
for all to authenticated
using (public.current_role()='admin')
with check (public.current_role()='admin');

create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    public.is_staff()
    or exists(
      select 1 from public.user_permissions p
      where p.user_id=(select auth.uid())
      and case permission_name
        when 'manage_matches' then p.can_manage_matches
        when 'edit_match_events' then p.can_edit_match_events
        when 'manage_training' then p.can_manage_training
        when 'manage_training_attendance' then p.can_manage_training_attendance
        when 'manage_calendar' then p.can_manage_calendar
        when 'manage_news' then p.can_manage_news
        when 'manage_players' then p.can_manage_players
        else false
      end
    ), false
  )
$$;

-- Delegated match permissions
drop policy if exists "delegated matches insert" on public.matches;
create policy "delegated matches insert" on public.matches for insert to authenticated
with check (public.has_permission('manage_matches'));
drop policy if exists "delegated matches update" on public.matches;
create policy "delegated matches update" on public.matches for update to authenticated
using (public.has_permission('manage_matches')) with check (public.has_permission('manage_matches'));
drop policy if exists "delegated matches delete" on public.matches;
create policy "delegated matches delete" on public.matches for delete to authenticated
using (public.has_permission('manage_matches'));

drop policy if exists "delegated attendance all" on public.match_attendance;
create policy "delegated attendance all" on public.match_attendance for all to authenticated
using (public.has_permission('manage_matches')) with check (public.has_permission('manage_matches'));

drop policy if exists "delegated lineup all" on public.match_lineup;
create policy "delegated lineup all" on public.match_lineup for all to authenticated
using (public.has_permission('manage_matches')) with check (public.has_permission('manage_matches'));

drop policy if exists "delegated events all" on public.match_events;
create policy "delegated events all" on public.match_events for all to authenticated
using (public.has_permission('edit_match_events') or public.has_permission('manage_matches'))
with check (public.has_permission('edit_match_events') or public.has_permission('manage_matches'));

-- Delegated calendar/news/players
drop policy if exists "delegated team events all" on public.team_events;
create policy "delegated team events all" on public.team_events for all to authenticated
using (public.has_permission('manage_calendar')) with check (public.has_permission('manage_calendar'));

drop policy if exists "delegated news all" on public.news;
create policy "delegated news all" on public.news for all to authenticated
using (public.has_permission('manage_news')) with check (public.has_permission('manage_news'));

drop policy if exists "delegated players all" on public.players;
create policy "delegated players all" on public.players for all to authenticated
using (public.has_permission('manage_players')) with check (public.has_permission('manage_players'));

drop policy if exists "delegated sports helpers players select" on public.players;
create policy "delegated sports helpers players select" on public.players for select to authenticated
using (
  public.has_permission('manage_matches')
  or public.has_permission('edit_match_events')
  or public.has_permission('manage_training')
  or public.has_permission('manage_training_attendance')
);

-- Delegated training permissions
drop policy if exists "delegated training sessions all" on public.training_sessions;
create policy "delegated training sessions all" on public.training_sessions for all to authenticated
using (public.has_permission('manage_training')) with check (public.has_permission('manage_training'));

drop policy if exists "delegated training games all" on public.training_games;
create policy "delegated training games all" on public.training_games for all to authenticated
using (public.has_permission('manage_training')) with check (public.has_permission('manage_training'));

drop policy if exists "delegated training game players all" on public.training_game_players;
create policy "delegated training game players all" on public.training_game_players for all to authenticated
using (public.has_permission('manage_training')) with check (public.has_permission('manage_training'));

drop policy if exists "delegated training events all" on public.training_events;
create policy "delegated training events all" on public.training_events for all to authenticated
using (public.has_permission('manage_training')) with check (public.has_permission('manage_training'));

drop policy if exists "delegated training attendance all" on public.training_attendance;
create policy "delegated training attendance all" on public.training_attendance for all to authenticated
using (public.has_permission('manage_training') or public.has_permission('manage_training_attendance'))
with check (public.has_permission('manage_training') or public.has_permission('manage_training_attendance'));



-- Private match chronicle / photo gallery
create table if not exists public.match_media (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_match_media_match on public.match_media(match_id,created_at);
alter table public.match_media enable row level security;

drop policy if exists "authenticated match media select" on public.match_media;
create policy "authenticated match media select" on public.match_media for select to authenticated using (true);
drop policy if exists "delegated match media all" on public.match_media;
create policy "delegated match media all" on public.match_media for all to authenticated
using (public.has_permission('manage_matches')) with check (public.has_permission('manage_matches'));

insert into storage.buckets(id,name,public)
values ('match-media','match-media',false)
on conflict (id) do update set public=false;

drop policy if exists "authenticated match media storage select" on storage.objects;
create policy "authenticated match media storage select" on storage.objects for select to authenticated
using (bucket_id='match-media');

drop policy if exists "delegated match media storage insert" on storage.objects;
create policy "delegated match media storage insert" on storage.objects for insert to authenticated
with check (bucket_id='match-media' and public.has_permission('manage_matches'));
drop policy if exists "delegated match media storage update" on storage.objects;
create policy "delegated match media storage update" on storage.objects for update to authenticated
using (bucket_id='match-media' and public.has_permission('manage_matches'))
with check (bucket_id='match-media' and public.has_permission('manage_matches'));
drop policy if exists "delegated match media storage delete" on storage.objects;
create policy "delegated match media storage delete" on storage.objects for delete to authenticated
using (bucket_id='match-media' and public.has_permission('manage_matches'));

-- Smart reminder de-duplication. Service role writes here from /api/reminders/run.
create table if not exists public.smart_notification_log (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
alter table public.smart_notification_log enable row level security;
drop policy if exists "admin smart notification log select" on public.smart_notification_log;
create policy "admin smart notification log select" on public.smart_notification_log for select to authenticated
using (public.current_role()='admin');

select 'V10 MEGA PACK PERMISSIONS READY' as status;
