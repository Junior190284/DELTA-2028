"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Target
} from "lucide-react";
import { CardDefinition, CardRarity, UserCard, UserUnopenedPack, PackDefinition, RARITY_CONFIG, getPackImageUrl } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";
import PackOpeningExperience from "./PackOpeningExperience";
import CardUnlockCinematicModal from "./CardUnlockCinematicModal";
import DailyInfernoSpin from "./DailyInfernoSpin";
import SquadBuilder3D from "./SquadBuilder3D";
import CardBattleCompareModal from "./CardBattleCompareModal";
import DeltaTradeHubModal from "./DeltaTradeHubModal";
import AchievementsModal from "./AchievementsModal";
import DeltaSkillMiniGamesModal from "./DeltaSkillMiniGamesModal";

const PACK_PRICES: Record<string, number> = {
  standard_pack: 50,
  matchday_booster: 80,
  gold_booster: 120,
  inferno_booster: 250,
  legend_booster: 350,
  legend_pack: 350
};

interface DeltaCollectionAlbumProps {
  currentUserId?: string;
  players?: { id: string; display_name: string; shirt_number: string | null; position: string | null; photo_path?: string | null }[];
  onOpenPlayerProfile?: (playerId: string) => void;
}

export default function DeltaCollectionAlbum({
  currentUserId,
  players = [],
  onOpenPlayerProfile
}: DeltaCollectionAlbumProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [allCards, setAllCards] = useState<CardDefinition[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [unopenedPacks, setUnopenedPacks] = useState<UserUnopenedPack[]>([]);
  const [packDefinitions, setPackDefinitions] = useState<PackDefinition[]>([]);
  const [deltaPoints, setDeltaPoints] = useState(0);

  // View Modes: "panini" (Team Squad Album), "roster" (Player Albums), "allCards" (Grid)
  const [activeViewTab, setActiveViewTab] = useState<"panini" | "roster" | "allCards">("panini");
  const [paniniRewardClaimed, setPaniniRewardClaimed] = useState(false);

  // Active Player Album View (null = show all player cards, playerId = show that player's cards carousel)
  const [selectedAlbumPlayerId, setSelectedAlbumPlayerId] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [selectedOwnership, setSelectedOwnership] = useState<"all" | "owned" | "missing">("all");
  
  // Modals
  const [inspectCard, setInspectCard] = useState<{ card: CardDefinition; userCard: UserCard | null } | null>(null);
  const [inspectFlipped, setInspectFlipped] = useState(false);
  const [activePackToOpen, setActivePackToOpen] = useState<PackDefinition | null>(null);
  const [cinematicCardToUnlock, setCinematicCardToUnlock] = useState<CardDefinition | null>(null);
  const [showDailySpin, setShowDailySpin] = useState(false);
  const [showSquadBuilder, setShowSquadBuilder] = useState(false);
  const [showTradeHub, setShowTradeHub] = useState(false);
  const [showBattleCompare, setShowBattleCompare] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSkillGames, setShowSkillGames] = useState(false);

  const getCardUnlockCondition = (card: CardDefinition): string => {
    const t = (card.card_name || card.title || card.card_type || "").toLowerCase();
    const r = (card.rarity || "").toLowerCase();
    if (r === "inferno" || t.includes("inferno")) {
      return "Odblokuj przez: Osiągnięcie Inferno Master lub Hat-trick w meczu";
    }
    if (t.includes("training") || card.card_type === "training") {
      return "Odblokuj przez: 10 oficjalnych treningów DELTA GM";
    }
    if (t.includes("captain") || card.card_type === "captain") {
      return "Odblokuj przez: Wyjście w pierwszym składzie z opaską kapitana";
    }
    if (t.includes("goal") || t.includes("striker")) {
      return "Zdobądź: Hat-trick lub Dublet w meczu ligowym";
    }
    if (t.includes("matchday") || card.card_type === "matchday") {
      return "Odblokuj przez: Udział w 10 meczach oficjalnych";
    }
    if (r === "legendary") {
      return "Odblokuj przez: Tytuł MVP meczu lub 25 rozegranych spotkań";
    }
    return "Odblokuj przez: Oficjalny debiut lub otwarcie paczki DELTA";
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
      }
    } catch (e) {
      console.error("Error loading collection:", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync automated activity rewards
  const handleSyncRewards = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/cards/sync-rewards", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.granted && data.granted.length > 0) {
          alert(`🎉 Przyznano ${data.granted.length} nowe paczki za Twoją aktywność meczową i treningową!`);
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
    const price = PACK_PRICES[packId] || 100;
    if (deltaPoints < price) {
      alert(`Potrzebujesz ${price} DP, aby odblokować tę paczkę. Obecnie masz ${deltaPoints} DP. Zbieraj punkty za duplikaty!`);
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
      await fetchCollection();
    } catch (e: any) {
      alert(e.message || "Nie udało się kupić paczki.");
    } finally {
      setBuyingPackId(null);
    }
  };

  useEffect(() => {
    fetchCollection();

    // Auto sync match/training rewards on mount
    fetch("/api/cards/sync-rewards", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.granted && data.granted.length > 0) {
          fetchCollection();
        }
      })
      .catch(() => {});
  }, []);

  // Map owned cards by card_id
  const ownedCardsMap = useMemo(() => {
    const map = new Map<string, UserCard>();
    userCards.forEach(uc => {
      map.set(uc.card_id, uc);
    });
    return map;
  }, [userCards]);

  const ownedCardsList = useMemo(() => {
    return allCards.filter(c => ownedCardsMap.has(c.id));
  }, [allCards, ownedCardsMap]);

  // Total completion statistics
  const totalCount = allCards.length;
  const ownedCount = userCards.length;
  const completionPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  // Group cards by player
  const playerAlbums = useMemo(() => {
    const map = new Map<string, {
      player: { id: string; display_name: string; shirt_number: string | null; position: string | null; photo_path?: string | null };
      cards: CardDefinition[];
      ownedCount: number;
      topOwnedCard: CardDefinition | null;
      completionRate: number;
    }>();

    // Initialize with all team players
    players.forEach(p => {
      map.set(p.id, {
        player: p,
        cards: [],
        ownedCount: 0,
        topOwnedCard: null,
        completionRate: 0
      });
    });

    // Populate with card definitions
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
        // Track highest rarity owned card
        if (!entry.topOwnedCard) {
          entry.topOwnedCard = card;
        }
      }
    });

    // Calculate rates
    const list = Array.from(map.values()).filter(a => a.cards.length > 0);
    list.forEach(a => {
      a.completionRate = a.cards.length > 0 ? Math.round((a.ownedCount / a.cards.length) * 100) : 0;
    });

    return list;
  }, [allCards, ownedCardsMap, players]);

  // Filtered player albums for showcase
  const filteredPlayerAlbums = useMemo(() => {
    return playerAlbums.filter(album => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = album.player.display_name.toLowerCase();
        if (!pName.includes(q)) return false;
      }

      if (selectedOwnership === "owned" && album.ownedCount === 0) return false;
      if (selectedOwnership === "missing" && album.ownedCount === album.cards.length) return false;

      return true;
    });
  }, [playerAlbums, searchQuery, selectedOwnership]);

  // Active selected player album
  const currentAlbum = useMemo(() => {
    if (!selectedAlbumPlayerId) return null;
    return playerAlbums.find(a => a.player.id === selectedAlbumPlayerId) || null;
  }, [playerAlbums, selectedAlbumPlayerId]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Navigation between players in album mode
  const handlePrevPlayer = () => {
    if (!currentAlbum) return;
    const currentIndex = playerAlbums.findIndex(a => a.player.id === currentAlbum.player.id);
    if (currentIndex > 0) {
      setSelectedAlbumPlayerId(playerAlbums[currentIndex - 1].player.id);
    } else {
      setSelectedAlbumPlayerId(playerAlbums[playerAlbums.length - 1].player.id);
    }
  };

  const handleNextPlayer = () => {
    if (!currentAlbum) return;
    const currentIndex = playerAlbums.findIndex(a => a.player.id === currentAlbum.player.id);
    if (currentIndex < playerAlbums.length - 1) {
      setSelectedAlbumPlayerId(playerAlbums[currentIndex + 1].player.id);
    } else {
      setSelectedAlbumPlayerId(playerAlbums[0].player.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      // Swiped left -> Next Player
      handleNextPlayer();
      cardSound.playFlip();
      cardSound.playHaptic("light");
    } else if (diff < -45) {
      // Swiped right -> Prev Player
      handlePrevPlayer();
      cardSound.playFlip();
      cardSound.playHaptic("light");
    }
    setTouchStartX(null);
  };

  return (
    <section className="section v8-section-page v104-collection-page animate-fadeIn">
      {/* ================= HERO & VIP ULTIMATE SHOWCASE ================= */}
      <div className="v200-collection-vip-hero">
        <div className="v200-hero-backdrop-glow" />
        
        {/* Top Header Row */}
        <div className="v200-hero-main-row">
          <div className="v200-hero-branding">
            <div className="v200-vip-badge">
              <Sparkles size={14} className="text-yellow-400 animate-spin" />
              <span>OFICJALNY KLASER KART KLUBOWYCH 2026</span>
            </div>
            <h2 className="v200-hero-title">
              DELTA <span className="v200-gold-text">COLLECTION</span>
            </h2>
            <p className="v200-hero-subtitle">
              Zbieraj unikalne cyfrowe karty zawodników DELTA Warszawa 2018 GM. Otwieraj paczki za mecze, treningi i osiągnięcia, graj w pojedynki i wymieniaj punkty Delta Points!
            </p>
          </div>

          {/* Luxury 3D Stat Cards */}
          <div className="v200-hero-stats-grid">
            {/* Completion Rate KPI */}
            <div className="v200-stat-card album-progress">
              <div className="v200-stat-card-header">
                <span className="v200-stat-label">POSTĘP KOLEKCJI</span>
                <span className="v200-tier-badge">
                  {completionPercentage >= 100 ? "👑 MISTRZ" : completionPercentage >= 50 ? "🥈 ZAAWANSOWANY" : "🥉 POCZĄTKUJĄCY"}
                </span>
              </div>
              <div className="v200-stat-number-row">
                <span className="v200-stat-huge">{ownedCount}</span>
                <span className="v200-stat-sub">/ {totalCount} KART</span>
              </div>
              <div className="v200-progress-track">
                <div 
                  className="v200-progress-fill" 
                  style={{ width: `${completionPercentage}%` }} 
                />
              </div>
              <div className="v200-stat-footer-txt">
                <span>{completionPercentage}% zebranych kart w klaserze</span>
              </div>
            </div>

            {/* Delta Points DP KPI */}
            <div className="v200-stat-card delta-points">
              <div className="v200-stat-card-header">
                <span className="v200-stat-label gold"><Coins size={14} className="inline mr-1" /> SKARBIEC DP</span>
                <button 
                  type="button"
                  onClick={handleSyncRewards}
                  disabled={syncing}
                  className="v200-sync-btn"
                  title="Sprawdź i odbierz nagrody za ostatnie mecze i treningi"
                >
                  <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                  <span>{syncing ? "SPRAWDZAM..." : "SYNCHRONIZUJ"}</span>
                </button>
              </div>
              <div className="v200-stat-number-row">
                <span className="v200-stat-huge text-gold">{deltaPoints}</span>
                <span className="v200-stat-sub">DP</span>
              </div>
              <div className="v200-dp-quick-actions">
                <span className="v200-dp-hint">Wymieniaj punkty na booster packi i karty legend!</span>
              </div>
            </div>
          </div>
        </div>

        {/* UNOPENED PACKS HIGH-PRIORITY ALERT BANNER */}
        {unopenedPacks.length > 0 && (
          <div className="v200-unopened-alert-card animate-pulseGlow">
            <div className="v200-unopened-left">
              <div className="v200-gift-icon-bubble">
                <Gift size={24} className="text-yellow-300 animate-bounce" />
              </div>
              <div>
                <h4 className="v200-unopened-heading">
                  🎁 Masz nieotwarte paczki kart ({unopenedPacks.length})!
                </h4>
                <p className="v200-unopened-text">
                  Czekają na Ciebie nowe karty piłkarskie do odblokowania w klaserze!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const firstPack = unopenedPacks[0];
                const packDef = packDefinitions.find(p => p.id === firstPack.pack_type_id) || packDefinitions[0];
                setActivePackToOpen(packDef);
              }}
              className="v200-unopened-open-btn"
            >
              <Sparkles size={18} />
              <span>OTWÓRZ PACZKĘ ({unopenedPacks.length})</span>
            </button>
          </div>
        )}

        {/* ================= LUXURY 3D ACTION CARDS HUB ================= */}
        <div className="v200-gaming-vip-grid">
          {/* Tile 1: Daily Spin */}
          <button
            type="button"
            onClick={() => setShowDailySpin(true)}
            className="v200-vip-action-tile tile-spin"
          >
            <div className="v200-tile-glow" />
            <div className="v200-tile-icon-box spin-glow">
              <Flame size={26} className="text-red-500 animate-pulse" />
            </div>
            <div className="v200-tile-content">
              <div className="v200-tile-tag tag-fire">DARMOWY BONUS DNIA</div>
              <h3 className="v200-tile-title">KOŁO FORTUNY 🔥</h3>
              <p className="v200-tile-desc">Zakręć kołem i zdobywaj codzienne nagrody, paczki oraz DP!</p>
            </div>
            <div className="v200-tile-chevron">→</div>
          </button>

          {/* Tile 2: Squad Builder 3D */}
          <button
            type="button"
            onClick={() => setShowSquadBuilder(true)}
            className="v200-vip-action-tile tile-squad"
          >
            <div className="v200-tile-glow" />
            <div className="v200-tile-icon-box squad-glow">
              <Users size={26} className="text-emerald-400" />
            </div>
            <div className="v200-tile-content">
              <div className="v200-tile-tag tag-squad">MURAWA 3D</div>
              <h3 className="v200-tile-title">MOJA DRUŻYNA</h3>
              <p className="v200-tile-desc">Ustaw wyjściowy skład ze swoich kart w formacji 1-2-3-1!</p>
            </div>
            <div className="v200-tile-chevron">→</div>
          </button>

          {/* Tile 3: Trade Hub */}
          <button
            type="button"
            onClick={() => setShowTradeHub(true)}
            className="v200-vip-action-tile tile-trade"
          >
            <div className="v200-tile-glow" />
            <div className="v200-tile-icon-box trade-glow">
              <ArrowLeftRight size={26} className="text-cyan-400" />
            </div>
            <div className="v200-tile-content">
              <div className="v200-tile-tag tag-trade">SZATNIA DELTA</div>
              <h3 className="v200-tile-title">GIEŁDA WYMIANY</h3>
              <p className="v200-tile-desc">Wymieniaj dublety kart ze swoimi kolegami z zespołu!</p>
            </div>
            <div className="v200-tile-chevron">→</div>
          </button>

          {/* Tile 4: Card Battle */}
          <button
            type="button"
            onClick={() => setShowBattleCompare(true)}
            className="v200-vip-action-tile tile-battle"
          >
            <div className="v200-tile-glow" />
            <div className="v200-tile-icon-box battle-glow">
              <Swords size={26} className="text-purple-400" />
            </div>
            <div className="v200-tile-content">
              <div className="v200-tile-tag tag-battle">HEAD-TO-HEAD</div>
              <h3 className="v200-tile-title">POJEDYNEK KART</h3>
              <p className="v200-tile-desc">Porównuj statystyki OVR i rozgrywaj emocjonujące starcia!</p>
            </div>
            <div className="v200-tile-chevron">→</div>
          </button>

          {/* Tile 5: Achievements */}
          <button
            type="button"
            onClick={() => setShowAchievements(true)}
            className="v200-vip-action-tile tile-achievements"
          >
            <div className="v200-tile-glow" />
            <div className="v200-tile-icon-box ach-glow">
              <Trophy size={26} className="text-yellow-400 animate-bounce" />
            </div>
            <div className="v200-tile-content">
              <div className="v200-tile-tag tag-gold">WYZWANIA & MISJE</div>
              <h3 className="v200-tile-title">ODZNAKI & NAGRODY</h3>
              <p className="v200-tile-desc">Odbieraj Delta Points za mecze, treningi oraz osiągnięcia!</p>
            </div>
            <div className="v200-tile-chevron">→</div>
          </button>

          {/* Tile 6: Skill Mini-Games */}
          <button
            type="button"
            onClick={() => {
              setShowSkillGames(true);
              cardSound.playFlip();
              cardSound.playHaptic("medium");
            }}
            className="v200-vip-action-tile tile-skill"
          >
            <div className="v200-tile-glow" />
            <div className="v200-tile-icon-box skill-glow">
              <Target size={26} className="text-amber-400 animate-pulse" />
            </div>
            <div className="v200-tile-content">
              <div className="v200-tile-tag tag-skill">MINI-GRY 3D (+DP)</div>
              <h3 className="v200-tile-title">TRENING CELNOŚCI 🎯</h3>
              <p className="v200-tile-desc">Rzuty wolne w okienko i refleks bramkarza! Zdobywaj punkty DP!</p>
            </div>
            <div className="v200-tile-chevron">→</div>
          </button>
        </div>

        {/* ================= 3D BOOSTER PACKS VAULT ================= */}
        <div className="v200-vault-section">
          <div className="v200-vault-header">
            <div>
              <div className="v200-vault-eyebrow">
                <Gift size={14} className="text-yellow-400 inline mr-1" />
                OFICJALNY SKARBIEC BOOSTERÓW
              </div>
              <h3 className="v200-vault-title">PACZKI KART DELTA WARSZAWA</h3>
            </div>
            <div className="v200-vault-info-pill">
              <Sparkles size={13} className="text-yellow-400 mr-1" />
              <span>Zdobywaj paczki za aktywność lub wymieniaj za DP</span>
            </div>
          </div>

          <div className="v200-vault-grid">
            {packDefinitions.map(pack => {
              const packCount = unopenedPacks.filter(p => p.pack_type_id === pack.id).length;
              const isInferno = pack.id === "inferno_booster" || pack.theme === "inferno";
              const isLegend = pack.id === "legend_booster" || pack.id === "legend_pack" || pack.theme === "legend";
              const isMatchday = pack.id === "matchday_booster" || pack.theme === "matchday";
              const isGold = pack.id === "gold_booster" || pack.theme === "gold";
              const packImg = pack.image_url || getPackImageUrl(pack.id, pack.theme);
              const price = PACK_PRICES[pack.id] || 100;
              const canAfford = deltaPoints >= price;

              return (
                <div 
                  key={pack.id} 
                  className={`v200-pack-card ${isInferno ? "theme-inferno" : isLegend ? "theme-legend" : isMatchday ? "theme-matchday" : isGold ? "theme-gold" : "theme-standard"}`}
                >
                  {/* Top Foil Header */}
                  <div className="v200-pack-top-foil">
                    <span className="v200-pack-edition-tag">
                      {isInferno ? "🔥 EDYCJA INFERNO" : isLegend ? "👑 EDYCJA LEGEND" : isMatchday ? "⚡ MATCHDAY" : isGold ? "🌟 GOLD SPECIAL" : "📦 STANDARD"}
                    </span>
                    <span className="v200-pack-cards-badge">{pack.cards_count} KART</span>
                  </div>

                  {/* 3D Pack Foil Visual */}
                  <div 
                    className="v200-pack-visual-wrap"
                    onClick={() => {
                      if (packCount > 0) setActivePackToOpen(pack);
                    }}
                    style={{ cursor: packCount > 0 ? "pointer" : "default" }}
                  >
                    <img 
                      src={packImg} 
                      alt={pack.name} 
                      className="v200-pack-img" 
                    />
                    <div className="v200-pack-hologram-sheen" />

                    {/* Stock status indicator */}
                    {packCount > 0 ? (
                      <div className="v200-pack-stock-badge available">
                        <Sparkles size={12} className="animate-spin" />
                        <span>{packCount} W POSIADANIU</span>
                      </div>
                    ) : (
                      <div className="v200-pack-stock-badge empty">
                        <span>0 W ZASOBACH</span>
                      </div>
                    )}
                  </div>

                  {/* Pack Details */}
                  <div className="v200-pack-body">
                    <h4 className="v200-pack-name">{pack.name}</h4>
                    <p className="v200-pack-desc">{pack.description}</p>
                    
                    {/* Action button */}
                    {packCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActivePackToOpen(pack)}
                        className="v200-pack-btn-open"
                      >
                        <Sparkles size={16} />
                        <span>OTWÓRZ TERAZ ({packCount})</span>
                      </button>
                    ) : (
                      <div className="v200-pack-buy-box">
                        <button
                          type="button"
                          onClick={() => handleBuyPack(pack.id)}
                          disabled={buyingPackId === pack.id || !canAfford}
                          className={`v200-pack-btn-buy ${canAfford ? "can-buy" : "locked"}`}
                        >
                          <Coins size={15} />
                          <span>
                            {buyingPackId === pack.id ? "ODBLOKOWYWANIE..." : `KUP ZA ${price} DP`}
                          </span>
                        </button>
                        <span className="v200-pack-earn-subtext">
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
      </div>

      {/* ================= VIEW 1: DEDICATED SINGLE PLAYER ALBUM (CAROUSEL) ================= */}
      {currentAlbum ? (
        <div 
          className="v104-single-player-album animate-fadeIn"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar Navigation */}
          <div className="v104-player-album-topbar devil-card">
            <button
              type="button"
              onClick={() => setSelectedAlbumPlayerId(null)}
              className="v104-album-back-btn"
            >
              <ArrowLeft size={16} /> WRÓĆ DO WSZYSTKICH ZAWODNIKÓW
            </button>

            <div className="v104-player-album-arrows">
              <button
                type="button"
                onClick={handlePrevPlayer}
                className="v104-arrow-btn"
                title="Poprzedni zawodnik"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="v104-album-player-indicator">
                {currentAlbum.player.display_name}
              </span>
              <button
                type="button"
                onClick={handleNextPlayer}
                className="v104-arrow-btn"
                title="Następny zawodnik"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Swipe Hint */}
          <div className="v200-swipe-hint">
            <span>👈 Przesuń palcem w lewo / prawo aby zmienić stronę klasera 👉</span>
          </div>

          {/* Player Banner */}
          <div className="v104-album-player-banner devil-card">
            <div className="v104-player-banner-info">
              <div className="v104-player-avatar-large">
                <span className="v104-avatar-initials-lg">
                  {currentAlbum.player.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="eyebrow gold">KLASER ZAWODNIKA DELTA GM</span>
                <h3 className="v104-album-player-name">{currentAlbum.player.display_name}</h3>
                <div className="v104-album-player-meta">
                  <span className="v104-album-badge pos">{currentAlbum.player.position || "ZAWODNIK"}</span>
                  <span className="v104-album-badge num">#{currentAlbum.player.shirt_number || "DELTA"}</span>
                  <span className="v104-album-badge count">
                    <Sparkles size={13} className="inline mr-1" />
                    {currentAlbum.ownedCount} / {currentAlbum.cards.length} KART ZDOBYTYCH ({currentAlbum.completionRate}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="v104-album-progress-box">
              <div className="v104-album-progress-bar">
                <i style={{ width: `${currentAlbum.completionRate}%` }} />
              </div>
              <span className="v104-album-progress-label">
                {currentAlbum.completionRate === 100 ? "👑 KOMPLETNA KOLEKCJA!" : `Brakuje ${currentAlbum.cards.length - currentAlbum.ownedCount} kart do kompletu`}
              </span>
            </div>
          </div>

          {/* Player Cards Horizontal 3D Carousel */}
          <div className="v104-album-carousel-section">
            <div className="v104-carousel-header">
              <span className="eyebrow gold"><Layers size={14} className="inline mr-1" /> KARTY W TEJ KOLEKCJI ({currentAlbum.cards.length})</span>
              <p className="v104-carousel-sub">
                Kliknij kartę, aby powiększyć i obejrzeć historię na rewersie. Karty zablokowane zdobędziesz otwierając paczki!
              </p>
            </div>

            <div className="v104-player-carousel-track">
              {currentAlbum.cards.map(card => {
                const userCard = ownedCardsMap.get(card.id) || null;
                const isLocked = !userCard;

                return (
                  <div key={card.id} className="v104-carousel-card-item">
                    <CollectibleCard3D
                      card={card}
                      userCard={userCard}
                      isLocked={isLocked}
                      size="md"
                      interactive={true}
                      showFlip={true}
                      onClick={() => setInspectCard({ card, userCard })}
                    />

                    <div className="v104-carousel-card-footer">
                      {!isLocked ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <span className="v104-status-tag owned">
                              <CheckCircle2 size={12} /> ODBLOKOWANA
                              {userCard?.duplicates_count ? ` (+${userCard.duplicates_count})` : ""}
                            </span>
                            <span className="v104-card-rarity-pill">
                              {card.rarity.toUpperCase()}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="v200-test-reveal-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCinematicCardToUnlock(card);
                            }}
                          >
                            <Sparkles size={11} /> ZOBACZ REVEAL 3D
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <span className="v104-status-tag locked">
                              <Lock size={12} /> ZABLOKOWANA
                            </span>
                            <span className="v104-card-rarity-pill">
                              {card.rarity.toUpperCase()}
                            </span>
                          </div>
                          <div className="v200-card-condition-hint">
                            <small>{getCardUnlockCondition(card)}</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ================= VIEW 2: ROSTER SHOWCASE & PANINI ALBUM ================= */
        <div className="v104-roster-showcase-section animate-fadeIn">
          {/* Main Collection Mode Switcher */}
          <div className="v200-collection-view-tabs">
            <button
              type="button"
              onClick={() => setActiveViewTab("panini")}
              className={`v200-view-mode-tab ${activeViewTab === "panini" ? "active" : ""}`}
            >
              <Shield size={16} />
              <span>📖 KLASER PANINI ROCZNIKA 2018 ({playerAlbums.filter(a => a.ownedCount > 0).length}/{playerAlbums.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab("roster")}
              className={`v200-view-mode-tab ${activeViewTab === "roster" ? "active" : ""}`}
            >
              <Users size={16} />
              <span>👥 ALBUMY ZAWODNIKÓW ({playerAlbums.length})</span>
            </button>
          </div>

          {/* ================= PANINI SQUAD STICKERS ALBUM ================= */}
          {activeViewTab === "panini" && (
            <div className="v200-panini-album-section animate-fadeIn">
              {/* Panini Squad Grand Banner */}
              <div className="v200-panini-banner-card">
                <div className="v200-panini-banner-left">
                  <div className="v200-panini-gold-shield">
                    <Shield size={32} className="text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="v200-panini-eyebrow">OFICJALNY KLASER DRUŻYNOWY PANINI</span>
                    <h3 className="v200-panini-title">MISTRZOWSKI SKŁAD DELTA 2018 GM</h3>
                    <p className="v200-panini-desc">
                      Zbierz kartę każdego z {playerAlbums.length} zawodników rocznika 2018. Wypełnij klaser, aby odebrać nagrodę mistrza drużyny!
                    </p>
                  </div>
                </div>

                {/* Progress & Milestone Claim */}
                <div className="v200-panini-banner-right">
                  <div className="v200-panini-kpi-box">
                    <div className="v200-panini-kpi-labels">
                      <span>POSTĘP SKŁADU</span>
                      <b>{playerAlbums.filter(a => a.ownedCount > 0).length} / {playerAlbums.length} ZAWODNIKÓW</b>
                    </div>
                    <div className="v200-panini-bar-track">
                      <div 
                        className="v200-panini-bar-fill" 
                        style={{ width: `${playerAlbums.length > 0 ? Math.round((playerAlbums.filter(a => a.ownedCount > 0).length / playerAlbums.length) * 100) : 0}%` }} 
                      />
                    </div>
                    <span className="v200-panini-rate-sub">
                      {playerAlbums.length > 0 ? Math.round((playerAlbums.filter(a => a.ownedCount > 0).length / playerAlbums.length) * 100) : 0}% kompletnego klaseru rocznika
                    </span>
                  </div>

                  {!paniniRewardClaimed ? (
                    <button
                      type="button"
                      onClick={() => {
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
                      className={`v200-panini-reward-btn ${playerAlbums.filter(a => a.ownedCount > 0).length >= 10 ? "ready" : "locked"}`}
                    >
                      <Trophy size={16} />
                      <span>
                        {playerAlbums.filter(a => a.ownedCount > 0).length >= 10 ? "ODBIERZ NAGRODĘ (+500 DP)" : `NAGRODA (OD 10 ZAWODNIKÓW)`}
                      </span>
                    </button>
                  ) : (
                    <div className="v200-panini-claimed-tag">
                      <CheckCircle2 size={16} className="text-green-400" />
                      <span>NAGRODA MISTRZA ODEBRANA (+500 DP)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Panini 16-Player Sticker Grid */}
              <div className="v200-panini-stickers-grid">
                {playerAlbums.map(album => {
                  const isOwned = album.ownedCount > 0;
                  const topCard = album.topOwnedCard || album.cards[0];

                  return (
                    <div
                      key={album.player.id}
                      onClick={() => {
                        if (isOwned && topCard) {
                          setInspectCard({ card: topCard, userCard: ownedCardsMap.get(topCard.id) || null });
                        } else {
                          setSelectedAlbumPlayerId(album.player.id);
                        }
                      }}
                      className={`v200-panini-sticker-slot ${isOwned ? "collected" : "empty"}`}
                    >
                      {isOwned ? (
                        /* Collected Player Shiny Card Slot */
                        <div className="v200-panini-collected-inner">
                          <div className="v200-panini-card-wrap">
                            <CollectibleCard3D
                              card={topCard}
                              userCard={ownedCardsMap.get(topCard.id) || null}
                              isLocked={false}
                              size="md"
                              interactive={false}
                              showFlip={false}
                            />
                          </div>

                          <div className="v200-panini-collected-footer">
                            <span className="v200-panini-badge-collected">
                              <CheckCircle2 size={12} className="inline mr-1 text-green-400" /> ZEBRANY W SKŁADZIE
                            </span>
                            <span className="v200-panini-owned-sub">
                              {album.ownedCount} / {album.cards.length} edycji karty
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Missing Player Sticker Silhouette Slot */
                        <div className="v200-panini-missing-inner">
                          <div className="v200-panini-silhouette-box">
                            <div className="v200-panini-jersey-num">#{album.player.shirt_number || "18"}</div>
                            <img src="/teamlogos/gm.png" alt="DELTA" className="v200-panini-crest-faint" />
                            <span className="v200-panini-pos-faint">{album.player.position || "POMOCNIK"}</span>
                          </div>

                          <div className="v200-panini-missing-footer">
                            <h4 className="v200-panini-missing-name">{album.player.display_name}</h4>
                            <span className="v200-panini-badge-missing">
                              <Lock size={11} className="inline mr-1" /> BRAKUJE W KLASERZE
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlbumPlayerId(album.player.id);
                              }}
                              className="v200-panini-find-btn"
                            >
                              <Sparkles size={11} /> JAK ZDOBYĆ?
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= ROSTER OVERVIEW (SEARCH & FILTERS) ================= */}
          {activeViewTab === "roster" && (
            <div className="v200-roster-overview-mode animate-fadeIn">
              {/* Search & Filters */}
              <div className="v104-filter-bar devil-card">
                <div className="v104-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Szukaj zawodnika DELTA Warszawa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="v104-toggle-group">
                  <button
                    onClick={() => setSelectedOwnership("all")}
                    className={selectedOwnership === "all" ? "active" : ""}
                  >
                    Wszyscy ({playerAlbums.length})
                  </button>
                  <button
                    onClick={() => setSelectedOwnership("owned")}
                    className={selectedOwnership === "owned" ? "active" : ""}
                  >
                    Rozpoczęte ({playerAlbums.filter(a => a.ownedCount > 0).length})
                  </button>
                  <button
                    onClick={() => setSelectedOwnership("missing")}
                    className={selectedOwnership === "missing" ? "active" : ""}
                  >
                    Nieukończone
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="v104-loading-state">
                  <RefreshCw size={36} className="animate-spin text-gold" />
                  <span>Ładowanie kart zawodników DELTA...</span>
                </div>
              ) : filteredPlayerAlbums.length === 0 ? (
                <div className="v104-empty-state devil-card">
                  <Layers size={48} />
                  <h3>Brak zawodników spełniających kryteria</h3>
                  <p>Wpisz inne nazwisko lub zresetuj filtry.</p>
                </div>
              ) : (
                <div className="v104-roster-grid">
                  {filteredPlayerAlbums.map(album => {
                    const representativeCard = album.topOwnedCard || album.cards[0];
                    const isRepLocked = !album.topOwnedCard;

                    return (
                      <div
                        key={album.player.id}
                        onClick={() => setSelectedAlbumPlayerId(album.player.id)}
                        className="v104-player-showcase-card devil-card"
                      >
                        {/* Card 3D Preview (Showcase Hero) */}
                        <div className="v104-showcase-card-preview">
                          <CollectibleCard3D
                            card={representativeCard}
                            userCard={album.topOwnedCard ? (ownedCardsMap.get(representativeCard.id) || null) : null}
                            isLocked={isRepLocked}
                            size="md"
                            interactive={false}
                            showFlip={false}
                          />
                        </div>

                        {/* Player Info & Stats */}
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

                          {/* Progress Bar */}
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
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= FULL-SCREEN 3D CARD INSPECT MODAL ================= */}
      {inspectCard && (
        <div 
          className="v104-inspect-modal-backdrop"
          onClick={() => {
            setInspectCard(null);
            setInspectFlipped(false);
          }}
        >
          <div 
            className="v104-inspect-modal-content"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setInspectCard(null);
                setInspectFlipped(false);
              }}
              className="v104-inspect-close"
              aria-label="Zamknij"
            >
              <X size={22} />
            </button>

            <CollectibleCard3D
              card={inspectCard.card}
              userCard={inspectCard.userCard}
              isLocked={!inspectCard.userCard}
              size="xl"
              interactive={true}
              showFlip={true}
              isFlipped={inspectFlipped}
              onFlipChange={setInspectFlipped}
            />

            <div className="v104-inspect-toolbar">
              <button
                type="button"
                className="v104-inspect-flip-btn"
                onClick={() => setInspectFlipped(!inspectFlipped)}
              >
                <RefreshCw size={13} />
                {inspectFlipped ? "OBRÓĆ NA AWERS" : "OBRÓĆ NA REWERS"}
              </button>
            </div>

            <span className="v104-inspect-hint">
              <span>✋</span> Chwyć kartę myszką lub palcem i obracaj w 3D • Kliknij, aby szybko odwrócić
            </span>
          </div>
        </div>
      )}

      {/* ================= PACK OPENING EXPERIENCE MODAL ================= */}
      {activePackToOpen && (
        <PackOpeningExperience
          pack={activePackToOpen}
          unopenedCount={unopenedPacks.length - 1}
          onClose={() => {
            setActivePackToOpen(null);
            fetchCollection();
          }}
          onOpenAnother={() => {
            if (unopenedPacks.length > 1) {
              const nextPack = unopenedPacks[1];
              const packDef = packDefinitions.find(p => p.id === nextPack.pack_type_id) || packDefinitions[0];
              setActivePackToOpen(packDef);
            } else {
              setActivePackToOpen(null);
            }
            fetchCollection();
          }}
        />
      )}

      {/* ================= CARD UNLOCK CINEMATIC MODAL ================= */}
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

      {/* ================= 1. DAILY INFERNO SPIN MODAL ================= */}
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

      {/* ================= 2. SQUAD BUILDER 3D MODAL ================= */}
      {showSquadBuilder && (
        <div className="v200-picker-backdrop" onClick={() => setShowSquadBuilder(false)}>
          <div className="v200-picker-modal max-w-4xl" onClick={e => e.stopPropagation()}>
            <SquadBuilder3D
              ownedCards={ownedCardsList}
              userCardsMap={ownedCardsMap}
              onClose={() => setShowSquadBuilder(false)}
            />
          </div>
        </div>
      )}

      {/* ================= 3. CARD BATTLE & COMPARE MODAL ================= */}
      {showBattleCompare && (
        <CardBattleCompareModal
          cards={allCards}
          userCardsMap={ownedCardsMap}
          onClose={() => setShowBattleCompare(false)}
          onRewardClaimed={(pts) => setDeltaPoints(p => p + pts)}
        />
      )}

      {/* ================= 4. DELTA TRADE HUB MODAL ================= */}
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

      {/* ================= 5. ACHIEVEMENTS & BADGES MODAL ================= */}
      {showAchievements && (
        <AchievementsModal
          isOpen={showAchievements}
          onClose={() => setShowAchievements(false)}
          onPointsUpdated={(newPts) => setDeltaPoints(p => p + newPts)}
        />
      )}

      {/* ================= 6. SKILL MINI-GAMES MODAL ================= */}
      {showSkillGames && (
        <DeltaSkillMiniGamesModal
          onClose={() => setShowSkillGames(false)}
          onPointsEarned={(pts) => setDeltaPoints(p => p + pts)}
        />
      )}
    </section>
  );
}
