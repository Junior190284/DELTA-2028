import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(){
  const result:any={
    ok:false,
    authenticated:false,
    vapid:{
      public:Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      private:Boolean(process.env.VAPID_PRIVATE_KEY),
      subject:Boolean(process.env.VAPID_SUBJECT)
    },
    runtime:{
      push_enabled: process.env.PUSH_ENABLED === "true",
      push_dry_run: process.env.PUSH_DRY_RUN === "true",
      cutoff_iso: process.env.PUSH_ACTIVATION_CUTOFF_ISO || "2026-10-09T14:30:00.000Z",
      env_present: {
        PUSH_ENABLED: process.env.PUSH_ENABLED !== undefined,
        PUSH_DRY_RUN: process.env.PUSH_DRY_RUN !== undefined,
        PUSH_ACTIVATION_CUTOFF_ISO: process.env.PUSH_ACTIVATION_CUTOFF_ISO !== undefined
      }
    },
    table:false,
    subscriptions:0
  };

  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    result.authenticated=Boolean(user);

    if(!user){
      result.message="Brak aktywnej sesji.";
      return NextResponse.json(result,{status:401});
    }

    const admin=createAdminClient();
    const {data,error}=await admin
      .from("push_subscriptions")
      .select("id,user_id")
      .eq("user_id",user.id);

    if(error){
      result.databaseError={code:error.code,message:error.message};
      result.message=/42P01/.test(error.code||"")
        ? "Brakuje tabeli push_subscriptions."
        : error.message;
      return NextResponse.json(result,{status:500});
    }

    result.table=true;
    result.subscriptions=data?.length||0;
    result.ok=
      result.authenticated &&
      result.table &&
      result.vapid.public &&
      result.vapid.private &&
      result.vapid.subject;

    result.message=result.ok
      ? "Konfiguracja serwera push jest gotowa."
      : "Konfiguracja VAPID jest niepełna.";

    return NextResponse.json(result);
  }catch(e:any){
    result.message=String(e?.message||e);
    return NextResponse.json(result,{status:500});
  }
}
