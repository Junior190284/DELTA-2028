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
  Bookmark
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
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";
import PackOpeningExperience from "./PackOpeningExperience";
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

// 5 Standard Booster Packs Configuration
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
    priceDp: 50,
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
    priceDp: 80,
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
    priceDp: 120,
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
    priceDp: 250,
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
    priceDp: 350,
    image: "/assets/packs/pack-legend.jpg",
    theme: "legend",
    guaranteeText: "Gwarantowana Karta Legendy & Ikony",
    badgeLabel: "LEGEND COLLECTOR",
    description: "Najwyższy poziom kolekcjonerski. Gwarantuje 6 elitarnych kart z legendarnej serii."
  }
];

// Helper: Rarity classification for 6 tiers
export function getRarityTier(card?: CardDefinition): {
  id: "common" | "rare" | "gold" | "matchday" | "inferno" | "legend";
  label: string;
  color: string;
  textColor: string;
  badgeBg: string;
  borderColor: string;
  glow: string;
} {
  if (!card) {
    return {
      id: "common",
      label: "COMMON",
      color: "#94a3b8",
      textColor: "#e2e8f0",
      badgeBg: "rgba(148, 163, 184, 0.15)",
      borderColor: "rgba(148, 163, 184, 0.4)",
      glow: "rgba(148, 163, 184, 0.2)"
    };
  }

  const r = (card.rarity || "").toLowerCase();
  const t = (card.card_type || "").toLowerCase();

  if (r === "inferno" || t.includes("inferno")) {
    return {
      id: "inferno",
      label: "INFERNO",
      color: "#ef4444",
      textColor: "#fca5a5",
      badgeBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(249, 115, 22, 0.25))",
      borderColor: "rgba(239, 68, 68, 0.7)",
      glow: "rgba(239, 68, 68, 0.5)"
    };
  }
  if (r === "legendary" || r === "legend" || t.includes("legend") || t.includes("ikona")) {
    return {
      id: "legend",
      label: "LEGEND",
      color: "#c084fc",
      textColor: "#f3e8ff",
      badgeBg: "linear-gradient(135deg, rgba(192, 132, 252, 0.25), rgba(126, 34, 206, 0.3))",
      borderColor: "rgba(192, 132, 252, 0.7)",
      glow: "rgba(192, 132, 252, 0.5)"
    };
  }
  if (r === "gold" || r === "epic" || t.includes("gold") || t.includes("mvp")) {
    return {
      id: "gold",
      label: "GOLD",
      color: "#f1c95c",
      textColor: "#fef08a",
      badgeBg: "linear-gradient(135deg, rgba(241, 201, 92, 0.25), rgba(202, 138, 4, 0.3))",
      borderColor: "rgba(241, 201, 92, 0.7)",
      glow: "rgba(241, 201, 92, 0.5)"
    };
  }
  if (r === "matchday" || t.includes("matchday")) {
    return {
      id: "matchday",
      label: "MATCHDAY",
      color: "#38bdf8",
      textColor: "#bae6fd",
      badgeBg: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.25))",
      borderColor: "rgba(56, 189, 248, 0.7)",
      glow: "rgba(56, 189, 248, 0.4)"
    };
  }
  if (r === "rare" || t.includes("training") || t.includes("warrior")) {
    return {
      id: "rare",
      label: "RARE",
      color: "#60a5fa",
      textColor: "#bfdbfe",
      badgeBg: "linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(37, 99, 235, 0.25))",
      borderColor: "rgba(96, 165, 250, 0.6)",
      glow: "rgba(96, 165, 250, 0.3)"
    };
  }
  return {
    id: "common",
    label: "COMMON",
    color: "#94a3b8",
    textColor: "#e2e8f0",
    badgeBg: "rgba(148, 163, 184, 0.15)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    glow: "rgba(148, 163, 184, 0.2)"
  };
}

interface DeltaCollectionAlbumProps {
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
  const [isOpeningPack, setIsOpeningPack] = useState(false);

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

  // View Modes: "collection2" (New Collection 2.0 Hub), "panini" (Binder 3D), "roster" (Player Albums)
  const [activeViewTab, setActiveViewTab] = useState<"collection2" | "panini" | "roster">("collection2");
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
  const [activePackToOpen, setActivePackToOpen] = useState<PackDefinition | null>(null);
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
    }, 3500);
  };

  const handleSetFeaturedCard = (cardId: string) => {
    setFeaturedCardId(cardId);
    try {
      localStorage.setItem("delta_featured_card_id", cardId);
    } catch {}
    cardSound.playPurchase();
    showToast("⭐ Karta została ustawiona jako Twoja wyróżniona wizytówka!");
  };

  const handleToggleLockCard = async (userCard: UserCard | null) => {
    if (!userCard) return;
    const newLocked = !(userCard as any).is_locked;
    try {
      const res = await fetch("/api/cards/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCardId: userCard.id, isLocked: newLocked })
      });
      if (res.ok) {
        setUserCards(prev => prev.map(uc => uc.id === userCard.id ? { ...uc, is_locked: newLocked } as any : uc));
        if (inspectCard && inspectCard.userCard?.id === userCard.id) {
          setInspectCard({
            ...inspectCard,
            userCard: { ...inspectCard.userCard, is_locked: newLocked } as any
          });
        }
        showToast(newLocked ? "🔒 Karta zabezpieczona przed przetopieniem w SBC" : "🔓 Zdjęto blokadę z karty");
      }
    } catch (e) {
      console.error("Error toggling card lock:", e);
    }
  };

  const getLayoutForCard = useMemo(() => {
    return (card?: CardDefinition): Partial<CardLayoutConfig> | undefined => {
      if (!card) return undefined;
      const pId = card.player_id || card.player?.id;
      if (!pId) return undefined;
      const t = (card.card_type || "").toLowerCase();
      const r = (card.rarity || "").toLowerCase();
      const templateKey = t.includes("training") || t.includes("warrior") ? "training" :
                          t.includes("inferno") || r === "inferno" ? "inferno" :
                          t.includes("legend") || r === "legendary" ? "legend" :
                          t.includes("gold") || t.includes("mvp") || r === "epic" ? "gold" :
                          t.includes("matchday") || r === "rare" ? "matchday" :
                          t.includes("panini") ? "panini" : "base";

      return cardLayoutsMap[`${pId}_${templateKey}`] || cardLayoutsMap[`${pId}_base`] || undefined;
    };
  }, [cardLayoutsMap]);

  const getCardUnlockCondition = (card: CardDefinition): { condition: string; packType: string; achievement: string } => {
    const t = (card.card_name || card.title || card.card_type || "").toLowerCase();
    const r = (card.rarity || "").toLowerCase();

    if (r === "inferno" || t.includes("inferno")) {
      return {
        condition: "Hat-trick w meczu ligowym lub odblokowanie w Kole Fortuny",
        packType: "Inferno Booster (gwarancja)",
        achievement: "🏆 Inferno Striker Master"
      };
    }
    if (r === "legendary" || t.includes("legend") || t.includes("ikona")) {
      return {
        condition: "Tytuł MVP Oficjalnego Meczu lub rozegranie 25 spotkań",
        packType: "Legend Pack (gwarancja)",
        achievement: "👑 Klubowa Ikona DELTA"
      };
    }
    if (r === "epic" || r === "gold" || t.includes("gold") || t.includes("mvp")) {
      return {
        condition: "Czyste konto bramkarza, asysta meczowa lub wysoki wskaźnik zaangażowania",
        packType: "Gold Booster / Paczki za mecze",
        achievement: "🌟 Złoty Mistrz Formy"
      };
    }
    if (t.includes("matchday") || card.card_type === "matchday" || r === "rare") {
      return {
        condition: "Obecność i powołanie na oficjalny mecz turniejowy DELTA",
        packType: "Matchday Booster / Standardowa",
        achievement: "⚡ Gotowość Meczowa"
      };
    }
    if (t.includes("training") || card.card_type === "training") {
      return {
        condition: "100% frekwencja treningowa w danym miesiącu",
        packType: "Standardowa Paczka / Trening",
        achievement: "🛡️ Tytan Treningu"
      };
    }
    return {
      condition: "Oficjalny debiut w roczniku 2018 lub otwarcie dowolnej paczki",
      packType: "Wszystkie paczki DELTA",
      achievement: "⚽ Pierwszy Krok w Klubie"
    };
  };

  // Fetch collection data from API
  const fetchCollection = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cards/collection");
      if (res.ok) {
        const data = await res.json();
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
      setLoading(false);
    }
  };

  useEffect(() => {
    preloadAllCardThemes();
    fetchCollection();

    fetch("/api/cards/sync-rewards", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.granted && data.granted.length > 0) {
          fetchCollection();
        }
      })
      .catch(() => {});

    const handlePackSync = () => {
      fetchCollection();
    };
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

  // Buy pack with Delta Points
  const handleBuyPack = async (packId: string) => {
    if (buyingPackId || isOpeningPack) return;
    const packObj = OFFICIAL_BOOSTER_PACKS.find(p => p.id === packId);
    const price = packObj?.priceDp || 100;

    if (deltaPoints < price) {
      alert(`Potrzebujesz ${price} DP, aby odblokować paczkę "${packObj?.name || packId}". Twój obecny stan to ${deltaPoints} DP.`);
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
      await fetchCollection();
    } catch (e: any) {
      alert(e.message || "Nie udało się kupić paczki.");
    } finally {
      setBuyingPackId(null);
    }
  };

  // Maps & Stats Calculations
  const ownedCardsMap = useMemo(() => {
    const map = new Map<string, UserCard>();
    userCards.forEach(uc => {
      map.set(uc.card_id, uc);
    });
    return map;
  }, [userCards]);

  const uniqueOwnedCards = useMemo(() => {
    return allCards.filter(c => ownedCardsMap.has(c.id));
  }, [allCards, ownedCardsMap]);

  const totalCardsCount = allCards.length || 1;
  const uniqueOwnedCount = uniqueOwnedCards.length;
  const totalDuplicatesCount = userCards.reduce((acc, uc) => acc + (uc.duplicates_count || 0), 0);
  const completionPercentage = Math.round((uniqueOwnedCount / totalCardsCount) * 100);

  // Recently acquired cards (sorted by acquired_at desc)
  const recentlyAcquiredList = useMemo(() => {
    const sortedUserCards = [...userCards].sort((a, b) => {
      const dateA = new Date(a.acquired_at || 0).getTime();
      const dateB = new Date(b.acquired_at || 0).getTime();
      return dateB - dateA;
    });

    return sortedUserCards
      .map(uc => {
        const cardDef = allCards.find(c => c.id === uc.card_id) || uc.card_definition;
        return { userCard: uc, card: cardDef };
      })
      .filter(item => item.card)
      .slice(0, 10);
  }, [userCards, allCards]);

  // Last acquired card & last special card
  const lastAcquiredItem = recentlyAcquiredList[0] || null;
  const lastSpecialItem = useMemo(() => {
    return recentlyAcquiredList.find(item => {
      const r = (item.card?.rarity || "").toLowerCase();
      const t = (item.card?.card_type || "").toLowerCase();
      return r === "inferno" || r === "legendary" || r === "epic" || r === "gold" || t.includes("inferno") || t.includes("legend");
    }) || null;
  }, [recentlyAcquiredList]);

  // Missing cards list
  const missingCardsList = useMemo(() => {
    return allCards.filter(c => !ownedCardsMap.has(c.id));
  }, [allCards, ownedCardsMap]);

  // Helper for Card OVR rating
  const getCardOvr = (c: CardDefinition): number => {
    const tier = getRarityTier(c);
    switch (tier.id) {
      case "inferno": return 95;
      case "legend": return 91;
      case "gold": return 86;
      case "matchday": return 82;
      case "rare": return 78;
      default: return 74;
    }
  };

  // Filtered Cards for Grid
  const filteredGridCards = useMemo(() => {
    return allCards.filter(card => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (card.player?.display_name || card.card_name || card.title || "").toLowerCase();
        if (!pName.includes(q)) return false;
      }

      // Player Filter
      if (selectedPlayerFilter !== "all") {
        if (card.player_id !== selectedPlayerFilter && card.player?.id !== selectedPlayerFilter) return false;
      }

      // Rarity Tier Filter
      if (selectedRarityFilter !== "all") {
        const tier = getRarityTier(card);
        if (tier.id !== selectedRarityFilter) return false;
      }

      // Card Type Filter
      if (selectedTypeFilter !== "all") {
        const t = (card.card_type || "").toLowerCase();
        if (selectedTypeFilter === "inferno" && !t.includes("inferno")) return false;
        if (selectedTypeFilter === "legend" && !t.includes("legend")) return false;
        if (selectedTypeFilter === "gold" && !t.includes("gold") && !t.includes("mvp")) return false;
        if (selectedTypeFilter === "matchday" && !t.includes("matchday")) return false;
        if (selectedTypeFilter === "training" && !t.includes("training")) return false;
        if (selectedTypeFilter === "base" && !t.includes("base") && !t.includes("standard") && t !== "") return false;
      }

      // Ownership Filter
      const isOwned = ownedCardsMap.has(card.id);
      const userCard = ownedCardsMap.get(card.id);
      if (selectedOwnershipFilter === "owned" && !isOwned) return false;
      if (selectedOwnershipFilter === "missing" && isOwned) return false;
      if (selectedOwnershipFilter === "duplicates" && (!userCard || (userCard.duplicates_count || 0) <= 0)) return false;
      if (selectedOwnershipFilter === "new") {
        // Defined as cards acquired in the last 7 days or single copy
        if (!isOwned) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        const uca = ownedCardsMap.get(a.id);
        const ucb = ownedCardsMap.get(b.id);
        if (uca && ucb) {
          return new Date(ucb.acquired_at || 0).getTime() - new Date(uca.acquired_at || 0).getTime();
        }
        if (uca) return -1;
        if (ucb) return 1;
        return 0;
      }
      if (sortBy === "rarity_desc") {
        const rank: Record<string, number> = { inferno: 6, legend: 5, gold: 4, matchday: 3, rare: 2, common: 1 };
        const rankA = rank[getRarityTier(a).id] || 1;
        const rankB = rank[getRarityTier(b).id] || 1;
        return rankB - rankA;
      }
      if (sortBy === "player_asc") {
        const nameA = a.player?.display_name || a.card_name || "";
        const nameB = b.player?.display_name || b.card_name || "";
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "ovr_desc") {
        return getCardOvr(b) - getCardOvr(a);
      }
      return 0;
    });
  }, [allCards, searchQuery, selectedPlayerFilter, selectedRarityFilter, selectedTypeFilter, selectedOwnershipFilter, sortBy, ownedCardsMap]);

  // Grouped Player Albums
  const playerAlbums = useMemo(() => {
    const map = new Map<string, {
      player: { id: string; display_name: string; shirt_number: string | null; position: string | null; photo_path?: string | null };
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
    <section className="section v8-section-page delta-collection-20-page animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="delta-toast-notification">
          <Sparkles size={16} className="text-yellow-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GŁÓWNY PANEL PODSUMOWANIA (TOP KPI SUMMARY PANEL)                      */}
      {/* ========================================================================= */}
      <div className="v200-collection-top-panel">
        <div className="v200-hero-backdrop-glow" />

        {/* Branding header */}
        <div className="v200-top-branding-row">
          <div className="v200-brand-left">
            <div className="v200-vip-badge">
              <Sparkles size={14} className="text-yellow-400" />
              <span>OFICJALNY SYSTEM KART KLUBOWYCH • DELTA 2018 GM</span>
            </div>
            <h1 className="v200-main-title">
              DELTA <span className="text-gold">COLLECTION 2.0</span>
            </h1>
            <p className="v200-main-subtitle">
              Kolekcjonuj unikalne cyfrowe karty zawodników DELTA Warszawa 2018 GM. Zdobywaj boostery za mecze i treningi, kompletuj albumy oraz odkrywaj legendy!
            </p>
          </div>

          {/* Points & Sync action */}
          <div className="v200-brand-actions">
            <div className="v200-dp-balance-chip">
              <Coins size={18} className="text-yellow-400" />
              <div>
                <span className="dp-label">TWÓJ SKARBIEC DP</span>
                <strong className="dp-amount">{deltaPoints} DP</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSyncRewards}
              disabled={syncing}
              className="v200-sync-rewards-btn"
              title="Sprawdź i odbierz nowe paczki za ostatnie mecze i treningi"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "SPRAWDZAM..." : "SYNCHRONIZUJ"}</span>
            </button>
          </div>
        </div>

        {/* 5 Głównych Kafelków Podsumowania (KPI GRID) */}
        <div className="v200-kpi-summary-grid">
          {/* Tile 1: Zdobyte Unikalne Karty */}
          <div className="v200-kpi-card">
            <div className="v200-kpi-icon-wrap icon-cards">
              <Layers size={20} />
            </div>
            <div className="v200-kpi-content">
              <span className="v200-kpi-label">ZDOBYTE KARTY</span>
              <div className="v200-kpi-val-row">
                <b className="v200-kpi-val-main">{uniqueOwnedCount}</b>
                <span className="v200-kpi-val-sub">/ {totalCardsCount}</span>
              </div>
              <span className="v200-kpi-hint">
                {totalDuplicatesCount > 0 ? `+${totalDuplicatesCount} duplikatów do SBC` : "Unikalne karty w klaserze"}
              </span>
            </div>
          </div>

          {/* Tile 2: Procent Ukończenia Kolekcji */}
          <div className="v200-kpi-card">
            <div className="v200-kpi-icon-wrap icon-progress">
              <Trophy size={20} />
            </div>
            <div className="v200-kpi-content">
              <span className="v200-kpi-label">UKOŃCZENIE KOLEKCJI</span>
              <div className="v200-kpi-val-row">
                <b className="v200-kpi-val-main text-gold">{completionPercentage}%</b>
              </div>
              <div className="v200-kpi-mini-track">
                <div className="v200-kpi-mini-fill" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
          </div>

          {/* Tile 3: Nieotwarte Paczki */}
          <div className={`v200-kpi-card ${unopenedPacks.length > 0 ? "has-unopened" : ""}`}>
            <div className="v200-kpi-icon-wrap icon-packs">
              <Gift size={20} />
            </div>
            <div className="v200-kpi-content">
              <span className="v200-kpi-label">NIEOTWARTE PACZKI</span>
              <div className="v200-kpi-val-row">
                <b className="v200-kpi-val-main text-red-400">{unopenedPacks.length}</b>
                <span className="v200-kpi-val-sub">SZT.</span>
              </div>
              {unopenedPacks.length > 0 ? (
                <button
                  type="button"
                  disabled={isOpeningPack}
                  onClick={() => {
                    const firstPack = unopenedPacks[0];
                    const packDef = packDefinitions.find(p => p.id === firstPack.pack_type_id) || {
                      id: firstPack.pack_type_id || "standard_pack",
                      name: "Paczka DELTA",
                      description: "Oficjalna paczka kart",
                      cards_count: 4,
                      drop_rates: { common: 60, rare: 30, epic: 8, legendary: 1.8, inferno: 0.2 },
                      min_rarity: "common",
                      theme: "standard",
                      is_active: true
                    };
                    setActivePackToOpen(packDef);
                  }}
                  className="v200-kpi-open-btn"
                >
                  <Sparkles size={12} />
                  <span>OTWÓRZ TERAZ</span>
                </button>
              ) : (
                <span className="v200-kpi-hint">Wszystkie paczki otwarte</span>
              )}
            </div>
          </div>

          {/* Tile 4: Ostatnio Zdobyta Karta */}
          <div className="v200-kpi-card">
            <div className="v200-kpi-icon-wrap icon-recent">
              <Sparkles size={20} />
            </div>
            <div className="v200-kpi-content">
              <span className="v200-kpi-label">OSTATNIO ZDOBYTA</span>
              {lastAcquiredItem?.card ? (
                <div 
                  className="v200-kpi-recent-row cursor-pointer"
                  onClick={() => setInspectCard({ card: lastAcquiredItem.card, userCard: lastAcquiredItem.userCard })}
                >
                  <span className="v200-kpi-recent-name">
                    {lastAcquiredItem.card.player?.display_name || lastAcquiredItem.card.card_name}
                  </span>
                  <span 
                    className="v200-rarity-pill-sm"
                    style={{ color: getRarityTier(lastAcquiredItem.card).color, borderColor: getRarityTier(lastAcquiredItem.card).borderColor }}
                  >
                    {getRarityTier(lastAcquiredItem.card).label}
                  </span>
                </div>
              ) : (
                <span className="v200-kpi-hint">Brak kart w kolekcji</span>
              )}
            </div>
          </div>

          {/* Tile 5: Ostatnia Karta Specjalna */}
          <div className="v200-kpi-card">
            <div className="v200-kpi-icon-wrap icon-special">
              <Crown size={20} />
            </div>
            <div className="v200-kpi-content">
              <span className="v200-kpi-label">KARTA SPECJALNA</span>
              {lastSpecialItem?.card ? (
                <div 
                  className="v200-kpi-recent-row cursor-pointer"
                  onClick={() => setInspectCard({ card: lastSpecialItem.card, userCard: lastSpecialItem.userCard })}
                >
                  <span className="v200-kpi-recent-name text-yellow-300">
                    {lastSpecialItem.card.player?.display_name || lastSpecialItem.card.card_name}
                  </span>
                  <span 
                    className="v200-rarity-pill-sm"
                    style={{ color: getRarityTier(lastSpecialItem.card).color, borderColor: getRarityTier(lastSpecialItem.card).borderColor }}
                  >
                    {getRarityTier(lastSpecialItem.card).label}
                  </span>
                </div>
              ) : (
                <span className="v200-kpi-hint">Zdobądź kartę Gold/Inferno/Legend</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKCJA ZAKŁADEK I MODÓW WIDOKU                                            */}
      {/* ========================================================================= */}
      <div className="v200-collection-view-tabs">
        <button
          type="button"
          onClick={() => {
            setActiveViewTab("collection2");
            setSelectedAlbumPlayerId(null);
          }}
          className={`v200-view-mode-tab ${activeViewTab === "collection2" && !selectedAlbumPlayerId ? "active" : ""}`}
        >
          <Layers size={16} />
          <span>🃏 KOLEKCJA 2.0 & GRID ({uniqueOwnedCount}/{totalCardsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveViewTab("panini");
            setSelectedAlbumPlayerId(null);
          }}
          className={`v200-view-mode-tab ${activeViewTab === "panini" ? "active" : ""}`}
        >
          <Shield size={16} />
          <span>📖 KLASER PANINI 3D ({playerAlbums.filter(a => a.ownedCount > 0).length}/{playerAlbums.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveViewTab("roster");
            setSelectedAlbumPlayerId(null);
          }}
          className={`v200-view-mode-tab ${activeViewTab === "roster" ? "active" : ""}`}
        >
          <Users size={16} />
          <span>👥 ALBUMY ZAWODNIKÓW ({playerAlbums.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* WIDOK DEDYKOWANEGO ALBUMU POJEDYNCZEGO ZAWODNIKA                          */}
      {/* ========================================================================= */}
      {currentAlbum && (
        <div className="v104-single-player-album animate-fadeIn mb-8">
          <div className="v104-player-album-topbar devil-card">
            <button
              type="button"
              onClick={() => setSelectedAlbumPlayerId(null)}
              className="v104-album-back-btn"
            >
              <ArrowLeft size={16} /> WRÓĆ DO KOLEKCJI
            </button>
            <span className="v104-album-player-indicator">
              {currentAlbum.player.display_name} • {currentAlbum.ownedCount} / {currentAlbum.cards.length} KART
            </span>
          </div>

          <div className="v104-album-player-banner devil-card">
            <div className="v104-player-banner-info">
              <div className="v104-player-avatar-large">
                <span className="v104-avatar-initials-lg">
                  {currentAlbum.player.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="eyebrow gold">KLASER ZAWODNIKA DELTA 2018</span>
                <h3 className="v104-album-player-name">{currentAlbum.player.display_name}</h3>
                <div className="v104-album-player-meta">
                  <span className="v104-album-badge pos">{currentAlbum.player.position || "ZAWODNIK"}</span>
                  <span className="v104-album-badge num">#{currentAlbum.player.shirt_number || "DELTA"}</span>
                  <span className="v104-album-badge count">
                    <Sparkles size={13} className="inline mr-1" />
                    {currentAlbum.ownedCount} / {currentAlbum.cards.length} ({currentAlbum.completionRate}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="v104-album-progress-box">
              <div className="v104-album-progress-bar">
                <i style={{ width: `${currentAlbum.completionRate}%` }} />
              </div>
              <span className="v104-album-progress-label">
                {currentAlbum.completionRate === 100 ? "👑 KOMPLETNA KOLEKCJA!" : `Brakuje ${currentAlbum.cards.length - currentAlbum.ownedCount} kart`}
              </span>
            </div>
          </div>

          <div className="v104-album-carousel-section">
            <PlayerCardsCircular3DCarousel
              cards={currentAlbum.cards}
              ownedCardsMap={ownedCardsMap}
              onInspectCard={(card, userCard) => setInspectCard({ card, userCard })}
              onCinematicReveal={(card) => setCinematicCardToUnlock(card)}
              getCardUnlockCondition={(c) => getCardUnlockCondition(c).condition}
              layoutsMap={cardLayoutsMap}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PACZKI I BOOSTERY (5 OFICJALNYCH TYPÓW PACZEK)                         */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "collection2" && (
        <div className="v200-vault-section">
          <div className="v200-section-heading-row">
            <div>
              <div className="v200-section-eyebrow">
                <Gift size={14} className="text-yellow-400 inline mr-1" />
                OFICJALNE PACZKI & BOOSTERY DELTA
              </div>
              <h2 className="v200-section-title">PACZKI I BOOSTERY KOLEKCJONERSKIE</h2>
            </div>
            <div className="v200-vault-info-pill">
              <Coins size={14} className="text-yellow-400 mr-1" />
              <span>Otwieraj zdobyte paczki lub odblokowuj za punkty DP</span>
            </div>
          </div>

          {/* 5 Booster Pack Cards Grid */}
          <div className="delta-boosters-carousel">
            {OFFICIAL_BOOSTER_PACKS.map(pack => {
              const ownedCountForPack = unopenedPacks.filter(p => p.pack_type_id === pack.id).length;
              const canAfford = deltaPoints >= pack.priceDp;
              const isBuyingThis = buyingPackId === pack.id;

              return (
                <div 
                  key={pack.id}
                  className={`delta-booster-card theme-${pack.theme}`}
                >
                  {/* Top Foil Banner */}
                  <div className="delta-booster-top">
                    <span className="delta-booster-badge">{pack.badgeLabel}</span>
                    <span className="delta-booster-cards-count">{pack.cardsCount} KART</span>
                  </div>

                  {/* Pack Graphic Visual */}
                  <div 
                    className="delta-booster-visual"
                    onClick={() => {
                      if (ownedCountForPack > 0 && !isOpeningPack) {
                        const packDef: PackDefinition = {
                          id: pack.id,
                          name: pack.name,
                          description: pack.description,
                          cards_count: pack.cardsCount,
                          drop_rates: { common: 50, rare: 30, epic: 14, legendary: 5, inferno: 1 },
                          min_rarity: pack.theme === "inferno" ? "epic" : pack.theme === "legend" ? "legendary" : "common",
                          theme: pack.theme,
                          image_url: pack.image,
                          is_active: true
                        };
                        setActivePackToOpen(packDef);
                      }
                    }}
                    style={{ cursor: ownedCountForPack > 0 ? "pointer" : "default" }}
                  >
                    <img 
                      src={pack.image} 
                      alt={pack.name} 
                      className="delta-booster-img" 
                      loading="lazy"
                    />
                    <div className="delta-booster-shine" />

                    {/* Stock Indicator Badge */}
                    {ownedCountForPack > 0 ? (
                      <div className="delta-booster-stock-badge in-stock">
                        <Sparkles size={12} className="animate-spin" />
                        <span>{ownedCountForPack} W POSIADANIU</span>
                      </div>
                    ) : (
                      <div className="delta-booster-stock-badge empty">
                        <span>0 W POSIADANIU</span>
                      </div>
                    )}
                  </div>

                  {/* Pack Info & Details */}
                  <div className="delta-booster-body">
                    <h3 className="delta-booster-name">{pack.name}</h3>
                    <p className="delta-booster-desc">{pack.description}</p>
                    
                    <div className="delta-booster-guarantee">
                      <Zap size={13} className="text-yellow-400" />
                      <span>{pack.guaranteeText}</span>
                    </div>

                    {/* Action Buttons */}
                    {ownedCountForPack > 0 ? (
                      <button
                        type="button"
                        disabled={isOpeningPack}
                        onClick={() => {
                          const packDef: PackDefinition = {
                            id: pack.id,
                            name: pack.name,
                            description: pack.description,
                            cards_count: pack.cardsCount,
                            drop_rates: { common: 50, rare: 30, epic: 14, legendary: 5, inferno: 1 },
                            min_rarity: pack.theme === "inferno" ? "epic" : pack.theme === "legend" ? "legendary" : "common",
                            theme: pack.theme,
                            image_url: pack.image,
                            is_active: true
                          };
                          setActivePackToOpen(packDef);
                        }}
                        className="delta-booster-btn-open"
                      >
                        <Sparkles size={16} />
                        <span>OTWÓRZ TERAZ ({ownedCountForPack})</span>
                      </button>
                    ) : (
                      <div className="delta-booster-buy-group">
                        <button
                          type="button"
                          onClick={() => handleBuyPack(pack.id)}
                          disabled={isBuyingThis || isOpeningPack || !canAfford}
                          className={`delta-booster-btn-buy ${canAfford ? "affordable" : "unaffordable"}`}
                        >
                          <Coins size={15} />
                          <span>
                            {isBuyingThis ? "ODBLOKOWYWANIE..." : `KUP ZA ${pack.priceDp} DP`}
                          </span>
                        </button>
                        <span className="delta-booster-subtext">
                          LUB ZDOBĄDŹ DARMOWĄ ZA MECZE
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OSTATNIO ZDOBYTE KARTY                                                 */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "collection2" && recentlyAcquiredList.length > 0 && (
        <div className="v200-recently-acquired-section">
          <div className="v200-section-heading-row">
            <div>
              <div className="v200-section-eyebrow">
                <Sparkles size={14} className="text-yellow-400 inline mr-1" />
                HISTORIA ZDOBYWANIA
              </div>
              <h3 className="v200-section-title">OSTATNIO ZDOBYTE KARTY</h3>
            </div>
            <span className="text-xs text-slate-400">
              Ostatnie {recentlyAcquiredList.length} kart w Twoim klaserze
            </span>
          </div>

          <div className="delta-recent-cards-row">
            {recentlyAcquiredList.map(({ card, userCard }, idx) => {
              const tier = getRarityTier(card);
              const isDuplicate = userCard && userCard.duplicates_count > 0;

              return (
                <div
                  key={`${card.id}_${idx}`}
                  className="delta-recent-card-item"
                  onClick={() => setInspectCard({ card, userCard })}
                >
                  <div className="delta-recent-card-wrapper">
                    <CollectibleCard3D
                      card={card}
                      userCard={userCard}
                      isLocked={false}
                      size="sm"
                      interactive={false}
                      showFlip={false}
                      layoutOverride={getLayoutForCard(card)}
                    />
                    {isDuplicate ? (
                      <span className="delta-badge-dup">
                        DUPLIKAT (x{userCard.duplicates_count + 1})
                      </span>
                    ) : (
                      <span className="delta-badge-new">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="delta-recent-card-meta">
                    <strong className="delta-recent-pname">
                      {card.player?.display_name || card.card_name}
                    </strong>
                    <span 
                      className="delta-recent-rarity"
                      style={{ color: tier.color }}
                    >
                      {tier.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BRAKUJĄCE KARTY (LOCKED HIGHLIGHT)                                      */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "collection2" && missingCardsList.length > 0 && (
        <div className="v200-missing-cards-section">
          <div className="v200-section-heading-row">
            <div>
              <div className="v200-section-eyebrow text-slate-400">
                <Lock size={14} className="inline mr-1" />
                DO ODKRYCIA W GRZE
              </div>
              <h3 className="v200-section-title">BRAKUJĄCE KARTY DO KOMPLETU ({missingCardsList.length})</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedOwnershipFilter("missing");
                const gridElem = document.getElementById("delta-cards-grid-anchor");
                if (gridElem) gridElem.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs text-yellow-400 hover:underline font-bold"
            >
              Zobacz wszystkie brakujące w gridzie →
            </button>
          </div>

          <div className="delta-missing-cards-row">
            {missingCardsList.slice(0, 6).map(card => {
              const tier = getRarityTier(card);
              const info = getCardUnlockCondition(card);

              return (
                <div
                  key={card.id}
                  className="delta-missing-card-item"
                  onClick={() => setCinematicCardToUnlock(card)}
                >
                  <div className="delta-missing-card-wrapper">
                    <CollectibleCard3D
                      card={card}
                      userCard={undefined}
                      isLocked={true}
                      size="sm"
                      interactive={false}
                      showFlip={false}
                      layoutOverride={getLayoutForCard(card)}
                    />
                    <div className="delta-locked-overlay">
                      <Lock size={22} className="text-slate-300 mb-1" />
                      <span className="delta-locked-label">ZABLOKOWANA</span>
                    </div>
                  </div>
                  <div className="delta-missing-meta">
                    <strong className="delta-missing-pname">
                      {card.player?.display_name || card.card_name}
                    </strong>
                    <span className="delta-missing-source">
                      Wypada z: {info.packType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. GŁÓWNY GRID KART & FILTRY                                              */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "collection2" && (
        <div className="v200-all-cards-section" id="delta-cards-grid-anchor">
          {/* Filter & Sort Bar */}
          <div className="delta-collection-toolbar">
            <div className="toolbar-search-row">
              {/* Search */}
              <div className="delta-search-box">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Szukaj karty, zawodnika, edycji..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Player Filter Dropdown */}
              <div className="delta-filter-select-wrap">
                <span className="filter-label">ZAWODNIK:</span>
                <select
                  value={selectedPlayerFilter}
                  onChange={e => setSelectedPlayerFilter(e.target.value)}
                  className="delta-select"
                >
                  <option value="all">Wszyscy Zawodnicy ({realPlayers.length})</option>
                  {realPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} (#{p.shirt_number || "GM"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="delta-filter-select-wrap">
                <span className="filter-label">SORTUJ:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="delta-select"
                >
                  <option value="newest">Najnowsze Zdobyte</option>
                  <option value="rarity_desc">Rzadkość (Od Najwyższej)</option>
                  <option value="ovr_desc">Ocena OVR (Najwyższa)</option>
                  <option value="player_asc">Zawodnik (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Rarity Filter Tabs (6 Tiers) */}
            <div className="delta-filter-chips-row">
              <span className="filter-chip-label">RZADKOŚĆ:</span>
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
                  className={`delta-filter-chip ${selectedRarityFilter === tier.id ? "active" : ""}`}
                  style={{
                    borderColor: selectedRarityFilter === tier.id ? tier.color : undefined,
                    color: selectedRarityFilter === tier.id ? tier.color : undefined
                  }}
                >
                  <span>{tier.label}</span>
                </button>
              ))}
            </div>

            {/* Ownership Filter Tabs */}
            <div className="delta-filter-chips-row">
              <span className="filter-chip-label">STAN:</span>
              {[
                { id: "all", label: `Wszystkie (${allCards.length})` },
                { id: "owned", label: `Zdobyte (${uniqueOwnedCount})` },
                { id: "missing", label: `Brakujące (${missingCardsList.length})` },
                { id: "new", label: "Nowe (NEW)" },
                { id: "duplicates", label: `Duplikaty (${totalDuplicatesCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedOwnershipFilter(tab.id as any)}
                  className={`delta-filter-chip ownership ${selectedOwnershipFilter === tab.id ? "active" : ""}`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Cards */}
          {loading ? (
            <div className="delta-collection-loading">
              <RefreshCw size={36} className="animate-spin text-yellow-400" />
              <span>Ładowanie kart DELTA...</span>
            </div>
          ) : filteredGridCards.length === 0 ? (
            <div className="delta-collection-empty">
              <Search size={44} className="text-slate-500 mb-2" />
              <h3>Brak kart spełniających wybrane kryteria</h3>
              <p>Zmień filtry rzadkości, zawodnika lub wyszukiwane hasło.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlayerFilter("all");
                  setSelectedRarityFilter("all");
                  setSelectedTypeFilter("all");
                  setSelectedOwnershipFilter("all");
                }}
                className="delta-btn-reset-filters"
              >
                Zresetuj wszystkie filtry
              </button>
            </div>
          ) : (
            <div className="delta-cards-main-grid">
              {filteredGridCards.map(card => {
                const isOwned = ownedCardsMap.has(card.id);
                const userCard = ownedCardsMap.get(card.id) || null;
                const tier = getRarityTier(card);
                const isFeatured = featuredCardId === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (isOwned) {
                        setInspectCard({ card, userCard });
                      } else {
                        setCinematicCardToUnlock(card);
                      }
                    }}
                    className={`delta-card-cell ${isOwned ? "is-owned" : "is-locked"}`}
                  >
                    <div className="delta-card-cell-inner">
                      <CollectibleCard3D
                        card={card}
                        userCard={userCard}
                        isLocked={!isOwned}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                        layoutOverride={getLayoutForCard(card)}
                      />

                      {/* Locked Frosted Glass Overlay */}
                      {!isOwned && (
                        <div className="delta-grid-locked-shield">
                          <Lock size={20} className="text-slate-300" />
                          <span>ZABLOKOWANA</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      {isFeatured && (
                        <div className="delta-featured-ribbon" title="Wyróżniona Karta">
                          <Star size={11} className="fill-yellow-400 text-yellow-400" />
                        </div>
                      )}

                      {isOwned && userCard && userCard.duplicates_count > 0 && (
                        <div className="delta-dup-tag">
                          x{userCard.duplicates_count + 1}
                        </div>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="delta-card-cell-footer">
                      <div className="delta-footer-pname">
                        {card.player?.display_name || card.card_name}
                      </div>
                      <div className="delta-footer-meta-row">
                        <span 
                          className="delta-rarity-pill-xs"
                          style={{ color: tier.color, borderColor: tier.borderColor }}
                        >
                          {tier.label}
                        </span>
                        {isOwned ? (
                          <span className="delta-status-owned">
                            <CheckCircle2 size={11} className="text-green-400 inline mr-0.5" /> Posiadana
                          </span>
                        ) : (
                          <span className="delta-status-locked">
                            <Lock size={11} className="text-slate-400 inline mr-0.5" /> Brak
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          onOpenPacks={() => setActivePackToOpen(packDefinitions[0] || null)}
          onOpenSBC={() => setShowSBC(true)}
          onOpenTradeHub={() => setShowTradeHub(true)}
          onClaimPaniniReward={() => {
            const collected = playerAlbums.filter(a => a.ownedCount > 0).length;
            if (collected >= 10) {
              setPaniniRewardClaimed(true);
              setDeltaPoints(p => p + 500);
              cardSound.playWalkoutFanfare();
              alert("👑 GRATULACJE! Odblokowano nagrodę Mistrza Klaseru Rocznika 2018: +500 DP oraz Złotą Odznakę!");
            } else {
              alert(`Zbierz jeszcze ${10 - collected} zawodników, aby odblokować nagrodę mistrzowską (+500 DP)!`);
            }
          }}
          getLayoutForCard={getLayoutForCard}
        />
      )}

      {/* ========================================================================= */}
      {/* WIDOK: ROSTER OVERVIEW (ALBUMY ZAWODNIKÓW)                                */}
      {/* ========================================================================= */}
      {!selectedAlbumPlayerId && activeViewTab === "roster" && (
        <div className="v200-roster-overview-mode animate-fadeIn">
          <div className="v104-roster-grid">
            {playerAlbums.map(album => {
              const representativeCard = album.topOwnedCard || album.cards[0];
              const isRepLocked = !album.topOwnedCard;

              return (
                <div
                  key={album.player.id}
                  onClick={() => setSelectedAlbumPlayerId(album.player.id)}
                  className="v104-player-showcase-card devil-card"
                >
                  <div className="v104-showcase-card-preview">
                    <CollectibleCard3D
                      card={representativeCard}
                      userCard={album.topOwnedCard ? (ownedCardsMap.get(representativeCard.id) || null) : null}
                      isLocked={isRepLocked}
                      size="md"
                      interactive={false}
                      showFlip={false}
                      layoutOverride={getLayoutForCard(representativeCard)}
                    />
                  </div>

                  <div className="v104-showcase-info">
                    <div className="v104-showcase-name-row">
                      <h4>{album.player.display_name}</h4>
                      <span className="v104-showcase-number">
                        #{album.player.shirt_number || "GM"}
                      </span>
                    </div>

                    <span className="v104-showcase-pos">
                      {album.player.position || "ZAWODNIK DELTA"}
                    </span>

                    <div className="v104-showcase-progress">
                      <div className="v104-showcase-bar-track">
                        <i style={{ width: `${album.completionRate}%` }} />
                      </div>
                      <div className="v104-showcase-bar-text">
                        <span>{album.ownedCount} / {album.cards.length} kart</span>
                        <b>{album.completionRate}%</b>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="v104-showcase-open-btn"
                    >
                      OTWÓRZ KLASER <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SZCZEGÓŁ KARTY (PREMIUM MODAL ZE WSZYSTKIMI DANYMI)                    */}
      {/* ========================================================================= */}
      {inspectCard && typeof document !== "undefined" && createPortal(
        <div 
          className="delta-card-detail-backdrop"
          onClick={() => {
            setInspectCard(null);
            setInspectFlipped(false);
          }}
        >
          <div 
            className="delta-card-detail-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => {
                setInspectCard(null);
                setInspectFlipped(false);
              }}
              className="delta-detail-close"
              aria-label="Zamknij"
            >
              <X size={22} />
            </button>

            {/* Left Column: 3D Interactive Card Preview */}
            <div className="delta-detail-card-column">
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

              <div className="delta-detail-flip-hint">
                <span>✋ Chwyć kartę myszką/palcem i obracaj w 3D • Kliknij aby odwrócić</span>
              </div>
            </div>

            {/* Right Column: Full Card Stats & Actions */}
            <div className="delta-detail-info-column">
              {/* Header Badges */}
              <div className="delta-detail-badges-row">
                <span 
                  className="delta-detail-rarity-badge"
                  style={{
                    color: getRarityTier(inspectCard.card).textColor,
                    background: getRarityTier(inspectCard.card).badgeBg,
                    borderColor: getRarityTier(inspectCard.card).borderColor
                  }}
                >
                  <Sparkles size={13} className="inline mr-1" />
                  {getRarityTier(inspectCard.card).label}
                </span>

                <span className="delta-detail-type-badge">
                  {inspectCard.card.title || inspectCard.card.card_type || "KARTA KLUBOWA"}
                </span>

                {featuredCardId === inspectCard.card.id && (
                  <span className="delta-detail-featured-badge">
                    <Star size={12} className="fill-yellow-400 text-yellow-400 inline mr-1" />
                    WYRÓŻNIONA
                  </span>
                )}
              </div>

              {/* Player Name & Number */}
              <h2 className="delta-detail-title">
                {inspectCard.card.player?.display_name || inspectCard.card.card_name}
              </h2>
              <p className="delta-detail-subtitle">
                Pozycja: <b>{inspectCard.card.player?.position || "ZAWODNIK DELTA"}</b> • Numer: <b>#{inspectCard.card.player?.shirt_number || "GM"}</b>
              </p>

              {/* Detailed Stats Grid */}
              <div className="delta-detail-data-box">
                <div className="delta-data-row">
                  <span className="data-key">Status Posiadania:</span>
                  <strong className="data-val text-green-400">
                    <Check size={14} className="inline mr-1" />
                    W POSIADANIU
                  </strong>
                </div>

                <div className="delta-data-row">
                  <span className="data-key">Liczba Egzemplarzy:</span>
                  <strong className="data-val">
                    {inspectCard.userCard 
                      ? `${(inspectCard.userCard.duplicates_count || 0) + 1} szt. (1 unikalna + ${inspectCard.userCard.duplicates_count || 0} duplikaty)`
                      : "1 sztuka"}
                  </strong>
                </div>

                <div className="delta-data-row">
                  <span className="data-key">Data Zdobycia:</span>
                  <strong className="data-val">
                    {inspectCard.userCard?.acquired_at 
                      ? new Date(inspectCard.userCard.acquired_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })
                      : "Sezon 2026/27"}
                  </strong>
                </div>

                <div className="delta-data-row">
                  <span className="data-key">Powiązane Osiągnięcie:</span>
                  <strong className="data-val text-yellow-300">
                    {getCardUnlockCondition(inspectCard.card).achievement}
                  </strong>
                </div>

                <div className="delta-data-row">
                  <span className="data-key">Źródło Wypadania:</span>
                  <strong className="data-val text-slate-300">
                    {getCardUnlockCondition(inspectCard.card).packType}
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="delta-detail-actions-group">
                {/* 1. Ustaw jako wyróżnioną */}
                <button
                  type="button"
                  onClick={() => handleSetFeaturedCard(inspectCard.card.id)}
                  className={`delta-action-btn featured ${featuredCardId === inspectCard.card.id ? "active" : ""}`}
                >
                  <Star size={16} className={featuredCardId === inspectCard.card.id ? "fill-yellow-400" : ""} />
                  <span>
                    {featuredCardId === inspectCard.card.id ? "⭐ TWOJA WYRÓŻNIONA KARTA" : "USTAW JAKO WYRÓŻNIONĄ"}
                  </span>
                </button>

                {/* 2. Profil Zawodnika */}
                {inspectCard.card.player_id && onOpenPlayerProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectCard(null);
                      if (inspectCard.card.player_id) {
                        onOpenPlayerProfile(inspectCard.card.player_id);
                      }
                    }}
                    className="delta-action-btn secondary"
                  >
                    <User size={16} />
                    <span>PROFIL ZAWODNIKA</span>
                  </button>
                )}

                {/* 3. Flip button */}
                <button
                  type="button"
                  onClick={() => setInspectFlipped(!inspectFlipped)}
                  className="delta-action-btn outline"
                >
                  <RefreshCw size={15} />
                  <span>{inspectFlipped ? "OBRÓĆ NA AWERS" : "OBRÓĆ NA REWERS"}</span>
                </button>

                {/* 4. Podpisz kartę */}
                <button
                  type="button"
                  onClick={() => setSignatureCard(inspectCard.card)}
                  className="delta-action-btn signature"
                >
                  <PenTool size={15} />
                  <span>PODPISZ KARTĘ</span>
                </button>

                {/* 5. Zablokuj przed SBC */}
                {inspectCard.userCard && (
                  <button
                    type="button"
                    onClick={() => handleToggleLockCard(inspectCard.userCard)}
                    className={`delta-action-btn ${(inspectCard.userCard as any).is_locked ? "lock-danger" : "lock-safe"}`}
                  >
                    {(inspectCard.userCard as any).is_locked ? <Lock size={15} /> : <Unlock size={15} />}
                    <span>
                      {(inspectCard.userCard as any).is_locked ? "KARTA ZABLOKOWANA (SBC)" : "ZABLOKUJ PRZED SBC"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* PACK OPENING EXPERIENCE MODAL                                             */}
      {/* ========================================================================= */}
      {activePackToOpen && (
        <PackOpeningExperience
          pack={activePackToOpen}
          unopenedCount={Math.max(0, unopenedPacks.length - 1)}
          collectionProgress={{
            currentOwned: uniqueOwnedCount,
            totalCards: totalCardsCount
          }}
          getLayoutForCard={getLayoutForCard}
          onPackConsumed={(remaining) => {
            if (typeof remaining === "number") {
              setUnopenedPacks(prev => prev.slice(0, remaining));
            } else {
              setUnopenedPacks(prev => prev.slice(1));
            }
          }}
          onClose={() => {
            setActivePackToOpen(null);
            fetchCollection();
          }}
          onOpenAnother={() => {
            if (unopenedPacks.length > 1) {
              const nextPack = unopenedPacks[1];
              const packDef = packDefinitions.find(p => p.id === nextPack.pack_type_id) || packDefinitions[0];
              setUnopenedPacks(prev => prev.slice(1));
              setActivePackToOpen(packDef);
            } else {
              setUnopenedPacks([]);
              setActivePackToOpen(null);
            }
            fetchCollection();
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

      {/* Pozostałe modale systemowe (Daily Spin, Mini-Games, SBC, Trade Hub, Card Battle, Squad Builder itp.) */}
      {showDailySpin && (
        <DailyInfernoSpin
          onClose={() => setShowDailySpin(false)}
          onRewardClaimed={(newBal) => {
            setDeltaPoints(newBal);
            fetchCollection();
          }}
          onOpenPack={(pack) => {
            setShowDailySpin(false);
            setActivePackToOpen(pack);
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
            setActivePackToOpen(def);
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

      {/* Safe bottom spacer for mobile navigation */}
      <div className="delta-collection-bottom-spacer" />
    </section>
  );
}
