import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACHIEVEMENTS_CATALOG, calculatePlayerAchievements } from "@/lib/achievements/engine";
import { CARD_TYPES_CONFIG } from "@/lib/cards/types";

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

    // 1. Ustal właściwego zawodnika (playerId)
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

    if (!effectivePlayerId) {
      // Fallback: pierwszy aktywny zawodnik w klubie
      const { data: firstPlayer } = await admin
        .from("players")
        .select("id")
        .eq("active", true)
        .order("display_name")
        .limit(1)
        .maybeSingle();
      effectivePlayerId = firstPlayer?.id || null;
    }

    if (!effectivePlayerId) {
      return NextResponse.json({ success: true, achievements: [], stats: { total: 0, unlockedCount: 0 } });
    }

    // 2. Pobierz profil zawodnika
    const { data: playerObj } = await admin
      .from("players")
      .select("id, display_name, shirt_number, position, photo_path")
      .eq("id", effectivePlayerId)
      .single();

    const playerName = playerObj?.display_name || "Zawodnik DELTA";

    // 3. Pobierz rzeczywiste, zatwierdzone statystyki meczowe
    const { data: lineups } = await admin
      .from("match_lineup")
      .select("match_id, is_starter, is_captain")
      .eq("player_id", effectivePlayerId);

    const { data: attendances } = await admin
      .from("match_attendance")
      .select("match_id, status")
      .eq("player_id", effectivePlayerId)
      .eq("status", "present"); // WYŁĄCZNIE POTWIERDZONA OBECNOŚĆ (NIE RSVP YES)

    const attendedMatchIds = new Set([
      ...(lineups || []).map(l => l.match_id),
      ...(attendances || []).map(a => a.match_id)
    ]);
    const matchCount = attendedMatchIds.size;
    const starterCount = (lineups || []).filter(l => l.is_starter).length;
    const captainCount = (lineups || []).filter(l => l.is_captain).length;

    // Gole i asysty
    const { data: events } = await admin
      .from("match_events")
      .select("match_id, event_type, player_id, assist_player_id")
      .or(`player_id.eq.${effectivePlayerId},assist_player_id.eq.${effectivePlayerId}`);

    let goalCount = 0;
    let assistCount = 0;
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

    const maxGoalsInSingleMatch = Object.values(goalsByMatch).reduce((max, c) => Math.max(max, c), 0);

    // 4. Pobierz rzeczywiste, zatwierdzone treningi
    const { data: trainAtt } = await admin
      .from("training_attendance")
      .select("training_id, status")
      .eq("player_id", effectivePlayerId)
      .eq("status", "present"); // WYŁĄCZNIE POTWIERDZONA OBECNOŚĆ

    const trainingCount = (trainAtt || []).length;
    const trainingStreak = Math.min(trainingCount, 6);

    // 5. Pobierz manualne wyróżnienia administratora
    const { data: manualGrants } = await admin
      .from("user_achievements")
      .select("achievement_id")
      .eq("player_id", effectivePlayerId)
      .eq("is_unlocked", true);

    const manualIds = (manualGrants || []).map(m => m.achievement_id);

    // 6. Przelicz stan osiągnięć dla zawodnika
    const statsMap = {
      [effectivePlayerId]: {
        m: matchCount,
        starts: starterCount,
        captain: captainCount,
        g: goalCount,
        a: assistCount,
        mvp: 0
      }
    };
    const trainingStatsMap = {
      [effectivePlayerId]: {
        sessions: trainingCount,
        goals: 0,
        assists: 0,
        attendanceStreak: trainingStreak
      }
    };

    const computedList = calculatePlayerAchievements(
      effectivePlayerId,
      statsMap,
      trainingStatsMap,
      maxGoalsInSingleMatch,
      manualIds
    );

    // 7. Pobierz już istniejące wpisy osiągnięć i kart
    const { data: existingUserAchievements } = await admin
      .from("user_achievements")
      .select("*")
      .eq("player_id", effectivePlayerId);

    const existingMap = new Map((existingUserAchievements || []).map(a => [a.achievement_id, a]));

    const { data: existingUserCards } = await admin
      .from("user_cards")
      .select("card_id, card_definitions(player_id, card_type)")
      .eq("user_id", user.id);

    const existingCardKeys = new Set(
      (existingUserCards || []).map(
        (uc: any) => `${uc.card_definitions?.player_id}_${uc.card_definitions?.card_type}`
      )
    );

    const newlyUnlockedAchievements: string[] = [];
    const newlyUnlockedCards: string[] = [];

    // 8. Zapisz nowe osiągnięcia i odblokuj powiązane karty (Idempotent Execution)
    for (const item of computedList) {
      const existing = existingMap.get(item.definition.id);
      const wasUnlockedBefore = existing?.is_unlocked || false;

      // Zapisujemy postęp w user_achievements
      if (!existing || existing.current_value !== item.current || (!wasUnlockedBefore && item.isUnlocked)) {
        await admin
          .from("user_achievements")
          .upsert({
            user_id: user.id,
            player_id: effectivePlayerId,
            achievement_id: item.definition.id,
            current_value: item.current,
            is_unlocked: item.isUnlocked,
            unlocked_at: item.isUnlocked ? (existing?.unlocked_at || new Date().toISOString()) : null,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,player_id,achievement_id" });
      }

      // Jeżeli osiągnięcie zostało odblokowane i posiada nagrodę kartową:
      if (item.isUnlocked && item.definition.rewardCardType) {
        const cardType = item.definition.rewardCardType;
        const cardKey = `${effectivePlayerId}_${cardType}`;

        if (!existingCardKeys.has(cardKey)) {
          // A) Zapewnij definicję karty w card_definitions
          const cfg = CARD_TYPES_CONFIG[cardType] || {
            name: "Karta Specjalna",
            defaultRarity: "gold",
            description: "Oficjalna karta DELTA"
          };

          const isRyszard = (playerName || "").toLowerCase().includes("ryszard");
          let artworkUrl = null;
          if (isRyszard) {
            if (cardType === "inferno") artworkUrl = "/assets/players/ryszard-inferno.png";
            else if (cardType === "mvp" || cardType === "goal_hunter") artworkUrl = "/assets/players/ryszard-legend.png";
            else artworkUrl = "/assets/players/ryszard-gold.png";
          }

          const { data: insertedDef } = await admin
            .from("card_definitions")
            .upsert({
              player_id: effectivePlayerId,
              season: "2026/27",
              card_type: cardType,
              card_name: `${playerName} — ${cfg.name}`,
              title: cfg.name,
              rarity: item.definition.rarity === "inferno" ? "inferno" : item.definition.rarity === "legend" ? "legendary" : "epic",
              artwork_url: artworkUrl,
              description: cfg.description,
              lore: `Karta odblokowana za osiągnięcie: ${item.definition.name}`,
              is_active: true
            }, { onConflict: "player_id,season,card_type" })
            .select("id")
            .single();

          const cardDefId = insertedDef?.id;

          // B) Wstaw kartę do user_cards
          if (cardDefId) {
            await admin
              .from("user_cards")
              .insert({
                user_id: user.id,
                card_id: cardDefId,
                duplicates_count: 0
              });

            existingCardKeys.add(cardKey);
            newlyUnlockedCards.push(cfg.name);
          }
        }
      }

      if (item.isUnlocked && !wasUnlockedBefore) {
        newlyUnlockedAchievements.push(item.definition.name);

        // Tworzymy wpis w News Center
        try {
          await admin
            .from("club_updates")
            .insert({
              source_key: "achievements",
              source_name: "DELTA ACHIEVEMENTS 2.0",
              title: `🏆 Nowe osiągnięcie: ${item.definition.name}`,
              body: `${playerName} zdobył odznakę "${item.definition.name}" (${item.definition.description})!`,
              priority: item.definition.rarity === "inferno" ? "high" : "normal",
              published_at: new Date().toISOString()
            });
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      playerId: effectivePlayerId,
      playerName,
      achievements: computedList,
      newlyUnlockedAchievements,
      newlyUnlockedCards,
      stats: {
        total: computedList.length,
        unlockedCount: computedList.filter(a => a.isUnlocked).length,
        inProgressCount: computedList.filter(a => a.status === "IN_PROGRESS").length,
        lockedCount: computedList.filter(a => a.status === "LOCKED").length
      }
    });

  } catch (err: any) {
    console.error("Błąd w API achievements/sync:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
