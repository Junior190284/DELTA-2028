-- ==========================================================================
-- DELTA 2018 GM — V13.0 KLUBOWY TYPER MECZOWY & TABELA LIDERÓW
-- Idempotent, safe additive migration
-- ==========================================================================

-- 1. Tabela typów meczowych użytkowników
create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score integer not null default 0,
  predicted_away_score integer not null default 0,
  first_scorer_id uuid references public.players(id) on delete set null,
  points_awarded integer not null default 0,
  is_evaluated boolean not null default false,
  exact_score_hit boolean not null default false,
  outcome_hit boolean not null default false,
  scorer_hit boolean not null default false,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_match_prediction unique (user_id, match_id)
);

create index if not exists idx_match_predictions_match on public.match_predictions(match_id);
create index if not exists idx_match_predictions_user on public.match_predictions(user_id);
create index if not exists idx_match_predictions_evaluated on public.match_predictions(is_evaluated);

-- 2. Włączenie RLS
alter table public.match_predictions enable row level security;

drop policy if exists "predictions read all" on public.match_predictions;
create policy "predictions read all" on public.match_predictions 
for select to authenticated using (true);

drop policy if exists "predictions upsert own" on public.match_predictions;
create policy "predictions upsert own" on public.match_predictions 
for all to authenticated 
using (user_id = auth.uid() or public.is_staff()) 
with check (user_id = auth.uid() or public.is_staff());

select 'V13 MATCH TYPER READY' as status;
