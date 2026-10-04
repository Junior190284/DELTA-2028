import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");
    const templateKey = searchParams.get("templateKey");

    const admin = createAdminClient();
    let query = admin.from("card_layouts").select("*");

    if (playerId) {
      query = query.eq("player_id", playerId);
    }
    if (templateKey) {
      query = query.eq("template_key", templateKey);
    }

    const { data, error } = await query;
    if (error) {
      // Table might not exist yet if migration pending, return empty gracefully
      console.warn("card_layouts query error (fallback to empty):", error.message);
      return NextResponse.json({ success: true, layouts: [] });
    }

    return NextResponse.json({ success: true, layouts: data || [] });
  } catch (err: any) {
    console.error("GET /api/cards/layout error:", err);
    return NextResponse.json({ success: true, layouts: [] });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // Verify admin or coach role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "coach"].includes(profile.role)) {
      return NextResponse.json({ error: "Brak uprawnień administratora" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      player_id, 
      template_key = "base", 
      photo_url, 
      scale = 1.0, 
      translate_x = 0.0, 
      translate_y = 0.0, 
      rotate = 0.0, 
      brightness = 1.0, 
      contrast = 1.0 
    } = body;

    if (!player_id) {
      return NextResponse.json({ error: "Brak identyfikatora zawodnika (player_id)" }, { status: 400 });
    }

    const admin = createAdminClient();

    const payload = {
      player_id,
      template_key,
      photo_url: photo_url || null,
      scale: parseFloat(scale) || 1.0,
      translate_x: parseFloat(translate_x) || 0.0,
      translate_y: parseFloat(translate_y) || 0.0,
      rotate: parseFloat(rotate) || 0.0,
      brightness: parseFloat(brightness) || 1.0,
      contrast: parseFloat(contrast) || 1.0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await admin
      .from("card_layouts")
      .upsert(payload, { onConflict: "player_id,template_key" })
      .select()
      .single();

    if (error) {
      console.error("Upsert card_layout error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, layout: data });
  } catch (err: any) {
    console.error("POST /api/cards/layout error:", err);
    return NextResponse.json({ error: err.message || "Wystąpił błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "coach"].includes(profile.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");
    const templateKey = searchParams.get("templateKey");

    if (!playerId) {
      return NextResponse.json({ error: "Brak playerId" }, { status: 400 });
    }

    const admin = createAdminClient();
    let query = admin.from("card_layouts").delete().eq("player_id", playerId);
    if (templateKey && templateKey !== "all") {
      query = query.eq("template_key", templateKey);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Pomyślnie zresetowano układ do domyślnego." });
  } catch (err: any) {
    console.error("DELETE /api/cards/layout error:", err);
    return NextResponse.json({ error: err.message || "Wystąpił błąd" }, { status: 500 });
  }
}
