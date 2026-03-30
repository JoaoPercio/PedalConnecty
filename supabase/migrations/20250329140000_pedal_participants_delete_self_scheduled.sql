-- Allow non-organizer participants to remove their own row while the pedal is still scheduled
-- (leave before the ride starts). Organizers cancel the whole pedal instead.
drop policy if exists "pedal_participants_delete_self_scheduled" on public.pedal_participants;
create policy "pedal_participants_delete_self_scheduled"
  on public.pedal_participants
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.pedals p
      where p.id = pedal_participants.pedal_id
        and p.status = 'scheduled'
        and p.creator_id is distinct from (select auth.uid())
    )
  );
