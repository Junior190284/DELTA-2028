import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // Pobieramy powiązanych zawodników dla danego użytkownika
    const { data: parentLinks } = await supabase
      .from("parent_players")
      .select("player_id")
      .eq("parent_id", user.id);

    const playerIds = (parentLinks || []).map(x => x.player_id);

    // Pobieramy historię przyznanych paczek, aby nie duplikować nagród
    const { data: existingPacks } = await supabase
      .from("user_unopened_packs")
      .select("source_reason")
      .eq("user_id", user.id);

    const existingReasons = new Set((existingPacks || []).map(p => p.source_reason));

    const newPacksToGrant: any[] = [];

    // Jeśli użytkownik nie ma powiązanego dziecka lub jest nowy, dajemy pakiet powitalny!
    const welcomeReason = "Nagroda na start • Witamy w kolekcji kart DELTA!";
    if (!existingReasons.has(welcomeReason)) {
      newPacksToGrant.push({
        user_id: user.id,
        pack_type_id: "matchday",
        source_reason: welcomeReason
      });
      existingReasons.add(welcomeReason);
    }

    // Sprawdzamy nagrody dla każdego przypisanego zawodnika
    for (const pId of playerIds) {
      // 1. Sprawdzamy mecze (Matchday Pack & Winner Pack)
      const { data: attendedMatches } = await supabase
        .from("match_attendance")
        .select("match:matches(id, match_date, home_team, away_team, home_score, away_score, status)")
        .eq("player_id", pId)
        .in("status", ["present", "yes"]);

      if (attendedMatches) {
        for (const item of attendedMatches) {
          const m: any = item.match;
          if (!m || m.status !== "played") continue;

          // Matchday pack
          const matchReason = `Mecz • ${m.home_team} vs ${m.away_team} (${m.match_date})`;
          if (!existingReasons.has(matchReason)) {
            newPacksToGrant.push({
              user_id: user.id,
              pack_type_id: "matchday",
              source_reason: matchReason
            });
            existingReasons.add(matchReason);
          }

          // Winner pack
          const isOursHome = m.home_team.includes("Delta");
          const ours = isOursHome ? m.home_score : m.away_score;
          const opp = isOursHome ? m.away_score : m.home_score;
          if (ours > opp) {
            const winReason = `Zwycięstwo • ${m.home_team} vs ${m.away_team} (${m.match_date})`;
            if (!existingReasons.has(winReason)) {
              newPacksToGrant.push({
                user_id: user.id,
                pack_type_id: "winner",
                source_reason: winReason
              });
              existingReasons.add(winReason);
            }
          }
        }
      }

      // 2. Sprawdzamy hat-tricki (Legendary Pack)
      const { data: goalEvents } = await supabase
        .from("match_events")
        .select("match_id, count:id")
        .eq("player_id", pId)
        .eq("event_type", "goal");

      // Sprawdzamy liczbę goli w danym meczu
      const goalsPerMatch: Record<string, number> = {};
      (goalEvents || []).forEach(e => {
        goalsPerMatch[e.match_id] = (goalsPerMatch[e.match_id] || 0) + 1;
      });

      for (const [mId, count] of Object.entries(goalsPerMatch)) {
        if (count >= 3) {
          const htReason = `Hat-trick w meczu (${count} gole!)`;
          if (!existingReasons.has(htReason)) {
            newPacksToGrant.push({
              user_id: user.id,
              pack_type_id: "legendary",
              source_reason: htReason
            });
            existingReasons.add(htReason);
          }
        }
      }

      // 3. Sprawdzamy treningi (Training Pack & Streak Pack)
      const { data: trainingsAttended } = await supabase
        .from("training_attendance")
        .select("training:training_sessions(id, training_date)")
        .eq("player_id", pId)
        .eq("status", "present");

      const sessionCount = trainingsAttended?.length || 0;
      if (sessionCount >= 5) {
        const tr5Reason = "Kamień milowy • 5 obecności na treningach";
        if (!existingReasons.has(tr5Reason)) {
          newPacksToGrant.push({
            user_id: user.id,
            pack_type_id: "training",
            source_reason: tr5Reason
          });
          existingReasons.add(tr5Reason);
        }
      }
      if (sessionCount >= 10) {
        const tr10Reason = "Wojownik treningu • 10 obecności na treningach";
        if (!existingReasons.has(tr10Reason)) {
          newPacksToGrant.push({
            user_id: user.id,
            pack_type_id: "streak",
            source_reason: tr10Reason
          });
          existingReasons.add(tr10Reason);
        }
      }
    }

    if (newPacksToGrant.length > 0) {
      await supabase.from("user_unopened_packs").insert(newPacksToGrant);
    }

    return NextResponse.json({
      grantedCount: newPacksToGrant.length,
      grantedPacks: newPacksToGrant
    });
  } catch (error: any) {
    console.error("Błąd synchronizacji nagród:", error);
    return NextResponse.json({ error: error?.message || "Błąd przyznawania nagród" }, { status: 500 });
  }
}
