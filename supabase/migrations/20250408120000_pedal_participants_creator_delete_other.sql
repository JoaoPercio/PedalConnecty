-- Organizers may delete another user's participant row while the pedal is still scheduled
-- (cannot remove their own row; they cancel the pedal or stay listed as organizer).
drop policy if exists "pedal_participants_creator_delete_other_scheduled" on public.pedal_participants;
create policy "pedal_participants_creator_delete_other_scheduled"
  on public.pedal_participants
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.pedals p
      where p.id = pedal_participants.pedal_id
        and p.creator_id = (select auth.uid())
        and p.status = 'scheduled'
    )
    and user_id is distinct from (select auth.uid())
  );
