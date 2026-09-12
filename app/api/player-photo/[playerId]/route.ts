import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_:Request,{params}:{params:Promise<{playerId:string}>}) {
  const { playerId } = await params;
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});

  const { data: player, error } = await supabase
    .from("players")
    .select("photo_path")
    .eq("id",playerId)
    .single();

  if(error || !player?.photo_path) return NextResponse.json({url:null});

  const { data } = await supabase.storage
    .from("player-photos")
    .createSignedUrl(player.photo_path, 60*30);

  return NextResponse.json({url:data?.signedUrl || null});
}
