-- Velocidade média prevista do trajeto (km/h).

alter table public.pedals
  add column if not exists average_speed_kmh numeric null;

comment on column public.pedals.average_speed_kmh is 'Velocidade média prevista do trajeto, em km/h.';
