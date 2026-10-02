import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureStarterCardsForPlayers } from "@/lib/cards/engine";
import { CARD_TYPES_CONFIG, CardDefinition, PackDefinition } from "@/lib/cards/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Pobieramy wszystkich zawodników
    const { data: players } = await supabase
      .from("players")
      .select("id, display_name, shirt_number, position, photo_path, active")
      .order("display_name");

    const activePlayers = (players || []).filter(p => p.active !== false);

    // Domyślne paczki w razie braku tabeli pack_definitions w DB
    const defaultPacks: PackDefinition[] = [
      {
        id: "standard_pack",
        name: "Paczka Standardowa",
        description: "3 karty zawodników DELTA GM. Gwarantowana min. 1 karta Common.",
        cards_count: 3,
        drop_rates: { common: 70, rare: 22, epic: 6, legendary: 1.8, inferno: 0.2 },
        min_rarity: "common",
        theme: "gold",
        is_active: true
      },
      {
        id: "gold_booster",
        name: "Gold Booster",
        description: "5 kart zawodników DELTA GM. Gwarantowana min. 1 karta Rare!",
        cards_count: 5,
        drop_rates: { common: 40, rare: 42, epic: 14, legendary: 3.5, inferno: 0.5 },
        min_rarity: "rare",
        theme: "gold",
        is_active: true
      },
      {
        id: "inferno_booster",
        name: "🔥 Inferno Booster",
        description: "5 kart z podwyższoną szansą na ognistą kartę INFERNO!",
        cards_count: 5,
        drop_rates: { common: 20, rare: 40, epic: 28, legendary: 9, inferno: 3 },
        min_rarity: "epic",
        theme: "inferno",
        is_active: true
      },
      {
        id: "legend_booster",
        name: "👑 Legend Pack",
        description: "6 kart mistrzowskich. Gwarantowana min. 1 karta Legendary!",
        cards_count: 6,
        drop_rates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 },
        min_rarity: "legendary",
        theme: "legend",
        is_active: true
      }
    ];

    // Funkcja generująca wirtualne karty startowe dla zawodników
    const generateVirtualCards = (): CardDefinition[] => {
      const list: CardDefinition[] = [];
      const starterTypes = ["base", "matchday", "training_warrior", "goal_hunter", "mvp", "inferno"] as const;
      let cardNum = 1;

      for (const p of activePlayers) {
        const isRyszard = (p.display_name || "").toLowerCase().includes("ryszard") &&
                          (p.display_name || "").toLowerCase().includes("rybacki");

        for (const type of starterTypes) {
          const cfg = CARD_TYPES_CONFIG[type];
          let artworkUrl: string | null = null;
          let artworkPose = "standard";

          if (isRyszard) {
            if (type === "inferno") {
              artworkUrl = "/assets/players/ryszard-inferno.png";
              artworkPose = "inferno_flame";
            } else if (type === "mvp" || type === "goal_hunter" || type === "training_warrior") {
              artworkUrl = "/assets/players/ryszard-legend.png";
              artworkPose = "action_dribble";
            } else {
              artworkUrl = "/assets/players/ryszard-gold.png";
              artworkPose = "arms_crossed";
            }
          }

          list.push({
            id: `card_${p.id}_${type}`,
            player_id: p.id,
            season: "2026/27",
            card_type: type,
            card_name: `${p.display_name} — ${cfg.name}`,
            title: cfg.name,
            rarity: cfg.defaultRarity,
            artwork_url: artworkUrl,
            artwork_pose: artworkPose,
            frame_theme: type === "inferno" ? "inferno" : type === "mvp" ? "legend" : "gold",
            card_number: cardNum++,
            is_active: true,
            is_limited: false,
            edition_size: null,
            description: cfg.description,
            lore: `Oficjalna karta DELTA Warszawa 2018 GM z kolekcji 2026/27.`,
            match_id: null,
            special_event_id: null,
            player: {
              id: p.id,
              display_name: p.display_name,
              shirt_number: p.shirt_number,
              position: p.position,
              photo_path: p.photo_path
            }
          });
        }
      }
      return list;
    };

    let allCards: CardDefinition[] = [];
    let userCards: any[] = [];
    let unopenedPacks: any[] = [];
    let deltaPoints = 0;
    let packDefs = defaultPacks;

    try {
      if (activePlayers.length > 0) {
        await ensureStarterCardsForPlayers(supabase, activePlayers, "2026/27");
      }

      // Pobieramy wszystkie definicje kart z bazy
      const { data: dbCards, error: cardsErr } = await supabase
        .from("card_definitions")
        .select(`
          *,
          player:players(id, display_name, shirt_number, position, photo_path),
          match:matches(id, match_date, home_team, away_team, home_score, away_score)
        `)
        .eq("is_active", true)
        .order("card_number", { ascending: true, nullsFirst: false });

      if (!cardsErr && dbCards && dbCards.length > 0) {
        allCards = dbCards;
      } else {
        allCards = generateVirtualCards();
      }

      if (user) {
        // Pobieramy karty użytkownika
        const { data: uc } = await supabase
          .from("user_cards")
          .select("*, card_definition:card_definitions(*, player:players(*))")
          .eq("user_id", user.id);

        if (uc) userCards = uc;

        // Pobieramy nieotwarte paczki
        const { data: up } = await supabase
          .from("user_unopened_packs")
          .select("*, pack_definition:pack_definitions(*)")
          .eq("user_id", user.id)
          .eq("is_opened", false)
          .order("created_at", { ascending: false });

        if (up && up.length > 0) {
          unopenedPacks = up;
        } else {
          // Jeśli użytkownik nie ma jeszcze paczek, dajemy mu 2 darmowe paczki startowe!
          unopenedPacks = [
            {
              id: "starter_pack_1",
              user_id: user.id,
              pack_type_id: "standard_pack",
              source_reason: "Pakiet powitalny DELTA GM",
              is_opened: false,
              created_at: new Date().toISOString(),
              pack_definition: defaultPacks[0]
            },
            {
              id: "starter_pack_2",
              user_id: user.id,
              pack_type_id: "gold_booster",
              source_reason: "Pakiet startowy kolekcjonera",
              is_opened: false,
              created_at: new Date().toISOString(),
              pack_definition: defaultPacks[1]
            }
          ];
        }

        // Saldo DP
        const { data: pointsRow } = await supabase
          .from("user_delta_points")
          .select("points_balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (pointsRow) deltaPoints = pointsRow.points_balance || 0;
      }

      // Pobieramy paczki z DB jeśli istnieją
      const { data: dbPacks } = await supabase
        .from("pack_definitions")
        .select("*")
        .eq("is_active", true);

      if (dbPacks && dbPacks.length > 0) {
        packDefs = dbPacks;
      }
    } catch (dbErr) {
      console.warn("Supabase cards table not ready, using virtual catalog:", dbErr);
      allCards = generateVirtualCards();
      unopenedPacks = [
        {
          id: "starter_pack_1",
          user_id: user?.id || "anon",
          pack_type_id: "standard_pack",
          source_reason: "Pakiet powitalny DELTA GM",
          is_opened: false,
          created_at: new Date().toISOString(),
          pack_definition: defaultPacks[0]
        },
        {
          id: "starter_pack_2",
          user_id: user?.id || "anon",
          pack_type_id: "gold_booster",
          source_reason: "Pakiet startowy kolekcjonera",
          is_opened: false,
          created_at: new Date().toISOString(),
          pack_definition: defaultPacks[1]
        }
      ];
    }

    if (allCards.length === 0) {
      allCards = generateVirtualCards();
    }

    return NextResponse.json({
      allCards,
      userCards,
      unopenedPacks,
      deltaPoints,
      packDefinitions: packDefs
    });
  } catch (error: any) {
    console.error("Błąd pobierania kolekcji:", error);
    return NextResponse.json({ error: error?.message || "Błąd pobierania kolekcji" }, { status: 500 });
  }
}
