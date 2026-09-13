import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try{
    const supabase = await createClient();
    const { data: { user }, error:userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {error:"Unauthorized",message:"Sesja wygasła. Zaloguj się ponownie."},
        {status:401}
      );
    }

    const subscription = await req.json();
    const endpoint=subscription?.endpoint;
    const p256dh=subscription?.keys?.p256dh;
    const auth=subscription?.keys?.auth;

    if(!endpoint || !p256dh || !auth){
      return NextResponse.json(
        {error:"Invalid subscription",message:"Telefon przekazał niepełne dane subskrypcji push."},
        {status:400}
      );
    }

    const admin=createAdminClient();

    // Service role writes after authentication. This avoids browser/RLS
    // differences during upsert while still assigning the subscription
    // only to the authenticated user.
    const { error } = await admin.from("push_subscriptions").upsert({
      user_id:user.id,
      endpoint,
      p256dh,
      auth,
      user_agent:req.headers.get("user-agent")
    },{onConflict:"endpoint"});

    if (error) {
      const missingTable =
        error.code==="42P01" ||
        /push_subscriptions.*does not exist|relation .*push_subscriptions/i.test(error.message||"");

      return NextResponse.json({
        error:"Database write failed",
        code:error.code,
        detail:error.message,
        message:missingTable
          ? "Brakuje tabeli push_subscriptions w Supabase. Uruchom plik supabase/v4_push_setup.sql."
          : `Supabase nie zapisał telefonu: ${error.message}`
      },{status:500});
    }

    return NextResponse.json({
      ok:true,
      message:"Telefon został zapisany do powiadomień push."
    });
  }catch(e:any){
    return NextResponse.json({
      error:"Push setup failed",
      detail:String(e?.message||e),
      message:`Błąd serwera podczas zapisywania telefonu: ${String(e?.message||e)}`
    },{status:500});
  }
}
