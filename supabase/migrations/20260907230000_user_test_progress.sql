-- Usability test progress (TCC validation). Isolated from core product tables.
-- Safe to drop later: drop table public.user_test_progress; drop table public.user_test_sessions;

create table if not exists public.user_test_sessions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  completed_count integer not null default 0,
  skipped_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_test_sessions_pkey primary key (user_id)
);

create table if not exists public.user_test_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  test_number smallint not null,
  status text not null default 'pending',
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint user_test_progress_user_test_key unique (user_id, test_number),
  constraint user_test_progress_test_number_check check (test_number >= 1 and test_number <= 10),
  constraint user_test_progress_status_check check (
    status in ('pending', 'in_progress', 'completed', 'skipped')
  )
);

create index if not exists user_test_progress_user_idx
  on public.user_test_progress (user_id, test_number);

create index if not exists user_test_progress_status_idx
  on public.user_test_progress (status);

create or replace function public.set_user_test_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_test_progress_updated_at on public.user_test_progress;
create trigger trg_user_test_progress_updated_at
  before update on public.user_test_progress
  for each row execute procedure public.set_user_test_progress_updated_at();

drop trigger if exists trg_user_test_sessions_updated_at on public.user_test_sessions;
create trigger trg_user_test_sessions_updated_at
  before update on public.user_test_sessions
  for each row execute procedure public.set_user_test_progress_updated_at();

alter table public.user_test_sessions enable row level security;
alter table public.user_test_progress enable row level security;

drop policy if exists "user_test_sessions_select_own" on public.user_test_sessions;
create policy "user_test_sessions_select_own"
  on public.user_test_sessions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_test_sessions_insert_own" on public.user_test_sessions;
create policy "user_test_sessions_insert_own"
  on public.user_test_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_test_sessions_update_own" on public.user_test_sessions;
create policy "user_test_sessions_update_own"
  on public.user_test_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_test_progress_select_own" on public.user_test_progress;
create policy "user_test_progress_select_own"
  on public.user_test_progress for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_test_progress_insert_own" on public.user_test_progress;
create policy "user_test_progress_insert_own"
  on public.user_test_progress for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_test_progress_update_own" on public.user_test_progress;
create policy "user_test_progress_update_own"
  on public.user_test_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.user_test_sessions to authenticated;
grant select, insert, update on public.user_test_progress to authenticated;
