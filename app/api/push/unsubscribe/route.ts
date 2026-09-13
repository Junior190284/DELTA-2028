import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});

  const {endpoint}=await req.json();
  if(!endpoint)return NextResponse.json({error:"Missing endpoint"},{status:400});

  const admin=createAdminClient();
  const {error}=await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id",user.id)
    .eq("endpoint",endpoint);

  if(error){
    return NextResponse.json({error:error.message},{status:500});
  }

  return NextResponse.json({ok:true});
}
