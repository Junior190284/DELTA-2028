"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Sparkles, 
  Gift, 
  Coins, 
  Layers, 
  Search, 
  Filter, 
  Flame, 
  Crown, 
  RefreshCw,
  Trophy,
  Award,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowLeft,
  User,
  Star,
  Users,
  ArrowLeftRight,
  Swords,
  Shield,
  Target,
  PenTool,
  Play,
  Tv,
  Check,
  Zap,
  Info,
  SlidersHorizontal,
  Bookmark,
  ShoppingCart,
  RotateCw
} from "lucide-react";
import { 
  CardDefinition, 
  CardRarity, 
  UserCard, 
  UserUnopenedPack, 
  PackDefinition, 
  CardLayoutConfig, 
  RARITY_CONFIG, 
  getPackImageUrl, 
  preloadAllCardThemes, 
  preloadCardAssets 
} from "@/lib/cards/types";
import { PACK_PRICES } from "@/lib/economy/security";
import { cardSound } from "@/lib/cards/audio";
import { FetchSequenceGuard, createDebouncedRevalidator } from "@/lib/cards/cardSync";
import {
  reconcileUnopenedPacksAfterOpen,
  selectPackSessionToOpen
} from "@/lib/cards/packOpeningAlbumBridge";
import type { PackOpeningResult } from "@/lib/cards/types";
import { DeltaCard, DeltaButton, DeltaBadge } from "@/components/ui";
import CollectibleCard3D from "./CollectibleCard3D";
import CinematicPackExperience from "./pack-opening-v2/CinematicPackExperience";
import CardUnlockCinematicModal from "./CardUnlockCinematicModal";
import DailyInfernoSpin from "./DailyInfernoSpin";
import SquadBuilder3D from "./SquadBuilder3D";
import DeltaSquadBuilderModal from "./DeltaSquadBuilderModal";
import DeltaPaniniChallengesModal from "./DeltaPaniniChallengesModal";
import DeltaCardLegendModal from "./DeltaCardLegendModal";
import CardBattleCompareModal from "./CardBattleCompareModal";
import DeltaTradeHubModal from "./DeltaTradeHubModal";
import AchievementsModal from "./AchievementsModal";
import DeltaSkillMiniGamesModal from "./DeltaSkillMiniGamesModal";
import DeltaSBCModal from "./DeltaSBCModal";
import BroadcastLeaderboard from "./BroadcastLeaderboard";
import PlayerVideoHighlightModal from "./PlayerVideoHighlightModal";
import DigitalSignatureModal from "./DigitalSignatureModal";
import PlayerCardsCircular3DCarousel from "./PlayerCardsCircular3DCarousel";
import Panini3DAlbumBinder from "./Panini3DAlbumBinder";

import "@/styles/delta-inferno-collection.css";

// 5 Standard Booster Packs Configuration (Authoritative Scenario B Prices)
const OFFICIAL_BOOSTER_PACKS: {
  id: string;
  name: string;
  cardsCount: number;
  priceDp: number;
  image: string;
  theme: "standard" | "matchday" | "gold" | "inferno" | "legend";
  guaranteeText: string;
  badgeLabel: string;
  description: string;
}[] = [
  {
    id: "standard_pack",
    name: "Paczka Standardowa",
    cardsCount: 3,
    priceDp: PACK_PRICES.standard_pack,
    image: "/assets/packs/pack-standard.jpg",
    theme: "standard",
    guaranteeText: "3 losowe karty zawodników DELTA",
    badgeLabel: "STANDARD",
    description: "Podstawowy pakiet kolekcjonerski zawierający 3 karty zawodników rocznika 2018."
  },
  {
    id: "matchday_booster",
    name: "Matchday Booster",
    cardsCount: 4,
    priceDp: PACK_PRICES.matchday_booster,
    image: "/assets/packs/pack-matchday.jpg",
    theme: "matchday",
    guaranteeText: "Min. 1 karta Matchday Hero",
    badgeLabel: "MATCHDAY",
    description: "Specjalny booster meczowy nagradzający ligowe występy i determinację na boisku."
  },
  {
    id: "gold_booster",
    name: "Gold Booster",
    cardsCount: 5,
    priceDp: PACK_PRICES.gold_booster,
    image: "/assets/packs/pack-gold.jpg",
    theme: "gold",
    guaranteeText: "Min. 1 karta Gold Master (wysoki OVR)",
    badgeLabel: "GOLD SPECIAL",
    description: "Ekskluzywny booster z gwarancją złotej karty elity o wysokich statystykach OVR."
  },
  {
    id: "inferno_booster",
    name: "Inferno Booster",
    cardsCount: 5,
    priceDp: PACK_PRICES.inferno_booster,
    image: "/assets/packs/pack-inferno.jpg",
    theme: "inferno",
    guaranteeText: "Gwarantowana karta Inferno z płomieniami",
    badgeLabel: "INFERNO EDYCYJNY",
    description: "Ognisty booster premium zawierający najgorętsze karty w unikalnej oprawie INFERNO."
  },
  {
    id: "legend_pack",
    name: "Legend Pack",
    cardsCount: 6,
    priceDp: PACK_PRICES.legend_pack,
    image: "/assets/packs/pack-legend.jpg",
    theme: "legend",
    guaranteeText: "Gwarantowana Karta Legendy & Ikony",
    badgeLabel: "LEGEND COLLECTOR",
    description: "Najwyższy poziom kolekcjonerski. Gwarantuje 6 elitarnych kart z legendarnej serii."
  }
];

import { getRarityTier, type RarityTier } from "@/lib/cards/rarityTiers";
export { getRarityTier, type RarityTier };

interface ActivePackSession {
  pack: PackDefinition;
  userUnopenedPackId: string | null;
  sessionKey: number;
  hasConsumedCurrentPack: boolean;
  lastOpenResult: PackOpeningResult | null;
}

export interface DeltaCollectionAlbumProps {
  currentUserId?: string;
  players?: { id: string; display_name: string; shirt_number: string | null; position: string | null; photo_path?: string | null }[];
  matches?: any[];
  onOpenPlayerProfile?: (playerId: string) => void;
}

export default function DeltaCollectionAlbum({
  currentUserId,
  players = [],
  matches = [],
  onOpenPlayerProfile
}: DeltaCollectionAlbumProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const collectionFetchGuardRef = useRef(new FetchSequenceGuard());
  const packSessionSeqRef = useRef(0);

  const [allCards, setAllCards] = useState<CardDefinition[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [unopenedPacks, setUnopenedPacks] = useState<UserUnopenedPack[]>([]);
  const [packDefinitions, setPackDefinitions] = useState<PackDefinition[]>([]);
  const [deltaPoints, setDeltaPoints] = useState(0);
  const [realPlayers, setRealPlayers] = useState<any[]>(players || []);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number; assists: number; attendancePercent: number; mvp: number }>>({});
  const [cardLayoutsMap, setCardLayoutsMap] = useState<Record<string, Partial<CardLayoutConfig>>>({});
  const [featuredCardId, setFeaturedCardId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View Modes: "collection2" (Main Grid & Album), "shop" (Dedicated Booster Shop), "panini" (Binder 3D), "roster" (Player Albums)
  const [activeViewTab, setActiveViewTab] = useState<"collection2" | "shop" | "panini" | "roster">("collection2");
  const [paniniRewardClaimed, setPaniniRewardClaimed] = useState(false);

  // Active Player Album View (null = none, playerId = show carousel)
  const [selectedAlbumPlayerId, setSelectedAlbumPlayerId] = useState<string | null>(null);

  // Filters & State for Cards Grid
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>("all");
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedOwnershipFilter, setSelectedOwnershipFilter] = useState<"all" | "owned" | "missing" | "new" | "duplicates">("all");
  const [sortBy, setSortBy] = useState<"newest" | "rarity_desc" | "player_asc" | "ovr_desc">("newest");
  
  // Modals
  const [inspectCard, setInspectCard] = useState<{ card: CardDefinition; userCard: UserCard | null } | null>(null);
  const [inspectFlipped, setInspectFlipped] = useState(false);
  const [activePackSession, setActivePackSession] = useState<ActivePackSession | null>(null);
  const isOpeningPack = Boolean(activePackSession);
  const [cinematicCardToUnlock, setCinematicCardToUnlock] = useState<CardDefinition | null>(null);
  const [showDailySpin, setShowDailySpin] = useState(false);
  const [showSquadBuilder, setShowSquadBuilder] = useState(false);
  const [showPaniniChallenges, setShowPaniniChallenges] = useState(false);
  const [showCardLegend, setShowCardLegend] = useState(false);
  const [showTradeHub, setShowTradeHub] = useState(false);
  const [showBattleCompare, setShowBattleCompare] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSkillGames, setShowSkillGames] = useState(false);
  const [showSBC, setShowSBC] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [videoHighlightCard, setVideoHighlightCard] = useState<CardDefinition | null>(null);
  const [signatureCard, setSignatureCard] = useState<CardDefinition | null>(null);

  // Load featured card from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("delta_featured_card_id");
      if (saved) setFeaturedCardId(saved);
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const launchPackFromUnopened = (
    preferredPackTypeId?: string | null,
    preferredUnopenedPackId?: string | null,
    allowFallbackToAny = true
  ) => {
    if (activePackSession) return;
    const selected = selectPackSessionToOpen({
      unopenedPacks,
      packDefinitions,
      preferredPackTypeId,
      preferredUnopenedPackId,
      allowFallbackToAny,
      fallbackCatalog: OFFICIAL_BOOSTER_PACKS
    });
    if (!selected) {
      showToast("Brak nieotwartych paczek. Kup paczkę w sklepie lub zdobądź za aktywność!");
      return;
    }
    packSessionSeqRef.current += 1;
    setActivePackSession({
      pack: selected.pack,
      userUnopenedPackId: selected.targetUnopenedPack.id,
      sessionKey: packSessionSeqRef.current,
      hasConsumedCurrentPack: false,
      lastOpenResult: null
    });
  };

  const launchGrantedPack = (pack: PackDefinition) => {
    if (activePackSession) return;
    packSessionSeqRef.current += 1;
    setActivePackSession({
      pack,
      userUnopenedPackId: null,
      sessionKey: packSessionSeqRef.current,
      hasConsumedCurrentPack: false,
      lastOpenResult: null
    });
  };

  const getLayoutForCard = (card: CardDefinition): Partial<CardLayoutConfig> | undefined => {
    if (!card.player_id) return undefined;
    const templateKey = (card as any).template_override || card.frame_theme || card.card_type || "default";
    return cardLayoutsMap[`${card.player_id}_${templateKey}`] || cardLayoutsMap[`${card.player_id}_default`];
  };

  const getCardUnlockCondition = (card: CardDefinition): { condition: string; packType: string; achievement: string } => {
    const rarity = (card.rarity || "").toLowerCase();
    const type = (card.card_type || "").toLowerCase();

    if (rarity === "inferno" || type.includes("inferno")) {
      return {
        condition: "Odblokuj poprzez otwarcie paczki Inferno Booster lub osiągnięcie serii treningowej.",
        packType: "Inferno Booster (500 DP)",
        achievement: "🔥 Płonący Duch DELTY"
      };
    }
    if (rarity === "legendary" || rarity === "legend") {
      return {
        condition: "Zdobądź w paczce Legend Pack lub ukończ wyzwanie Hall of Fame.",
        packType: "Legend Pack (750 DP)",
        achievement: "👑 Legenda Górnego Mokotowa"
      };
    }
    if (rarity === "gold" || type.includes("mvp")) {
      return {
        condition: "Wypada z Gold Boostera lub nagród MVP za ligowe mecze MZPN.",
        packType: "Gold Booster (350 DP)",
        achievement: "⭐ Złoty Mistrz Sezonu"
      };
    }
    if (rarity === "matchday") {
      return {
        condition: "Zdobądź w Matchday Boosterze lub za 100% frekwencję meczową.",
        packType: "Matchday Booster (200 DP)",
        achievement: "⚡ Wojownik Dnia Meczowego"
      };
    }
    return {
      condition: "Dostępna w paczce Standardowej oraz za punkty DP i obecności treningowe.",
      packType: "Paczka Standardowa (100 DP)",
      achievement: "⚽ Pierwszy Krok w Klubie"
    };
  };

  // Fetch collection data from API
  const fetchCollection = async (silent = false) => {
    const requestSeq = collectionFetchGuardRef.current.startRequest();
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await fetch("/api/cards/collection");
      if (res.ok) {
        const data = await res.json();
        if (!collectionFetchGuardRef.current.isLatest(requestSeq)) {
          return;
        }
        setAllCards(data.allCards || []);
        setUserCards(data.userCards || []);
        setUnopenedPacks(data.unopenedPacks || []);
        setPackDefinitions(data.packDefinitions || []);
        setDeltaPoints(data.deltaPoints || 0);
        if (data.players && data.players.length > 0) setRealPlayers(data.players);
        if (data.playerStats) setPlayerStats(data.playerStats);

        // Build Layouts Map from DB and LocalStorage
        const layouts: Record<string, Partial<CardLayoutConfig>> = {};
        if (data.cardLayouts && Array.isArray(data.cardLayouts)) {
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
        }
        try {
          const cached = localStorage.getItem("delta_card_layouts_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            Object.assign(layouts, parsed);
          }
        } catch {}
        setCardLayoutsMap(layouts);
      }
    } catch (e) {
      console.error("Error loading collection:", e);
    } finally {
      if (!silent && collectionFetchGuardRef.current.isLatest(requestSeq)) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    preloadAllCardThemes();
    fetchCollection();

    fetch("/api/cards/sync-rewards", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.granted && data.granted.length > 0) {
          fetchCollection(true);
        }
      })
      .catch(() => {});

    const handlePackSync = createDebouncedRevalidator(() => fetchCollection(true), 120);
    window.addEventListener("delta:pack-opened", handlePackSync);
    window.addEventListener("delta:collection-updated", handlePackSync);
    return () => {
      window.removeEventListener("delta:pack-opened", handlePackSync);
      window.removeEventListener("delta:collection-updated", handlePackSync);
    };
  }, []);

  // Sync automated activity rewards
  const handleSyncRewards = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      const res = await fetch("/api/cards/sync-rewards", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.granted && data.granted.length > 0) {
          showToast(`🎉 Otrzymano ${data.granted.length} nowe paczki za ostatnią aktywność meczową!`);
        } else {
          showToast("✨ Wszystkie nagrody za mecze i treningi są aktualne!");
        }
        await fetchCollection();
      }
    } catch (e) {
      console.error("Error syncing rewards:", e);
    } finally {
      setSyncing(false);
    }
  };

  // Buy pack with Delta Points (FAZA 3 — Client DP check, zero API call on shortfall)
  const handleBuyPack = async (packId: string) => {
    if (buyingPackId || isOpeningPack) return;
    const packObj = OFFICIAL_BOOSTER_PACKS.find(p => p.id === packId);
    const price = packObj?.priceDp || 100;

    if (deltaPoints < price) {
      showToast(`⚠️ Niewystarczająca liczba Punktów DELTA. Paczka "${packObj?.name || packId}" kosztuje ${price} DP, a posiadasz ${deltaPoints} DP (brakuje ${price - deltaPoints} DP).`);
      return;
    }

    try {
      setBuyingPackId(packId);
      const res = await fetch("/api/cards/buy-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_type_id: packId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Błąd zakupu paczki");
      }
      if (data.remainingPoints !== undefined) {
        setDeltaPoints(data.remainingPoints);
      }
      cardSound.playPurchase();
      showToast(`🎁 Pomyślnie zakupiono paczkę "${packObj?.name || 'Booster'}"!`);
      await fetchCollection(true);
    } catch (e: any) {
      showToast(`❌ ${e.message || "Nie udało się kupić paczki."}`);
    } finally {
      setBuyingPackId(null);
    }
  };

  // Maps & Stats Calculations
  const ownedCardsMap = useMemo(() => {
    const map = new Map<string, UserCard>();
    userCards.forEach(uc => {
      const cardId = uc.card_id || uc.card_definition?.id;
      if (cardId) {
        map.set(cardId, uc);
      }
    });
    return map;
  }, [userCards]);

  const uniqueOwnedCount = useMemo(() => {
    return ownedCardsMap.size;
  }, [ownedCardsMap]);

  const totalCardsCount = useMemo(() => {
    return allCards.length || 1;
  }, [allCards]);

  const totalDuplicatesCount = useMemo(() => {
    return userCards.reduce((acc, curr) => acc + (curr.duplicates_count || 0), 0);
  }, [userCards]);

  const completionPercentage = useMemo(() => {
    if (totalCardsCount === 0) return 0;
    return Math.min(100, Math.round((uniqueOwnedCount / totalCardsCount) * 100));
  }, [uniqueOwnedCount, totalCardsCount]);

  // Featured / Last Acquired
  const lastAcquiredItem = useMemo(() => {
    if (userCards.length === 0) return null;
    const sorted = [...userCards].sort((a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime());
    const latest = sorted[0];
    const targetCardId = latest.card_id || latest.card_definition?.id;
    const cardDef = allCards.find(c => c.id === targetCardId);
    return cardDef ? { card: cardDef, userCard: latest } : null;
  }, [userCards, allCards]);

  const recentlyAcquiredList = useMemo(() => {
    if (userCards.length === 0) return [];
    const sorted = [...userCards].sort((a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime());
    const top6 = sorted.slice(0, 6);
    return top6.map(uc => {
      const targetCardId = uc.card_id || uc.card_definition?.id;
      const card = allCards.find(c => c.id === targetCardId);
      return card ? { card, userCard: uc } : null;
    }).filter(Boolean) as { card: CardDefinition; userCard: UserCard }[];
  }, [userCards, allCards]);

  const missingCardsList = useMemo(() => {
    return allCards.filter(c => !ownedCardsMap.has(c.id));
  }, [allCards, ownedCardsMap]);

  // Filtered Cards for Main Grid
  const filteredGridCards = useMemo(() => {
    let result = [...allCards];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const pName = (c.player?.display_name || "").toLowerCase();
        const cName = (c.card_name || "").toLowerCase();
        const rName = (c.rarity || "").toLowerCase();
        const tName = (c.card_type || "").toLowerCase();
        return pName.includes(q) || cName.includes(q) || rName.includes(q) || tName.includes(q);
      });
    }

    if (selectedPlayerFilter !== "all") {
      result = result.filter(c => c.player_id === selectedPlayerFilter);
    }

    if (selectedRarityFilter !== "all") {
      result = result.filter(c => {
        const tier = getRarityTier(c);
        return tier.id === selectedRarityFilter;
      });
    }

    if (selectedTypeFilter !== "all") {
      result = result.filter(c => c.card_type === selectedTypeFilter);
    }

    if (selectedOwnershipFilter === "owned") {
      result = result.filter(c => ownedCardsMap.has(c.id));
    } else if (selectedOwnershipFilter === "missing") {
      result = result.filter(c => !ownedCardsMap.has(c.id));
    } else if (selectedOwnershipFilter === "duplicates") {
      result = result.filter(c => {
        const uc = ownedCardsMap.get(c.id);
        return uc && uc.duplicates_count > 0;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        const uca = ownedCardsMap.get(a.id);
        const ucb = ownedCardsMap.get(b.id);
        if (uca && !ucb) return -1;
        if (!uca && ucb) return 1;
        if (uca && ucb) return new Date(ucb.acquired_at).getTime() - new Date(uca.acquired_at).getTime();
        return (a.card_number || 0) - (b.card_number || 0);
      }
      if (sortBy === "rarity_desc") {
        const rarityWeights: Record<string, number> = { legend: 6, inferno: 5, gold: 4, matchday: 3, rare: 2, common: 1 };
        const wA = rarityWeights[getRarityTier(a).id] || 0;
        const wB = rarityWeights[getRarityTier(b).id] || 0;
        return wB - wA;
      }
      if (sortBy === "ovr_desc") {
        const ovrA = (a as any).attributes?.ovr || 70;
        const ovrB = (b as any).attributes?.ovr || 70;
        return ovrB - ovrA;
      }
      if (sortBy === "player_asc") {
        const nameA = a.player?.display_name || a.card_name;
        const nameB = b.player?.display_name || b.card_name;
        return nameA.localeCompare(nameB, "pl");
      }
      return 0;
    });

    return result;
  }, [allCards, ownedCardsMap, searchQuery, selectedPlayerFilter, selectedRarityFilter, selectedTypeFilter, selectedOwnershipFilter, sortBy]);

  const handleSetFeaturedCard = (cardId: string) => {
    try {
      localStorage.setItem("delta_featured_card_id", cardId);
      setFeaturedCardId(cardId);
      cardSound.playWalkoutFanfare();
      showToast("⭐ Karta została ustawiona jako Twoja wyróżniona wizytówka!");
    } catch {}
  };

  const playerAlbums = useMemo(() => {
    const map = new Map<string, {
      player: any;
      cards: CardDefinition[];
      ownedCount: number;
      topOwnedCard: CardDefinition | null;
      completionRate: number;
    }>();

    realPlayers.forEach(p => {
      map.set(p.id, {
        player: p,
        cards: [],
        ownedCount: 0,
        topOwnedCard: null,
        completionRate: 0
      });
    });

    allCards.forEach(card => {
      const pid = card.player_id;
      if (!map.has(pid)) {
        map.set(pid, {
          player: card.player || { id: pid, display_name: "Zawodnik DELTA", shirt_number: null, position: null },
          cards: [],
          ownedCount: 0,
          topOwnedCard: null,
          completionRate: 0
        });
      }
      const entry = map.get(pid)!;
      entry.cards.push(card);
      if (ownedCardsMap.has(card.id)) {
        entry.ownedCount++;
        if (!entry.topOwnedCard) {
          entry.topOwnedCard = card;
        }
      }
    });

    const list = Array.from(map.values()).filter(a => a.cards.length > 0);
    list.forEach(a => {
      a.completionRate = a.cards.length > 0 ? Math.round((a.ownedCount / a.cards.length) * 100) : 0;
    });

    return list;
  }, [allCards, ownedCardsMap, realPlayers]);

  const currentAlbum = useMemo(() => {
    if (!selectedAlbumPlayerId) return null;
    return playerAlbums.find(a => a.player.id === selectedAlbumPlayerId) || null;
  }, [playerAlbums, selectedAlbumPlayerId]);

  return (
    <section className="section v8-section-page delta-collection-20-page w-full min-w-0 max-w-full space-y-5 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100000] p-3 px-4 rounded-xl bg-gradient-to-r from-[#141824] to-[#0a0d14] border border-amber-400/40 text-slate-100 text-xs font-bold shadow-2xl flex items-center gap-2 animate-fadeIn backdrop-blur-md">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GŁÓWNY PANEL PODSUMOWANIA (INFERNO 3D HERO COMMAND PANEL)               */}
      {/* ========================================================================= */}
      <div className="delta-collection-hero-panel w-full">
        <div className="delta-collection-hero-glow" />

        {/* Branding header & Resource Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="relative shrink-0 rounded-2xl bg-gradient-to-br from-red-600 via-amber-500 to-red-600 p-1 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center"
              style={{ width: "52px", height: "52px", minWidth: "52px", minHeight: "52px" }}
            >
              <img
                src="/teamlogos/gm.png"
                alt="DELTA Warszawa"
                style={{ width: "38px", height: "38px", objectFit: "contain" }}
                className="relative z-10"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  DELTA <span className="text-amber-400">INFERNO 3D</span>
                </span>
                <DeltaBadge variant="crimson" size="sm" dot>
                  Kolekcja 2026/27
                </DeltaBadge>
                <DeltaBadge variant="gold" size="sm">
                  Górny Mokotów
                </DeltaBadge>
              </div>
              <p className="text-xs text-slate-400 font-medium m-0 truncate max-w-xl">
                Oficjalny album kart 3D zawodników, gablota pucharowa i skarbiec paczek boosterów.
              </p>
            </div>
          </div>

          {/* Points Balance & Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* DP Balance Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090c14]/90 border border-amber-400/35 text-xs font-bold shadow-inner">
              <Coins size={16} className="text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SKARBIEC</span>
                <strong className="text-xs font-black text-amber-300 font-mono">{deltaPoints} DP</strong>
              </div>
            </div>

            {/* Unopened Packs Quick Pill */}
            {unopenedPacks.length > 0 && (
              <button
                type="button"
                disabled={isOpeningPack}
                onClick={() => launchPackFromUnopened()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-xs cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] min-h-[44px]"
                title="Otwórz pierwszą z oczekujących paczek"
              >
                <Gift size={15} className="animate-bounce" />
                <span>{unopenedPacks.length} PACZEK</span>
              </button>
            )}

            {/* Quick Wheel Button */}
            <DeltaButton
              variant="outline"
              size="sm"
              touchTarget={true}
              onClick={() => setShowDailySpin(true)}
              className="text-xs font-bold text-amber-300 border-amber-400/30"
              title="Zakręć darmowym kołem fortuny"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>KOŁO FORTUNY</span>
            </DeltaButton>

            {/* Sync Rewards Button */}
            <button
              type="button"
              onClick={handleSyncRewards}
              disabled={syncing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Synchronizuj nagrody za ostatnie mecze i treningi"
              aria-label="Synchronizuj nagrody"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin text-amber-400" : ""} />
            </button>
          </div>
        </div>

        {/* 4 Kompaktowe Kafelki Statystyk (KPI GRID) */}
        <div className="delta-collection-stats-grid">
          {/* Tile 1: Ukończenie Kolekcji */}
          <div className="delta-stat-card">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <span>UKOŃCZENIE</span>
              <Trophy size={14} className="text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <strong className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                {completionPercentage}%
              </strong>
              <span className="text-[11px] font-bold text-slate-400">
                {uniqueOwnedCount}/{totalCardsCount}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Tile 2: Karty w Klaserze */}
          <div className="delta-stat-card">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <span>W KLASERZE</span>
              <Layers size={14} className="text-slate-300" />
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <strong className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
                {uniqueOwnedCount}
              </strong>
              <span className="text-[10px] font-bold text-slate-400 truncate">
                {totalDuplicatesCount > 0 ? `+${totalDuplicatesCount} powtórek` : "unikalnych"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {totalCardsCount - uniqueOwnedCount > 0 ? `Brakuje jeszcze ${totalCardsCount - uniqueOwnedCount} kart` : "Kompletny album!"}
            </span>
          </div>

          {/* Tile 3: Nieotwarte Paczki */}
          <div className="delta-stat-card">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <span>PACZKI</span>
              <Gift size={14} className="text-red-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <strong className="text-xl sm:text-2xl font-black text-red-400 font-mono">
                {unopenedPacks.length}
              </strong>
              {unopenedPacks.length > 0 ? (
                <button
                  type="button"
                  disabled={isOpeningPack}
                  onClick={() => launchPackFromUnopened()}
                  className="px-2 py-0.5 rounded-lg bg-red-600/25 border border-red-500/40 text-red-300 text-[10px] font-black hover:bg-red-600/40 cursor-pointer"
                >
                  OTWÓRZ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveViewTab("shop")}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold hover:text-white cursor-pointer"
                >
                  SKLEP
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {unopenedPacks.length > 0 ? "Gotowe do otwarcia" : "Kup w sklepie za DP"}
            </span>
          </div>

          {/* Tile 4: Ostatnio Zdobyta */}
          <div className="delta-stat-card">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <span>OSTATNIA KARTA</span>
              <Sparkles size={14} className="text-amber-400" />
            </div>
            {lastAcquiredItem?.card ? (
              <div 
                className="flex items-center justify-between gap-1.5 cursor-pointer group"
                onClick={() => setInspectCard({ card: lastAcquiredItem.card, userCard: lastAcquiredItem.userCard })}
              >
                <span className="text-xs font-black text-slate-200 group-hover:text-amber-300 transition-colors truncate">
                  {lastAcquiredItem.card.player?.display_name || lastAcquiredItem.card.card_name}
                </span>
                <span 
                  className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0"
                  style={{ color: getRarityTier(lastAcquiredItem.card).color, borderColor: getRarityTier(lastAcquiredItem.card).borderColor }}
                >
                  {getRarityTier(lastAcquiredItem.card).label}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">Brak kart w kolekcji</span>
            )}
            <span className="text-[10px] text-slate-400 truncate">
              {lastAcquiredItem ? "Kliknij aby obejrzeć w 3D" : "Otwórz pierwszą paczkę"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ZAKŁADKI I MODY WIDOKU (SEGMENTED VIEW SWITCHER)                        */}
      {/* ========================================================================= */}
      <div className="delta-collection-nav-tabs w-full">
        <button
          type="button"
          data-tab="album"
          onClick={() => {
            setActiveViewTab("collection2");
            setSelectedAlbumPlayerId(null);
          }}
          className={`delta-collection-tab-btn ${activeViewTab === "collection2" && !selectedAlbumPlayerId ? "active" : ""}`}
        >
          <Layers size={15} />
          <span>ALBUM & SIATKA KART ({uniqueOwnedCount}/{totalCardsCount})</span>
        </button>

        <button
          type="button"
          data-tab="shop"
          onClick={() => {
            setActiveViewTab("shop");
            setSelectedAlbumPlayerId(null);
          }}
          className={`delta-collection-tab-btn ${activeViewTab === "shop" ? "active" : ""}`}
        >
          <ShoppingCart size={15} className="text-amber-400" />
          <span>SKLEP PACZEK (5 BOOSTERÓW)</span>
        </button>

        <button
          type="button"
          data-tab="panini"
          onClick={() => {
            setActiveViewTab("panini");
            setSelectedAlbumPlayerId(null);
          }}
          className={`delta-collection-tab-btn ${activeViewTab === "panini" ? "active" : ""}`}
        >
          <Shield size={15} />
          <span>KLASER PANINI 3D</span>
        </button>

        <button
          type="button"
          data-tab="roster"
          onClick={() => {
            setActiveViewTab("roster");
            setSelectedAlbumPlayerId(null);
          }}
          className={`delta-collection-tab-btn ${activeViewTab === "roster" ? "active" : ""}`}
        >
          <Users size={15} />
          <span>KARTY ZAWODNIKÓW ({playerAlbums.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. SKLEP PACZEK (FAZA 3 — 5 OFICJALNYCH BOOSTERÓW DELTA)                   */}
      {/* Widok dedykowany                                                          */}
      {/* ========================================================================= */}
      {activeViewTab === "shop" && (
        <section aria-label="Sklep Paczek i Boosterów" className="w-full space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Gift size={13} />
                OFICJALNY SKLEP PACZEK DELTA
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 m-0">
                Paczki i Boostery Kolekcjonerskie
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Coins size={14} className="text-amber-400" />
              <span>Kupuj za punkty DP lub zdobywaj za mecze i frekwencję</span>
            </div>
          </div>

          {/* 5 Booster Pack Cards Grid */}
          <div className="delta-booster-shop-grid">
            {OFFICIAL_BOOSTER_PACKS.map(pack => {
              const ownedCountForPack = unopenedPacks.filter(p => p.pack_type_id === pack.id).length;
              const canAfford = deltaPoints >= pack.priceDp;
              const isBuyingThis = buyingPackId === pack.id;

              return (
                <div 
                  key={pack.id}
                  className={`delta-booster-card-v5 theme-${pack.theme}`}
                >
                  {/* Top Foil Banner */}
                  <div className="flex items-center justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-300 tracking-wider truncate max-w-[130px]">{pack.badgeLabel}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-slate-200 shrink-0 font-mono">{pack.cardsCount} KART</span>
                  </div>

                  {/* Pack Graphic Visual */}
                  <div 
                    className="relative w-full aspect-[1/1.4] rounded-xl overflow-hidden bg-radial from-slate-800 to-[#07090e] border border-white/10 flex items-center justify-center group cursor-pointer"
                    onClick={() => {
                      if (ownedCountForPack > 0 && !isOpeningPack) {
                        launchPackFromUnopened(pack.id, null, false);
                      }
                    }}
                  >
                    <img 
                      src={pack.image} 
                      alt={pack.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                    {/* Stock Indicator Badge */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
                      {ownedCountForPack > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/90 text-white font-black text-[10px] shadow-lg">
                          <Sparkles size={11} className="animate-spin" />
                          <span>{ownedCountForPack} W POSIADANIU</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-black/60 text-slate-400 font-bold text-[9px]">
                          0 W POSIADANIU
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pack Info & Details */}
                  <div className="flex flex-col gap-1.5 flex-1 justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-100 truncate m-0">{pack.name}</h3>
                      <p className="text-[10px] text-slate-400 line-clamp-2 m-0 mt-0.5 leading-snug">{pack.description}</p>
                      
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                        <Zap size={12} className="text-amber-400 shrink-0" />
                        <span className="truncate">{pack.guaranteeText}</span>
                      </div>
                    </div>

                    {/* Action Buttons with Strict Minimum 44px Touch Target */}
                    <div className="mt-2 pt-2 border-t border-white/8">
                      {ownedCountForPack > 0 ? (
                        <DeltaButton
                          variant="primary"
                          size="sm"
                          touchTarget={true}
                          disabled={isOpeningPack}
                          onClick={() => launchPackFromUnopened(pack.id, null, false)}
                          className="w-full font-black text-xs shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                        >
                          <Sparkles size={14} className="text-amber-300 animate-spin" />
                          <span>OTWÓRZ ({ownedCountForPack})</span>
                        </DeltaButton>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <DeltaButton
                            variant={canAfford ? "gold" : "secondary"}
                            size="sm"
                            touchTarget={true}
                            disabled={isBuyingThis || isOpeningPack || !canAfford}
                            onClick={() => handleBuyPack(pack.id)}
                            className="w-full font-black text-xs"
                          >
                            <Coins size={14} />
                            <span>
                              {isBuyingThis ? "KUPUJĘ..." : `KUP ZA ${pack.priceDp} DP`}
                            </span>
                          </DeltaButton>
                          {!canAfford && (
                            <span className="text-[9px] text-center text-slate-400">
                              Brakuje {pack.priceDp - deltaPoints} DP
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. GŁÓWNA SIATKA KART & FILTRY (FAZA 2 — NOWY ALBUM)                       */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "collection2" && (
        <section aria-label="Siatka Kart Kolekcji" className="w-full space-y-3 pt-2">
          {/* Toolbar: Wyszukiwarka, Filtry Zawodnika i Sortowanie */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0b0e15] border border-white/10 shadow-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Search input */}
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Szukaj karty, zawodnika, rzadkości..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400/50 min-h-[44px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Player selector */}
              <select
                value={selectedPlayerFilter}
                onChange={e => setSelectedPlayerFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#121520] border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-400/50 min-h-[44px]"
              >
                <option value="all">Wszyscy Zawodnicy ({realPlayers.length})</option>
                {realPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} (#{p.shirt_number || "GM"})
                  </option>
                ))}
              </select>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#121520] border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-400/50 min-h-[44px]"
              >
                <option value="newest">Najnowsze Zdobyte</option>
                <option value="rarity_desc">Rzadkość (Od Najwyższej)</option>
                <option value="ovr_desc">Ocena OVR (Najwyższa)</option>
                <option value="player_asc">Zawodnik (A-Z)</option>
              </select>
            </div>

            {/* Rarity Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">RZADKOŚĆ:</span>
              {[
                { id: "all", label: "Wszystkie", color: "#ffffff" },
                { id: "common", label: "COMMON", color: "#94a3b8" },
                { id: "rare", label: "RARE", color: "#60a5fa" },
                { id: "gold", label: "GOLD", color: "#f1c95c" },
                { id: "matchday", label: "MATCHDAY", color: "#38bdf8" },
                { id: "inferno", label: "INFERNO", color: "#ef4444" },
                { id: "legend", label: "LEGEND", color: "#c084fc" }
              ].map(tier => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedRarityFilter(tier.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[34px] border ${
                    selectedRarityFilter === tier.id
                      ? "bg-white/15 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-white border-transparent"
                  }`}
                  style={{
                    borderColor: selectedRarityFilter === tier.id ? tier.color : undefined,
                    color: selectedRarityFilter === tier.id ? tier.color : undefined
                  }}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            {/* Ownership Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">STAN:</span>
              {[
                { id: "all", label: `Wszystkie (${allCards.length})` },
                { id: "owned", label: `Zdobyte (${uniqueOwnedCount})` },
                { id: "missing", label: `Brakujące (${missingCardsList.length})` },
                { id: "duplicates", label: `Duplikaty (${totalDuplicatesCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedOwnershipFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[34px] border ${
                    selectedOwnershipFilter === tab.id
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-white border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid: Rendered Cards OR Empty States */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={36} className="animate-spin text-amber-400" />
              <span className="text-xs font-bold">Ładowanie kart DELTA INFERNO...</span>
            </div>
          ) : userCards.length === 0 && selectedOwnershipFilter === "owned" ? (
            /* DEDICATED HIGH-IMPACT EMPTY STATE (FAZA 2.3) */
            <div className="delta-collection-empty-showcase">
              <div className="flex items-center justify-center -space-x-3 sm:-space-x-4 mb-4">
                <div className="w-18 h-28 sm:w-24 sm:h-34 rounded-xl bg-gradient-to-b from-red-950/80 to-[#0e1017] border border-red-500/40 shadow-lg transform -rotate-6 p-1.5 flex flex-col items-center justify-between">
                  <span className="delta-card-watermark-demo text-[8px] font-black text-red-400 uppercase tracking-widest">WZÓR</span>
                  <Shield size={26} className="text-red-400/60 my-auto" />
                  <span className="text-[9px] font-bold text-slate-400">INFERNO</span>
                </div>
                <div className="w-20 h-30 sm:w-26 sm:h-38 rounded-xl bg-gradient-to-b from-amber-950/80 via-[#161924] to-[#0a0d14] border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.3)] z-10 transform scale-105 p-2 flex flex-col items-center justify-between">
                  <span className="delta-card-watermark-demo text-[9px] font-black text-amber-300 uppercase tracking-widest">WZÓR 3D</span>
                  <Sparkles size={30} className="text-amber-400 my-auto drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <span className="text-[9px] font-extrabold text-amber-300">DO ZDOBYCIA W PACZKACH</span>
                </div>
                <div className="w-18 h-28 sm:w-24 sm:h-34 rounded-xl bg-gradient-to-b from-purple-950/80 to-[#0e1017] border border-purple-500/40 shadow-lg transform rotate-6 p-1.5 flex flex-col items-center justify-between">
                  <span className="delta-card-watermark-demo text-[8px] font-black text-purple-400 uppercase tracking-widest">WZÓR</span>
                  <Award size={26} className="text-purple-400/60 my-auto" />
                  <span className="text-[9px] font-bold text-slate-400">LEGEND</span>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-100 m-0">
                Twój album czeka na pierwsze karty!
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                Zbuduj swój mistrzowski skład DELTA 2018 GM. Otwieraj paczki INFERNO, aby zdobyć unikalne karty klubowe z autografami i animacjami 3D!
              </p>

              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {unopenedPacks.length > 0 ? (
                  <DeltaButton
                    variant="primary"
                    size="md"
                    touchTarget={true}
                    onClick={() => launchPackFromUnopened()}
                    className="font-black text-xs"
                  >
                    <Gift size={16} />
                    <span>OTWÓRZ PIERWSZĄ PACZKĘ ({unopenedPacks.length})</span>
                  </DeltaButton>
                ) : (
                  <DeltaButton
                    variant="gold"
                    size="md"
                    touchTarget={true}
                    onClick={() => setActiveViewTab("shop")}
                    className="font-black text-xs"
                  >
                    <ShoppingCart size={16} />
                    <span>PRZEJDŹ DO SKLEPU PACZEK</span>
                  </DeltaButton>
                )}
                <DeltaButton
                  variant="outline"
                  size="md"
                  touchTarget={true}
                  onClick={() => setShowDailySpin(true)}
                  className="font-bold text-xs"
                >
                  <Sparkles size={16} className="text-amber-400" />
                  <span>ZAKRĘĆ KOŁEM FORTUNY</span>
                </DeltaButton>
              </div>
            </div>
          ) : filteredGridCards.length === 0 ? (
            /* FILTER EMPTY STATE */
            <div className="py-10 p-6 rounded-2xl bg-[#0e1119] border border-white/10 text-center flex flex-col items-center gap-2">
              <Search size={36} className="text-slate-500" />
              <strong className="text-sm font-black text-slate-200">Brak kart spełniających wybrane kryteria</strong>
              <p className="text-xs text-slate-400 m-0">Zmień filtry rzadkości, zawodnika lub wyszukiwane hasło.</p>
              <DeltaButton
                variant="outline"
                size="sm"
                touchTarget={true}
                className="mt-2 text-xs font-bold"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlayerFilter("all");
                  setSelectedRarityFilter("all");
                  setSelectedOwnershipFilter("all");
                }}
              >
                Zresetuj wszystkie filtry
              </DeltaButton>
            </div>
          ) : (
            /* MAIN CARDS GRID */
            <div className="delta-collection-cards-grid">
              {filteredGridCards.map(card => {
                const isOwned = ownedCardsMap.has(card.id);
                const userCard = ownedCardsMap.get(card.id) || null;
                const tier = getRarityTier(card);
                const isFeatured = featuredCardId === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setInspectCard({ card, userCard });
                    }}
                    className={`delta-card-cell-v5 ${isOwned ? "is-owned" : "is-locked"}`}
                  >
                    <div className="relative w-full rounded-xl overflow-hidden">
                      <CollectibleCard3D
                        card={card}
                        userCard={userCard}
                        isLocked={!isOwned}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                        layoutOverride={getLayoutForCard(card)}
                      />

                      {/* Locked Padlock Overlay */}
                      {!isOwned && (
                        <div className="absolute inset-0 bg-[#07090e]/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center">
                          <Lock size={20} className="text-amber-400 mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">NIEZDOBYTA</span>
                        </div>
                      )}

                      {/* Featured ribbon */}
                      {isFeatured && (
                        <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-400/90 text-slate-950 shadow-md">
                          <Star size={11} className="fill-current" />
                        </div>
                      )}

                      {/* Duplicate tag */}
                      {isOwned && userCard && userCard.duplicates_count > 0 && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[9px] font-mono shadow-md">
                          x{userCard.duplicates_count + 1}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Info */}
                    <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                      <strong className="text-xs font-black text-slate-100 truncate">
                        {card.player?.display_name || card.card_name}
                      </strong>
                      <div className="flex items-center justify-between text-[10px]">
                        <span 
                          className="font-black px-1 py-0.2 rounded border uppercase tracking-wider text-[9px]"
                          style={{ color: tier.color, borderColor: tier.borderColor }}
                        >
                          {tier.label}
                        </span>
                        {isOwned ? (
                          <span className="flex items-center gap-0.5 text-emerald-400 font-bold text-[10px]">
                            <CheckCircle2 size={11} /> Posiadana
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-slate-400 font-medium text-[10px]">
                            <Lock size={10} /> Brak
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* WIDOK: PANINI 3D SQUAD BINDER                                             */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "panini" && (
        <Panini3DAlbumBinder
          playerAlbums={playerAlbums}
          ownedCardsMap={ownedCardsMap}
          allCards={allCards}
          deltaPoints={deltaPoints}
          paniniRewardClaimed={paniniRewardClaimed}
          onInspectCard={(card, userCard) => setInspectCard({ card, userCard })}
          onSelectPlayer={(playerId) => setSelectedAlbumPlayerId(playerId)}
          onOpenPacks={() => {
            if (unopenedPacks.length > 0) {
              launchPackFromUnopened();
            } else {
              setActiveViewTab("shop");
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* WIDOK: PLAYER ALBUMS (CIRCULAR 3D CAROUSEL)                               */}
      {/* ========================================================================= */}
      {selectedAlbumPlayerId && currentAlbum && (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0b0e15] border border-white/10">
            <button
              type="button"
              onClick={() => setSelectedAlbumPlayerId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer min-h-[44px]"
            >
              <ArrowLeft size={15} />
              <span>Wróć do wszystkich albumów</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Album: <strong className="text-amber-300">{currentAlbum.player.display_name}</strong>
              </span>
              <DeltaBadge variant="gold" size="sm">
                {currentAlbum.ownedCount}/{currentAlbum.cards.length} KART
              </DeltaBadge>
            </div>
          </div>

          <PlayerCardsCircular3DCarousel
            cards={currentAlbum.cards}
            ownedCardsMap={ownedCardsMap}
            onInspectCard={(card, userCard) => setInspectCard({ card, userCard })}
            onCinematicReveal={(card) => setCinematicCardToUnlock(card)}
            getCardUnlockCondition={(c) => getCardUnlockCondition(c).condition}
            layoutsMap={cardLayoutsMap}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* PODGLĄD POJEDYNCZEJ KARTY 3D (FAZA 2.2 INSPECT MODAL)                     */}
      {/* ========================================================================= */}
      {inspectCard && (
        <div 
          className="delta-inspect-modal-backdrop"
          onClick={() => {
            setInspectCard(null);
            setInspectFlipped(false);
          }}
        >
          <div 
            className="delta-inspect-modal-card p-4 sm:p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => {
                setInspectCard(null);
                setInspectFlipped(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center z-20"
              aria-label="Zamknij podgląd karty"
            >
              <X size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left Column: 3D Interactive Card Preview */}
              <div className="flex flex-col items-center justify-center gap-3">
                <CollectibleCard3D
                  card={inspectCard.card}
                  userCard={inspectCard.userCard}
                  isLocked={false}
                  size="xl"
                  interactive={true}
                  showFlip={true}
                  touchFlip={true}
                  isFlipped={inspectFlipped}
                  onFlipChange={setInspectFlipped}
                  layoutOverride={getLayoutForCard(inspectCard.card)}
                />
                <span className="text-[11px] text-slate-400 font-medium text-center">
                  ✋ Chwyć myszką/palcem, aby obracać w 3D • Kliknij kartę aby odwrócić
                </span>
              </div>

              {/* Right Column: Card Stats & Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    className="text-xs font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider"
                    style={{
                      color: getRarityTier(inspectCard.card).textColor,
                      background: getRarityTier(inspectCard.card).badgeBg,
                      borderColor: getRarityTier(inspectCard.card).borderColor
                    }}
                  >
                    <Sparkles size={12} className="inline mr-1" />
                    {getRarityTier(inspectCard.card).label}
                  </span>
                  <DeltaBadge variant="default" size="sm">
                    {inspectCard.card.title || inspectCard.card.card_type || "KARTA KLUBOWA"}
                  </DeltaBadge>
                  {featuredCardId === inspectCard.card.id && (
                    <DeltaBadge variant="gold" size="sm">
                      ⭐ WYRÓŻNIONA
                    </DeltaBadge>
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-100 m-0">
                    {inspectCard.card.player?.display_name || inspectCard.card.card_name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pozycja: <strong className="text-slate-200">{inspectCard.card.player?.position || "Zawodnik DELTA"}</strong> • Numer: <strong className="text-slate-200">#{inspectCard.card.player?.shirt_number || "GM"}</strong>
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/8 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status w kolekcji:</span>
                    {inspectCard.userCard ? (
                      <strong className="text-emerald-400 flex items-center gap-1 font-bold">
                        <Check size={14} /> W POSIADANIU
                      </strong>
                    ) : (
                      <strong className="text-amber-400 flex items-center gap-1 font-bold">
                        <Lock size={14} /> DO ZDOBYCIA
                      </strong>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Liczba egzemplarzy:</span>
                    <strong className="text-slate-200">
                      {inspectCard.userCard ? `${(inspectCard.userCard.duplicates_count || 0) + 1} sztuk` : "0 (niezdobyta)"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Źródło wypadania:</span>
                    <strong className="text-amber-300">
                      {getCardUnlockCondition(inspectCard.card).packType}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <DeltaButton
                    variant="gold"
                    size="sm"
                    touchTarget={true}
                    onClick={() => handleSetFeaturedCard(inspectCard.card.id)}
                    className="text-xs font-bold"
                  >
                    <Star size={14} />
                    <span>{featuredCardId === inspectCard.card.id ? "WYRÓŻNIONA" : "USTAW JAKO WYRÓŻNIONĄ"}</span>
                  </DeltaButton>

                  <DeltaButton
                    variant="outline"
                    size="sm"
                    touchTarget={true}
                    onClick={() => setInspectFlipped(!inspectFlipped)}
                    className="text-xs font-bold"
                  >
                    <RotateCw size={14} />
                    <span>{inspectFlipped ? "AWERS" : "REWERS"}</span>
                  </DeltaButton>

                  {inspectCard.card.player_id && onOpenPlayerProfile && (
                    <DeltaButton
                      variant="secondary"
                      size="sm"
                      touchTarget={true}
                      onClick={() => {
                        setInspectCard(null);
                        if (inspectCard.card.player_id) {
                          onOpenPlayerProfile(inspectCard.card.player_id);
                        }
                      }}
                      className="text-xs font-bold"
                    >
                      <User size={14} />
                      <span>PROFIL</span>
                    </DeltaButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PACK OPENING EXPERIENCE MODAL (DELTA INFERNO V2 3D)                       */}
      {/* ========================================================================= */}
      {activePackSession && (
        <CinematicPackExperience
          pack={activePackSession.pack}
          userUnopenedPackId={activePackSession.userUnopenedPackId}
          sessionKey={activePackSession.sessionKey}
          unopenedCount={
            activePackSession.hasConsumedCurrentPack
              ? typeof activePackSession.lastOpenResult?.remaining_unopened_packs_count === "number"
                ? activePackSession.lastOpenResult.remaining_unopened_packs_count
                : unopenedPacks.length
              : Math.max(0, unopenedPacks.length - 1)
          }
          onPackConsumed={(result) => {
            setUnopenedPacks((prev) => reconcileUnopenedPacksAfterOpen(prev, result));
            if (typeof result.new_points_balance === "number" && Number.isFinite(result.new_points_balance)) {
              setDeltaPoints(result.new_points_balance);
            }
            setActivePackSession((prev) =>
              prev
                ? {
                    ...prev,
                    hasConsumedCurrentPack: true,
                    lastOpenResult: result
                  }
                : prev
            );
          }}
          onClose={() => {
            setActivePackSession(null);
            void fetchCollection(true);
          }}
          onOpenAnother={() => {
            const remainingPacks = activePackSession.lastOpenResult
              ? reconcileUnopenedPacksAfterOpen(unopenedPacks, activePackSession.lastOpenResult)
              : unopenedPacks;
            const nextSession = selectPackSessionToOpen({
              unopenedPacks: remainingPacks,
              packDefinitions,
              preferredPackTypeId: activePackSession.pack.id,
              allowFallbackToAny: true,
              fallbackCatalog: OFFICIAL_BOOSTER_PACKS
            });
            if (nextSession) {
              packSessionSeqRef.current += 1;
              setActivePackSession({
                pack: nextSession.pack,
                userUnopenedPackId: nextSession.targetUnopenedPack.id,
                sessionKey: packSessionSeqRef.current,
                hasConsumedCurrentPack: false,
                lastOpenResult: null
              });
            } else {
              setUnopenedPacks([]);
              setActivePackSession(null);
              showToast("Brak kolejnych nieotwartych paczek.");
            }
            void fetchCollection(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* LOCKED CARD CINEMATIC MODAL (ODKRYJ JAK ODBLOKOWAĆ)                       */}
      {/* ========================================================================= */}
      {cinematicCardToUnlock && (
        <CardUnlockCinematicModal
          card={cinematicCardToUnlock}
          onClose={() => setCinematicCardToUnlock(null)}
          onAddToCollection={() => {
            setCinematicCardToUnlock(null);
            fetchCollection();
          }}
          onViewProfile={() => {
            if (onOpenPlayerProfile && cinematicCardToUnlock.player_id) {
              onOpenPlayerProfile(cinematicCardToUnlock.player_id);
            }
          }}
        />
      )}

      {/* Pozostałe modale systemowe */}
      {showDailySpin && (
        <DailyInfernoSpin
          onClose={() => setShowDailySpin(false)}
          onRewardClaimed={(newBal) => {
            setDeltaPoints(newBal);
            fetchCollection();
          }}
          onOpenPack={(pack) => {
            setShowDailySpin(false);
            launchGrantedPack(pack);
          }}
          packDefinitions={packDefinitions}
        />
      )}

      {showSquadBuilder && (
        <DeltaSquadBuilderModal
          isOpen={showSquadBuilder}
          onClose={() => setShowSquadBuilder(false)}
          userCards={userCards}
          onSquadSaved={() => fetchCollection()}
        />
      )}

      {showPaniniChallenges && (
        <DeltaPaniniChallengesModal
          isOpen={showPaniniChallenges}
          onClose={() => setShowPaniniChallenges(false)}
          userCards={userCards}
          onRewardClaimed={() => fetchCollection()}
        />
      )}

      {showCardLegend && (
        <DeltaCardLegendModal
          isOpen={showCardLegend}
          onClose={() => setShowCardLegend(false)}
        />
      )}

      {showBattleCompare && (
        <CardBattleCompareModal
          cards={allCards}
          userCardsMap={ownedCardsMap}
          onClose={() => setShowBattleCompare(false)}
          onRewardClaimed={(pts) => setDeltaPoints(p => p + pts)}
        />
      )}

      {showTradeHub && (
        <DeltaTradeHubModal
          userCards={userCards}
          allCards={allCards}
          deltaPoints={deltaPoints}
          onClose={() => setShowTradeHub(false)}
          onTradeComplete={() => fetchCollection()}
          onPointsEarned={(pts) => setDeltaPoints(p => p + pts)}
        />
      )}

      {showAchievements && (
        <AchievementsModal
          isOpen={showAchievements}
          onClose={() => setShowAchievements(false)}
          onPointsUpdated={(newPts) => setDeltaPoints(p => p + newPts)}
        />
      )}

      {showSkillGames && (
        <DeltaSkillMiniGamesModal
          onClose={() => setShowSkillGames(false)}
          onPointsEarned={(pts) => setDeltaPoints(p => p + pts)}
        />
      )}

      {showSBC && (
        <DeltaSBCModal
          userCards={userCards}
          allCards={allCards}
          onClose={() => setShowSBC(false)}
          onRewardClaimed={(packId, pts) => {
            if (pts) setDeltaPoints(p => p + pts);
            fetchCollection();
          }}
          onOpenPackDirectly={(packId) => {
            const def = packDefinitions.find(p => p.id === packId) || packDefinitions[0];
            launchGrantedPack(def);
          }}
        />
      )}

      {showBroadcast && (
        <BroadcastLeaderboard
          cards={allCards}
          players={realPlayers}
          playerStats={playerStats}
          matches={matches}
          onClose={() => setShowBroadcast(false)}
        />
      )}

      {videoHighlightCard && (
        <PlayerVideoHighlightModal
          card={videoHighlightCard}
          onClose={() => setVideoHighlightCard(null)}
        />
      )}

      {signatureCard && (
        <DigitalSignatureModal
          card={signatureCard}
          onClose={() => setSignatureCard(null)}
          onSaved={() => {
            if (inspectCard) {
              setInspectCard({ ...inspectCard });
            }
          }}
        />
      )}
    </section>
  );
}
