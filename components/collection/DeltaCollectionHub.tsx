"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Sparkles, 
  Gift, 
  RotateCw, 
  User, 
  Trophy, 
  Layers,
  ArrowRight
} from "lucide-react";
import { 
  CardDefinition, 
  UserCard, 
  UserUnopenedPack, 
  PackDefinition, 
  CardLayoutConfig 
} from "@/lib/cards/types";
import { 
  DeltaCardModel, 
  DeltaCardTheme, 
  adaptLegacyToDeltaCardModel,
  DELTA_THEME_CONFIGS 
} from "@/lib/cards/deltaCardModel";
import { cardSound } from "@/lib/cards/audio";
import CollectionSummary from "./CollectionSummary";
import CollectionFilterBar, { FilterState } from "./CollectionFilterBar";
import CardGrid from "./CardGrid";
import CardDetailModal from "./CardDetailModal";
import PlayerCollectionView from "./PlayerCollectionView";
import CollectionEmptyState from "./CollectionEmptyState";
import { 
  subscribeCardEvents, 
  FetchSequenceGuard, 
  createDebouncedRevalidator, 
  toggleFavoriteWithRollback 
} from "@/lib/cards/cardSync";

export interface DeltaCollectionHubProps {
  initialAllCards?: CardDefinition[];
  initialUserCards?: UserCard[];
  initialUnopenedPacks?: UserUnopenedPack[];
  initialDeltaPoints?: number;
  onOpenPackModal?: () => void;
  className?: string;
}

export default function DeltaCollectionHub({
  initialAllCards,
  initialUserCards,
  initialUnopenedPacks,
  initialDeltaPoints = 0,
  onOpenPackModal,
  className = ""
}: DeltaCollectionHubProps) {
  const [allCards, setAllCards] = useState<CardDefinition[]>(initialAllCards || []);
  const [userCards, setUserCards] = useState<UserCard[]>(initialUserCards || []);
  const [unopenedPacks, setUnopenedPacks] = useState<UserUnopenedPack[]>(initialUnopenedPacks || []);
  const [deltaPoints, setDeltaPoints] = useState<number>(initialDeltaPoints);
  const [playersList, setPlayersList] = useState<{ id: string; name: string; shirtNumber?: string | null; photoPath?: string | null }[]>([]);
  const [playerStatsMap, setPlayerStatsMap] = useState<Record<string, any>>({});
  const [cardLayoutsMap, setCardLayoutsMap] = useState<Record<string, Partial<CardLayoutConfig>>>({});
  const [loading, setLoading] = useState<boolean>(!initialAllCards);
  const [error, setError] = useState<string | null>(null);

  // Modals & Inspection State
  const [selectedCard, setSelectedCard] = useState<DeltaCardModel | null>(null);
  const [featuredCardId, setFeaturedCardId] = useState<string | null>(null);
  const [selectedPlayerForView, setSelectedPlayerForView] = useState<{ id: string; name: string; shirtNumber?: string | null; photoPath?: string | null } | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    player: "all",
    cardType: "all",
    rarity: "all",
    sort: "newest"
  });

  // Load featured card from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFeatured = localStorage.getItem("delta_featured_card_id");
      if (savedFeatured) setFeaturedCardId(savedFeatured);
    }
  }, []);

  const fetchGuardRef = React.useRef(new FetchSequenceGuard());

  // Fetch data if not passed or when synced
  const fetchData = useCallback(async () => {
    const seq = fetchGuardRef.current.startRequest();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/cards/collection");
      if (!res.ok) throw new Error("Nie udało się pobrać kolekcji kart");
      const data = await res.json();

      // Drop stale responses if a newer request was started in the meantime
      if (!fetchGuardRef.current.isLatest(seq)) {
        return;
      }

      setAllCards(data.allCards || []);
      setUserCards(data.userCards || []);
      setUnopenedPacks(data.unopenedPacks || []);
      setDeltaPoints(data.deltaPoints || 0);

      if (data.players && Array.isArray(data.players)) {
        setPlayersList(
          data.players.map((p: any) => ({
            id: p.id,
            name: p.display_name,
            shirtNumber: p.shirt_number,
            photoPath: p.photo_path
          }))
        );
      }

      if (data.playerStats) {
        setPlayerStatsMap(data.playerStats);
      }

      if (data.cardLayouts && Array.isArray(data.cardLayouts)) {
        const layouts: Record<string, Partial<CardLayoutConfig>> = {};
        data.cardLayouts.forEach((row: any) => {
          layouts[`${row.player_id}_${row.template_key}`] = {
            scale: row.scale,
            translateX: row.translate_x,
            translateY: row.translate_y,
            rotate: row.rotate,
            brightness: row.brightness,
            contrast: row.contrast,
            photoUrl: row.photo_url
          };
        });
        setCardLayoutsMap(layouts);
      }
    } catch (err: any) {
      if (fetchGuardRef.current.isLatest(seq)) {
        console.error("Error loading collection hub data:", err);
        setError(err?.message || "Błąd pobierania danych");
      }
    } finally {
      if (fetchGuardRef.current.isLatest(seq)) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialAllCards || initialAllCards.length === 0) {
      fetchData();
    }
  }, [initialAllCards, fetchData]);

  // Event listener for external card pack opening & collection synchronization
  useEffect(() => {
    const debouncedRefresh = createDebouncedRevalidator(async () => {
      await fetchData();
    }, 150);

    const unsubscribe = subscribeCardEvents({
      onPackOpened: (payload) => {
        // Optimistically update unopened packs count if provided
        if (typeof payload.remaining_unopened_packs_count === "number") {
          setUnopenedPacks(prev => prev.slice(0, payload.remaining_unopened_packs_count));
        }
        if (typeof payload.new_points_balance === "number") {
          setDeltaPoints(payload.new_points_balance);
        }
        debouncedRefresh();
      },
      onCollectionUpdated: () => {
        debouncedRefresh();
      },
      onFavoriteUpdated: (fav) => {
        if (!fav.card_id) return;
        setUserCards(prev =>
          prev.map(uc => uc.card_id === fav.card_id ? { ...uc, is_favorite: fav.is_favorite } : uc)
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // Map user cards by card_id for fast lookup
  const userCardsMap = useMemo(() => {
    const map = new Map<string, UserCard>();
    userCards.forEach((uc) => {
      if (uc.card_id) map.set(uc.card_id, uc);
    });
    return map;
  }, [userCards]);

  // Transform all catalogue cards into unified DeltaCardModel instances
  const cardModels: DeltaCardModel[] = useMemo(() => {
    return allCards.map((card) => {
      const userCard = userCardsMap.get(card.id) || null;
      const isOwned = !!userCard;
      const pStats = card.player_id ? playerStatsMap[card.player_id] : undefined;

      return adaptLegacyToDeltaCardModel({
        card,
        player: card.player,
        userCard,
        isLocked: !isOwned,
        stats: pStats ? {
          matches: 24,
          goals: pStats.goals,
          assists: pStats.assists,
          trainings: pStats.attendancePercent ? Math.round(pStats.attendancePercent * 0.9) : 90,
          attendance: pStats.attendancePercent,
          mvp: pStats.mvp
        } : undefined
      });
    });
  }, [allCards, userCardsMap, playerStatsMap]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCardsInCatalog = cardModels.length;
    const uniqueOwned = userCards.length;
    const duplicatesCount = userCards.reduce((acc, uc) => acc + (uc.duplicates_count || 0), 0);
    const totalOwnedWithDuplicates = uniqueOwned + duplicatesCount;
    const favoritesCount = userCards.filter((uc) => uc.is_favorite).length;

    return {
      totalCardsInCatalog,
      uniqueOwned,
      duplicatesCount,
      totalCards: totalOwnedWithDuplicates,
      favoritesCount
    };
  }, [cardModels, userCards]);

  // Favorite toggle handler with immediate optimistic update and automatic rollback on failure
  const handleToggleFavorite = async (cardId: string, currentFavorite: boolean) => {
    const nextFavorite = !currentFavorite;

    await toggleFavoriteWithRollback(
      cardId,
      nextFavorite,
      (val) => {
        setUserCards(prev =>
          prev.map(uc => uc.card_id === cardId ? { ...uc, is_favorite: val } : uc)
        );
        if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard(prev => prev ? { ...prev, isFavorite: val } : null);
        }
      }
    );
  };

  // Set featured card handler
  const handleSetFeatured = (cardId: string) => {
    setFeaturedCardId(cardId);
    try {
      localStorage.setItem("delta_featured_card_id", cardId);
    } catch {}
  };

  // Filter and Sort Cards
  const filteredAndSortedCards = useMemo(() => {
    let list = [...cardModels];

    // 1. Filter: Search
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.playerName.toLowerCase().includes(query) ||
          c.cardType.toLowerCase().includes(query) ||
          (c.backData?.cardId && c.backData.cardId.toLowerCase().includes(query)) ||
          (c.shirtNumber && c.shirtNumber.includes(query))
      );
    }

    // 2. Filter: Status
    if (filters.status === "owned") {
      list = list.filter((c) => !c.isLocked);
    } else if (filters.status === "missing") {
      list = list.filter((c) => c.isLocked);
    } else if (filters.status === "duplicates") {
      list = list.filter((c) => !c.isLocked && (c.duplicatesCount || 0) > 0);
    } else if (filters.status === "favorites") {
      list = list.filter((c) => !c.isLocked && c.isFavorite);
    }

    // 3. Filter: Player
    if (filters.player !== "all") {
      list = list.filter((c) => c.playerId === filters.player);
    }

    // 4. Filter: Card Type / Theme
    if (filters.cardType !== "all") {
      list = list.filter((c) => c.cardType === filters.cardType);
    }

    // 5. Filter: Rarity
    if (filters.rarity !== "all") {
      list = list.filter((c) => c.rarity.toLowerCase() === filters.rarity.toLowerCase());
    }

    // 6. Sort
    const rarityRank: Record<string, number> = {
      inferno: 5,
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1
    };

    list.sort((a, b) => {
      if (filters.sort === "rarity") {
        const rankA = rarityRank[a.rarity.toLowerCase()] || 0;
        const rankB = rarityRank[b.rarity.toLowerCase()] || 0;
        return rankB - rankA;
      }
      if (filters.sort === "player") {
        return a.playerName.localeCompare(b.playerName, "pl");
      }
      if (filters.sort === "duplicates") {
        return (b.duplicatesCount || 0) - (a.duplicatesCount || 0);
      }
      if (filters.sort === "card_type") {
        return a.cardType.localeCompare(b.cardType);
      }
      // Default: newest (owned cards first, then by acquisition or id)
      if (a.isLocked !== b.isLocked) {
        return a.isLocked ? 1 : -1;
      }
      return (b.obtainedAt || "").localeCompare(a.obtainedAt || "");
    });

    return list;
  }, [cardModels, filters]);

  // Handle player collection view
  const openPlayerView = (playerId: string) => {
    const playerObj = playersList.find(p => p.id === playerId);
    if (playerObj) {
      setSelectedPlayerForView(playerObj);
    }
  };

  const selectedPlayerCards = useMemo(() => {
    if (!selectedPlayerForView) return [];
    return cardModels.filter(c => c.playerId === selectedPlayerForView.id);
  }, [cardModels, selectedPlayerForView]);

  return (
    <div className={`w-full space-y-6 text-slate-100 ${className}`}>
      {/* Top Header Tray */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-white/10 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-[1000] tracking-tight uppercase text-white">
              DELTA Album Kolekcjonera
            </h1>
            <p className="text-xs text-slate-400">
              Oficjalne karty zawodników rocznika 2018 • Sezon 2026/27
            </p>
          </div>
        </div>

        {/* Action Tray: Unopened Packs & DP Balance */}
        <div className="flex items-center gap-3">
          {onOpenPackModal && (
            <button
              onClick={onOpenPackModal}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>Otwórz Paczki</span>
              {unopenedPacks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                  {unopenedPacks.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Odśwież kolekcję"
            aria-label="Odśwież dane kolekcji"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 1. Collection Summary Statistics */}
      <CollectionSummary
        totalCards={summaryMetrics.totalCards}
        uniqueOwned={summaryMetrics.uniqueOwned}
        duplicatesCount={summaryMetrics.duplicatesCount}
        favoritesCount={summaryMetrics.favoritesCount}
        totalCardsInCatalog={summaryMetrics.totalCardsInCatalog}
        onSelectFilter={(statusFilter) => setFilters(prev => ({ ...prev, status: statusFilter as any }))}
      />

      {/* 2. Filter & Sort Bar */}
      <CollectionFilterBar
        filters={filters}
        onChange={setFilters}
        playersList={playersList}
        totalResultsCount={filteredAndSortedCards.length}
      />

      {/* 3. Main Card Grid or Empty State */}
      {error ? (
        <CollectionEmptyState
          type="error"
          errorMessage={error}
          onRetry={fetchData}
        />
      ) : filteredAndSortedCards.length === 0 ? (
        <CollectionEmptyState
          type={
            filters.status === "favorites" ? "no_favorites" :
            filters.status === "duplicates" ? "no_duplicates" :
            cardModels.length === 0 ? "empty_collection" : "no_results"
          }
          onResetFilters={() => setFilters({
            search: "",
            status: "all",
            player: "all",
            cardType: "all",
            rarity: "all",
            sort: "newest"
          })}
          onOpenPacks={onOpenPackModal}
        />
      ) : (
        <CardGrid
          cards={filteredAndSortedCards}
          onSelectCard={(card) => setSelectedCard(card)}
          featuredCardId={featuredCardId}
        />
      )}

      {/* 4. Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onToggleFavorite={handleToggleFavorite}
        onSetFeatured={handleSetFeatured}
        isFeatured={selectedCard ? featuredCardId === selectedCard.id : false}
      />

      {/* 5. Player Collection View Modal */}
      <PlayerCollectionView
        player={selectedPlayerForView}
        playerCards={selectedPlayerCards}
        isOpen={!!selectedPlayerForView}
        onClose={() => setSelectedPlayerForView(null)}
        onSelectCard={(card) => {
          setSelectedPlayerForView(null);
          setSelectedCard(card);
        }}
      />
    </div>
  );
}
