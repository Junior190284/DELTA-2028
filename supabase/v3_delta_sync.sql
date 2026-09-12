-- V3: DELTA Sync feed
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

create index if not exists idx_club_updates_published
on public.club_updates(published_at desc);

create table if not exists public.delta_sync_log (
  id bigint generated always as identity primary key,
  status text not null,
  items_found int not null default 0,
  items_inserted int not null default 0,
  details text,
  created_at timestamptz not null default now()
);

alter table public.club_updates enable row level security;
alter table public.delta_sync_log enable row level security;

drop policy if exists "authenticated club updates select" on public.club_updates;
create policy "authenticated club updates select"
on public.club_updates for select to authenticated
using (true);

drop policy if exists "staff sync log select" on public.delta_sync_log;
create policy "staff sync log select"
on public.delta_sync_log for select to authenticated
using (public.is_staff());

-- Writes are intentionally performed server-side via the Supabase service role.
