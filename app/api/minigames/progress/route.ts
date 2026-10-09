import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        unlockedMaxLevel: 1, 
        accuracyHighScore: 0,
        gkHighScore: 0,
        gkBestStreak: 0
      });
    }

    const { data: progressRows } = await supabase
      .from("user_minigame_progress")
      .select("game_id, max_level_reached, high_score, best_streak")
      .eq("user_id", user.id);

    const accuracy = progressRows?.find(r => r.game_id === "accuracy");
    const gk = progressRows?.find(r => r.game_id === "gk_reflex");

    return NextResponse.json({
      unlockedMaxLevel: accuracy?.max_level_reached || 1,
      accuracyHighScore: accuracy?.high_score || 0,
      gkHighScore: gk?.high_score || 0,
      gkBestStreak: gk?.best_streak || 0
    });
  } catch (error: any) {
    console.error("Błąd pobierania postępu minigier:", error);
    return NextResponse.json({ 
      unlockedMaxLevel: 1, 
      accuracyHighScore: 0,
      gkHighScore: 0,
      gkBestStreak: 0
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { game_id, level_completed, score = 0, streak = 0 } = body;

    if (!game_id) {
      return NextResponse.json({ error: "Brak game_id" }, { status: 400 });
    }

    // 1. Pobieramy obecny stan z bazy
    const { data: existing } = await supabase
      .from("user_minigame_progress")
      .select("max_level_reached, high_score, best_streak, games_played")
      .eq("user_id", user.id)
      .eq("game_id", game_id)
      .maybeSingle();

    const currentMaxLvl = existing?.max_level_reached || 1;
    const currentHighScore = existing?.high_score || 0;
    const currentBestStreak = existing?.best_streak || 0;
    const currentGamesCount = existing?.games_played || 0;

    const newMaxLvl = level_completed ? Math.max(currentMaxLvl, Number(level_completed) + 1) : currentMaxLvl;
    const newHighScore = Math.max(currentHighScore, Number(score) || 0);
    const newBestStreak = Math.max(currentBestStreak, Number(streak) || 0);

    await supabase
      .from("user_minigame_progress")
      .upsert({
        user_id: user.id,
        game_id,
        max_level_reached: newMaxLvl,
        high_score: newHighScore,
        best_streak: newBestStreak,
        games_played: currentGamesCount + 1,
        last_played_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,game_id" });

    // 2. SECURITY RULE: CLIENT NEVER DECIDES REWARD VALUE.
    // Ignorujemy wszelkie body.points_earned lub body.points przesłane z klienta.
    // Pobieramy aktualne, niezmienione saldo punktów użytkownika.
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPoints = pointsRecord?.points_balance || 0;

    return NextResponse.json({
      success: true,
      game_id,
      max_level_reached: newMaxLvl,
      high_score: newHighScore,
      best_streak: newBestStreak,
      newPointsBalance: currentPoints
    });
  } catch (error: any) {
    console.error("Błąd zapisu postępu minigier:", error);
    return NextResponse.json({ error: error?.message || "Błąd serwera" }, { status: 500 });
  }
}
