import { SupabaseClient } from "@supabase/supabase-js";
import { CardDefinition, CardRarity, PackDefinition, PackOpeningResult, RARITY_CONFIG, CARD_TYPES_CONFIG } from "./types";

/**
 * Zapewnia istnienie domyślnych 6 kart startowych dla każdego zawodnika w danym sezonie
 */
export async function ensureStarterCardsForPlayers(
  supabase: SupabaseClient,
  players: { id: string; display_name: string }[],
  season = "2026/27"
) {
  if (!players || !players.length) return;

  const starterTypes = ["base", "matchday", "training_warrior", "goal_hunter", "mvp", "inferno"] as const;

  const cardsToInsert: any[] = [];

  for (const p of players) {
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

      cardsToInsert.push({
        player_id: p.id,
        season,
        card_type: type,
        card_name: `${p.display_name} — ${cfg.name}`,
        title: cfg.name,
        rarity: cfg.defaultRarity,
        artwork_url: artworkUrl,
        artwork_pose: artworkPose,
        frame_theme: type === "inferno" ? "inferno" : type === "mvp" ? "legend" : "gold",
        description: cfg.description,
        lore: `Oficjalna karta DELTA Warszawa 2018 GM z kolekcji ${season}.`,
        is_active: true
      });
    }
  }

  // Wstawienie lub aktualizacja (on conflict do nothing)
  try {
    await supabase
      .from("card_definitions")
      .upsert(cardsToInsert, { onConflict: "player_id,season,card_type", ignoreDuplicates: true });
  } catch (err) {
    console.error("Błąd seedowania kart:", err);
  }
}

/**
 * Losuje rzadkość na podstawie wag procentowych w definicji paczki
 */
export function rollRarity(dropRates: Record<CardRarity, number>, guaranteedMin?: CardRarity): CardRarity {
  const raritiesOrder: CardRarity[] = ["common", "rare", "epic", "legendary", "inferno"];
  
  let validRates = { ...dropRates };
  if (guaranteedMin) {
    const minIndex = raritiesOrder.indexOf(guaranteedMin);
    // Zerujemy rzadkości poniżej gwarantowanego minimum
    raritiesOrder.slice(0, minIndex).forEach(r => {
      validRates[r] = 0;
    });
  }

  const totalWeight = Object.values(validRates).reduce((sum, w) => sum + (w || 0), 0);
  if (totalWeight <= 0) return guaranteedMin || "common";

  let randomVal = Math.random() * totalWeight;
  for (const rarity of raritiesOrder) {
    const weight = validRates[rarity] || 0;
    if (randomVal <= weight) {
      return rarity;
    }
    randomVal -= weight;
  }

  return guaranteedMin || "common";
}

/**
 * Główny silnik serwerowy otwierania paczki (Server-Side Pack Opening Engine)
 */
export async function openPackServerSide(
  supabase: SupabaseClient,
  userId: string,
  userUnopenedPackId?: string,
  packTypeId = "matchday"
): Promise<PackOpeningResult> {
  // 1. Sprawdzamy lub pobieramy definicję paczki
  let finalPackTypeId = packTypeId;

  if (userUnopenedPackId) {
    const { data: packRow, error: packErr } = await supabase
      .from("user_unopened_packs")
      .select("id, pack_type_id, is_opened")
      .eq("id", userUnopenedPackId)
      .eq("user_id", userId)
      .single();

    if (packErr || !packRow) {
      throw new Error("Nie znaleziono paczki do otwarcia.");
    }
    if (packRow.is_opened) {
      throw new Error("Ta paczka została już otwarta.");
    }
    finalPackTypeId = packRow.pack_type_id;
  }

  // 2. Pobieramy konfigurację paczki z bazy lub stosujemy unikalną konfigurację dla danego typu
  const PACK_FALLBACK_CONFIGS: Record<string, { cardsCount: number; dropRates: Record<CardRarity, number>; minRarity: CardRarity }> = {
    standard_pack: {
      cardsCount: 3,
      dropRates: { common: 70, rare: 22, epic: 6, legendary: 1.8, inferno: 0.2 },
      minRarity: "common"
    },
    matchday_booster: {
      cardsCount: 4,
      dropRates: { common: 50, rare: 35, epic: 11, legendary: 3.5, inferno: 0.5 },
      minRarity: "rare"
    },
    gold_booster: {
      cardsCount: 5,
      dropRates: { common: 35, rare: 45, epic: 15, legendary: 4.5, inferno: 0.5 },
      minRarity: "rare"
    },
    inferno_booster: {
      cardsCount: 5,
      dropRates: { common: 20, rare: 40, epic: 28, legendary: 9, inferno: 3 },
      minRarity: "epic"
    },
    legend_pack: {
      cardsCount: 6,
      dropRates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 },
      minRarity: "legendary"
    },
    legend_booster: {
      cardsCount: 6,
      dropRates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 },
      minRarity: "legendary"
    }
  };

  const { data: packDef } = await supabase
    .from("pack_definitions")
    .select("*")
    .eq("id", finalPackTypeId)
    .maybeSingle();

  const fallback = PACK_FALLBACK_CONFIGS[finalPackTypeId] || PACK_FALLBACK_CONFIGS["standard_pack"];
  const cardsCount = packDef?.cards_count || fallback.cardsCount;
  const dropRates: Record<CardRarity, number> = packDef?.drop_rates || fallback.dropRates;
  const minRarity: CardRarity = packDef?.min_rarity || fallback.minRarity;

  // 3. Pobieramy wszystkie aktywne wzory kart
  const { data: allCards, error: cardsErr } = await supabase
    .from("card_definitions")
    .select(`
      *,
      player:players(id, display_name, shirt_number, position, photo_path),
      match:matches(id, match_date, home_team, away_team, home_score, away_score)
    `)
    .eq("is_active", true);

  let availableCards: CardDefinition[] = allCards || [];

  if (!availableCards.length) {
    const { data: players } = await supabase
      .from("players")
      .select("id, display_name, shirt_number, position, photo_path, active")
      .order("display_name");

    const activePlayers = (players || []).filter(p => p.active !== false);
    const starterTypes = ["base", "matchday", "training_warrior", "goal_hunter", "mvp", "inferno"] as const;

    for (const p of activePlayers) {
      const isRyszard = (p.display_name || "").toLowerCase().includes("ryszard") &&
                        (p.display_name || "").toLowerCase().includes("rybacki");

      for (const type of starterTypes) {
        const cfg = CARD_TYPES_CONFIG[type];
        let artworkUrl: string | null = null;
        let artworkPose = "standard";

        if (isRyszard) {
          if (type === "inferno") artworkUrl = "/assets/players/ryszard-inferno.png";
          else if (type === "mvp" || type === "goal_hunter" || type === "training_warrior") artworkUrl = "/assets/players/ryszard-legend.png";
          else artworkUrl = "/assets/players/ryszard-gold.png";
        }

        availableCards.push({
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
          card_number: availableCards.length + 1,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: cfg.description,
          lore: `Oficjalna karta DELTA Warszawa 2018 GM.`,
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
  }

  if (!availableCards.length) {
    throw new Error("Brak dostępnych kart w puli losowania.");
  }

  // 4. Pobieramy obecne karty użytkownika, aby wykryć duplikaty
  const { data: existingUserCards } = await supabase
    .from("user_cards")
    .select("card_id, duplicates_count")
    .eq("user_id", userId);

  const ownedCardIds = new Set((existingUserCards || []).map(x => x.card_id));

  // 5. Losowanie kart (Drop Engine)
  const drawnCards: {
    card: CardDefinition;
    is_duplicate: boolean;
    duplicate_points: number;
  }[] = [];

  let totalDeltaPoints = 0;

  for (let slot = 0; slot < cardsCount; slot++) {
    // Jeśli to ostatni slot i nie wylosowano jeszcze min_rarity, wymuszamy min_rarity
    const isLastSlot = slot === cardsCount - 1;
    const hasMetMinRarity = drawnCards.some(d => {
      const raritiesOrder: CardRarity[] = ["common", "rare", "epic", "legendary", "inferno"];
      return raritiesOrder.indexOf(d.card.rarity) >= raritiesOrder.indexOf(minRarity);
    });

    const guaranteed = isLastSlot && !hasMetMinRarity ? minRarity : undefined;
    const rolledRarity = rollRarity(dropRates, guaranteed);

    // Wybieramy losową kartę z puli o wylosowanej rzadkości
    let matchingCards = availableCards.filter(c => c.rarity === rolledRarity);
    if (!matchingCards.length) {
      matchingCards = availableCards; // fallback
    }

    const selectedCard = matchingCards[Math.floor(Math.random() * matchingCards.length)] as CardDefinition;
    const isDuplicate = ownedCardIds.has(selectedCard.id);
    const pointsForDup = isDuplicate ? (RARITY_CONFIG[selectedCard.rarity]?.duplicatePoints ?? 4) : 0;

    if (isDuplicate) {
      totalDeltaPoints += pointsForDup;
    } else {
      ownedCardIds.add(selectedCard.id); // W obrębie tej samej paczki kolejne to duplikaty
    }

    drawnCards.push({
      card: selectedCard,
      is_duplicate: isDuplicate,
      duplicate_points: pointsForDup
    });
  }

  // 6. Zapis w bazie (Transakcja addytywna)
  // a) Aktualizacja / wstawienie kart do user_cards
  for (const drawn of drawnCards) {
    const existing = (existingUserCards || []).find(x => x.card_id === drawn.card.id);
    if (existing) {
      await supabase
        .from("user_cards")
        .update({ duplicates_count: (existing.duplicates_count || 0) + 1 })
        .eq("user_id", userId)
        .eq("card_id", drawn.card.id);
    } else {
      await supabase
        .from("user_cards")
        .insert({
          user_id: userId,
          card_id: drawn.card.id,
          duplicates_count: 0
        });
    }
  }

  // b) Aktualizacja stanu Delta Points (user_delta_points)
  let newBalance = 0;
  if (totalDeltaPoints > 0) {
    const { data: currentPoints } = await supabase
      .from("user_delta_points")
      .select("points_balance, total_earned")
      .eq("user_id", userId)
      .maybeSingle();

    newBalance = (currentPoints?.points_balance || 0) + totalDeltaPoints;
    const newTotal = (currentPoints?.total_earned || 0) + totalDeltaPoints;

    await supabase
      .from("user_delta_points")
      .upsert({
        user_id: userId,
        points_balance: newBalance,
        total_earned: newTotal,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
  } else {
    const { data: currentPoints } = await supabase
      .from("user_delta_points")
      .select("points_balance")
      .eq("user_id", userId)
      .maybeSingle();
    newBalance = currentPoints?.points_balance || 0;
  }

  // c) Oznaczenie paczki jako otwartej w bazie (zużycie konkretnego egzemplarza)
  let consumedPackId: string | null = userUnopenedPackId || null;

  if (consumedPackId) {
    await supabase
      .from("user_unopened_packs")
      .update({
        is_opened: true,
        opened_at: new Date().toISOString()
      })
      .eq("id", consumedPackId);
  } else {
    // Jeśli nie podano ID konkretnej paczki, zużywamy najstarszą nieotwartą paczkę użytkownika tego typu
    const { data: matchPack } = await supabase
      .from("user_unopened_packs")
      .select("id")
      .eq("user_id", userId)
      .eq("pack_type_id", finalPackTypeId)
      .eq("is_opened", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (matchPack?.id) {
      consumedPackId = matchPack.id;
    } else {
      // Fallback: dowolna pierwsza nieotwarta paczka użytkownika
      const { data: anyPack } = await supabase
        .from("user_unopened_packs")
        .select("id")
        .eq("user_id", userId)
        .eq("is_opened", false)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (anyPack?.id) consumedPackId = anyPack.id;
    }

    if (consumedPackId) {
      await supabase
        .from("user_unopened_packs")
        .update({
          is_opened: true,
          opened_at: new Date().toISOString()
        })
        .eq("id", consumedPackId);
    }
  }

  // Pobieramy aktualną liczbę pozostałych nieotwartych paczek
  const { count: remainingCount } = await supabase
    .from("user_unopened_packs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_opened", false);

  // d) Zapis do audit logu
  await supabase
    .from("pack_opening_logs")
    .insert({
      user_id: userId,
      pack_type_id: finalPackTypeId,
      cards_drawn: drawnCards.map(d => ({
        card_id: d.card.id,
        rarity: d.card.rarity,
        is_duplicate: d.is_duplicate,
        points: d.duplicate_points
      })),
      delta_points_awarded: totalDeltaPoints
    });

  return {
    cards: drawnCards,
    total_delta_points_earned: totalDeltaPoints,
    new_points_balance: newBalance,
    pack_type_id: finalPackTypeId,
    consumed_pack_id: consumedPackId,
    remaining_unopened_packs_count: remainingCount ?? 0
  };
}
