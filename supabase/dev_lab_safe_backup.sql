-- ==============================================================================
-- DELTA DEV LAB — SAFE ISOLATED BACKUP & NON-DESTRUCTIVE RESTORE SCRIPT
-- Schemat odizolowany: _backup_isolated (niedostępny przez PostgREST / publiczne API)
-- ==============================================================================

-- 1. UTWORZENIE IZOLOWANEGO SCHEMATU BEZ DOSTĘPU Z ZEWNĄTRZ
create schema if not exists _backup_isolated;

-- BEZWZGLĘDNA BLOKADA DOSTĘPU DLA PUBLIC / ANON / AUTHENTICATED:
revoke all on schema _backup_isolated from public, anon, authenticated;
grant all on schema _backup_isolated to postgres, service_role;

-- 2. PROCEDURA BEZPIECZNEGO SNAPSHOTU TABEL (DANE + METADANE)
create or replace procedure _backup_isolated.take_snapshot(p_label text)
language plpgsql
security definer
as $$
begin
  -- Kopia tabel kalendarza i modułu treningowego
  execute format('create table if not exists _backup_isolated.team_events_%s as select * from public.team_events', p_label);
  execute format('create table if not exists _backup_isolated.training_events_%s as select * from public.training_events', p_label);
  execute format('create table if not exists _backup_isolated.training_sessions_%s as select * from public.training_sessions', p_label);
  execute format('create table if not exists _backup_isolated.training_attendance_%s as select * from public.training_attendance', p_label);
  execute format('create table if not exists _backup_isolated.training_games_%s as select * from public.training_games', p_label);
  execute format('create table if not exists _backup_isolated.training_game_players_%s as select * from public.training_game_players', p_label);
  
  -- Zabezpieczenie tabel kopii zapasowej
  execute format('revoke all on all tables in schema _backup_isolated from public, anon, authenticated');
end;
$$;

-- 3. PROCEDURA NIEDESTRUKCYJNEGO ODTWORZENIA (RESTORE BEZ DROP TABLE)
create or replace procedure _backup_isolated.restore_snapshot(p_label text)
language plpgsql
security definer
as $$
begin
  -- Odtwarzanie rekordów przez UPSERT (bez usuwania historycznych tabel)
  execute format('
    insert into public.team_events
    select * from _backup_isolated.team_events_%s
    on conflict (id) do update set
      title = excluded.title,
      event_date = excluded.event_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      location = excluded.location,
      details = excluded.details
  ', p_label);

  execute format('
    insert into public.training_events
    select * from _backup_isolated.training_events_%s
    on conflict (id) do nothing
  ', p_label);
end;
$$;
