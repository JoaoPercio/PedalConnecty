-- Pedal lifecycle timestamps and completed-pedals counter on profiles.

alter table public.pedals
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

alter table public.profiles
  add column if not exists completed_pedals_count integer not null default 0;

-- When a pedal becomes completed, increment once per distinct user (creator + approved participants).
create or replace function public.bump_profiles_on_pedal_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
     and old.status is distinct from new.status
     and old.status is distinct from 'completed'
  then
    update public.profiles p
    set completed_pedals_count = completed_pedals_count + 1
    where p.id in (
      select distinct uid from (
        select new.creator_id as uid
        union
        select pp.user_id
        from public.pedal_participants pp
        where pp.pedal_id = new.id
          and pp.status = 'approved'
      ) s
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedals_bump_completed_count on public.pedals;
create trigger trg_pedals_bump_completed_count
  after update of status on public.pedals
  for each row
  execute procedure public.bump_profiles_on_pedal_completed();

-- Backfill completed_pedals_count from existing data.
update public.profiles pr
set completed_pedals_count = coalesce(sub.cnt, 0)
from (
  select
    pr2.id as profile_id,
    (
      select count(*)::integer
      from (
        select p.id
        from public.pedals p
        where p.creator_id = pr2.id
          and p.status = 'completed'
        union
        select pp.pedal_id
        from public.pedal_participants pp
        inner join public.pedals p on p.id = pp.pedal_id
        where pp.user_id = pr2.id
          and pp.status = 'approved'
          and p.status = 'completed'
      ) u
    ) as cnt
  from public.profiles pr2
) sub
where pr.id = sub.profile_id;
