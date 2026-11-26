-- DELTA-051T6 — SMART CALENDAR PRO (PROPOSED MIGRATION / PENDING APPROVAL)
-- Ten skrypt rozbudowuje możliwości kalendarza o:
-- 1. Nowe kolumny w team_events (status, widoczność, całodniowe, data zakończenia, zatwierdzenie)
-- 2. Rozszerzone RLS pozwalające rodzicom/zawodnikom na tworzenie i edycję własnych wydarzeń
-- 3. Tabelę komentarzy do wydarzeń kalendarza (event_comments) z moderacją sztabu
-- 4. Tabelę prywatnych notatek rodzica/opiekuna (event_private_notes)
--
-- UWAGA: Zgodnie z zasadami bezpieczeństwa DELTA, migracja NIE jest wykonywana automatycznie na bazie.

-- 1. Rozszerzenie public.team_events
alter table public.team_events add column if not exists end_date date;
alter table public.team_events add column if not exists is_all_day boolean not null default false;
alter table public.team_events add column if not exists visibility text not null default 'public' check (visibility in ('private', 'coach', 'team_proposal', 'public'));
alter table public.team_events add column if not exists status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'));
alter table public.team_events add column if not exists is_approved boolean not null default true;
alter table public.team_events add column if not exists approved_by uuid references public.profiles(id) on delete set null;
alter table public.team_events add column if not exists approved_at timestamptz;
alter table public.team_events add column if not exists parent_id uuid references public.profiles(id) on delete set null;

-- 2. Aktualizacja polityk RLS dla team_events (własne pozycje rodziców i zawodników)
-- Odczyt: publiczne widzą wszyscy uwierzytelnieni; prywatne widzi tylko twórca i uprawniony sztab
drop policy if exists "team events authenticated select" on public.team_events;
create policy "team events authenticated select" on public.team_events for select to authenticated using (
  visibility = 'public' 
  or created_by = auth.uid() 
  or (visibility = 'coach' and public.is_staff())
  or (visibility = 'team_proposal' and (public.is_staff() or created_by = auth.uid()))
);

-- Zapis: sztab może dodawać dowolne; rodzice/zawodnicy mogą tworzyć własne wydarzenia (private / coach / team_proposal)
drop policy if exists "team events insert" on public.team_events;
create policy "team events insert" on public.team_events for insert to authenticated with check (
  public.is_staff() or (created_by = auth.uid() and visibility in ('private', 'coach', 'team_proposal'))
);

-- Aktualizacja: sztab zarządza wszystkimi; twórca może edytować tylko własne wydarzenia
drop policy if exists "team events update" on public.team_events;
create policy "team events update" on public.team_events for update to authenticated using (
  public.is_staff() or (created_by = auth.uid() and visibility != 'public')
) with check (
  public.is_staff() or (created_by = auth.uid() and visibility != 'public')
);

-- Usuwanie: sztab usuwa dowolne; twórca usuwa własne
drop policy if exists "team events delete" on public.team_events;
create policy "team events delete" on public.team_events for delete to authenticated using (
  public.is_staff() or (created_by = auth.uid() and visibility != 'public')
);

-- 3. Tabela komentarzy: public.event_comments
create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null default 'parent',
  content text not null,
  is_edited boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_comments_event_id on public.event_comments(event_id);
create index if not exists idx_event_comments_user_id on public.event_comments(user_id);
alter table public.event_comments enable row level security;

-- RLS komentarzy:
drop policy if exists "event comments select" on public.event_comments;
create policy "event comments select" on public.event_comments for select to authenticated using (
  exists (
    select 1 from public.team_events e
    where e.id = event_comments.event_id
    and (e.visibility = 'public' or e.created_by = auth.uid() or public.is_staff())
  )
);

drop policy if exists "event comments insert" on public.event_comments;
create policy "event comments insert" on public.event_comments for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.team_events e
    where e.id = event_comments.event_id
    and (e.visibility = 'public' or e.created_by = auth.uid() or public.is_staff())
  )
);

drop policy if exists "event comments update" on public.event_comments;
create policy "event comments update" on public.event_comments for update to authenticated using (
  user_id = auth.uid() or public.is_staff()
) with check (
  user_id = auth.uid() or public.is_staff()
);

drop policy if exists "event comments delete" on public.event_comments;
create policy "event comments delete" on public.event_comments for delete to authenticated using (
  user_id = auth.uid() or public.is_staff()
);

-- 4. Tabela prywatnych notatek rodzica: public.event_private_notes
create table if not exists public.event_private_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_private_notes enable row level security;

create policy "event private notes owner only" on public.event_private_notes for all to authenticated using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);
