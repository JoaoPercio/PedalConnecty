-- Policies for joining pedais and organizer approvals (safe to run once).
-- Adjust or drop existing policies if your project already defines overlapping rules.

alter table public.pedal_participants enable row level security;

-- Authenticated users can request to join (insert own row)
drop policy if exists "pedal_participants_insert_self" on public.pedal_participants;
create policy "pedal_participants_insert_self"
  on public.pedal_participants
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Users can read participant rows for pedais they belong to or organize
drop policy if exists "pedal_participants_select_related" on public.pedal_participants;
create policy "pedal_participants_select_related"
  on public.pedal_participants
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.pedals p
      where p.id = pedal_participants.pedal_id
        and p.creator_id = (select auth.uid())
    )
    or (
      pedal_participants.status = 'approved'
      and exists (
        select 1 from public.pedal_participants me
        where me.pedal_id = pedal_participants.pedal_id
          and me.user_id = (select auth.uid())
          and me.status = 'approved'
      )
    )
  );

-- Organizers can update status (approve / reject)
drop policy if exists "pedal_participants_creator_update" on public.pedal_participants;
create policy "pedal_participants_creator_update"
  on public.pedal_participants
  for update
  to authenticated
  using (
    exists (
      select 1 from public.pedals p
      where p.id = pedal_participants.pedal_id
        and p.creator_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.pedals p
      where p.id = pedal_participants.pedal_id
        and p.creator_id = (select auth.uid())
    )
  );
