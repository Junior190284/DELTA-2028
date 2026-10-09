import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACHIEVEMENTS_CATALOG, calculatePlayerAchievements } from "@/lib/achievements/engine";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Sprawdź uprawnienia administratora
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "coach") {
      return NextResponse.json({ error: "Brak uprawnień administratora" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");

    const { data: players } = await admin
      .from("players")
      .select("id, display_name, shirt_number, position, active")
      .order("display_name");

    const { data: allUserAchievements } = await admin
      .from("user_achievements")
      .select("*");

    return NextResponse.json({
      success: true,
      players: players || [],
      achievementsCatalog: ACHIEVEMENTS_CATALOG,
      userAchievements: allUserAchievements || []
    });

  } catch (err: any) {
    console.error("Błąd admin achievements API:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Sprawdź uprawnienia
    const { data: profile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "coach") {
      return NextResponse.json({ error: "Brak uprawnień administratora" }, { status: 403 });
    }

    const body = await req.json();
    const { action, playerId, achievementId } = body;

    if (!playerId || !achievementId) {
      return NextResponse.json({ error: "Wymagane parametry playerId i achievementId" }, { status: 400 });
    }

    if (action === "grant") {
      // Manualne przyznanie osiągnięcia
      await admin
        .from("user_achievements")
        .upsert({
          user_id: user.id,
          player_id: playerId,
          achievement_id: achievementId,
          current_value: 1,
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,player_id,achievement_id" });

      // Zapis do audit logu
      await admin
        .from("audit_logs")
        .insert({
          user_id: user.id,
          action: "grant_achievement",
          entity_type: "achievement",
          entity_id: achievementId,
          details: {
            player_id: playerId,
            granted_by: profile.display_name || user.email,
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json({ success: true, message: "Osiągnięcie zostało pomyślnie przyznane." });
    } else if (action === "revoke") {
      // Cofnięcie manualnego osiągnięcia
      await admin
        .from("user_achievements")
        .delete()
        .eq("player_id", playerId)
        .eq("achievement_id", achievementId);

      // Audit log
      await admin
        .from("audit_logs")
        .insert({
          user_id: user.id,
          action: "revoke_achievement",
          entity_type: "achievement",
          entity_id: achievementId,
          details: {
            player_id: playerId,
            revoked_by: profile.display_name || user.email,
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json({ success: true, message: "Osiągnięcie zostało cofnięte." });
    }

    return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });

  } catch (err: any) {
    console.error("Błąd w admin achievements action:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
