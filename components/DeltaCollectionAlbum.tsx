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
  Swords
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd zakupu paczki");
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

  return (
    <section className="section v8-section-page v104-collection-page animate-fadeIn">
      {/* ================= HERO & COMPLETION BANNER ================= */}
      <div className="v104-collection-hero devil-card">
        <div className="v104-collection-hero-main">
          <div className="v104-collection-hero-text">
            <span className="eyebrow gold"><Sparkles size={14} className="inline mr-1" /> OFICJALNY KLASER KART KLUBOWYCH</span>
            <h2>DELTA <em>COLLECTION</em></h2>
            <p>
              Zbieraj unikalne cyfrowe karty zawodników DELTA Warszawa 2018 GM. Otwieraj paczki za mecze, treningi i osiągnięcia lub wymieniaj punkty Delta Points!
            </p>
          </div>

          {/* KPI COUNTERS */}
          <div className="v104-collection-kpis">
            {/* Completion Box */}
            <div className="v104-kpi-card">
              <span className="v104-kpi-label">POSTĘP KOLEKCJI</span>
              <div className="v104-kpi-val">
                <b>{ownedCount}</b>
                <small>/ {totalCount} kart</small>
              </div>
              <div className="v104-progress-bar">
                <i style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>

            {/* Delta Points Box */}
            <div className="v104-kpi-card">
              <span className="v104-kpi-label gold"><Coins size={13} /> DELTA POINTS</span>
              <div className="v104-kpi-val">
                <b className="text-gold">{deltaPoints}</b>
                <small>DP</small>
              </div>
              <span className="v104-kpi-hint">Wymieniaj na booster packs</span>
            </div>
          </div>
        </div>

        {/* UNOPENED PACKS BANNER */}
        {unopenedPacks.length > 0 && (
          <div className="v104-collection-unopened-banner">
            <div>
              <span className="v104-unopened-title">
                🎁 Masz nieotwarte paczki kart ({unopenedPacks.length})!
              </span>
              <p className="v104-unopened-sub">
                Otwórz je teraz, aby zdobyć nowe karty do swojego oficjalnego klasera!
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const firstPack = unopenedPacks[0];
                const packDef = packDefinitions.find(p => p.id === firstPack.pack_type_id) || packDefinitions[0];
                setActivePackToOpen(packDef);
              }}
              className="v104-open-pack-btn"
            >
              <Sparkles size={16} /> OTWÓRZ PACZKĘ ({unopenedPacks.length})
            </button>
          </div>
        )}

        {/* ================= 2.0 GAMING NAVIGATION RIBBON ================= */}
        <div className="v200-collection-gaming-ribbon">
          <button
            type="button"
            onClick={() => setShowDailySpin(true)}
            className="v200-gaming-nav-btn spin"
          >
            <Flame size={20} className="text-red-500 animate-pulse flex-shrink-0" />
            <div className="text-left">
              <span className="v200-gbtn-kicker">CODZIENNY BONUS</span>
              <strong className="v200-gbtn-title">KOŁO FORTUNY 🔥</strong>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowSquadBuilder(true)}
            className="v200-gaming-nav-btn squad"
          >
            <Users size={20} className="text-yellow-400 flex-shrink-0" />
            <div className="text-left">
              <span className="v200-gbtn-kicker">MURAWA 3D</span>
              <strong className="v200-gbtn-title">MOJA DRUŻYNA</strong>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowTradeHub(true)}
            className="v200-gaming-nav-btn trade"
          >
            <ArrowLeftRight size={20} className="text-cyan-400 flex-shrink-0" />
            <div className="text-left">
              <span className="v200-gbtn-kicker">SZATNIA DELTA</span>
              <strong className="v200-gbtn-title">GIEŁDA WYMIANY</strong>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowBattleCompare(true)}
            className="v200-gaming-nav-btn battle"
          >
            <Swords size={20} className="text-purple-400 flex-shrink-0" />
            <div className="text-left">
              <span className="v200-gbtn-kicker">HEAD-TO-HEAD</span>
              <strong className="v200-gbtn-title">POJEDYNEK KART</strong>
            </div>
          </button>
        </div>

        {/* ================= 3D BOOSTER PACKS VAULT ================= */}
        <div className="v104-vault-section">
          <div className="v104-vault-header">
            <div>
              <span className="eyebrow gold"><Gift size={13} className="inline mr-1" /> SKARBIEC PACZEK DELTA</span>
              <h3 className="v104-vault-title">RODZAJE PACZEK & BOOSTERÓW</h3>
            </div>
            <span className="v104-vault-subhint">
              Paczki zdobywasz za obecność na treningach, mecze ligowe, turnieje oraz wyzwania!
            </span>
          </div>

          <div className="v104-vault-grid">
            {packDefinitions.map(pack => {
              const packCount = unopenedPacks.filter(p => p.pack_type_id === pack.id).length;
              const isInferno = pack.id === "inferno_booster" || pack.theme === "inferno";
              const isLegend = pack.id === "legend_booster" || pack.id === "legend_pack" || pack.theme === "legend";
              const isMatchday = pack.id === "matchday_booster" || pack.theme === "matchday";
              const isGold = pack.id === "gold_booster" || pack.theme === "gold";
              const packImg = pack.image_url || getPackImageUrl(pack.id, pack.theme);

              return (
                <div 
                  key={pack.id} 
                  className={`v104-booster-pack-card ${isInferno ? "pack-inferno" : isLegend ? "pack-legend" : isMatchday ? "pack-matchday" : isGold ? "pack-gold" : "pack-standard"}`}
                >
                  {/* 3D Realistic Foil Booster Pack Visual */}
                  <div 
                    className="v104-booster-pack-preview"
                    onClick={() => {
                      if (packCount > 0) setActivePackToOpen(pack);
                    }}
                    style={{ cursor: packCount > 0 ? "pointer" : "default" }}
                  >
                    <img 
                      src={packImg} 
                      alt={pack.name} 
                      className="v104-booster-pack-img" 
                    />
                    <div className="v104-booster-pack-glare" />

                    {packCount > 0 ? (
                      <span className="v104-booster-owned-badge active">
                        <Sparkles size={11} /> {packCount} DOSTĘPNE
                      </span>
                    ) : (
                      <span className="v104-booster-owned-badge">0 W ZASOBACH</span>
                    )}
                  </div>

                  {/* Pack Metadata & Actions */}
                  <div className="v104-booster-pack-meta">
                    <div className="v104-booster-title-row">
                      <h4 className="v104-booster-name">{pack.name}</h4>
                      <span className="v104-booster-cards-count">{pack.cards_count} KART</span>
                    </div>

                    <p className="v104-booster-desc">{pack.description}</p>
                    
                    {packCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActivePackToOpen(pack)}
                        className="v104-booster-action-btn active"
                      >
                        <Sparkles size={14} /> OTWÓRZ TERAZ ({packCount})
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleBuyPack(pack.id)}
                          disabled={buyingPackId === pack.id || deltaPoints < (PACK_PRICES[pack.id] || 100)}
                          className={`v104-booster-action-btn ${deltaPoints >= (PACK_PRICES[pack.id] || 100) ? "active" : ""}`}
                          style={{
                            background: deltaPoints >= (PACK_PRICES[pack.id] || 100) 
                              ? "linear-gradient(135deg, #f1c95c, #ca8a04)" 
                              : "rgba(255,255,255,0.06)",
                            color: deltaPoints >= (PACK_PRICES[pack.id] || 100) ? "#000" : "#94a3b8",
                            border: deltaPoints >= (PACK_PRICES[pack.id] || 100) ? "1px solid #fde047" : "1px solid rgba(255,255,255,0.1)",
                            cursor: deltaPoints >= (PACK_PRICES[pack.id] || 100) ? "pointer" : "default"
                          }}
                        >
                          <Coins size={13} /> {buyingPackId === pack.id ? "KUPUJĘ..." : `KUP ZA ${PACK_PRICES[pack.id] || 100} DP`}
                        </button>

                        <div className="v104-booster-earn-hint">
                          <span>LUB ZDOBĄDŹ ZA MECZE / TRENINGI</span>
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

      {/* ================= VIEW 1: DEDICATED SINGLE PLAYER ALBUM (CAROUSEL) ================= */}
      {currentAlbum ? (
        <div className="v104-single-player-album animate-fadeIn">
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
        /* ================= VIEW 2: ROSTER SHOWCASE (ALL PLAYERS OVERVIEW) ================= */
        <div className="v104-roster-showcase-section animate-fadeIn">
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
                Wszyscy zawodnicy ({playerAlbums.length})
              </button>
              <button
                onClick={() => setSelectedOwnership("owned")}
                className={selectedOwnership === "owned" ? "active" : ""}
              >
                Rozpoczęte klasery
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
                const hasCards = album.ownedCount > 0;
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
        />
      )}
    </section>
  );
}
