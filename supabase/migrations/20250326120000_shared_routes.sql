-- Shared routes (matches app DDL: start_lat/start_lng, nullable distance/elevation)

create table if not exists public.routes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text null,
  distance_km numeric null,
  elevation_gain numeric null,
  start_lat numeric null,
  start_lng numeric null,
  route_geojson jsonb not null,
  created_at timestamp without time zone null default now(),
  constraint routes_pkey primary key (id),
  constraint routes_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade
);

create index if not exists routes_user_id_idx on public.routes (user_id);
create index if not exists routes_start_idx on public.routes (start_lat, start_lng);

create table if not exists public.route_ratings (
  id uuid not null default gen_random_uuid(),
  route_id uuid not null,
  user_id uuid not null,
  rating integer not null,
  created_at timestamp without time zone null default now(),
  constraint route_ratings_pkey primary key (id),
  constraint route_ratings_route_id_user_id_key unique (route_id, user_id),
  constraint route_ratings_route_id_fkey foreign key (route_id) references public.routes (id) on delete cascade,
  constraint route_ratings_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade,
  constraint route_ratings_rating_check check (rating >= 1 and rating <= 5)
);

create index if not exists route_ratings_route_id_idx on public.route_ratings (route_id);

create table if not exists public.route_comments (
  id uuid not null default gen_random_uuid(),
  route_id uuid not null,
  user_id uuid not null,
  comment text not null,
  created_at timestamp without time zone null default now(),
  constraint route_comments_pkey primary key (id),
  constraint route_comments_route_id_fkey foreign key (route_id) references public.routes (id) on delete cascade,
  constraint route_comments_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade
);

create index if not exists route_comments_route_id_idx on public.route_comments (route_id);

create table if not exists public.route_favorites (
  route_id uuid not null references public.routes (id) on delete cascade,
  user_id uuid not null
    constraint route_favorites_user_id_fkey references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

create index if not exists route_favorites_user_id_idx on public.route_favorites (user_id);

alter table public.routes enable row level security;
alter table public.route_ratings enable row level security;
alter table public.route_comments enable row level security;
alter table public.route_favorites enable row level security;

drop policy if exists "routes_select_authenticated" on public.routes;
create policy "routes_select_authenticated"
  on public.routes
  for select
  to authenticated
  using (true);

drop policy if exists "routes_insert_owner" on public.routes;
create policy "routes_insert_owner"
  on public.routes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "routes_update_owner" on public.routes;
create policy "routes_update_owner"
  on public.routes
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routes_delete_owner" on public.routes;
create policy "routes_delete_owner"
  on public.routes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "route_ratings_select" on public.route_ratings;
create policy "route_ratings_select"
  on public.route_ratings
  for select
  to authenticated
  using (true);

drop policy if exists "route_ratings_insert_own" on public.route_ratings;
create policy "route_ratings_insert_own"
  on public.route_ratings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "route_ratings_update_own" on public.route_ratings;
create policy "route_ratings_update_own"
  on public.route_ratings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "route_comments_select" on public.route_comments;
create policy "route_comments_select"
  on public.route_comments
  for select
  to authenticated
  using (true);

drop policy if exists "route_comments_insert_own" on public.route_comments;
create policy "route_comments_insert_own"
  on public.route_comments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "route_comments_update_own" on public.route_comments;
create policy "route_comments_update_own"
  on public.route_comments
  for update
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "route_favorites_select_own" on public.route_favorites;
create policy "route_favorites_select_own"
  on public.route_favorites
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "route_favorites_insert_own" on public.route_favorites;
create policy "route_favorites_insert_own"
  on public.route_favorites
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "route_favorites_delete_own" on public.route_favorites;
create policy "route_favorites_delete_own"
  on public.route_favorites
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.route_comments;
