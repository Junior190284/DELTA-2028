
-- V2 additions / indexes
create index if not exists idx_matches_date on public.matches(match_date);
create index if not exists idx_attendance_match on public.match_attendance(match_id);
create index if not exists idx_lineup_match on public.match_lineup(match_id);
create index if not exists idx_events_match on public.match_events(match_id);
create index if not exists idx_news_published on public.news(published_at desc);

-- Seed known schedule (ambiguous rounds intentionally not invented beyond known entries)
insert into public.matches(round_no,match_date,match_time,venue,home_team,away_team,status)
select 1,'2026-09-12','09:30','Górny Mokotów','K.S. Delta Warszawa WI','K.S. Delta Warszawa GM','scheduled'
where not exists (select 1 from public.matches where round_no=1 and match_date='2026-09-12');

insert into public.matches(round_no,match_date,venue,home_team,away_team,status)
select 3,'2026-09-26','Górny Mokotów','Alfa Przymierze Rodzin','K.S. Delta Warszawa GM','scheduled'
where not exists (select 1 from public.matches where round_no=3);

insert into public.matches(round_no,match_date,venue,home_team,away_team,status)
select 4,'2026-10-03','Górny Mokotów','FC Vizja Warszawa','K.S. Delta Warszawa GM','scheduled'
where not exists (select 1 from public.matches where round_no=4);

insert into public.matches(round_no,match_date,venue,home_team,away_team,status)
select 5,'2026-10-10','Górny Mokotów','K.S. Delta Warszawa GM','K.S. Delta Warszawa WA','scheduled'
where not exists (select 1 from public.matches where round_no=5);

insert into public.matches(round_no,match_date,venue,home_team,away_team,status)
select 6,'2026-10-17','Górny Mokotów','RKS Ursus Warszawa','K.S. Delta Warszawa GM','scheduled'
where not exists (select 1 from public.matches where round_no=6);
