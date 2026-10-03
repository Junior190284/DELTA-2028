import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") || null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Pobierz definicje osiągnięć
    const { data: defs, error: defsErr } = await admin
      .from("achievement_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (defsErr) {
      // Jeśli tabela nie istnieje w Supabase, zwróć przejrzystą informację
      if (defsErr.message?.includes("achievement_definitions") || defsErr.message?.includes("schema cache")) {
        return NextResponse.json({ 
          error: "Brakuje tabeli osiągnięć w bazie Supabase. Uruchom plik 'supabase/v12_achievements_system.sql' w Supabase SQL Editor.",
          missingTable: true 
        }, { status: 500 });
      }
      return NextResponse.json({ error: defsErr.message }, { status: 500 });
    }

    // 2. Jeśli nie podano playerId, sprawdź czy użytkownik jest powiązany z zawodnikiem
    let effectivePlayerId = playerId;
    if (!effectivePlayerId) {
      const { data: linked } = await admin
        .from("parent_players")
        .select("player_id")
        .eq("parent_id", user.id)
        .limit(1)
        .maybeSingle();
      effectivePlayerId = linked?.player_id || null;
    }

    // 3. Pobierz aktualne statystyki meczowe zawodnika
    let matchCount = 0;
    let goalCount = 0;
    let assistCount = 0;
    let hattrickCount = 0;
    let captainCount = 0;
    let starterCount = 0;

    let trainingCount = 0;
    let trainingGoalCount = 0;
    let trainingWinsCount = 0;
    let trainingStreakCount = 0;

    if (effectivePlayerId) {
      // Mecze: obecności i składy
      const { data: lineups } = await admin
        .from("match_lineup")
        .select("match_id, is_starter, is_captain")
        .eq("player_id", effectivePlayerId);

      const { data: attendances } = await admin
        .from("match_attendance")
        .select("match_id, status")
        .eq("player_id", effectivePlayerId)
        .in("status", ["present", "yes"]);

      const attendedMatchIds = new Set([
        ...(lineups || []).map(l => l.match_id),
        ...(attendances || []).map(a => a.match_id)
      ]);
      matchCount = attendedMatchIds.size;
      starterCount = (lineups || []).filter(l => l.is_starter).length;
      captainCount = (lineups || []).filter(l => l.is_captain).length;

      // Gole i asysty
      const { data: events } = await admin
        .from("match_events")
        .select("match_id, event_type, player_id, assist_player_id")
        .or(`player_id.eq.${effectivePlayerId},assist_player_id.eq.${effectivePlayerId}`);

      const goalsByMatch: Record<string, number> = {};
      (events || []).forEach(e => {
        if (e.event_type === "goal" && e.player_id === effectivePlayerId) {
          goalCount++;
          goalsByMatch[e.match_id] = (goalsByMatch[e.match_id] || 0) + 1;
        }
        if (e.assist_player_id === effectivePlayerId) {
          assistCount++;
        }
      });

      hattrickCount = Object.values(goalsByMatch).filter(count => count >= 3).length;

      // Treningi
      const { data: trainAtt } = await admin
        .from("training_attendance")
        .select("training_id, status, training_sessions(training_date)")
        .eq("player_id", effectivePlayerId)
        .eq("status", "present");

      trainingCount = (trainAtt || []).length;
      trainingStreakCount = Math.min(trainingCount, 5); // proste przybliżenie ciągłości

      const { data: trainEvents } = await admin
        .from("training_events")
        .select("id")
        .eq("player_id", effectivePlayerId)
        .eq("event_type", "goal");
      trainingGoalCount = (trainEvents || []).length;

      // Wygrane gierki
      const { data: userGames } = await admin
        .from("training_game_players")
        .select("game_id, team, training_games(team_a_score, team_b_score)")
        .eq("player_id", effectivePlayerId);

      (userGames || []).forEach((g: any) => {
        const game = g.training_games;
        if (!game) return;
        if (g.team === "A" && game.team_a_score > game.team_b_score) trainingWinsCount++;
        if (g.team === "B" && game.team_b_score > game.team_a_score) trainingWinsCount++;
      });
    }

    // 4. Statystyki użytkownika / rodzica / kolekcji
    const { data: userCards } = await admin
      .from("user_cards")
      .select("card_id, card_definitions(rarity, player_id)")
      .eq("user_id", user.id);

    const cardsCount = (userCards || []).length;
    const hasEpicOrBetter = (userCards || []).some((c: any) => 
      ["epic", "legendary", "inferno"].includes(c.card_definitions?.rarity)
    );

    const { data: allActivePlayers } = await admin
      .from("players")
      .select("id")
      .eq("active", true);
    
    const collectedPlayerIds = new Set((userCards || []).map((c: any) => c.card_definitions?.player_id).filter(Boolean));
    const isTeamComplete = (allActivePlayers || []).length > 0 && 
      (allActivePlayers || []).every(p => collectedPlayerIds.has(p.id));

    const { data: parentLinks } = await admin
      .from("parent_players")
      .select("player_id")
      .eq("parent_id", user.id);
    const hasParentLink = (parentLinks || []).length > 0;

    const { data: pushSub } = await admin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    const hasPushSub = (pushSub || []).length > 0;

    const { data: dpData } = await admin
      .from("user_delta_points")
      .select("total_earned")
      .eq("user_id", user.id)
      .maybeSingle();
    const totalDpEarned = dpData?.total_earned || 0;

    // 5. Pobierz już istniejące wpisy user_achievements
    const { data: existingProgress } = await admin
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id);

    const existingMap = new Map((existingProgress || []).map(p => [p.achievement_id, p]));

    // 6. Przelicz wartości dla każdego osiągnięcia
    const computedAchievements = [];

    for (const def of defs || []) {
      let currentVal = 0;

      switch (def.id) {
        // MECZE
        case "first_match":
        case "match_veteran_10":
        case "match_veteran_25":
          currentVal = matchCount;
          break;
        case "first_goal":
        case "scorer_5":
        case "scorer_15":
        case "scorer_30":
          currentVal = goalCount;
          break;
        case "first_hattrick":
          currentVal = hattrickCount;
          break;
        case "first_assist":
        case "assist_master_10":
          currentVal = assistCount;
          break;
        case "captain_armband":
          currentVal = captainCount;
          break;
        case "starter_lineup_5":
          currentVal = starterCount;
          break;

        // TRENINGI
        case "first_training":
        case "training_regular_10":
        case "training_warrior_25":
        case "training_legend_50":
          currentVal = trainingCount;
          break;
        case "training_goal_5":
        case "training_goal_20":
          currentVal = trainingGoalCount;
          break;
        case "training_game_winner_5":
          currentVal = trainingWinsCount;
          break;
        case "training_streak_5":
          currentVal = trainingStreakCount;
          break;

        // KOLEKCJA
        case "open_first_pack":
          currentVal = cardsCount > 0 ? 1 : 0;
          break;
        case "collector_10_cards":
          currentVal = cardsCount;
          break;
        case "collector_team_complete":
          currentVal = isTeamComplete ? 1 : 0;
          break;
        case "pull_epic_or_better":
          currentVal = hasEpicOrBetter ? 1 : 0;
          break;
        case "daily_spin_streak_3":
          currentVal = 1; // domyślny postęp
          break;
        case "first_trade":
          currentVal = 0;
          break;

        // RODZIC / KLUB
        case "parent_link_active":
          currentVal = hasParentLink ? 1 : 0;
          break;
        case "push_notifications_on":
          currentVal = hasPushSub ? 1 : 0;
          break;
        case "match_rsvp_ahead_5":
          currentVal = Math.min(matchCount, 5);
          break;
        case "delta_points_tycoon_1000":
          currentVal = totalDpEarned;
          break;

        default:
          currentVal = 0;
      }

      const isUnlocked = currentVal >= def.target_value;
      const existing = existingMap.get(def.id);
      const claimedReward = existing?.claimed_reward || false;

      // Zapisz / zaktualizuj w bazie
      const progressRecord = {
        user_id: user.id,
        player_id: def.for_entity === "player" ? effectivePlayerId : null,
        achievement_id: def.id,
        current_value: currentVal,
        is_unlocked: isUnlocked,
        unlocked_at: isUnlocked ? (existing?.unlocked_at || new Date().toISOString()) : null,
        claimed_reward: claimedReward,
        claimed_at: existing?.claimed_at || null,
        updated_at: new Date().toISOString()
      };

      // Upsert w tle (asynchronicznie, bez blokowania)
      admin
        .from("user_achievements")
        .upsert(progressRecord, { onConflict: "user_id,player_id,achievement_id" })
        .then(() => {});

      computedAchievements.push({
        ...def,
        current_value: currentVal,
        is_unlocked: isUnlocked,
        claimed_reward: claimedReward,
        unlocked_at: progressRecord.unlocked_at
      });
    }

    return NextResponse.json({
      success: true,
      playerId: effectivePlayerId,
      achievements: computedAchievements,
      stats: {
        total: computedAchievements.length,
        unlockedCount: computedAchievements.filter(a => a.is_unlocked).length,
        unclaimedRewardsCount: computedAchievements.filter(a => a.is_unlocked && !a.claimed_reward).length
      }
    });

  } catch (err: any) {
    console.error("Błąd w API osiągnięć:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
