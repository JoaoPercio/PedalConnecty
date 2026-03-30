-- Allow pedal creators to update their own pedais (required for edit screen).
-- Requires row level security enabled on public.pedals (add only the policy if RLS is already on).
drop policy if exists "pedals_update_owner" on public.pedals;
create policy "pedals_update_owner"
  on public.pedals
  for update
  to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));
