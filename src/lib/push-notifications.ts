import { supabase } from "./supabase";

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

export async function subscribeToPush(userId: string): Promise<{
  error: Error | null;
}> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { error: new Error("Push notifications não configuradas.") };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: new Error("Permissão de notificações negada.") };
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return { error: new Error("Service worker indisponível.") };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      userVisibleOnly: true,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { error: new Error("Subscrição push inválida.") };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  return { error: error ?? null };
}

export async function unsubscribeFromPush(userId: string): Promise<{
  error: Error | null;
}> {
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
  }

  return { error: null };
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
