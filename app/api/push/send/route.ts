import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});

  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "coach") {
    return NextResponse.json({error:"Forbidden"},{status:403});
  }

  const payload = await req.json();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("*");

  let sent=0, failed=0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({
        endpoint:s.endpoint,
        keys:{p256dh:s.p256dh,auth:s.auth}
      }, JSON.stringify({
        title:payload.title || "DELTA 2018 GM",
        body:payload.body || "",
        url:payload.url || "/"
      }));
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ok:true,sent,failed});
}
