-- Web Push subscriptions for PWA notifications

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Notify push dispatcher when a notification row is inserted.
-- Requires pg_net extension (enabled by default on Supabase).
-- Set app.push_webhook_url and app.push_webhook_secret via Supabase Vault or SQL:
--   alter database postgres set app.push_webhook_url = 'https://your-app.vercel.app/api/push/webhook';
--   alter database postgres set app.push_webhook_secret = 'your-secret';

create or replace function public.dispatch_push_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_target_url text;
begin
  v_url := current_setting('app.push_webhook_url', true);
  v_secret := current_setting('app.push_webhook_secret', true);

  if v_url is null or v_url = '' then
    return new;
  end if;

  v_target_url := case
    when (new.data->>'pedal_id') is not null then
      '/pedals/' || (new.data->>'pedal_id')
    else '/home'
  end;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'userId', new.user_id,
      'title', new.title,
      'message', new.message,
      'url', v_target_url,
      'notificationId', new.id
    )
  );

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_notifications_push_dispatch on public.notifications;
create trigger trg_notifications_push_dispatch
  after insert on public.notifications
  for each row execute procedure public.dispatch_push_on_notification_insert();
