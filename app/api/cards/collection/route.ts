import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureStarterCardsForPlayers } from "@/lib/cards/engine";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // 1. Pobieramy wszystkich zawodników i sprawdzamy czy mają karty startowe
    const { data: players } = await supabase
      .from("players")
      .select("id, display_name, shirt_number, position, photo_path, active")
      .order("display_name");

    if (players && players.length) {
      await ensureStarterCardsForPlayers(supabase, players, "2026/27");
    }

    // 2. Pobieramy wszystkie definicje kart
    const { data: allCards, error: cardsErr } = await supabase
      .from("card_definitions")
      .select(`
        *,
        player:players(id, display_name, shirt_number, position, photo_path),
        match:matches(id, match_date, home_team, away_team, home_score, away_score)
      `)
      .eq("is_active", true)
      .order("card_number", { ascending: true, nullsFirst: false });

    if (cardsErr) throw cardsErr;

    // 3. Pobieramy karty zdobyte przez użytkownika
    const { data: userCards } = await supabase
      .from("user_cards")
      .select("*, card_definition:card_definitions(*, player:players(*))")
      .eq("user_id", user.id);

    // 4. Pobieramy nieotwarte paczki użytkownika
    const { data: unopenedPacks } = await supabase
      .from("user_unopened_packs")
      .select("*, pack_definition:pack_definitions(*)")
      .eq("user_id", user.id)
      .eq("is_opened", false)
      .order("created_at", { ascending: false });

    // 5. Pobieramy saldo Delta Points
    const { data: pointsRow } = await supabase
      .from("user_delta_points")
      .select("points_balance, total_earned")
      .eq("user_id", user.id)
      .maybeSingle();

    // 6. Pobieramy definicje typów paczek
    const { data: packDefinitions } = await supabase
      .from("pack_definitions")
      .select("*")
      .eq("is_active", true);

    return NextResponse.json({
      allCards: allCards || [],
      userCards: userCards || [],
      unopenedPacks: unopenedPacks || [],
      deltaPoints: pointsRow?.points_balance || 0,
      totalEarnedPoints: pointsRow?.total_earned || 0,
      packDefinitions: packDefinitions || []
    });
  } catch (error: any) {
    console.error("Błąd pobierania kolekcji:", error);
    return NextResponse.json({ error: error?.message || "Błąd pobierania kolekcji" }, { status: 500 });
  }
}
