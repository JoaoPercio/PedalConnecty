-- Google OAuth: gate registration until profile is complete; auto-insert profile for Google sign-ups only.

alter table public.profiles
  add column if not exists registration_completed_at timestamptz;

alter table public.profiles
  alter column first_name drop not null,
  alter column last_name drop not null,
  alter column birth_date drop not null,
  alter column city drop not null,
  alter column gender drop not null,
  alter column skill_level drop not null;

-- Existing full profiles (email signup) count as completed.
update public.profiles
set registration_completed_at = coalesce(registration_completed_at, now())
where registration_completed_at is null
  and first_name is not null
  and trim(first_name) <> ''
  and last_name is not null
  and trim(last_name) <> ''
  and birth_date is not null
  and city is not null
  and trim(city) <> ''
  and gender is not null
  and skill_level is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_google boolean;
  v_first text;
  v_last text;
  v_full text;
  v_avatar text;
begin
  v_is_google :=
    coalesce(new.raw_app_meta_data->>'provider', '') = 'google'
    or position('google' in coalesce((new.raw_app_meta_data->'providers')::text, '')) > 0
    or coalesce(new.raw_user_meta_data->>'iss', '') like '%accounts.google.com%';

  if not v_is_google then
    return new;
  end if;

  v_full := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_first := nullif(trim(coalesce(new.raw_user_meta_data->>'given_name', '')), '');
  v_last := nullif(trim(coalesce(new.raw_user_meta_data->>'family_name', '')), '');

  if v_first is null and v_full is not null then
    v_first := split_part(v_full, ' ', 1);
    v_last := nullif(trim(substring(v_full from length(v_first) + 2)), '');
  end if;

  v_avatar := nullif(
    trim(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')),
    ''
  );

  insert into public.profiles (
    id,
    first_name,
    last_name,
    avatar_url,
    birth_date,
    city,
    gender,
    skill_level,
    registration_completed_at
  )
  values (
    new.id,
    v_first,
    v_last,
    v_avatar,
    null,
    null,
    null,
    null,
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
