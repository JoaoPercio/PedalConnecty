-- Pedais female_only: inserção em pedal_participants só com perfil gender=feminino,
-- exceto o organizador a inserir-se (ex.: criação do pedal).

drop policy if exists "pedal_participants_insert_self" on public.pedal_participants;
create policy "pedal_participants_insert_self"
  on public.pedal_participants
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.pedals p
      where p.id = pedal_participants.pedal_id
        and (
          p.visibility = 'public'
          or (
            p.visibility = 'female_only'
            and (
              p.creator_id = (select auth.uid())
              or exists (
                select 1 from public.profiles pr
                where pr.id = (select auth.uid())
                  and pr.gender = 'feminino'
              )
            )
          )
          or (
            p.visibility = 'private'
            and p.creator_id = (select auth.uid())
            and pedal_participants.user_id = p.creator_id
          )
        )
    )
  );
