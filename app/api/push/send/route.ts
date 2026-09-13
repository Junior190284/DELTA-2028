import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function safeMessage(err:any){
  return String(
    err?.body ||
    err?.message ||
    err?.response?.body ||
    err ||
    "Nieznany błąd"
  ).slice(0,500);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id",user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "coach") {
    return NextResponse.json({error:"Forbidden"},{status:403});
  }

  const payload = await req.json();

  const subject=process.env.VAPID_SUBJECT;
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey=process.env.VAPID_PRIVATE_KEY;

  if(!subject || !publicKey || !privateKey){
    return NextResponse.json({
      error:"VAPID_CONFIG",
      message:"Brakuje konfiguracji VAPID w Vercel.",
      config:{
        subject:Boolean(subject),
        publicKey:Boolean(publicKey),
        privateKey:Boolean(privateKey)
      }
    },{status:500});
  }

  try{
    webpush.setVapidDetails(subject,publicKey,privateKey);
  }catch(e:any){
    return NextResponse.json({
      error:"VAPID_INVALID",
      message:"Nie można ustawić kluczy VAPID.",
      detail:safeMessage(e)
    },{status:500});
  }

  const admin = createAdminClient();
  const { data: subs, error:subError } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,created_at");

  if(subError){
    return NextResponse.json({
      error:"SUBSCRIPTIONS_READ",
      message:"Nie można odczytać zapisanych telefonów.",
      detail:subError.message,
      code:subError.code
    },{status:500});
  }

  let sent=0, failed=0, removed=0;
  const errors:any[]=[];

  for (const s of subs || []) {
    try {
      await webpush.sendNotification({
        endpoint:s.endpoint,
        keys:{p256dh:s.p256dh,auth:s.auth}
      }, JSON.stringify({
        title:payload.title || "DELTA 2018 GM",
        body:payload.body || "Test powiadomień DELTA 2018 GM",
        url:payload.url || "/dashboard?view=club",
        tag:payload.tag || `delta-test-${Date.now()}`
      }),{
        TTL:60 * 60
      });

      sent++;
    } catch (err:any) {
      failed++;
      const statusCode=Number(err?.statusCode||0);
      const detail=safeMessage(err);

      errors.push({
        subscriptionId:s.id,
        statusCode,
        message:detail
      });

      // These subscriptions are permanently invalid.
      if(statusCode===404 || statusCode===410){
        await admin.from("push_subscriptions").delete().eq("id",s.id);
        removed++;
      }
    }
  }

  return NextResponse.json({
    ok:failed===0,
    sent,
    failed,
    removed,
    total:(subs||[]).length,
    errors
  });
}
