-- V8.8.0 — Push subscriptions setup
-- Uruchom cały plik w Supabase SQL Editor tylko raz.
-- Skrypt jest idempotentny: można uruchomić ponownie bez szkody.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id
on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push own select" on public.push_subscriptions;
drop policy if exists "push own insert" on public.push_subscriptions;
drop policy if exists "push own update" on public.push_subscriptions;
drop policy if exists "push own delete" on public.push_subscriptions;

create policy "push own select"
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "push own insert"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "push own update"
on public.push_subscriptions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "push own delete"
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));

select 'PUSH READY' as status;
