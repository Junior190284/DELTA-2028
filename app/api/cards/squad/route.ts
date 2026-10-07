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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: squad, error } = await supabase
      .from("user_squads")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching squad:", error);
    }

    return NextResponse.json({ squad: squad || null });
  } catch (err: any) {
    console.error("Squad GET error:", err);
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

    const body = await req.json();
    const {
      squad_name = "Moja 11 DELTA",
      formation = "2-3-1",
      slots = [],
      captain_card_id = null,
      coach_card_id = null,
      stadium_card_id = null,
      crest_card_id = null,
      squad_rating = 70,
      attack_rating = 70,
      midfield_rating = 70,
      defense_rating = 70,
      goalkeeper_rating = 70,
      chemistry_score = 100
    } = body;

    const { data, error } = await supabase
      .from("user_squads")
      .upsert({
        user_id: user.id,
        squad_name,
        formation,
        slots,
        captain_card_id,
        coach_card_id,
        stadium_card_id,
        crest_card_id,
        squad_rating,
        attack_rating,
        midfield_rating,
        defense_rating,
        goalkeeper_rating,
        chemistry_score,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error saving squad:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, squad: data });
  } catch (err: any) {
    console.error("Squad POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
