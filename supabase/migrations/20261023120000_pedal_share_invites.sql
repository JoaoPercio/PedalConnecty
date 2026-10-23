-- Convites por link. O efeito (entrada direta ou pedido) fica gravado na linha,
-- calculado no servidor a partir de quem criou o convite. A URL só carrega o token.

create table if not exists public.pedal_share_invites (
  id uuid primary key default gen_random_uuid(),
  pedal_id uuid not null references public.pedals (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  allows_direct_join boolean not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pedal_share_invites_token_format check (token ~ '^[0-9a-f]{64}$')
);

create unique index if not exists pedal_share_invites_token_uidx
  on public.pedal_share_invites (token);

create unique index if not exists pedal_share_invites_active_creator_uidx
  on public.pedal_share_invites (pedal_id, created_by)
  where revoked_at is null;

create index if not exists pedal_share_invites_pedal_idx
  on public.pedal_share_invites (pedal_id);

comment on table public.pedal_share_invites is
  'Link de convite. allows_direct_join só é verdadeiro quando o autor é o organizador.';

alter table public.pedal_share_invites enable row level security;

revoke all on table public.pedal_share_invites from public, anon, authenticated;

-- Impede gravar entrada direta para quem não é o organizador, mesmo fora do RPC.
create or replace function public.pedal_share_invites_enforce_direct_join()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.allows_direct_join and not exists (
    select 1
    from public.pedals p
    where p.id = new.pedal_id
      and p.creator_id = new.created_by
  ) then
    raise exception 'Só o organizador pode criar um convite com entrada direta.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedal_share_invites_enforce_direct_join on public.pedal_share_invites;
create trigger trg_pedal_share_invites_enforce_direct_join
  before insert or update of allows_direct_join, created_by, pedal_id
  on public.pedal_share_invites
  for each row
  execute procedure public.pedal_share_invites_enforce_direct_join();

-- Um participante por pedal, para o aceite não duplicar linhas em corrida.
do $$
begin
  if exists (
    select 1
    from public.pedal_participants
    group by pedal_id, user_id
    having count(*) > 1
  ) then
    raise exception
      'pedal_participants tem linhas duplicadas (pedal_id, user_id). Remova as duplicatas antes de aplicar esta migration.';
  end if;
end $$;

create unique index if not exists pedal_participants_pedal_user_uidx
  on public.pedal_participants (pedal_id, user_id);

create or replace function public.ensure_pedal_share_invite(p_pedal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_creator uuid;
  v_direct boolean;
  v_row public.pedal_share_invites%rowtype;
  v_token text;
begin
  if v_uid is null then
    raise exception 'É necessário iniciar sessão.';
  end if;

  select p.creator_id into v_creator
  from public.pedals p
  where p.id = p_pedal_id;

  if v_creator is null then
    raise exception 'Pedal não encontrado.';
  end if;

  v_direct := v_creator = v_uid;

  if not v_direct and not exists (
    select 1
    from public.pedal_participants pp
    where pp.pedal_id = p_pedal_id
      and pp.user_id = v_uid
      and pp.status = 'approved'
  ) then
    raise exception 'Só o organizador ou um participante aprovado pode convidar.';
  end if;

  select * into v_row
  from public.pedal_share_invites i
  where i.pedal_id = p_pedal_id
    and i.created_by = v_uid
    and i.revoked_at is null
  for update;

  if found then
    return jsonb_build_object(
      'token', v_row.token,
      'allows_direct_join', v_row.allows_direct_join
    );
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.pedal_share_invites (pedal_id, created_by, token, allows_direct_join)
  values (p_pedal_id, v_uid, v_token, v_direct)
  returning * into v_row;

  return jsonb_build_object(
    'token', v_row.token,
    'allows_direct_join', v_row.allows_direct_join
  );
exception
  when unique_violation then
    select * into v_row
    from public.pedal_share_invites i
    where i.pedal_id = p_pedal_id
      and i.created_by = v_uid
      and i.revoked_at is null;

    if not found then
      raise exception 'Não foi possível gerar o convite. Tente novamente.';
    end if;

    return jsonb_build_object(
      'token', v_row.token,
      'allows_direct_join', v_row.allows_direct_join
    );
end;
$$;

create or replace function public.revoke_pedal_share_invite(p_pedal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'É necessário iniciar sessão.';
  end if;

  update public.pedal_share_invites
  set revoked_at = now()
  where pedal_id = p_pedal_id
    and created_by = v_uid
    and revoked_at is null;

  if not found then
    raise exception 'Não há convite ativo para invalidar.';
  end if;
end;
$$;

create or replace function public.get_pedal_share_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := lower(trim(coalesce(p_token, '')));
  v_invite public.pedal_share_invites%rowtype;
  v_pedal public.pedals%rowtype;
  v_organizer text;
  v_uid uuid := auth.uid();
  v_my_status text;
  v_state text;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('state', 'invalid');
  end if;

  select * into v_invite
  from public.pedal_share_invites
  where token = v_token;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  select * into v_pedal
  from public.pedals
  where id = v_invite.pedal_id;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  select nullif(
    trim(both from concat_ws(
      ' ',
      nullif(trim(pr.first_name), ''),
      nullif(trim(pr.last_name), '')
    )),
    ''
  )
  into v_organizer
  from public.profiles pr
  where pr.id = v_pedal.creator_id;

  if v_uid is not null then
    select pp.status into v_my_status
    from public.pedal_participants pp
    where pp.pedal_id = v_pedal.id
      and pp.user_id = v_uid;
  end if;

  if v_invite.revoked_at is not null then
    v_state := 'revoked';
  elsif v_pedal.status = 'completed' then
    v_state := 'completed';
  elsif v_pedal.status = 'cancelled' then
    v_state := 'cancelled';
  elsif v_pedal.status in ('scheduled', 'in_progress') then
    v_state := 'open';
  else
    v_state := 'closed';
  end if;

  return jsonb_build_object(
    'state', v_state,
    'allows_direct_join', v_invite.allows_direct_join,
    'pedal_id', v_pedal.id,
    'name', v_pedal.name,
    'description', v_pedal.description,
    'date', v_pedal.date,
    'start_location', v_pedal.start_location,
    'visibility', v_pedal.visibility,
    'status', v_pedal.status,
    'organizer_name', coalesce(v_organizer, 'Organizador'),
    'my_status', v_my_status,
    'is_organizer', v_uid is not null and v_uid = v_pedal.creator_id
  );
end;
$$;

create or replace function public.accept_pedal_share_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := lower(trim(coalesce(p_token, '')));
  v_invite public.pedal_share_invites%rowtype;
  v_pedal public.pedals%rowtype;
  v_existing public.pedal_participants%rowtype;
  v_approved int;
  v_gender text;
  v_direct boolean;
  v_user_name text;
  v_pedal_name text;
  v_status text;
  v_had_row boolean := false;
begin
  if v_uid is null then
    raise exception 'É necessário iniciar sessão.';
  end if;

  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Convite inválido.';
  end if;

  select * into v_invite
  from public.pedal_share_invites
  where token = v_token
  for update;

  if not found then
    raise exception 'Convite inválido.';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'Este convite foi invalidado.';
  end if;

  select * into v_pedal
  from public.pedals
  where id = v_invite.pedal_id
  for update;

  if not found then
    raise exception 'Pedal não encontrado.';
  end if;

  if v_pedal.status = 'completed' then
    raise exception 'Este pedal já foi encerrado.';
  elsif v_pedal.status = 'cancelled' then
    raise exception 'Este pedal foi cancelado.';
  elsif v_pedal.status not in ('scheduled', 'in_progress') then
    raise exception 'Este pedal não está aceitando novos participantes.';
  end if;

  -- Entrada direta só com a flag persistida e com o autor ainda sendo o organizador.
  v_direct := v_invite.allows_direct_join
    and v_invite.created_by = v_pedal.creator_id;

  if v_invite.allows_direct_join and not v_direct then
    raise exception 'Este convite não permite entrada direta.';
  end if;

  if v_pedal.creator_id = v_uid then
    return jsonb_build_object('result', 'already_member', 'pedal_id', v_pedal.id);
  end if;

  select * into v_existing
  from public.pedal_participants
  where pedal_id = v_pedal.id
    and user_id = v_uid
  for update;

  v_had_row := found;

  if v_had_row and v_existing.status = 'approved' then
    return jsonb_build_object('result', 'already_member', 'pedal_id', v_pedal.id);
  end if;

  if not v_direct and v_had_row and v_existing.status = 'pending' then
    return jsonb_build_object('result', 'already_pending', 'pedal_id', v_pedal.id);
  end if;

  if v_pedal.visibility = 'female_only' then
    select pr.gender into v_gender
    from public.profiles pr
    where pr.id = v_uid;

    if v_gender is distinct from 'feminino' then
      raise exception 'Este pedal é exclusivo para mulheres. Só é possível participar com gênero feminino no perfil.';
    end if;
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

  if v_had_row then
    update public.pedal_participants
    set status = case when v_direct then 'approved' else 'pending' end
    where id = v_existing.id;
  else
    insert into public.pedal_participants (pedal_id, user_id, status)
    values (
      v_pedal.id,
      v_uid,
      case when v_direct then 'approved' else 'pending' end
    );
  end if;

  if v_direct and not v_had_row and v_pedal.creator_id is distinct from v_uid then
    select coalesce(
      nullif(
        trim(both from concat_ws(
          ' ',
          nullif(trim(pr.first_name), ''),
          nullif(trim(pr.last_name), '')
        )),
        ''
      ),
      'Alguém'
    )
    into v_user_name
    from public.profiles pr
    where pr.id = v_uid;

    v_pedal_name := coalesce(nullif(trim(v_pedal.name), ''), 'este pedal');

    insert into public.notifications (user_id, type, title, message, data, expires_at)
    values (
      v_pedal.creator_id,
      'new_participant',
      'Novo participante',
      v_user_name || ' entrou no pedal "' || v_pedal_name || '" por um convite',
      jsonb_build_object('pedal_id', v_pedal.id, 'participant_id', v_uid),
      now() + interval '7 days'
    );
  end if;

  return jsonb_build_object(
    'result', case when v_direct then 'joined' else 'requested' end,
    'pedal_id', v_pedal.id
  );
exception
  when unique_violation then
    select pp.status into v_status
    from public.pedal_participants pp
    where pp.pedal_id = v_pedal.id
      and pp.user_id = v_uid;

    if v_status = 'approved' or v_pedal.creator_id = v_uid then
      return jsonb_build_object('result', 'already_member', 'pedal_id', v_pedal.id);
    end if;

    if v_status = 'pending' and not v_direct then
      return jsonb_build_object('result', 'already_pending', 'pedal_id', v_pedal.id);
    end if;

    raise exception 'Não foi possível concluir a entrada. Tente novamente.';
end;
$$;

revoke all on function public.ensure_pedal_share_invite(uuid) from public, anon, authenticated;
grant execute on function public.ensure_pedal_share_invite(uuid) to authenticated;

revoke all on function public.revoke_pedal_share_invite(uuid) from public, anon, authenticated;
grant execute on function public.revoke_pedal_share_invite(uuid) to authenticated;

revoke all on function public.get_pedal_share_invite(text) from public, anon, authenticated;
grant execute on function public.get_pedal_share_invite(text) to anon, authenticated;

revoke all on function public.accept_pedal_share_invite(text) from public, anon, authenticated;
grant execute on function public.accept_pedal_share_invite(text) to authenticated;
