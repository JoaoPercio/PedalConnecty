-- Notify approved participants (except creator) when a pedal status becomes in_progress.

create or replace function public.notify_pedal_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_pedal_name text;
begin
  if tg_op = 'UPDATE'
     and new.status = 'in_progress'
     and old.status is distinct from 'in_progress' then
    v_pedal_name := coalesce(nullif(trim(new.name), ''), 'este pedal');

    for r in
      select pp.user_id
      from public.pedal_participants pp
      where pp.pedal_id = new.id
        and pp.status = 'approved'
        and pp.user_id is distinct from new.creator_id
    loop
      insert into public.notifications (user_id, type, title, message, data, expires_at)
      values (
        r.user_id,
        'pedal_started',
        'Pedal iniciado',
        'O pedal "' || v_pedal_name || '" começou',
        jsonb_build_object('pedal_id', new.id),
        now() + interval '7 days'
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pedals_started_notify on public.pedals;
create trigger trg_pedals_started_notify
  after update of status on public.pedals
  for each row
  execute procedure public.notify_pedal_started();
