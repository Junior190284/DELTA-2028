import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});

  const subscription = await req.json();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id:user.id,
    endpoint:subscription.endpoint,
    p256dh:subscription.keys?.p256dh,
    auth:subscription.keys?.auth,
    user_agent:req.headers.get("user-agent")
  },{onConflict:"endpoint"});

  if (error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
