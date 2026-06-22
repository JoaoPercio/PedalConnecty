-- Nearby pedals within radius (km), scheduled/in_progress and visible on map only.

create index if not exists idx_pedals_start_location
  on public.pedals (start_lat, start_lng);

create or replace function public.nearby_pedals(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 30
)
returns setof public.pedals
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.pedals p
  where p.status in ('scheduled', 'in_progress')
    and p.visibility in ('public', 'female_only')
    and p.start_lat is not null
    and p.start_lng is not null
    and (
      6371.0 * acos(
        least(
          1::double precision,
          greatest(
            -1::double precision,
            cos(radians(p_lat))
              * cos(radians(p.start_lat::double precision))
              * cos(radians(p.start_lng::double precision) - radians(p_lng))
            + sin(radians(p_lat)) * sin(radians(p.start_lat::double precision))
          )
        )
      )
    ) <= p_radius_km
  order by p.date asc;
$$;

revoke all on function public.nearby_pedals(double precision, double precision, double precision) from public;
grant execute on function public.nearby_pedals(double precision, double precision, double precision) to authenticated;
