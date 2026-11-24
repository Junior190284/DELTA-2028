import type { AchievementInput, ClubCommunication, CollectionCard, CollectionCardCategory, CommunicationInput, DashboardUI4AdapterInput, DashboardUI4Model, PlayerInput, PlayerSummary, RecentAchievement, RecentCard, Section, SeriesProgress, UserCardInput, UserUnopenedPackItem } from "./types.ts";

export function classifyCardCategory(cardType?: string | null, rarity?: string | null): CollectionCardCategory {
  const ct = (cardType || "").toLowerCase();
  const r = (rarity || "").toLowerCase();

  if (
    ct.includes("inferno") ||
    ct.includes("training") ||
    ct.includes("goal") ||
    ct.includes("mvp") ||
    ct.includes("legend") ||
    r === "inferno" ||
    r === "legendary" ||
    r === "epic"
  ) {
    return "special";
  }

  if (ct.includes("matchday") || r === "matchday" || r === "rare") {
    return "matchday";
  }

  return "base";
}

const available = <T>(data: T): Section<T> => ({ status: "available", data });
const empty = <T>(data: T): Section<T> => ({ status: "empty", data });
const unavailable = <T>(reason: "not_loaded" | "not_authorized" | "no_linked_player"): Section<T> => ({ status: "unavailable", data: null, reason });
const timestamp = (value?: string | null) => value && !Number.isNaN(Date.parse(value)) ? Date.parse(value) : 0;
const playerSummary = (player: PlayerInput): PlayerSummary => ({
  id: player.id, displayName: player.display_name?.trim() || player.name?.trim() || "Zawodnik",
  shirtNumber: player.shirt_number ?? null, position: player.position ?? null,
});
const cardDefinition = (card: UserCardInput) => card.card_definition ?? card.card ?? null;
const cardDefinitionId = (card: UserCardInput) => card.card_id ?? card.card_definition_id ?? cardDefinition(card)?.id ?? null;
const cardCopies = (card: UserCardInput) => card.quantity ?? (card.duplicates_count !== undefined && card.duplicates_count !== null ? card.duplicates_count + 1 : 1);
const finite = (value?: number | null) => Number.isFinite(value) ? Number(value) : 0;

function recentCard(card: UserCardInput): RecentCard | null {
  const definition = cardDefinition(card);
  const definitionId = cardDefinitionId(card);
  if (!definition || !definitionId) return null;
  return {
    userCardId: card.id, definitionId,
    name: definition.name?.trim() || definition.title?.trim() || "Karta",
    rarity: definition.rarity ?? null,
    playerName: definition.player?.display_name?.trim() || definition.player?.name?.trim() || null,
    acquiredAt: card.acquired_at ?? card.created_at ?? null,
    artworkUrl: definition.artwork_url ?? definition.image_url ?? null,
  };
}

function achievement(item: AchievementInput): RecentAchievement | null {
  const definition = item.achievement;
  const id = item.achievement_id ?? definition?.id ?? item.id;
  if (!id) return null;
  return {
    id,
    name: definition?.name?.trim() || definition?.title?.trim() || item.name?.trim() || item.title?.trim() || "Odznaka",
    description: definition?.description ?? item.description ?? null,
    icon: definition?.icon ?? definition?.icon_url ?? item.icon ?? item.icon_url ?? null,
    unlockedAt: item.unlockedAt ?? item.unlocked_at ?? null,
    category: definition?.category ?? item.category ?? null,
    rarity: definition?.rarity ?? item.rarity ?? null,
  };
}

function communication(item: CommunicationInput, source: ClubCommunication["source"]): ClubCommunication {
  return { id: item.id, title: item.title, summary: item.summary ?? item.content ?? null,
    publishedAt: item.published_at ?? item.created_at ?? null, source, urgent: item.urgent === true };
}

export function createDashboardUI4Model(input: DashboardUI4AdapterInput): DashboardUI4Model {
  const actorKind = input.profile.role === "parent" ? "parent" : input.profile.role === "player" ? "player"
    : input.profile.role === "admin" || input.profile.role === "coach" ? "staff" : "user";
  const linkedIds = new Set(input.parentPlayerIds ?? []);
  const linkedPlayer = actorKind === "parent"
    ? input.players?.find(p => linkedIds.has(p.id))
    : actorKind === "player"
    ? input.players?.find(p => (linkedIds.size > 0 ? linkedIds.has(p.id) : p.id === input.profile.id))
    : input.players?.find(p => linkedIds.has(p.id));
  const profilePlayer = linkedPlayer ? available(playerSummary(linkedPlayer))
    : input.players === undefined ? unavailable<PlayerSummary>("not_loaded")
    : actorKind === "parent" || actorKind === "player" ? unavailable<PlayerSummary>("no_linked_player") : empty<PlayerSummary>(null as never);

  let nextAction: DashboardUI4Model["nextAction"];
  if (input.nextMatch === undefined && input.nextTraining === undefined) nextAction = unavailable("not_loaded");
  else if (input.nextMatch) nextAction = available({
    kind: "match", id: input.nextMatch.id ?? null, title: input.nextMatch.title?.trim() || "Najbliższy mecz",
    startsAt: input.nextMatch.starts_at ?? input.nextMatch.start_time ?? null,
    location: input.nextMatch.location ?? null, opponent: input.nextMatch.opponent ?? null,
    countdown: input.nextMatchCountdown ?? null,
  });
  else if (input.nextTraining) nextAction = available({
    kind: "training", id: input.nextTraining.session.id ?? null,
    title: input.nextTraining.session.title?.trim() || "Najbliższy trening",
    startsAt: input.nextTraining.start ?? input.nextTraining.session.starts_at ?? input.nextTraining.session.start_time ?? null,
    location: input.nextTraining.session.location ?? null, opponent: null,
    countdown: input.nextTraining.countdown ?? null,
  });
  else nextAction = empty(null as never);

  let progress: DashboardUI4Model["progress"];
  if (input.progressUnavailableReason) {
    progress = unavailable(input.progressUnavailableReason);
  } else if (input.sportsXp) {
    progress = available({
      level: input.sportsXp.playerLevel,
      title: input.sportsXp.stadiumTierTitle,
      currentXP: input.sportsXp.sportsXp,
      seasonXP: input.sportsXp.sportsXp,
      currentLevelXP: input.sportsXp.currentLvlXp,
      nextLevelXP: input.sportsXp.neededLvlXp,
      progressPercent: Math.min(100, Math.max(0, input.sportsXp.progressPercent)),
      activityStreak: input.sportsXp.presentTrainings,
      maxStreak: input.sportsXp.presentTrainings,
      verifiedTrainings: input.sportsXp.presentTrainings,
      verifiedMatches: input.sportsXp.presentMatches,
      stadiumStage: input.sportsXp.stadiumTierTitle,
      attendanceRatePercent: input.sportsXp.attendanceRatePercent ?? null,
      nextAchievement: input.nextAchievement ?? null,
    });
  } else if (input.gameProfile) {
    progress = available({
      level: input.gameProfile.levelInfo.level,
      title: input.gameProfile.levelInfo.title,
      currentXP: input.gameProfile.currentXP,
      seasonXP: input.gameProfile.seasonXP,
      currentLevelXP: input.gameProfile.levelInfo.currentLevelXP,
      nextLevelXP: input.gameProfile.levelInfo.nextLevelXP,
      progressPercent: Math.min(100, Math.max(0, input.gameProfile.levelInfo.progressPercent)),
      activityStreak: input.gameProfile.activityStreak,
      maxStreak: input.gameProfile.maxStreak,
      nextAchievement: input.nextAchievement ?? null,
    });
  } else {
    progress = unavailable("not_loaded");
  }

  let recentCards: DashboardUI4Model["recentCards"];
  let collectionCards: DashboardUI4Model["collectionCards"];
  let albumProgress: DashboardUI4Model["albumProgress"];
  if (!input.access.canViewCollection) {
    recentCards = unavailable("not_authorized");
    collectionCards = unavailable("not_authorized");
    albumProgress = unavailable("not_authorized");
  } else if (input.userCards === undefined) {
    recentCards = unavailable("not_loaded");
    collectionCards = unavailable("not_loaded");
    albumProgress = unavailable("not_loaded");
  } else {
    const sortedUserCards = [...input.userCards].sort(
      (a, b) => timestamp(b.acquired_at ?? b.created_at) - timestamp(a.acquired_at ?? a.created_at)
    );
    const cards = sortedUserCards
      .map(recentCard)
      .filter((card): card is RecentCard => card !== null)
      .slice(0, 4);
    recentCards = cards.length ? available(cards) : empty([]);

    const validDefinitions = input.allCards !== undefined ? new Set(input.allCards.map(c => c.id)) : null;
    const mappedCollection: CollectionCard[] = [];
    const ownedIds = new Set<string>();
    let copies = 0;
    let baseCount = 0;
    let matchdayCount = 0;
    let specialCount = 0;

    for (const card of sortedUserCards) {
      const def = cardDefinition(card);
      const id = cardDefinitionId(card);
      if (!id || (validDefinitions && !validDefinitions.has(id))) continue;

      const dupCount = typeof card.duplicates_count === "number" ? card.duplicates_count : 0;
      const quantity = Math.max(1, cardCopies(card));
      const category = classifyCardCategory(def?.card_type, def?.rarity);

      mappedCollection.push({
        id: card.id,
        cardId: id,
        name: def?.name?.trim() || def?.title?.trim() || "Karta",
        title: def?.title?.trim() || def?.name?.trim() || "DELTA",
        rarity: def?.rarity ?? null,
        cardType: def?.card_type ?? null,
        category,
        cardNumber: typeof def?.card_number === "number" ? def.card_number : null,
        season: def?.season ?? "2026/27",
        playerName: def?.player?.display_name?.trim() || def?.player?.name?.trim() || null,
        playerShirtNumber: def?.player?.shirt_number ?? null,
        playerPosition: def?.player?.position ?? null,
        playerPhotoUrl: def?.player?.photo_path ?? null,
        artworkUrl: def?.artwork_url ?? def?.image_url ?? null,
        artworkPose: def?.artwork_pose ?? null,
        frameTheme: def?.frame_theme ?? null,
        acquiredAt: card.acquired_at ?? card.created_at ?? null,
        duplicatesCount: dupCount,
        quantity,
        isFavorite: card.is_favorite === true
      });

      const isNew = !ownedIds.has(id);
      ownedIds.add(id);
      copies += quantity;

      if (isNew) {
        if (category === "special") {
          specialCount++;
        } else if (category === "matchday") {
          matchdayCount++;
        } else {
          baseCount++;
        }
      }
    }

    collectionCards = mappedCollection.length ? available(mappedCollection) : empty([]);

    const unopenedPacks = input.unopenedPacksCount !== undefined
      ? finite(input.unopenedPacksCount)
      : finite(input.gameProfile?.unopenedPacks);

    const effectiveUnopenedCount = unopenedPacks !== undefined
      ? unopenedPacks
      : (input.unopenedPacksList ? input.unopenedPacksList.length : 0);

    const owned = ownedIds.size;
    const duplicates = Math.max(0, copies - owned);
    const series: SeriesProgress[] = [
      { id: "base", name: "Karty Podstawowe (Base)", category: "base", owned: baseCount, total: null, percent: null },
      { id: "matchday", name: "Karty Meczowe (Matchday)", category: "matchday", owned: matchdayCount, total: null, percent: null },
      { id: "inferno", name: "Karty Specjalne (Inferno)", category: "inferno", owned: specialCount, total: null, percent: null }
    ];

    const packsListProp = input.unopenedPacksList !== undefined ? { unopenedPacksList: input.unopenedPacksList } : {};

    if (input.allCards === undefined && input.userCards === undefined) {
      albumProgress = unavailable("not_loaded");
    } else if (input.allCards !== undefined && !input.allCards.length && !input.userCards.length) {
      albumProgress = empty({ owned: 0, total: 0, percent: 0, duplicates: 0, unopenedPacks: effectiveUnopenedCount, ...packsListProp, series });
    } else if (input.isAuthoritativeCatalog === true && input.allCards && input.allCards.length > 0) {
      const definitions = new Set(input.allCards.map(card => card.id));
      const total = definitions.size;
      const percent = total > 0 ? Math.round(owned / total * 100) : 0;
      albumProgress = available({ owned, total, percent, duplicates, unopenedPacks: effectiveUnopenedCount, ...packsListProp, series });
    } else {
      // Real-data mode: Catalog from RLS is non-authoritative.
      // Total cards and percent are unavailable (null) per DELTA-033 requirements.
      albumProgress = available({ owned, total: null, percent: null, duplicates, unopenedPacks: effectiveUnopenedCount, ...packsListProp, series });
    }
  }

  let recentAchievements: DashboardUI4Model["recentAchievements"];
  if (!input.access.canViewAchievements) recentAchievements = unavailable("not_authorized");
  else if (input.achievements === undefined) {
    recentAchievements = input.progressUnavailableReason
      ? unavailable(input.progressUnavailableReason)
      : unavailable("not_loaded");
  } else {
    const items = input.achievements.filter(a => a.isUnlocked === true || a.is_unlocked === true)
      .sort((a,b) => timestamp(b.unlockedAt ?? b.unlocked_at) - timestamp(a.unlockedAt ?? a.unlocked_at))
      .map(achievement).filter((item): item is RecentAchievement => item !== null).slice(0, 3);
    recentAchievements = items.length ? available(items) : empty([]);
  }

  let teamShowcase: DashboardUI4Model["teamShowcase"];
  if (!input.access.canViewTeamShowcase) teamShowcase = unavailable("not_authorized");
  else if (input.players === undefined) teamShowcase = unavailable("not_loaded");
  else {
    const players = input.players.filter(p => p.active !== false);
    const summary = { playerCount: players.length, featuredPlayers: players.slice(0,3).map(playerSummary), entryPoint: "players" as const };
    teamShowcase = players.length ? available(summary) : empty(summary);
  }

  let clubCommunications: DashboardUI4Model["clubCommunications"];
  if (!input.access.canViewClubCommunications) clubCommunications = unavailable("not_authorized");
  else if (input.news === undefined && input.clubUpdates === undefined) clubCommunications = unavailable("not_loaded");
  else {
    const items = [...(input.news ?? []).map(i => communication(i, "news")), ...(input.clubUpdates ?? []).map(i => communication(i, "club_update"))]
      .sort((a,b) => timestamp(b.publishedAt) - timestamp(a.publishedAt)).slice(0,3);
    clubCommunications = items.length ? available(items) : empty([]);
  }

  return {
    profile: { accountId: input.profile.id, actorKind, displayName: input.profile.display_name?.trim() || "Użytkownik",
      teamName: input.teamName ?? null, player: profilePlayer },
    nextAction, progress, recentCards, collectionCards, albumProgress, recentAchievements, teamShowcase, clubCommunications,
  };
}

export function mapServerUserCardsToCollectionCards(userCards: any[]): CollectionCard[] {
  if (!Array.isArray(userCards)) return [];
  const sorted = [...userCards].sort((a, b) => {
    const timeA = a.acquired_at ? new Date(a.acquired_at).getTime() : 0;
    const timeB = b.acquired_at ? new Date(b.acquired_at).getTime() : 0;
    return timeB - timeA;
  });

  return sorted.map(uc => {
    const def = uc.card_definition || uc.card || {};
    const player = def.player || {};
    const dupCount = typeof uc.duplicates_count === "number" ? uc.duplicates_count : 0;
    const quantity = Math.max(1, dupCount + 1);
    const category = classifyCardCategory(def.card_type, def.rarity);

    return {
      id: String(uc.id),
      cardId: String(uc.card_id || def.id),
      name: String(def.card_name || def.title || def.name || "Karta"),
      title: String(def.title || def.card_name || "DELTA"),
      rarity: def.rarity ?? null,
      cardType: def.card_type ? String(def.card_type).toUpperCase() : null,
      category,
      cardNumber: typeof def.card_number === "number" ? def.card_number : null,
      season: def.season || "2026/27",
      playerName: player.display_name || player.name || null,
      playerShirtNumber: player.shirt_number !== undefined ? player.shirt_number : null,
      playerPosition: player.position || null,
      playerPhotoUrl: player.photo_path || null,
      artworkUrl: def.artwork_url || def.image_url || null,
      artworkPose: def.artwork_pose || null,
      frameTheme: def.frame_theme || null,
      acquiredAt: uc.acquired_at || uc.created_at || null,
      duplicatesCount: dupCount,
      quantity,
      isFavorite: uc.is_favorite === true
    };
  });
}

export function mapServerUnopenedPacks(unopenedPacks: any[]): UserUnopenedPackItem[] {
  if (!Array.isArray(unopenedPacks)) return [];
  return unopenedPacks
    .filter(p => p && p.is_opened !== true)
    .map(p => ({
      id: String(p.id),
      packTypeId: String(p.pack_type_id || p.packTypeId || "standard_pack"),
      sourceReason: p.source_reason ?? p.sourceReason ?? null,
      createdAt: p.created_at ?? p.createdAt ?? null,
      packDefinition: p.pack_definition ? {
        id: String(p.pack_definition.id),
        name: String(p.pack_definition.name),
        description: p.pack_definition.description ?? null,
        cardsCount: typeof p.pack_definition.cards_count === "number" ? p.pack_definition.cards_count : (p.pack_definition.cardsCount ?? 3),
        theme: p.pack_definition.theme ?? "standard",
        imageUrl: p.pack_definition.image_url ?? p.pack_definition.imageUrl ?? null
      } : undefined
    }));
}
