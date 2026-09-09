import type { NotificationRow } from "@/lib/notifications";

export const DEMO_NOTIFICATION_ID = "usability-demo-notification";

let currentTestNumber: number | null = null;
const listeners = new Set<() => void>();

export function setUsabilityCurrentTestNumber(testNumber: number | null): void {
  if (currentTestNumber === testNumber) return;
  currentTestNumber = testNumber;
  for (const listener of listeners) listener();
}

export function getUsabilityCurrentTestNumber(): number | null {
  return currentTestNumber;
}

export function subscribeUsabilityCurrentTestNumber(
  listener: () => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function shouldInjectDemoNotification(): boolean {
  return currentTestNumber === 10;
}

export function isDemoNotificationId(id: string): boolean {
  return id === DEMO_NOTIFICATION_ID;
}

/** In-memory only — never persisted to Supabase. */
export function buildDemoNotification(userId: string): NotificationRow {
  return {
    id: DEMO_NOTIFICATION_ID,
    user_id: userId,
    type: "usability_demo",
    title: "Notificação de teste",
    message:
      "Esta é uma notificação de demonstração do PedalConnect. Abra-a para concluir o Teste 10 de usabilidade.",
    data: { demo: true, usability_test: 10 },
    is_read: false,
    created_at: new Date().toISOString(),
    expires_at: null,
  };
}

export function ensureDemoNotificationInList(
  userId: string,
  rows: NotificationRow[]
): NotificationRow[] {
  if (!shouldInjectDemoNotification()) return rows;
  if (rows.some((r) => r.id === DEMO_NOTIFICATION_ID)) return rows;
  return [buildDemoNotification(userId), ...rows];
}
