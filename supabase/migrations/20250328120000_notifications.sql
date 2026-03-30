-- In-app notifications (RLS: users only read/update/delete own rows; inserts via SECURITY DEFINER triggers)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Triggers: participant lifecycle ----------
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

  -- Pedido: INSERT pending ou UPDATE que volta a pending (ex.: após rejected)
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

drop trigger if exists trg_pedal_participants_notify on public.pedal_participants;
create trigger trg_pedal_participants_notify
  after insert or update on public.pedal_participants
  for each row execute procedure public.notify_pedal_participant_change();

-- ---------- Chat: new message ----------
create or replace function public.notify_pedal_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct x.uid as uid from (
      select p.creator_id as uid from public.pedals p where p.id = new.pedal_id
      union
      select pp.user_id as uid from public.pedal_participants pp
      where pp.pedal_id = new.pedal_id and pp.status = 'approved'
    ) x
    where x.uid is distinct from new.user_id
  loop
    insert into public.notifications (user_id, type, title, message, data, expires_at)
    values (
      r.uid,
      'new_message',
      'Nova mensagem no chat',
      'Há uma nova mensagem no pedal',
      jsonb_build_object('pedal_id', new.pedal_id, 'message_id', new.id),
      now() + interval '1 day'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_pedal_messages_notify on public.pedal_messages;
create trigger trg_pedal_messages_notify
  after insert on public.pedal_messages
  for each row execute procedure public.notify_pedal_new_message();

-- ---------- Pedal cancelled (when status column becomes 'cancelled') ----------
create or replace function public.notify_pedal_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if tg_op = 'UPDATE'
     and new.status = 'cancelled'
     and (old.status is distinct from 'cancelled') then
    for r in
      select user_id from public.pedal_participants
      where pedal_id = new.id and status = 'approved'
    loop
      insert into public.notifications (user_id, type, title, message, data, expires_at)
      values (
        r.user_id,
        'pedal_cancelled',
        'Pedal cancelado',
        'Um pedal em que você participa foi cancelado',
        jsonb_build_object('pedal_id', new.id),
        now() + interval '7 days'
      );
    end loop;
    if not exists (
      select 1 from public.pedal_participants
      where pedal_id = new.id and user_id = new.creator_id and status = 'approved'
    ) then
      insert into public.notifications (user_id, type, title, message, data, expires_at)
      values (
        new.creator_id,
        'pedal_cancelled',
        'Pedal cancelado',
        'Seu pedal foi marcado como cancelado',
        jsonb_build_object('pedal_id', new.id),
        now() + interval '7 days'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedals_cancelled_notify on public.pedals;
create trigger trg_pedals_cancelled_notify
  after update on public.pedals
  for each row execute procedure public.notify_pedal_cancelled();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when others then null;
end $$;
