-- Pontos de parada ao longo do trajeto (nome + coordenadas), separados da LineString.

alter table public.routes
  add column if not exists route_waypoints jsonb not null default '[]'::jsonb;

alter table public.pedals
  add column if not exists route_waypoints jsonb not null default '[]'::jsonb;

comment on column public.routes.route_waypoints is 'Array JSON: [{ "name": string, "lat": number, "lng": number }]';
comment on column public.pedals.route_waypoints is 'Array JSON: [{ "name": string, "lat": number, "lng": number }]';
