-- DELTA-051T6 — SMART CALENDAR PRO (PROPOSED MIGRATION / PENDING APPROVAL)
-- Ten skrypt rozbudowuje możliwości kalendarza o:
-- 1. Nowe kolumny w team_events (status, widoczność, całodniowe, data zakończenia, zatwierdzenie)
-- 2. Rozszerzone RLS pozwalające rodzicom/zawodnikom na tworzenie i edycję własnych wydarzeń
-- 3. Tabelę komentarzy do wydarzeń kalendarza (event_comments) z moderacją sztabu
-- 4. Tabelę prywatnych notatek rodzica/opiekuna (event_private_notes)
--
-- UWAGA: Zgodnie z zasadami bezpieczeństwa DELTA, migracja NIE jest wykonywana automatycznie na bazie.

-- 1. Rozszerzenie public.team_events (bezpieczne kolumny addytywne)
alter table public.team_events add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.team_events add column if not exists end_date date;
alter table public.team_events add column if not exists is_all_day boolean not null default false;
alter table public.team_events add column if not exists visibility text not null default 'public' check (visibility in ('private', 'coach', 'team_proposal', 'public'));
alter table public.team_events add column if not exists status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'));
alter table public.team_events add column if not exists is_approved boolean not null default true;
alter table public.team_events add column if not exists approved_by uuid references public.profiles(id) on delete set null;
alter table public.team_events add column if not exists approved_at timestamptz;
alter table public.team_events add column if not exists parent_id uuid references public.profiles(id) on delete set null;

-- 2. Aktualizacja polityk RLS dla team_events (własne pozycje rodziców i zawodników)
-- Usunięcie wcześniejszych polityk permissive, które pozwalały na odczyt wszystkich wierszy (true)
drop policy if exists "team events authenticated select" on public.team_events;
drop policy if exists "delegated team events all" on public.team_events;
drop policy if exists "team events staff insert" on public.team_events;
drop policy if exists "team events staff update" on public.team_events;
drop policy if exists "team events staff delete" on public.team_events;

-- Odczyt: publiczne widzą powiązani użytkownicy drużyny lub sztab; prywatne widzi WYŁĄCZNIE twórca
create policy "team events authenticated select" on public.team_events for select to authenticated using (
  (visibility = 'public' and (team_id is null or team_id in (select public.get_parent_team_ids(auth.uid())) or public.is_staff()))
  or created_by = auth.uid() 
  or (visibility = 'coach' and (public.is_staff() or created_by = auth.uid()))
  or (visibility = 'team_proposal' and (public.is_staff() or created_by = auth.uid() or (is_approved = true and (team_id is null or team_id in (select public.get_parent_team_ids(auth.uid()))))))
  or (player_id is not null and exists (
    select 1 from public.parent_players pp
    where pp.parent_id = auth.uid() and pp.player_id = team_events.player_id
  ))
);

-- Zapis: sztab może dodawać dowolne; rodzice/zawodnicy mogą tworzyć wyłącznie niepubliczne propozycje/notatki
-- Ochrona: brak możliwości samozwańczego ustawienia is_approved = true lub approved_by przez rodzica
drop policy if exists "team events insert" on public.team_events;
create policy "team events insert" on public.team_events for insert to authenticated with check (
  public.is_staff() or (
    created_by = auth.uid() 
    and visibility in ('private', 'coach', 'team_proposal')
    and is_approved = false
    and approved_by is null
    and (team_id is null or team_id in (select public.get_parent_team_ids(auth.uid())))
  )
);

-- Aktualizacja: sztab zarządza wszystkimi; twórca może edytować tylko własne wydarzenia niebędące publicznymi
-- Ochrona: blokada zmiany created_by, blokada samo-zatwierdzania (is_approved musi pozostać false bez sztabu)
drop policy if exists "team events update" on public.team_events;
create policy "team events update" on public.team_events for update to authenticated using (
  public.is_staff() or (created_by = auth.uid() and visibility != 'public')
) with check (
  public.is_staff() or (
    created_by = auth.uid() 
    and visibility != 'public'
    and is_approved = false
    and approved_by is null
  )
);

-- Usuwanie: sztab usuwa dowolne; twórca usuwa wyłącznie własne
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

-- RLS komentarzy: dziedziczenie dostępu z wydarzenia nadrzędnego
drop policy if exists "event comments select" on public.event_comments;
create policy "event comments select" on public.event_comments for select to authenticated using (
  exists (
    select 1 from public.team_events e
    where e.id = event_comments.event_id
    and (
      e.created_by = auth.uid()
      or (e.visibility = 'public' and (e.team_id is null or e.team_id in (select public.get_parent_team_ids(auth.uid())) or public.is_staff()))
      or (e.visibility = 'coach' and (public.is_staff() or e.created_by = auth.uid()))
      or (e.visibility = 'team_proposal' and (e.created_by = auth.uid() or public.is_staff() or e.team_id in (select public.get_parent_team_ids(auth.uid()))))
    )
  )
);

drop policy if exists "event comments insert" on public.event_comments;
create policy "event comments insert" on public.event_comments for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.team_events e
    where e.id = event_comments.event_id
    and (
      e.created_by = auth.uid()
      or (e.visibility = 'public' and (e.team_id is null or e.team_id in (select public.get_parent_team_ids(auth.uid())) or public.is_staff()))
      or (e.visibility = 'coach' and (public.is_staff() or e.created_by = auth.uid()))
      or (e.visibility = 'team_proposal' and (e.created_by = auth.uid() or public.is_staff() or e.team_id in (select public.get_parent_team_ids(auth.uid()))))
    )
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

-- Prywatne notatki: BEZWZGLĘDNA IZOLACJA — wyłącznie autor ma dostęp (nawet trener ani admin ich nie odczyta)
drop policy if exists "event private notes owner only" on public.event_private_notes;
create policy "event private notes owner only" on public.event_private_notes for all to authenticated using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);

-- 5. Usunięcie historycznych zbyt szerokich polityk permissive dla tabel treningowych
drop policy if exists "delegated training sessions all" on public.training_sessions;
drop policy if exists "delegated training games all" on public.training_games;
drop policy if exists "delegated training game players all" on public.training_game_players;
drop policy if exists "delegated training events all" on public.training_events;
drop policy if exists "delegated training attendance all" on public.training_attendance;

-- ==============================================================================
-- NON-DESTRUCTIVE ROLLBACK PROCEDURE (NIEDESTRUKCYJNE WYCOFANIE):
-- 1. ZAKAZ DROP TABLE: Nigdy nie usuwaj tabel event_comments ani event_private_notes,
--    aby nie bezpowrotnie skasować wpisów i notatek użytkowników.
-- 2. ZAKAZ PRZYWRACANIA POLITYK PERMISSIVE (USING TRUE): Przywrócenie using(true)
--    naruszyłoby poufność prywatnych wpisów.
-- 3. BEZPIECZNE WYCOFANIE APLIKACJI (APPLICATION ROLLBACK):
--    W razie potrzeby cofnięcia zmian aplikacyjnych na Vercel, schemat bazy danych
--    pozostaje w 100% kompatybilny wstecz (nowe kolumny są nullable z bezpiecznymi defaultami).
-- ==============================================================================
