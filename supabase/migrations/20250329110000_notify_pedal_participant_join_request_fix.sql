-- Fix join_request notifications:
-- 1) App uses UPDATE (not INSERT) when re-requesting after reject — must notify on pending transition.
-- 2) coalesce names: NULL || '...' in PostgreSQL yields NULL → violates notifications.message NOT NULL.
-- 3) Keep SECURITY DEFINER + search_path so inserts succeed under RLS.

create or replace function public.notify_pedal_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_pedal_name text;
  v_user_name text;
begin
  select p.creator_id, p.name into v_creator, v_pedal_name
  from public.pedals p
  where p.id = coalesce(new.pedal_id, old.pedal_id);

  if v_creator is null then
    return coalesce(new, old);
  end if;

  select pr.first_name into v_user_name
  from public.profiles pr
  where pr.id = new.user_id;

  v_pedal_name := coalesce(nullif(trim(v_pedal_name), ''), 'este pedal');
  v_user_name := coalesce(nullif(trim(v_user_name), ''), 'Alguém');

  -- Pedido novo: INSERT com pending OU re-pedido (UPDATE de rejected/outro → pending)
  if new.user_id is distinct from v_creator then
    if (tg_op = 'INSERT' and new.status = 'pending')
       or (
         tg_op = 'UPDATE'
         and new.status = 'pending'
         and old.status is distinct from 'pending'
       ) then
      insert into public.notifications (user_id, type, title, message, data, expires_at)
      values (
        v_creator,
        'join_request',
        'Novo pedido para participar',
        v_user_name || ' pediu para entrar no pedal "' || v_pedal_name || '"',
        jsonb_build_object('pedal_id', new.pedal_id, 'from_user_id', new.user_id),
        now() + interval '2 days'
      );
      return new;
    end if;
  end if;

  if tg_op = 'UPDATE' and new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.notifications (user_id, type, title, message, data, expires_at)
    values (
      new.user_id,
      'request_approved',
      'Pedido aprovado',
      'Você foi aprovado no pedal "' || v_pedal_name || '"',
      jsonb_build_object('pedal_id', new.pedal_id),
      now() + interval '7 days'
    );
    if v_creator is distinct from new.user_id then
      insert into public.notifications (user_id, type, title, message, data, expires_at)
      values (
        v_creator,
        'new_participant',
        'Novo participante',
        v_user_name || ' foi aprovado no pedal "' || v_pedal_name || '"',
        jsonb_build_object('pedal_id', new.pedal_id, 'participant_id', new.user_id),
        now() + interval '7 days'
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.notifications (user_id, type, title, message, data, expires_at)
    values (
      new.user_id,
      'request_rejected',
      'Pedido recusado',
      'Seu pedido para o pedal "' || v_pedal_name || '" foi recusado',
      jsonb_build_object('pedal_id', new.pedal_id),
      now() + interval '7 days'
    );
    return new;
  end if;

  return coalesce(new, old);
end;
$$;
