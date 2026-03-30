-- Re-bind notification triggers (e.g. if an older migration failed at trigger creation,
-- or to switch EXECUTE FUNCTION → EXECUTE PROCEDURE on older Postgres).
-- Requires functions from 20250328120000_notifications.sql to exist.

drop trigger if exists trg_pedal_participants_notify on public.pedal_participants;
create trigger trg_pedal_participants_notify
  after insert or update on public.pedal_participants
  for each row execute procedure public.notify_pedal_participant_change();

drop trigger if exists trg_pedal_messages_notify on public.pedal_messages;
create trigger trg_pedal_messages_notify
  after insert on public.pedal_messages
  for each row execute procedure public.notify_pedal_new_message();

drop trigger if exists trg_pedals_cancelled_notify on public.pedals;
create trigger trg_pedals_cancelled_notify
  after update on public.pedals
  for each row execute procedure public.notify_pedal_cancelled();
