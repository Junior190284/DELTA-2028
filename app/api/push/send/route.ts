import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function safeMessage(err: any) {
  return String(
    err?.body ||
    err?.message ||
    err?.response?.body ||
    err ||
    "Nieznany błąd"
  ).slice(0, 500);
}

export async function POST(req: NextRequest) {
  // 1. Feature Flag Guard
  if (process.env.PUSH_ENABLED !== "true") {
    return NextResponse.json({
      ok: false,
      error: "PUSH_DISABLED",
      message: "Powiadomienia Web Push są obecnie wyłączone na tym środowisku."
    }, { status: 403 });
  }

  // 2. Auth & Role verification
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json();

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    return NextResponse.json({
      error: "VAPID_CONFIG",
      message: "Brakuje konfiguracji VAPID.",
      config: {
        subject: Boolean(subject),
        publicKey: Boolean(publicKey),
        privateKey: Boolean(privateKey)
      }
    }, { status: 500 });
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (e: any) {
    return NextResponse.json({
      error: "VAPID_INVALID",
      message: "Nie można ustawić kluczy VAPID.",
      detail: safeMessage(e)
    }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: subs, error: subError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, created_at")
    .eq("enabled", true);

  if (subError) {
    return NextResponse.json({
      error: "SUBSCRIPTIONS_READ",
      message: "Nie można odczytać zapisanych telefonów.",
      detail: subError.message
    }, { status: 500 });
  }

  let sent = 0, failed = 0, disabled = 0;
  const errors: any[] = [];

  for (const s of subs || []) {
    try {
      await webpush.sendNotification({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      }, JSON.stringify({
        title: payload.title || "DELTA 2018 GM",
        body: payload.body || "Test powiadomień DELTA 2018 GM",
        url: payload.url || "/dashboard?view=club",
        tag: payload.tag || `delta-test-${Date.now()}`,
        category: "test"
      }), {
        TTL: 60 * 60
      });

      sent++;
    } catch (err: any) {
      failed++;
      const statusCode = Number(err?.statusCode || 0);
      const detail = safeMessage(err);

      errors.push({
        subscriptionId: s.id,
        statusCode,
        message: detail
      });

      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").update({ enabled: false }).eq("id", s.id);
        disabled++;
      }
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    disabled,
    total: (subs || []).length,
    errors
  });
}
