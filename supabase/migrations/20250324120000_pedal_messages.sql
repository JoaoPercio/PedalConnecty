-- Chat messages for pedals
create table if not exists public.pedal_messages (
  id uuid primary key default gen_random_uuid(),
  pedal_id uuid not null references public.pedals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

create index if not exists pedal_messages_pedal_id_created_at_idx
  on public.pedal_messages (pedal_id, created_at);

alter table public.pedal_messages enable row level security;

-- Read: pedal creator OR approved participant (matches product rule for chat access)
create policy "pedal_messages_select_approved_or_creator"
  on public.pedal_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.pedals p
      where p.id = pedal_messages.pedal_id
        and (
          p.creator_id = (select auth.uid())
          or exists (
            select 1 from public.pedal_participants pp
            where pp.pedal_id = p.id
              and pp.user_id = (select auth.uid())
              and pp.status = 'approved'
          )
        )
    )
  );

-- Insert: same as read
create policy "pedal_messages_insert_approved_or_creator"
  on public.pedal_messages
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.pedals p
      where p.id = pedal_messages.pedal_id
        and (
          p.creator_id = (select auth.uid())
          or exists (
            select 1 from public.pedal_participants pp
            where pp.pedal_id = p.id
              and pp.user_id = (select auth.uid())
              and pp.status = 'approved'
          )
        )
    )
  );

-- Realtime (ignore if already added to publication)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pedal_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.pedal_messages';
  end if;
end $$;
