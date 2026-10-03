import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB = "K.S. Delta Warszawa GM";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Pobierz mecze z bazy
    const { data: matches, error: matchErr } = await admin
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });

    if (matchErr) {
      if (matchErr.message?.includes("match_predictions") || matchErr.message?.includes("schema cache")) {
        return NextResponse.json({ error: "Brakuje tabeli typer w bazie Supabase. Uruchom 'supabase/v13_match_typer.sql'." }, { status: 500 });
      }
      return NextResponse.json({ error: matchErr.message }, { status: 500 });
    }

    // 2. Pobierz profile użytkowników
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, role");

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // 3. Pobierz wszystkich zawodników
    const { data: players } = await admin
      .from("players")
      .select("id, display_name, shirt_number, position, active")
      .eq("active", true)
      .order("display_name", { ascending: true });

    // 4. Pobierz wszystkie typy
    const { data: allPredictions, error: predErr } = await admin
      .from("match_predictions")
      .select("*");

    if (predErr) {
      if (predErr.message?.includes("match_predictions") || predErr.message?.includes("schema cache")) {
        return NextResponse.json({ 
          error: "Brakuje tabeli 'match_predictions' w Supabase. Uruchom plik 'supabase/v13_match_typer.sql'.",
          missingTable: true 
        }, { status: 500 });
      }
      return NextResponse.json({ error: predErr.message }, { status: 500 });
    }

    // 5. Pobierz zdarzenia meczowe (gole do weryfikacji pierwszego strzelca)
    const { data: matchEvents } = await admin
      .from("match_events")
      .select("id, match_id, event_type, player_id, minute, created_at")
      .eq("event_type", "goal")
      .order("created_at", { ascending: true });

    // 6. Automatyczne rozliczanie nierozliczonych typów dla meczów o statusie 'played'
    const evaluatedUpdates = [];
    const playedMatches = (matches || []).filter(m => m.status === "played" && m.home_score !== null && m.away_score !== null);
    const playedMatchMap = new Map(playedMatches.map(m => [m.id, m]));

    for (const pred of allPredictions || []) {
      const match = playedMatchMap.get(pred.match_id);
      if (match && !pred.is_evaluated) {
        const actualHome = match.home_score as number;
        const actualAway = match.away_score as number;
        const predHome = pred.predicted_home_score;
        const predAway = pred.predicted_away_score;

        const exactHit = actualHome === predHome && actualAway === predAway;

        const actualSign = actualHome > actualAway ? "H" : actualHome < actualAway ? "A" : "D";
        const predSign = predHome > predAway ? "H" : predHome < predAway ? "A" : "D";
        const outcomeHit = actualSign === predSign;

        // Pierwszy strzelec dla DELTY
        const firstGoal = (matchEvents || []).find(e => e.match_id === match.id && e.player_id);
        const scorerHit = Boolean(pred.first_scorer_id && firstGoal && pred.first_scorer_id === firstGoal.player_id);

        let pts = 0;
        if (exactHit) pts += 100;
        else if (outcomeHit && (actualHome - actualAway === predHome - predAway)) pts += 50;
        else if (outcomeHit) pts += 25;

        if (scorerHit) pts += 50;

        // Zaktualizuj rekord
        await admin
          .from("match_predictions")
          .update({
            points_awarded: pts,
            is_evaluated: true,
            exact_score_hit: exactHit,
            outcome_hit: outcomeHit,
            scorer_hit: scorerHit,
            evaluated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", pred.id);

        // Dodaj punkty Delta Points użytkownikowi jeśli zdobył > 0
        if (pts > 0) {
          const { data: curDp } = await admin
            .from("user_delta_points")
            .select("points_balance, total_earned")
            .eq("user_id", pred.user_id)
            .maybeSingle();

          await admin
            .from("user_delta_points")
            .upsert({
              user_id: pred.user_id,
              points_balance: (curDp?.points_balance || 0) + pts,
              total_earned: (curDp?.total_earned || 0) + pts,
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id" });
        }

        pred.points_awarded = pts;
        pred.is_evaluated = true;
        pred.exact_score_hit = exactHit;
        pred.outcome_hit = outcomeHit;
        pred.scorer_hit = scorerHit;
      }
    }

    // 7. Statystyki społeczności dla każdego meczu (rozkład 1 / X / 2)
    const matchCommunityStats: Record<string, { total: number; deltaWinPct: number; drawPct: number; oppWinPct: number }> = {};
    (matches || []).forEach(m => {
      const matchPreds = (allPredictions || []).filter(p => p.match_id === m.id);
      const total = matchPreds.length;
      if (total === 0) {
        matchCommunityStats[m.id] = { total: 0, deltaWinPct: 0, drawPct: 0, oppWinPct: 0 };
        return;
      }

      const isHomeDelta = m.home_team === CLUB;
      let deltaWins = 0;
      let draws = 0;
      let oppWins = 0;

      matchPreds.forEach(p => {
        if (p.predicted_home_score === p.predicted_away_score) {
          draws++;
        } else if (isHomeDelta) {
          if (p.predicted_home_score > p.predicted_away_score) deltaWins++;
          else oppWins++;
        } else {
          if (p.predicted_away_score > p.predicted_home_score) deltaWins++;
          else oppWins++;
        }
      });

      matchCommunityStats[m.id] = {
        total,
        deltaWinPct: Math.round((deltaWins / total) * 100),
        drawPct: Math.round((draws / total) * 100),
        oppWinPct: Math.round((oppWins / total) * 100)
      };
    });

    // 8. Tabela Liderów Typera
    const userScores: Record<string, { userId: string; name: string; role: string; totalPoints: number; predictionsCount: number; exactHits: number; outcomeHits: number; scorerHits: number }> = {};

    (allPredictions || []).forEach(p => {
      if (!userScores[p.user_id]) {
        const prof = profileMap.get(p.user_id);
        userScores[p.user_id] = {
          userId: p.user_id,
          name: prof?.display_name || "Kibic DELTA",
          role: prof?.role || "parent",
          totalPoints: 0,
          predictionsCount: 0,
          exactHits: 0,
          outcomeHits: 0,
          scorerHits: 0
        };
      }

      userScores[p.user_id].predictionsCount++;
      if (p.is_evaluated) {
        userScores[p.user_id].totalPoints += (p.points_awarded || 0);
        if (p.exact_score_hit) userScores[p.user_id].exactHits++;
        if (p.outcome_hit) userScores[p.user_id].outcomeHits++;
        if (p.scorer_hit) userScores[p.user_id].scorerHits++;
      }
    });

    const leaderboard = Object.values(userScores).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      return b.predictionsCount - a.predictionsCount;
    });

    // 9. Typy zalogowanego użytkownika
    const myPredictions = (allPredictions || []).filter(p => p.user_id === user.id);

    return NextResponse.json({
      success: true,
      currentUserId: user.id,
      matches,
      players,
      myPredictions,
      communityStats: matchCommunityStats,
      leaderboard
    });

  } catch (err: any) {
    console.error("Błąd API typera:", err);
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

    const body = await req.json();
    const { matchId, predictedHomeScore, predictedAwayScore, firstScorerId } = body;

    if (!matchId || predictedHomeScore === undefined || predictedAwayScore === undefined) {
      return NextResponse.json({ error: "Niekompletne dane typu" }, { status: 400 });
    }

    const homeNum = Math.max(0, parseInt(predictedHomeScore, 10) || 0);
    const awayNum = Math.max(0, parseInt(predictedAwayScore, 10) || 0);

    const admin = createAdminClient();

    // Sprawdź mecz
    const { data: match, error: matchErr } = await admin
      .from("matches")
      .select("id, status, match_date, match_time")
      .eq("id", matchId)
      .single();

    if (matchErr || !match) {
      return NextResponse.json({ error: "Nie znaleziono meczu" }, { status: 404 });
    }

    if (match.status === "played") {
      return NextResponse.json({ error: "Mecz został już rozegrany — typowanie zamknięte!" }, { status: 400 });
    }

    // Zapisz typ
    const payload = {
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: homeNum,
      predicted_away_score: awayNum,
      first_scorer_id: firstScorerId || null,
      is_evaluated: false,
      points_awarded: 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await admin
      .from("match_predictions")
      .upsert(payload, { onConflict: "user_id,match_id" })
      .select()
      .single();

    if (error) {
      console.error("Błąd zapisu typu:", error);
      return NextResponse.json({ error: `Błąd bazy: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      prediction: data,
      message: "Twój typ został pomyślnie zapisany!"
    });

  } catch (err: any) {
    console.error("Błąd zapisu typu:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
