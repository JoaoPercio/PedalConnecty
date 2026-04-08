-- Geolocalized cyclist alerts (Waze-style)

create table if not exists public.map_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  description text,
  lat numeric not null,
  lng numeric not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),

  constraint fk_map_alerts_user
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade,

  constraint map_alerts_type_check
    check (
      type in (
        'danger',
        'obstacle',
        'good_route',
        'climb',
        'repair',
        'water'
      )
    )
);

create index if not exists idx_map_alerts_location
  on public.map_alerts (lat, lng);

create index if not exists idx_map_alerts_expires
  on public.map_alerts (expires_at);

alter table public.map_alerts enable row level security;

create policy "map_alerts_select_authenticated"
  on public.map_alerts
  for select
  to authenticated
  using (true);

create policy "map_alerts_insert_own"
  on public.map_alerts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "map_alerts_delete_own"
  on public.map_alerts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Runs with definer rights so expired rows from all users are removed (RLS would block otherwise).
create or replace function public.delete_expired_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.map_alerts
  where expires_at < now();
end;
$$;

revoke all on function public.delete_expired_alerts() from public;
grant execute on function public.delete_expired_alerts() to authenticated;

-- Nearby alerts within radius (km), non-expired only.
create or replace function public.nearby_map_alerts(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 30
)
returns setof public.map_alerts
language sql
stable
security invoker
set search_path = public
as $$
  select m.*
  from public.map_alerts m
  where m.expires_at > now()
    and (
      6371.0 * acos(
        least(
          1::double precision,
          greatest(
            -1::double precision,
            cos(radians(p_lat))
              * cos(radians(m.lat::double precision))
              * cos(radians(m.lng::double precision) - radians(p_lng))
            + sin(radians(p_lat)) * sin(radians(m.lat::double precision))
          )
        )
      )
    ) <= p_radius_km;
$$;

revoke all on function public.nearby_map_alerts(double precision, double precision, double precision) from public;
grant execute on function public.nearby_map_alerts(double precision, double precision, double precision) to authenticated;
