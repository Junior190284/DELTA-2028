import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedMinigame, getMinigameCanonicalKey } from "@/lib/economy/security";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

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

    const { data: claimedRows } = await supabase
      .from("user_claimed_rewards")
      .select("reward_key")
      .eq("user_id", user.id)
      .eq("reward_type", "MINIGAME");

    const claimedKeys = (claimedRows || []).map(r => r.reward_key);

    const accuracy = progressRows?.find(r => r.game_id === "accuracy" || r.game_id === "free_kicks");
    const gk = progressRows?.find(r => r.game_id === "gk_reflex");

    return NextResponse.json({
      unlockedMaxLevel: accuracy?.max_level_reached || 1,
      accuracyHighScore: accuracy?.high_score || 0,
      gkHighScore: gk?.high_score || 0,
      gkBestStreak: gk?.best_streak || 0,
      claimedRewardKeys: claimedKeys
    });
  } catch (error) {
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
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { game_id, level_completed, score = 0, streak = 0 } = body;

    const rawGameId = typeof game_id === "string" ? game_id.trim() : "";
    if (!rawGameId || !isAllowedMinigame(rawGameId)) {
      return NextResponse.json({ error: "Nieprawidłowe lub niedozwolone game_id" }, { status: 400 });
    }

    const cleanGameId = getMinigameCanonicalKey(rawGameId);
    const safeLevel = Math.max(0, Math.min(10, Math.floor(Number(level_completed) || 0)));
    const safeScore = Math.max(0, Math.min(1_000_000, Math.floor(Number(score) || 0)));
    const safeStreak = Math.max(0, Math.min(10_000, Math.floor(Number(streak) || 0)));

    const { data: existing } = await supabase
      .from("user_minigame_progress")
      .select("max_level_reached, high_score, best_streak, games_played")
      .eq("user_id", user.id)
      .eq("game_id", cleanGameId)
      .maybeSingle();

    const currentMaxLvl = existing?.max_level_reached || 1;
    const currentHighScore = existing?.high_score || 0;
    const currentBestStreak = existing?.best_streak || 0;
    const currentGamesCount = existing?.games_played || 0;

    // SECURITY ANTI-CHEAT: Progresja poziomów nie może przeskakiwać (np. z poziomu 1 od razu na 10).
    // Gracz może zgłosić ukończenie poziomu N tylko wtedy, gdy N <= currentMaxLvl.
    let newMaxLvl = currentMaxLvl;
    if (safeLevel > 0) {
      if (safeLevel <= currentMaxLvl) {
        newMaxLvl = Math.max(currentMaxLvl, Math.min(10, safeLevel + 1));
      } else {
        console.warn(`[MinigamesProgress] Skipped invalid level jump from ${currentMaxLvl} to ${safeLevel} for user ${user.id}`);
      }
    }
    const newHighScore = Math.max(currentHighScore, safeScore);
    const newBestStreak = Math.max(currentBestStreak, safeStreak);

    await supabase.from("user_minigame_progress").upsert(
      {
        user_id: user.id,
        game_id: cleanGameId,
        max_level_reached: newMaxLvl,
        high_score: newHighScore,
        best_streak: newBestStreak,
        games_played: currentGamesCount + 1,
        last_played_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,game_id" }
    );

    // SECURITY RULE: CLIENT NEVER DECIDES REWARD VALUE.
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPoints = pointsRecord?.points_balance || 0;

    return NextResponse.json({
      success: true,
      game_id: cleanGameId,
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
