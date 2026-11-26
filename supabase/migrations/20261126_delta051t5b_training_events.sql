-- DELTA-051T5B — TRAINING EVENTS ENHANCEMENT MIGRATION (PROPOSED / PENDING APPROVAL)
-- Ten skrypt rozbudowuje tabelę public.training_events oraz public.training_game_players
-- o obsługę bramek samobójczych (own_goal), drużyny strzelającej oraz rozszerzenia drużyn ('A','B','C','D').
-- Zgodnie z zasadami DELTA, migracja NIE jest wykonywana automatycznie na bazie.

-- 1. Rozszerzenie dozwolonych drużyn w training_game_players (A, B, C, D)
alter table public.training_game_players drop constraint if exists training_game_players_team_check;
alter table public.training_game_players add constraint training_game_players_team_check check (team in ('A', 'B', 'C', 'D'));

-- 2. Rozszerzenie typów zdarzeń w training_events ('goal', 'own_goal')
alter table public.training_events drop constraint if exists training_events_event_type_check;
alter table public.training_events add constraint training_events_event_type_check check (event_type in ('goal', 'own_goal'));

-- 3. Dodanie kolumn pomocniczych do training_events (opcjonalne, zachowując kompatybilność wsteczną)
alter table public.training_events add column if not exists team text check (team in ('A', 'B', 'C', 'D', 'team_a', 'team_b'));
alter table public.training_events add column if not exists minute integer;

-- 4. Indeksy pod zapytania live stats
create index if not exists idx_training_events_game_id on public.training_events(game_id);
create index if not exists idx_training_events_player_id on public.training_events(player_id);
create index if not exists idx_training_events_assist_id on public.training_events(assist_player_id);
