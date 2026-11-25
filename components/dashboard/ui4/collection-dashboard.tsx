"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  Award,
  ChevronRight,
  BookOpen,
  Trophy,
  Flame,
  Shield,
  ArrowRight,
  Calendar,
  Lock,
  Clock,
  Star,
  CheckCircle2,
  Copy,
  X,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import dynamic from "next/dynamic";
import DeltaCard from "@/components/cards/DeltaCard";
import CardDetailModal from "@/components/collection/CardDetailModal";
import CollectionFilterBar, { FilterState } from "@/components/collection/CollectionFilterBar";

const CinematicPackExperience = dynamic(
  () => import("@/components/pack-opening-v2/CinematicPackExperience"),
  { ssr: false }
);
import {
  selectPackSessionToOpen,
  reconcileUnopenedPacksAfterOpen,
  buildFallbackPackDefinition
} from "@/lib/cards/packOpeningAlbumBridge";
import {
  subscribeCardEvents,
  FetchSequenceGuard,
  dispatchCollectionUpdated
} from "@/lib/cards/cardSync";
import type { PackDefinition, PackOpeningResult, UserUnopenedPack } from "@/lib/cards/types";
import type { DashboardUI4Model, CollectionCard, UserUnopenedPackItem } from "./types";
import {
  classifyCardCategory,
  mapServerUserCardsToCollectionCards,
  mapServerUnopenedPacks
} from "./adapter";
import { DeltaDesktopSidebar } from "./delta-desktop-sidebar";
import { DeltaMobileBottomNav } from "./delta-mobile-nav";
import {
  DeltaCardModel,
  DELTA_THEME_CONFIGS,
  resolveDeltaCardTheme
} from "@/lib/cards/deltaCardModel";
import { resolveSafePlayerImageUrl } from "@/lib/cards/playerVisuals";

interface CollectionDashboardProps {
  model: DashboardUI4Model;
  openPackFetch?: typeof fetch;
}

export type CollectionTab = "all" | "base" | "matchday" | "special" | "duplicates";

export function toDeltaCardModel(card: CollectionCard): DeltaCardModel {
  const theme = resolveDeltaCardTheme(card.cardType, card.rarity, card.frameTheme);
  const themeConfig = DELTA_THEME_CONFIGS[theme];
  return {
    id: card.id,
    playerId: card.cardId,
    playerName: (card.playerName || card.name || "ZAWODNIK DELTA").toUpperCase(),
    shirtNumber:
      card.playerShirtNumber !== null && card.playerShirtNumber !== undefined
        ? String(card.playerShirtNumber)
        : card.cardNumber !== null && card.cardNumber !== undefined
        ? String(card.cardNumber)
        : null,
    position: card.playerPosition,
    playerImage: card.playerPhotoUrl || card.artworkUrl || null,
    cardType: theme,
    rarity: (card.rarity || "common").toLowerCase() as any,
    frameTheme: card.frameTheme,
    artworkPose: card.artworkPose,
    duplicatesCount: card.duplicatesCount,
    isFavorite: card.isFavorite,
    obtainedAt: card.acquiredAt,
    isOwned: true,
    isLocked: false,
    backData: {
      season: card.season || "2026/27",
      seriesName: themeConfig.label,
      seriesCode: themeConfig.seriesCode,
      cardId: `${themeConfig.seriesCode}-${String(card.cardNumber || 1).padStart(3, "0")}`,
      obtainedAt: card.acquiredAt,
      sourceReason: null,
      lore: null,
      milestoneBadge: null
    }
  };
}

export function filterAndSortCollectionCards(
  allCards: CollectionCard[],
  activeTab: CollectionTab,
  filters: FilterState
): CollectionCard[] {
  let list = [...allCards];

  // 1. Category Tab Filter
  if (activeTab === "base") {
    list = list.filter(c => c.category === "base");
  } else if (activeTab === "matchday") {
    list = list.filter(c => c.category === "matchday");
  } else if (activeTab === "special") {
    list = list.filter(c => c.category === "special");
  } else if (activeTab === "duplicates") {
    list = list.filter(c => c.duplicatesCount > 0 || c.quantity > 1);
  }

  // 2. Search Filter
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.playerName && c.playerName.toLowerCase().includes(q)) ||
      (c.playerShirtNumber !== null && String(c.playerShirtNumber).includes(q)) ||
      (c.cardNumber !== null && String(c.cardNumber).includes(q)) ||
      (c.cardType && c.cardType.toLowerCase().includes(q))
    );
  }

  // 3. Rarity Filter
  if (filters.rarity && filters.rarity !== "all") {
    list = list.filter(c => (c.rarity || "").toLowerCase() === filters.rarity.toLowerCase());
  }

  // 4. Player Filter
  if (filters.player && filters.player !== "all") {
    list = list.filter(c => c.cardId === filters.player);
  }

  // 5. Card Type / Theme Filter
  if (filters.cardType && filters.cardType !== "all") {
    list = list.filter(c => (c.cardType || "").toUpperCase() === filters.cardType.toUpperCase());
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
      const rankA = rarityRank[(a.rarity || "").toLowerCase()] || 0;
      const rankB = rarityRank[(b.rarity || "").toLowerCase()] || 0;
      if (rankB !== rankA) return rankB - rankA;
    } else if (filters.sort === "player") {
      const comp = (a.playerName || "").localeCompare(b.playerName || "", "pl");
      if (comp !== 0) return comp;
    } else if (filters.sort === "duplicates") {
      const comp = (b.duplicatesCount || 0) - (a.duplicatesCount || 0);
      if (comp !== 0) return comp;
    } else if (filters.sort === "card_type") {
      const comp = (a.cardType || "").localeCompare(b.cardType || "");
      if (comp !== 0) return comp;
    }

    // Default: newest by acquiredAt
    return (b.acquiredAt || "").localeCompare(a.acquiredAt || "");
  });

  return list;
}

function formatUnlockedBadgeCount(status: string, count: number): string {
  if (status !== "available" && status !== "empty") {
    return "—";
  }
  if (count === 1) return "1 ODBLOKOWANA";
  if (count >= 2 && count <= 4) return `${count} ODBLOKOWANE`;
  return `${count} ODBLOKOWANYCH`;
}

export function CollectionDashboard({ model, openPackFetch }: CollectionDashboardProps) {
  const {
    profile,
    progress,
    recentCards,
    collectionCards,
    albumProgress,
    recentAchievements,
    nextAction
  } = model;

  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }

  const [activeTab, setActiveTab] = useState<CollectionTab>("all");
  const [mobileSection, setMobileSection] = useState<"album" | "vault" | "series">("album");
  const [selectedCard, setSelectedCard] = useState<DeltaCardModel | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [favoriteCardId, setFavoriteCardId] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);
  const fetchSequenceGuardRef = useRef(new FetchSequenceGuard());

  // Local state for unopened packs allowing dynamic consumption and UI refresh
  const [localUnopenedPacks, setLocalUnopenedPacks] = useState<UserUnopenedPackItem[]>(() => {
    if (albumProgress?.data?.unopenedPacksList && albumProgress.data.unopenedPacksList.length > 0) {
      return albumProgress.data.unopenedPacksList;
    }
    const count = albumProgress?.data?.unopenedPacks ?? 0;
    if (count > 0) {
      return Array.from({ length: count }, (_, i) => ({
        id: `pack-${i + 1}`,
        packTypeId: "standard_pack",
        sourceReason: "reward",
        createdAt: new Date().toISOString()
      }));
    }
    return [];
  });

  // Local state for all cards allowing immediate inclusion of newly drawn cards upon confirmed success
  const [localAllCards, setLocalAllCards] = useState<CollectionCard[]>(() => {
    if (collectionCards?.status === "available" && Array.isArray(collectionCards.data)) {
      return collectionCards.data;
    }
    return [];
  });

  // Local state for recent drops
  const [localRecentCards, setLocalRecentCards] = useState(() => {
    if (recentCards?.status === "available" && Array.isArray(recentCards.data)) {
      return recentCards.data;
    }
    return [];
  });

  // Synchronize local state when server component props (model) update via router.refresh()
  useEffect(() => {
    if (model.collectionCards?.status === "available" && Array.isArray(model.collectionCards.data)) {
      setLocalAllCards(model.collectionCards.data);
    }
  }, [model.collectionCards]);

  useEffect(() => {
    if (model.albumProgress?.data?.unopenedPacksList && Array.isArray(model.albumProgress.data.unopenedPacksList)) {
      setLocalUnopenedPacks(model.albumProgress.data.unopenedPacksList);
    } else if (typeof model.albumProgress?.data?.unopenedPacks === "number") {
      const count = model.albumProgress.data.unopenedPacks;
      setLocalUnopenedPacks(prev => {
        if (prev.length === count) return prev;
        return Array.from({ length: count }, (_, i) => ({
          id: `pack-${i + 1}`,
          packTypeId: "standard_pack",
          sourceReason: "reward",
          createdAt: new Date().toISOString()
        }));
      });
    }
  }, [model.albumProgress]);

  useEffect(() => {
    if (model.recentCards?.status === "available" && Array.isArray(model.recentCards.data)) {
      setLocalRecentCards(model.recentCards.data);
    }
  }, [model.recentCards]);

  // Authoritative server reconciliation engine (DELTA-041G)
  const reconcileCollectionFromServer = useCallback(async () => {
    const seq = fetchSequenceGuardRef.current.startRequest();
    setIsReconciling(true);
    setReconciliationError(null);

    try {
      const fetcher = openPackFetch || fetch;
      const res = await fetcher("/api/cards/collection", {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Guard against out-of-order delayed responses (Requirement D)
      if (!fetchSequenceGuardRef.current.isLatest(seq)) {
        return;
      }

      // Check if data is valid and authorized (Requirement E)
      if (data && typeof data === "object") {
        if (Array.isArray(data.unopenedPacks)) {
          const mappedPacks = mapServerUnopenedPacks(data.unopenedPacks);
          setLocalUnopenedPacks(mappedPacks);
        }
        if (Array.isArray(data.userCards)) {
          const mappedCards = mapServerUserCardsToCollectionCards(data.userCards);
          setLocalAllCards(mappedCards);
          setLocalRecentCards(
            mappedCards.slice(0, 4).map(c => ({
              userCardId: c.id,
              definitionId: c.cardId,
              name: c.name,
              rarity: c.rarity,
              playerName: c.playerName,
              acquiredAt: c.acquiredAt,
              artworkUrl: c.artworkUrl
            }))
          );

          // Notify global event bus with authoritative counts for cross-view sync (Requirement F)
          dispatchCollectionUpdated("server_reconciled", null, {
            remaining_unopened_packs_count: Array.isArray(data.unopenedPacks)
              ? data.unopenedPacks.filter((p: any) => !p.is_opened).length
              : undefined,
            total_cards_count: mappedCards.length
          });
        }
      }

      // Safe trigger of server component refresh
      try {
        router?.refresh();
      } catch {
        // Safe in test environments
      }
    } catch {
      if (fetchSequenceGuardRef.current.isLatest(seq)) {
        setReconciliationError(
          "Nie udało się pobrać aktualnego stanu kolekcji z serwera. Sprawdź połączenie i spróbuj ponownie."
        );
      }
    } finally {
      if (fetchSequenceGuardRef.current.isLatest(seq)) {
        setIsReconciling(false);
      }
    }
  }, [openPackFetch, router]);

  // Active pack opening session
  const [activePackSession, setActivePackSession] = useState<{
    pack: PackDefinition;
    userUnopenedPackId: string | null;
    sessionKey: number;
  } | null>(null);

  const [packOpenToast, setPackOpenToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    player: "all",
    cardType: "all",
    rarity: "all",
    sort: "newest"
  });

  const allCards = localAllCards;

  const playersList = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allCards) {
      if (c.playerName) {
        map.set(c.cardId, c.playerName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allCards]);

  const tabCounts = useMemo(() => {
    return {
      all: allCards.length,
      base: allCards.filter(c => c.category === "base").length,
      matchday: allCards.filter(c => c.category === "matchday").length,
      special: allCards.filter(c => c.category === "special").length,
      duplicates: allCards.filter(c => c.duplicatesCount > 0 || c.quantity > 1).length
    };
  }, [allCards]);

  const filteredAndSortedCards = useMemo(() => {
    return filterAndSortCollectionCards(allCards, activeTab, filters);
  }, [allCards, activeTab, filters]);

  const handleCardClick = (card: CollectionCard) => {
    setSelectedCard(toDeltaCardModel(card));
    setIsDetailModalOpen(true);
  };

  const handleToggleFavorite = (cardId: string, currentFav: boolean) => {
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard({ ...selectedCard, isFavorite: !currentFav });
    }
  };

  const handleSetFavorite = (cardId: string) => {
    setFavoriteCardId(prev => (prev === cardId ? null : cardId));
  };

  useEffect(() => {
    if (!packOpenToast) return;
    const timer = setTimeout(() => {
      setPackOpenToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [packOpenToast]);

  // Synchronize state with cardSync event bus for cross-view reconciliation
  useEffect(() => {
    const unsubscribe = subscribeCardEvents({
      onPackOpened: (payload) => {
        if (payload.consumed_pack_id) {
          setLocalUnopenedPacks(prev => prev.filter(p => p.id !== payload.consumed_pack_id));
        }
        if (typeof payload.remaining_unopened_packs_count === "number" && Number.isFinite(payload.remaining_unopened_packs_count)) {
          const target = Math.max(0, Math.floor(payload.remaining_unopened_packs_count));
          setLocalUnopenedPacks(prev => (prev.length > target ? prev.slice(prev.length - target) : prev));
        }
      },
      onCollectionUpdated: (payload) => {
        if (payload.source === "already_opened_reconciliation") {
          void reconcileCollectionFromServer();
        }
      }
    });
    return unsubscribe;
  }, [reconcileCollectionFromServer]);

  const handleStartPackOpening = (packItem: UserUnopenedPackItem) => {
    const convertedPacks: UserUnopenedPack[] = localUnopenedPacks.map(p => ({
      id: p.id,
      user_id: "",
      pack_type_id: p.packTypeId,
      source_reason: p.sourceReason ?? null,
      is_opened: false,
      opened_at: null,
      created_at: p.createdAt || new Date().toISOString(),
      pack_definition: p.packDefinition ? {
        id: p.packDefinition.id,
        name: p.packDefinition.name,
        description: p.packDefinition.description ?? "Oficjalna paczka kart",
        cards_count: p.packDefinition.cardsCount,
        drop_rates: { common: 60, rare: 30, epic: 8, legendary: 1.8, inferno: 0.2 },
        min_rarity: "common",
        theme: p.packDefinition.theme || "standard",
        image_url: p.packDefinition.imageUrl ?? undefined,
        is_active: true
      } : undefined
    }));

    const session = selectPackSessionToOpen({
      unopenedPacks: convertedPacks,
      packDefinitions: [],
      preferredUnopenedPackId: packItem.id,
      preferredPackTypeId: packItem.packTypeId
    });

    if (session) {
      setActivePackSession({
        pack: session.pack,
        userUnopenedPackId: session.targetUnopenedPack.id,
        sessionKey: Date.now()
      });
    } else {
      const fallbackPack = buildFallbackPackDefinition(packItem.packTypeId, {
        id: packItem.packTypeId,
        name: packItem.packDefinition?.name || "Paczka DELTA",
        cardsCount: packItem.packDefinition?.cardsCount || 4,
        theme: packItem.packDefinition?.theme || "standard"
      });
      setActivePackSession({
        pack: fallbackPack,
        userUnopenedPackId: packItem.id,
        sessionKey: Date.now()
      });
    }
  };

  const handlePackConsumed = (result: PackOpeningResult) => {
    const consumedId = result.consumed_pack_id || activePackSession?.userUnopenedPackId;

    // 1. Reconcile unopened packs
    setLocalUnopenedPacks(prev => {
      let next = prev;
      if (consumedId) {
        next = next.filter(p => p.id !== consumedId);
      }
      if (
        typeof result.remaining_unopened_packs_count === "number" &&
        Number.isFinite(result.remaining_unopened_packs_count)
      ) {
        const target = Math.max(0, Math.floor(result.remaining_unopened_packs_count));
        if (next.length > target) {
          next = next.slice(next.length - target);
        }
      }
      return next;
    });

    // 2. Update collection cards
    if (Array.isArray(result.cards) && result.cards.length > 0) {
      setLocalAllCards(prev => {
        const updated = [...prev];
        for (const item of result.cards) {
          const drawn = item?.card;
          if (!drawn || !drawn.id) continue;
          const existingIdx = updated.findIndex(
            c => c.cardId === drawn.id || (c.name && drawn.card_name && c.name.toLowerCase() === drawn.card_name.toLowerCase())
          );
          if (existingIdx >= 0) {
            // Increment duplicates count
            const existing = updated[existingIdx];
            updated[existingIdx] = {
              ...existing,
              duplicatesCount: (existing.duplicatesCount || 0) + 1,
              quantity: (existing.quantity || 1) + 1
            };
          } else {
            // Add as new unique card
            const newCard: CollectionCard = {
              id: `uc-${drawn.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              cardId: drawn.id,
              name: drawn.card_name || drawn.title || "Karta DELTA",
              title: drawn.title || drawn.card_name || "Karta DELTA",
              category: classifyCardCategory(drawn.card_type),
              rarity: drawn.rarity || "common",
              cardType: String(drawn.card_type || "base").toUpperCase(),
              frameTheme: drawn.frame_theme ?? null,
              artworkPose: drawn.artwork_pose ?? null,
              cardNumber: drawn.card_number ?? null,
              playerShirtNumber: drawn.player?.shirt_number ? Number(drawn.player.shirt_number) || null : null,
              playerName: drawn.player?.display_name || "ZAWODNIK DELTA",
              playerPosition: drawn.player?.position || "POM",
              playerPhotoUrl: drawn.player?.photo_path || drawn.artwork_url || null,
              artworkUrl: drawn.artwork_url || null,
              acquiredAt: new Date().toISOString(),
              quantity: 1,
              duplicatesCount: 0,
              isFavorite: false,
              season: drawn.season || "2026/27"
            };
            updated.unshift(newCard);
          }
        }
        return updated;
      });

      // 3. Update recent drops gallery
      setLocalRecentCards(prev => {
        const newRecent = result.cards.filter(item => item?.card?.id).map(item => ({
          userCardId: `drop-${item.card.id}-${Date.now()}`,
          definitionId: item.card.id,
          name: item.card.card_name || item.card.title || "Karta DELTA",
          rarity: (item.card.rarity || "common").toUpperCase(),
          cardType: String(item.card.card_type || "base").toUpperCase(),
          playerName: item.card.player?.display_name || "ZAWODNIK DELTA",
          playerShirtNumber: item.card.player?.shirt_number ? Number(item.card.player.shirt_number) || null : null,
          acquiredAt: new Date().toISOString(),
          artworkUrl: item.card.artwork_url || null
        }));
        return [...newRecent, ...prev].slice(0, 4);
      });
    }

    // 4. Show success toast
    setPackOpenToast({
      type: "success",
      message: `Pomyślnie otwarto paczkę! Zdobyto ${result.cards?.length || 0} kart.`
    });
  };

  const handleOpenAnother = () => {
    setLocalUnopenedPacks(prev => {
      if (prev.length > 0) {
        const nextPack = prev[0];
        handleStartPackOpening(nextPack);
      } else {
        setActivePackSession(null);
      }
      return prev;
    });
  };

  const tabs: { id: CollectionTab; label: string; count: number }[] = [
    { id: "all", label: "Wszystkie", count: tabCounts.all },
    { id: "base", label: "Podstawowe", count: tabCounts.base },
    { id: "matchday", label: "Meczowe", count: tabCounts.matchday },
    { id: "special", label: "Specjalne", count: tabCounts.special },
    { id: "duplicates", label: "Duplikaty", count: tabCounts.duplicates }
  ];

  const isParent = profile.actorKind === "parent";
  const isRestricted = profile.player.status === "unavailable";
  const playerName = profile.player.data?.displayName || profile.displayName;
  const shirtNumber = profile.player.data?.shirtNumber ?? 7;
  const position = profile.player.data?.position ?? "NAP";
  const levelData = progress.data;
  const albumData = albumProgress.data;

  // Find if active child has an authentic card in the collection
  const activePlayerCard = useMemo(() => {
    if (!profile.player.data?.id && !profile.player.data?.displayName) return null;
    return localAllCards.find(c =>
      (profile.player.data?.id && (c.cardId === profile.player.data.id || c.id === profile.player.data.id)) ||
      (profile.player.data?.displayName && c.playerName && c.playerName.trim().toLowerCase() === profile.player.data.displayName.trim().toLowerCase())
    ) || null;
  }, [localAllCards, profile.player.data]);

  // Safely resolve authorized photo for the active child ONLY (zero leakage of other children)
  const authorizedActivePhoto = useMemo(() => {
    return resolveSafePlayerImageUrl({
      playerName: profile.player.data?.displayName,
      cardName: activePlayerCard?.name,
      artworkUrl: activePlayerCard?.artworkUrl,
      photoPath: activePlayerCard?.playerPhotoUrl
    });
  }, [activePlayerCard, profile.player.data]);

  // Active child's hero card (representing active player, using authorized photo or neutral fallback)
  const eliteCardModel = useMemo(() => ({
    id: activePlayerCard?.id || "card-hero-active-player",
    playerId: profile.player.data?.id || "player-active",
    playerName: playerName.toUpperCase(),
    shirtNumber: shirtNumber !== null ? String(shirtNumber) : "7",
    position: position || "ZAWODNIK",
    cardType: "INFERNO" as const, // Visual showcase frame theme of the DELTA INFERNO collection
    rarity: (activePlayerCard?.rarity ? activePlayerCard.rarity.toLowerCase() : "common") as any, // Authentic rarity from data, never artificially forced to inferno
    playerImage: authorizedActivePhoto || null
  }), [activePlayerCard, authorizedActivePhoto, playerName, shirtNumber, position, profile.player.data]);

  return (
    <div className="e41-root">
      <div className="d4-desktop-shell">
        {/* Desktop Sidebar Navigation */}
        <DeltaDesktopSidebar
          profile={profile}
          activeItem="collection"
          unopenedPacks={localUnopenedPacks.length}
          collectionPercent={albumProgress.status === "available" ? (albumData?.percent ?? null) : null}
          variantTheme="collector"
        />

        <div className="d4-desktop-content pb-24 lg:pb-12">
          {/* Ambient Gold/Inferno Lighting */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] pointer-events-none z-0"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.16) 0%, rgba(220, 38, 38, 0.07) 35%, rgba(5, 11, 20, 0) 70%)"
            }}
          />

          {/* ===================================================================== */}
          {/* 1. TOP APP BAR (Compact on mobile, full identity on desktop)          */}
          {/* ===================================================================== */}
          <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-amber-500/25 px-4 py-2.5">
            <div className="d4-container-desktop flex items-center justify-between gap-2">
              {/* Club & Vault Identity */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
                  <div className="w-full h-full bg-slate-950 rounded-[9px] sm:rounded-[10px] flex items-center justify-center p-1">
                    <Image
                      src="/teamlogos/gm.png"
                      alt="Delta"
                      width={30}
                      height={30}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 sm:gap-2">
                    <span>DELTA INFERNO · VAULT</span>
                    <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      SKARBIEC KART
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-black text-white truncate">
                    Kolekcja Kart i Album Cyfrowy
                  </div>
                  <div className="hidden sm:block text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    Sezon 2026/27 · Rocznik 2018 (U-9)
                  </div>
                </div>
              </div>

              {/* Action back to Home Dashboard */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/preview/dashboard-ui4?view=home"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 hover:text-white transition focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Wróć do pulpitu głównego"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180 text-sky-400 shrink-0" />
                  <span className="hidden sm:inline">DO PULPITU GŁÓWNEGO</span>
                  <span className="sm:hidden">PULPIT</span>
                </Link>

                <div
                  role="status"
                  aria-label={`Dostępne paczki: ${localUnopenedPacks.length}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black shadow-sm select-none e41-num"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{localUnopenedPacks.length} {localUnopenedPacks.length === 1 ? "PACZKA" : "PACZEK"}</span>
                </div>
              </div>
            </div>
          </header>

          {/* ===================================================================== */}
          {/* MAIN COLLECTION GRID (DESKTOP BALANCED 2-LEVEL ARCHITECTURE)          */}
          {/* ===================================================================== */}
          <main className="d4-container-desktop relative z-10">
            {/* Reconciliation Error Banner with Manual Retry (DELTA-041G) */}
            {reconciliationError && (
              <div
                role="alert"
                data-testid="reconciliation-error-banner"
                className="mb-4 p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{reconciliationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void reconcileCollectionFromServer()}
                  disabled={isReconciling}
                  data-testid="retry-reconcile-btn"
                  className="shrink-0 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin" : ""}`} />
                  <span>{isReconciling ? "Odświeżanie..." : "Odśwież stan kolekcji"}</span>
                </button>
              </div>
            )}
            
            {/* Mobile Navigation Tabs (<640px compact navigation, DELTA-042C) */}
            <div
              role="tablist"
              aria-label="Nawigacja sekcji kolekcji"
              data-testid="mobile-collection-tabs"
              className="d4-mobile-tabs sm:hidden flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80 mb-3 shadow-lg"
            >
              <button
                type="button"
                role="tab"
                id="mobile-tab-album"
                aria-selected={mobileSection === "album"}
                data-testid="mobile-tab-album"
                onClick={() => setMobileSection("album")}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  mobileSection === "album"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>ALBUM ({localAllCards.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                id="mobile-tab-vault"
                aria-selected={mobileSection === "vault"}
                data-testid="mobile-tab-vault"
                onClick={() => setMobileSection("vault")}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  mobileSection === "vault"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>SKARBIEC ({localUnopenedPacks.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                id="mobile-tab-series"
                aria-selected={mobileSection === "series"}
                data-testid="mobile-tab-series"
                onClick={() => setMobileSection("series")}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  mobileSection === "series"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>SERIE</span>
              </button>
            </div>
            
            {/* ----------------------------------------------------------------- */}
            {/* ROW 1: 2-COLUMN PRIMARY WORKSPACE (DeltaCard Hero vs Album/Drops) */}
            {/* ----------------------------------------------------------------- */}
            <div className={`d4-dashboard-row-1 ${mobileSection === "album" ? "d4-hide-mobile" : ""}`}>
              
              {/* LEFT SHOWCASE COLUMN: HERO INFERNO CARD & PACK VAULT (5 COLS) */}
              <div className={`lg:col-span-5 flex flex-col ${mobileSection !== "vault" ? "d4-hide-mobile" : ""}`}>
                <section
                  data-testid="e41-collection-section"
                  className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 rounded-3xl p-3.5 sm:p-4 text-center overflow-hidden shadow-2xl flex flex-col items-center"
                >
                  {/* Subtle ambient light */}
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2.5 shadow">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>GŁÓWNA KARTA ZAWODNIKA · STYL INFERNO</span>
                    </div>

                    {/* High-Fidelity Card Renderer */}
                    {albumProgress.status === "available" && recentCards.status === "available" ? (
                      <div className="w-[200px] sm:w-[220px] my-1 transition duration-300 hover:scale-105">
                        <DeltaCard
                          card={eliteCardModel}
                          size="responsive"
                          interactive={true}
                          showFlip={false}
                          className="mx-auto drop-shadow-[0_12px_28px_rgba(245,158,11,0.22)]"
                        />
                      </div>
                    ) : (
                      <div className="w-full py-10 px-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                        <Lock className="w-8 h-8 mx-auto text-amber-500/60" />
                        <div className="text-sm font-bold text-slate-300">
                          Kolekcja kart jest zastrzeżona
                        </div>
                        <div className="text-xs text-slate-500">
                          Dostęp do kart zawodnika wymaga zalogowania na profil członka klubu DELTA.
                        </div>
                      </div>
                    )}

                    {/* Card Identity & Persona Details */}
                    <div className="w-full mt-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/25 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-left">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="font-extrabold text-white">{playerName}</span>
                        <span className="text-slate-400 font-medium">#{shirtNumber} ({position})</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        {activePlayerCard?.rarity ? `${activePlayerCard.rarity.toUpperCase()} · 26/27` : "BAZOWA · 26/27"}
                      </span>
                    </div>

                    {/* Pack Vault Section */}
                    <div data-testid="pack-vault-section" className="mt-3 w-full">
                      {localUnopenedPacks.length === 0 ? (
                        <div
                          data-testid="pack-vault-empty"
                          className="w-full py-3 px-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1"
                        >
                          <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-wide">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>BRAK NOWYCH PACZEK DO OTWARCIA</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Skarbiec paczek jest pusty. Zdobądź nowe paczki przez obecność na treningach, mecze ligowe i wyzwania klubowe.
                          </p>
                        </div>
                      ) : (
                        <div data-testid="pack-vault-list" className="space-y-2">
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>Dostępne Paczki ({localUnopenedPacks.length})</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Wybierz paczkę do otwarcia</span>
                          </div>

                          <div className="max-h-[190px] overflow-y-auto space-y-2 pr-0.5">
                            {localUnopenedPacks.map((packItem) => {
                              const packName = packItem.packDefinition?.name || (
                                packItem.packTypeId.includes("inferno")
                                  ? "Paczka Inferno"
                                  : packItem.packTypeId.includes("legend")
                                  ? "Paczka Legend"
                                  : packItem.packTypeId.includes("matchday")
                                  ? "Paczka Meczowa"
                                  : packItem.packTypeId.includes("gold")
                                  ? "Paczka Gold"
                                  : "Paczka Standardowa DELTA"
                              );
                              const cardsCount = packItem.packDefinition?.cardsCount || 4;
                              const reason = packItem.sourceReason || "Nagroda klubowa";
                              const isOpeningThis = activePackSession?.userUnopenedPackId === packItem.id;

                              return (
                                <div
                                  key={packItem.id}
                                  data-testid={`pack-item-${packItem.id}`}
                                  className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-2.5 hover:border-amber-500/60 transition shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <div className="text-xs font-black text-white truncate">{packName}</div>
                                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                                        <span>{cardsCount} karty</span>
                                        <span>•</span>
                                        <span className="text-amber-400/90">{reason}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    data-testid={`open-pack-btn-${packItem.id}`}
                                    disabled={activePackSession !== null}
                                    onClick={() => handleStartPackOpening(packItem)}
                                    className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-950/50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[36px]"
                                  >
                                    {isOpeningThis ? "OTWIERANIE..." : "OTWÓRZ"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Key Collection Metrics Grid */}
                    <div className="mt-3 w-full grid grid-cols-3 gap-2">
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-base sm:text-lg lg:text-xl font-black text-white e41-num">
                          {localAllCards.length} {albumData?.total != null ? <span className="text-xs text-slate-400 font-normal">/ {albumData.total}</span> : null}
                        </div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mt-0.5 truncate">
                          <span className="sm:hidden">Unikalne</span>
                          <span className="hidden sm:inline">Unikalne Karty {albumData?.total ? `(${Math.round((localAllCards.length / albumData.total) * 100)}%)` : (albumData?.percent != null ? `(${albumData.percent}%)` : "")}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-base sm:text-lg lg:text-xl font-black text-white e41-num">
                          {tabCounts.duplicates}
                        </div>
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide mt-0.5 truncate">
                          <span className="sm:hidden">Duplikaty</span>
                          <span className="hidden sm:inline">Duplikaty w Kolekcji</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-base sm:text-lg lg:text-xl font-black text-white e41-num" data-testid="unopened-packs-count">
                          {localUnopenedPacks.length}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mt-0.5 truncate">
                          <span className="sm:hidden">Paczki</span>
                          <span className="hidden sm:inline">Paczki do Otwarcia</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT GALLERY COLUMN: ALBUM MATRIX & RECENT DROPS (7 COLS) */}
              <div className={`lg:col-span-7 flex flex-col gap-3.5 sm:gap-4 ${mobileSection !== "series" ? "d4-hide-mobile" : ""}`}>
                
                {/* 2A. ALBUM BINDER PROGRESS & SUB-COLLECTIONS */}
                <section className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2.5 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Serie i Sekcje w Albumie Klubowym
                      </h2>
                    </div>
                    <span className="text-xs text-amber-400 font-bold e41-num">
                      {albumData?.percent != null ? `${albumData.percent}% UKOŃCZENIA` : "Mianownik: Oczekuje na publikację sezonu"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(albumData?.series && albumData.series.length > 0 ? albumData.series : [
                      { id: "base", name: "Karty Podstawowe (Base)", category: "base" as const, owned: 0, total: null, percent: null },
                      { id: "matchday", name: "Karty Meczowe (Matchday)", category: "matchday" as const, owned: 0, total: null, percent: null },
                      { id: "inferno", name: "Karty Specjalne (Inferno)", category: "inferno" as const, owned: 0, total: null, percent: null }
                    ]).map((s) => {
                      const colorGradient = s.category === "inferno"
                        ? "from-red-500 to-amber-500"
                        : s.category === "matchday"
                        ? "from-sky-500 to-emerald-400"
                        : "from-amber-500 to-amber-300";
                      return (
                        <div key={s.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-semibold">{s.name}</span>
                            <span className="text-amber-400 font-bold e41-num">
                              {s.owned} {s.total != null ? `/ ${s.total} KART (${s.percent}%)` : "KART W KOLEKCJI"}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className={`bg-gradient-to-r ${colorGradient} h-full rounded-full transition-all duration-500`}
                              style={{ width: s.percent != null ? `${s.percent}%` : `${Math.min(100, Math.max(s.owned > 0 ? 15 : 0, s.owned * 12))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 2B. RECENT CARD DROPS GALLERY (4 cards) */}
                <section className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2.5 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Ostatnio Zdobyte Karty
                      </h2>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      Ostatnie 4 dropy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {localRecentCards.length > 0 ? (
                      localRecentCards.map((card, i) => {
                        const rarity = (card.rarity || "COMMON").toUpperCase();
                        const glow =
                          rarity === "INFERNO"
                            ? "border-red-500/50 bg-red-950/20 text-red-400"
                            : rarity === "GOLD"
                            ? "border-amber-500/50 bg-amber-950/20 text-amber-400"
                            : rarity === "SILVER"
                            ? "border-slate-400/40 bg-slate-800/30 text-slate-300"
                            : "border-slate-700 bg-slate-900/40 text-slate-400";
                        const matching = allCards.find(c => c.id === card.userCardId || c.cardId === card.definitionId);
                        return (
                          <div
                            key={card.userCardId || i}
                            role={matching ? "button" : undefined}
                            tabIndex={matching ? 0 : undefined}
                            onClick={() => matching && handleCardClick(matching)}
                            onKeyDown={(e) => {
                              if (matching && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                handleCardClick(matching);
                              }
                            }}
                            className={`p-3 rounded-2xl border ${glow} flex flex-col items-center text-center transition hover:scale-105 shadow-md backdrop-blur-sm ${matching ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400" : ""}`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 mb-1.5 shadow">
                              <Image
                                src="/teamlogos/gm.png"
                                alt="Crest"
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>
                            <div className="text-xs font-black text-white truncate max-w-full">{card.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold truncate max-w-full">
                              {card.playerName || "ZAWODNIK"}
                            </div>
                            <span className="text-[9px] font-black mt-0.5 e41-num">{rarity}</span>
                          </div>
                        );
                      })
                    ) : recentCards.status === "empty" || localRecentCards.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                        Brak jeszcze kart w kolekcji — otwórz pierwszą paczkę!
                      </div>
                    ) : (
                      <div className="col-span-full py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                        Kolekcja kart niedostępna dla tego profilu.
                      </div>
                    )}
                  </div>
                </section>

              </div>

            </div>

            {/* ----------------------------------------------------------------- */}
            {/* SECTION 2: FULL COLLECTION ALBUM & CATEGORY TABS                */}
            {/* ----------------------------------------------------------------- */}
            <section
              data-testid="e41-full-album-section"
              className={`mt-3 sm:mt-5 bg-slate-900/65 border border-slate-800/85 rounded-3xl p-3 sm:p-5 lg:p-6 backdrop-blur-md shadow-2xl relative overflow-hidden ${
                mobileSection !== "album" ? "d4-hide-mobile" : ""
              }`}
            >
              {/* Header and Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                      <span>Pełny Album Kart Kolekcjonerskich</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                        2D Premium
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Rzeczywiście posiadane karty przypisane do Twojego konta · Sezon 2026/27
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-300">
                    Posiadane: <strong className="text-amber-400 e41-num">{allCards.length}</strong> unikalnych
                  </span>
                  {tabCounts.duplicates > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-sky-950/50 border border-sky-500/30 text-xs font-bold text-sky-300">
                      Duplikaty: <strong className="text-sky-400 e41-num">{tabCounts.duplicates}</strong> kart
                    </span>
                  )}
                </div>
              </div>

              {/* Category Navigation Tabs */}
              <div className="relative mb-4">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        data-testid={`tab-${tab.id}`}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 flex items-center gap-2 border ${
                          isActive
                            ? "bg-gradient-to-r from-amber-500/25 to-amber-600/15 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/40"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black e41-num ${
                            isActive
                              ? "bg-amber-400 text-slate-950"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Discreet scroll cue on mobile */}
                <div
                  className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-900/90 via-slate-900/50 to-transparent sm:hidden flex items-center justify-end pr-0.5 text-slate-400/80"
                  aria-hidden="true"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Filter Bar (Search, Rarity, Sort, Reset) */}
              <div className="mb-5">
                <CollectionFilterBar
                  filters={filters}
                  onChange={setFilters}
                  playersList={playersList}
                  totalResultsCount={filteredAndSortedCards.length}
                  hideStatusTabs={true}
                />
              </div>

              {/* Grid of Owned Cards */}
              {collectionCards?.status === "available" && filteredAndSortedCards.length > 0 ? (
                <div
                  data-testid="e41-album-grid"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 items-start"
                >
                  {filteredAndSortedCards.map((card) => {
                    const cardModel = toDeltaCardModel(card);
                    const isFavorite = favoriteCardId === card.id || favoriteCardId === card.cardId;
                    return (
                      <div
                        key={card.id}
                        data-testid={`card-item-${card.id}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Karta ${card.name}, ${card.quantity} ${card.quantity === 1 ? "egzemplarz" : "egzemplarze"}${isFavorite ? " (ulubiona w tej sesji)" : ""}. Naciśnij Enter lub kliknij, aby otworzyć szczegóły.`}
                        onClick={() => handleCardClick(card)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCardClick(card);
                          }
                        }}
                        className="group relative flex flex-col items-center bg-slate-950/40 border border-slate-800/80 hover:border-amber-500/60 rounded-2xl p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:transform-none shadow-md hover:shadow-amber-950/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        {/* Favorite Card Ribbon (Session only) */}
                        {isFavorite && (
                          <div className="absolute -top-2.5 z-30 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-lg flex items-center gap-1 motion-reduce:animate-none">
                            <span>⭐</span>
                            <span>ULUBIONA</span>
                          </div>
                        )}

                        {/* 2:3 Card Container */}
                        <div className="w-full relative aspect-[2/3] max-w-[220px]">
                          <DeltaCard
                            card={cardModel}
                            size="responsive"
                            interactive={true}
                            showFlip={false}
                          />
                        </div>

                        {/* Card Meta & Copies indicator */}
                        <div className="w-full mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          {card.quantity > 1 ? (
                            <span
                              className="px-2 py-0.5 rounded-full font-black text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 e41-num"
                              title={`Posiadasz ${card.quantity} egzemplarze tej karty`}
                            >
                              x{card.quantity} ({card.duplicatesCount} {card.duplicatesCount === 1 ? "duplikat" : "duplikaty"})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                              1 egzemplarz
                            </span>
                          )}

                          <span className="text-[9px] font-bold uppercase text-slate-500 truncate max-w-[45%]">
                            {card.category === "base"
                              ? "Podstawowa"
                              : card.category === "matchday"
                              ? "Meczowa"
                              : "Specjalna"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : collectionCards?.status === "available" && filteredAndSortedCards.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-3">
                  <Layers className="w-8 h-8 mx-auto text-slate-600" />
                  <div className="text-sm font-bold text-slate-300">
                    Brak kart spełniających wybrane kryteria
                  </div>
                  <div className="text-xs text-slate-500">
                    Spróbuj zmienić wyszukiwaną frazę lub zresetować filtry rzadkości i serii.
                  </div>
                  <button
                    onClick={() => {
                      setFilters({
                        search: "",
                        status: "all",
                        player: "all",
                        cardType: "all",
                        rarity: "all",
                        sort: "newest"
                      });
                      setActiveTab("all");
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-amber-500/30 transition shadow cursor-pointer"
                  >
                    Zresetuj filtry
                  </button>
                </div>
              ) : collectionCards?.status === "empty" ? (
                <div className="py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-amber-500/60" />
                  <div className="text-sm font-bold text-slate-300">
                    Brak kart w Twojej kolekcji
                  </div>
                  <div className="text-xs text-slate-500">
                    Twoja kolekcja kart jest obecnie pusta. Karty są zdobywane za mecze, treningi i wydarzenia klubowe.
                  </div>
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
                  <Lock className="w-8 h-8 mx-auto text-amber-500/60" />
                  <div className="text-sm font-bold text-slate-300">
                    Kolekcja kart jest zastrzeżona
                  </div>
                  <div className="text-xs text-slate-500">
                    {collectionCards?.reason === "not_authorized"
                      ? "Brak autoryzacji do podglądu kolekcji tego konta."
                      : "Dane kolekcji nie zostały jeszcze załadowane."}
                  </div>
                </div>
              )}
            </section>

            {/* ----------------------------------------------------------------- */}
            {/* ROW 2: SECONDARY WORKSPACE (Badges & Trophies vs Match Pack Radar)*/}
            {/* ----------------------------------------------------------------- */}
            <div className="d4-dashboard-row-2">
              
              {/* 3A. COLLECTOR ACHIEVEMENTS & TROPHIES (6 COLS) */}
              <div className="lg:col-span-6 flex flex-col">
                <section className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-4 sm:p-5 backdrop-blur-md h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Odznaki i Osiągnięcia Kolekcjonerskie
                      </h2>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                      {formatUnlockedBadgeCount(recentAchievements.status, recentAchievements.data?.length ?? 0)}
                    </span>
                  </div>

                  {recentAchievements.status === "available" && recentAchievements.data && recentAchievements.data.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {recentAchievements.data.map((ach) => (
                        <div key={ach.id} className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/30 flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Star className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{ach.name}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold">{ach.description || "Odblokowane ✓"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentAchievements.status === "available" || recentAchievements.status === "empty" ? (
                    <div className="py-6 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        Brak zdobytych odznak w tym sezonie
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Odznaki przyznawane są za obecność na treningach, mecze i postawę sportową.
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        {recentAchievements.reason === "no_linked_player"
                          ? "Brak powiązanego profilu zawodnika"
                          : recentAchievements.reason === "not_authorized"
                          ? "Brak uprawnień do profilu zawodnika"
                          : "Osiągnięcia niedostępne"}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* 3B. MATCHDAY PACK DROP RADAR (6 COLS) */}
              <div className="lg:col-span-6 flex flex-col">
                <section className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-sky-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md h-full flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Radar Wydarzeń Sportowych
                      </h2>
                    </div>
                    <span className="text-xs text-sky-400 font-bold uppercase">
                      {nextAction.status === "available" && nextAction.data
                        ? (nextAction.data.countdown || "ZAPLANOWANE")
                        : "BRAK WYDARZEŃ"}
                    </span>
                  </div>

                  {nextAction.status === "available" && nextAction.data ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">{nextAction.data.title}</div>
                          <div className="text-[11px] text-slate-300">
                            {nextAction.data.kind === "match" ? "Najbliższy mecz ligowy: " : "Najbliższy trening: "}
                            <strong className="text-amber-400">{nextAction.data.location || "Centrum DELTA"}</strong>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/preview/dashboard-ui4?view=home"
                        className="e41-btn-action e41-btn-primary text-xs shrink-0 py-2.5 px-4 min-h-[40px] font-bold"
                      >
                        <span>Szczegóły wydarzenia →</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-6 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        Brak zaplanowanych meczów ani treningów w najbliższym czasie.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Paczki meczowe zostaną przydzielone po potwierdzeniu obecności na oficjalnych rozgrywkach.
                      </p>
                    </div>
                  )}
                </section>
              </div>

            </div>

          </main>

          {/* Mobile Bottom Navigation */}
          <DeltaMobileBottomNav
            unopenedPacks={localUnopenedPacks.length}
            activeItem="collection"
          />

          {/* Card Detail Inspection Modal */}
          <CardDetailModal
            card={selectedCard}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            onToggleFavorite={handleToggleFavorite}
            onSetFeatured={handleSetFavorite}
            isFeatured={selectedCard ? (favoriteCardId === selectedCard.id || favoriteCardId === selectedCard.playerId) : false}
          />

          {/* Cinematic Pack Experience Stage */}
          {activePackSession && (
            <CinematicPackExperience
              pack={activePackSession.pack}
              userUnopenedPackId={activePackSession.userUnopenedPackId}
              sessionKey={activePackSession.sessionKey}
              unopenedCount={localUnopenedPacks.length}
              autoStart={false}
              enableStadiumFilm={true}
              openPackFetch={openPackFetch}
              onPackConsumed={handlePackConsumed}
              onClose={() => setActivePackSession(null)}
              onOpenAnother={handleOpenAnother}
            />
          )}

          {/* Toast feedback notification */}
          {packOpenToast && (
            <div
              role="status"
              aria-live="polite"
              className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 max-w-sm backdrop-blur-md transition-all ${
                packOpenToast.type === "success"
                  ? "bg-slate-900/95 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-900/95 border-red-500/50 text-red-300"
              }`}
            >
              {packOpenToast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div className="text-xs font-bold leading-snug flex-1">
                {packOpenToast.message}
              </div>
              <button
                type="button"
                onClick={() => setPackOpenToast(null)}
                aria-label="Zamknij powiadomienie"
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollectionDashboard;
