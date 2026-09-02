import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

interface WebhookBody {
  userId: string;
  title: string;
  message: string;
  url?: string;
  notificationId?: string;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin credentials missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys missing");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:suporte@pedalconnect.app",
    publicKey,
    privateKey
  );
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.userId || !body.title || !body.message) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    configureWebPush();
  } catch {
    return Response.json({ error: "Push not configured" }, { status: 503 });
  }

  const supabase = getAdminClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", body.userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: body.title,
    message: body.message,
    url: body.url ?? "/home",
    notificationId: body.notificationId,
  });

  const results = await Promise.allSettled(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return Response.json({ sent, failed });
}
