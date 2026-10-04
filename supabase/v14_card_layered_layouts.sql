-- ==========================================================================
-- DELTA CARDS & COLLECTION — V14.0 LAYERED ARCHITECTURE & CARD LAYOUTS
-- Visual Card Layout Editor persistence
-- ==========================================================================

create table if not exists public.card_layouts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  template_key text not null default 'base',
  photo_url text,
  scale numeric not null default 1.0,
  translate_x numeric not null default 0.0,
  translate_y numeric not null default 0.0,
  rotate numeric not null default 0.0,
  brightness numeric not null default 1.0,
  contrast numeric not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_card_layout_player_template unique (player_id, template_key)
);

create index if not exists idx_card_layouts_player on public.card_layouts(player_id);

alter table public.card_layouts enable row level security;

-- Read policy: all authenticated users can view card layouts
drop policy if exists card_layouts_read_all on public.card_layouts;
create policy card_layouts_read_all on public.card_layouts for select to authenticated using (true);

-- Write policy: staff / admin can manage card layouts
drop policy if exists card_layouts_staff_all on public.card_layouts;
create policy card_layouts_staff_all on public.card_layouts for all to authenticated using (public.is_staff()) with check (public.is_staff());
