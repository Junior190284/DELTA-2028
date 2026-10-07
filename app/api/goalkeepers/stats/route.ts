import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");
    const playerId = searchParams.get("playerId");

    let query = supabase.from("goalkeeper_match_stats").select("*, player:players(display_name, shirt_number)");
    if (matchId) query = query.eq("match_id", matchId);
    if (playerId) query = query.eq("player_id", playerId);

    const { data: stats, error } = await query;
    if (error) {
      return NextResponse.json({ stats: [] });
    }

    return NextResponse.json({ stats: stats || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "coach")) {
      return NextResponse.json({ error: "Wymagane uprawnienia sztabu trenerskiego." }, { status: 403 });
    }

    const body = await req.json();
    const {
      match_id,
      player_id,
      minutes_played = 60,
      goals_conceded = 0,
      saves = 0,
      clean_sheet = false,
      penalty_saves = 0,
      notes = ""
    } = body;

    if (!match_id || !player_id) {
      return NextResponse.json({ error: "Brak match_id lub player_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("goalkeeper_match_stats")
      .upsert({
        match_id,
        player_id,
        minutes_played,
        goals_conceded,
        saves,
        clean_sheet: !!clean_sheet,
        penalty_saves,
        notes
      }, { onConflict: "match_id,player_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, stats: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
