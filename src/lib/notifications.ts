import { supabase } from "./supabase";

export const NOTIFICATION_TYPES = [
  "join_request",
  "request_approved",
  "request_rejected",
  "new_participant",
  "pedal_reminder",
  "pedal_cancelled",
  "pedal_started",
  "new_message",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Remove expired rows for the current user (RLS). Call before listing. */
export async function deleteExpiredNotificationsForUser(): Promise<{
  error: Error | null;
}> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso());

  return { error: error ?? null };
}

export async function fetchNotificationsForUser(
  userId: string,
  limit = 50
): Promise<{ rows: NotificationRow[]; error: Error | null }> {
  await deleteExpiredNotificationsForUser();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,user_id,type,title,message,data,is_read,created_at,expires_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error };

  const rows = (data ?? []) as NotificationRow[];
  return { rows, error: null };
}

export async function fetchUnreadNotificationCount(
  userId: string
): Promise<{ count: number; error: Error | null }> {
  await deleteExpiredNotificationsForUser();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return { count: 0, error };
  return { count: count ?? 0, error: null };
}

export async function markNotificationsAsRead(
  userId: string,
  ids: string[]
): Promise<{ error: Error | null }> {
  if (ids.length === 0) return { error: null };
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .in("id", ids);
  return { error: error ?? null };
}

export async function markAllNotificationsRead(
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { error: error ?? null };
}

export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("id", notificationId);
  return { error: error ?? null };
}
