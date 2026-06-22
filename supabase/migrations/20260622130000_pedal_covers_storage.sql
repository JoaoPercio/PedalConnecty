-- Pedal cover images: public bucket + RLS on storage.objects.
-- File path convention: {pedalId}.{ext} (see uploadPedalCover in src/lib/pedals.ts).

insert into storage.buckets (id, name, public)
values ('pedals', 'pedals', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pedal_covers_select_public" on storage.objects;
create policy "pedal_covers_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'pedals');

drop policy if exists "pedal_covers_insert_creator" on storage.objects;
create policy "pedal_covers_insert_creator"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pedals'
    and exists (
      select 1
      from public.pedals p
      where p.id::text = split_part(name, '.', 1)
        and p.creator_id = (select auth.uid())
    )
  );

drop policy if exists "pedal_covers_update_creator" on storage.objects;
create policy "pedal_covers_update_creator"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pedals'
    and exists (
      select 1
      from public.pedals p
      where p.id::text = split_part(name, '.', 1)
        and p.creator_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'pedals'
    and exists (
      select 1
      from public.pedals p
      where p.id::text = split_part(name, '.', 1)
        and p.creator_id = (select auth.uid())
    )
  );

drop policy if exists "pedal_covers_delete_creator" on storage.objects;
create policy "pedal_covers_delete_creator"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pedals'
    and exists (
      select 1
      from public.pedals p
      where p.id::text = split_part(name, '.', 1)
        and p.creator_id = (select auth.uid())
    )
  );
