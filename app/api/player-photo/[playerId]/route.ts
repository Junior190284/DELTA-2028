import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status:401 });
  }

  // 1. Resolve role from public.profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // 2. Strict Child Photo Privacy Gate:
  // Admin has club-wide administrative access for registration/ID issuance.
  // Parents (including coaches who are parents) MUST be explicitly linked in parent_players.
  // Coach status alone does NOT grant unrestricted access to photos of the entire academy.
  if (!isAdmin) {
    const { data: link, error: linkError } = await supabase
      .from("parent_players")
      .select("player_id")
      .eq("parent_id", user.id)
      .eq("player_id", playerId)
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to access this player's photo" },
        { status: 403 }
      );
    }
  }

  // 3. Authorized — fetch photo_path and create signed URL
  const { data: player, error } = await supabase
    .from("players")
    .select("photo_path")
    .eq("id", playerId)
    .single();

  if (error || !player?.photo_path) {
    return NextResponse.json({ url: null });
  }

  const { data } = await supabase.storage
    .from("player-photos")
    .createSignedUrl(player.photo_path, 60*30);

  return NextResponse.json({ url: data?.signedUrl || null });
}
