-- Códigos de convite para pedais privados: só o criador entra direto; outros entram via RPC com código.

alter table public.pedals
  add column if not exists invite_code text;

create unique index if not exists pedals_invite_code_unique
  on public.pedals (invite_code)
  where invite_code is not null;

comment on column public.pedals.invite_code is 'Código alfanumérico (pedais visibility=private); gerado automaticamente.';

-- Gera código legível (sem I, O, 0, 1).
create or replace function public.generate_pedal_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  candidate text;
  attempts int := 0;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    candidate := result;
    exit when not exists (
      select 1 from public.pedals p where p.invite_code = candidate
    );
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Não foi possível gerar código de convite único';
    end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.pedals_set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.visibility = 'private' then
    if new.invite_code is null or trim(new.invite_code) = '' then
      new.invite_code := public.generate_pedal_invite_code();
    end if;
  else
    new.invite_code := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedals_set_invite_code on public.pedals;
create trigger trg_pedals_set_invite_code
  before insert or update of visibility, invite_code
  on public.pedals
  for each row
  execute procedure public.pedals_set_invite_code();

-- Pedais privados existentes sem código
do $$
declare
  r record;
begin
  for r in
    select id from public.pedals
    where visibility = 'private'
      and (invite_code is null or trim(invite_code) = '')
  loop
    update public.pedals
    set invite_code = public.generate_pedal_invite_code()
    where id = r.id;
  end loop;
end;
$$;

-- Bloquear pedidos de participação diretos em pedais privados (exceto o organizador a inserir-se na criação).
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
          p.visibility in ('public', 'female_only')
          or (
            p.visibility = 'private'
            and p.creator_id = (select auth.uid())
            and pedal_participants.user_id = p.creator_id
          )
        )
    )
  );

-- Entrar com código: aprovação imediata (pedal privado).
create or replace function public.join_pedal_with_invite(raw_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pedal public.pedals%rowtype;
  v_norm text;
  v_approved int;
begin
  if v_uid is null then
    raise exception 'É necessário iniciar sessão.';
  end if;

  v_norm := upper(trim(replace(replace(coalesce(raw_code, ''), '-', ''), ' ', '')));
  if v_norm = '' then
    raise exception 'Indique o código de convite.';
  end if;

  select * into strict v_pedal
  from public.pedals p
  where p.visibility = 'private'
    and upper(trim(p.invite_code)) = v_norm;

  if v_pedal.status not in ('scheduled', 'in_progress') then
    raise exception 'Este pedal não está aberto a novos participantes.';
  end if;

  if v_pedal.creator_id = v_uid then
    return v_pedal.id;
  end if;

  if v_pedal.max_participants is not null then
    select count(*)::int into v_approved
    from public.pedal_participants pp
    where pp.pedal_id = v_pedal.id
      and pp.status = 'approved';

    if v_approved >= v_pedal.max_participants then
      raise exception 'Este pedal já atingiu o limite de participantes.';
    end if;
  end if;

  if exists (
    select 1 from public.pedal_participants pp
    where pp.pedal_id = v_pedal.id and pp.user_id = v_uid
  ) then
    update public.pedal_participants
    set status = 'approved'
    where pedal_id = v_pedal.id and user_id = v_uid;
  else
    insert into public.pedal_participants (pedal_id, user_id, status)
    values (v_pedal.id, v_uid, 'approved');
  end if;

  return v_pedal.id;
exception
  when no_data_found then
    raise exception 'Código inválido ou pedal não encontrado.';
  when too_many_rows then
    raise exception 'Código ambíguo; contacte o suporte.';
end;
$$;

revoke all on function public.join_pedal_with_invite(text) from public;
grant execute on function public.join_pedal_with_invite(text) to authenticated;

-- Novo código (só organizador do pedal privado).
create or replace function public.regenerate_pedal_invite_code(p_pedal_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new text;
begin
  if v_uid is null then
    raise exception 'É necessário iniciar sessão.';
  end if;

  if not exists (
    select 1 from public.pedals p
    where p.id = p_pedal_id and p.creator_id = v_uid and p.visibility = 'private'
  ) then
    raise exception 'Só o organizador pode renovar o código deste pedal privado.';
  end if;

  v_new := public.generate_pedal_invite_code();
  update public.pedals set invite_code = v_new where id = p_pedal_id;
  return v_new;
end;
$$;

revoke all on function public.regenerate_pedal_invite_code(uuid) from public;
grant execute on function public.regenerate_pedal_invite_code(uuid) to authenticated;

-- Código de convite só para o organizador (evita expor no select genérico).
create or replace function public.get_pedal_invite_code_for_creator(p_pedal_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    return null;
  end if;

  select p.invite_code into v_code
  from public.pedals p
  where p.id = p_pedal_id
    and p.creator_id = v_uid
    and p.visibility = 'private';

  return v_code;
end;
$$;

revoke all on function public.get_pedal_invite_code_for_creator(uuid) from public;
grant execute on function public.get_pedal_invite_code_for_creator(uuid) to authenticated;
