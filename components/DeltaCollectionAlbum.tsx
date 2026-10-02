"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Flame, 
  Sparkles, 
  Search, 
  Filter, 
  Gift, 
  Coins, 
  Lock, 
  CheckCircle2, 
  RotateCw, 
  ChevronRight, 
  Layers, 
  Trophy, 
  Crown, 
  Award,
  RefreshCw,
  X
} from "lucide-react";
import { 
  CardDefinition, 
  UserCard, 
  UserUnopenedPack, 
  PackDefinition, 
  CardRarity, 
  RARITY_CONFIG 
} from "@/lib/cards/types";
import CollectibleCard3D from "./CollectibleCard3D";
import PackOpeningExperience from "./PackOpeningExperience";
import PlayerPhoto from "./PlayerPhoto";
import { cardSound } from "@/lib/cards/audio";

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
  players?: { id: string; display_name: string; shirt_number: string | null; position: string | null }[];
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

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [selectedOwnership, setSelectedOwnership] = useState<"all" | "owned" | "missing">("all");
  
  // Modals
  const [inspectCard, setInspectCard] = useState<{ card: CardDefinition; userCard: UserCard | null } | null>(null);
  const [activePackToOpen, setActivePackToOpen] = useState<PackDefinition | null>(null);

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
    // Auto-sync rewards silently on mount
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

  // Total completion statistics
  const totalCount = allCards.length;
  const ownedCount = userCards.length;
  const completionPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  // Group cards by player
  const playerAlbums = useMemo(() => {
    const map = new Map<string, {
      player: { id: string; display_name: string; shirt_number: string | null; position: string | null };
      cards: CardDefinition[];
      ownedCount: number;
    }>();

    allCards.forEach(card => {
      const pid = card.player_id;
      if (!map.has(pid)) {
        map.set(pid, {
          player: card.player || { id: pid, display_name: "Zawodnik DELTA", shirt_number: null, position: null },
          cards: [],
          ownedCount: 0
        });
      }
      const entry = map.get(pid)!;
      entry.cards.push(card);
      if (ownedCardsMap.has(card.id)) {
        entry.ownedCount++;
      }
    });

    return Array.from(map.values());
  }, [allCards, ownedCardsMap]);

  // Filtered card list
  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (card.player?.display_name || "").toLowerCase();
        const cTitle = (card.title || card.card_name).toLowerCase();
        if (!pName.includes(q) && !cTitle.includes(q)) return false;
      }

      // Player filter
      if (selectedPlayerId !== "all" && card.player_id !== selectedPlayerId) {
        return false;
      }

      // Rarity filter
      if (selectedRarity !== "all" && card.rarity !== selectedRarity) {
        return false;
      }

      // Ownership filter
      const isOwned = ownedCardsMap.has(card.id);
      if (selectedOwnership === "owned" && !isOwned) return false;
      if (selectedOwnership === "missing" && isOwned) return false;

      return true;
    });
  }, [allCards, searchQuery, selectedPlayerId, selectedRarity, selectedOwnership, ownedCardsMap]);

  return (
    <section className="section v8-section-page v104-collection-page animate-fadeIn">
      {/* ================= HERO & COMPLETION BANNER ================= */}
      <div className="v104-collection-hero devil-card">
        <div className="v104-collection-hero-main">
          <div className="v104-collection-hero-text">
            <span className="eyebrow gold"><Sparkles size={14} className="inline mr-1" /> OFICJALNY KLASER KART KLUBOWYCH</span>
            <h2>DELTA <em>COLLECTION</em></h2>
            <p>
              Zbieraj unikalne cyfrowe karty zawodników DELTA Warszawa 2018 GM. Otwieraj paczki za mecze, treningi i osiągnięcia lub wymieniaj duplikaty na Delta Points!
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
              <span className="v104-kpi-sub">Wymiana duplikatów</span>
            </div>

            {/* Sync Rewards Button */}
            <button
              type="button"
              onClick={handleSyncRewards}
              disabled={syncing}
              className="v104-sync-btn"
              title="Sprawdź nowe nagrody za mecze i treningi"
            >
              <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
              <span>SYNCHRONIZUJ</span>
            </button>
          </div>
        </div>

        {/* ================= UNOPENED PACKS CALLOUT BANNER ================= */}
        {unopenedPacks.length > 0 && (
          <div className="v104-unopened-banner">
            <div className="v104-unopened-info">
              <div className="v104-unopened-icon">
                <Gift size={28} />
              </div>
              <div>
                <h4>
                  MASZ {unopenedPacks.length} {unopenedPacks.length === 1 ? "NOWĄ PACZKĘ" : unopenedPacks.length < 5 ? "NOWE PACZKI" : "NOWYCH PACZEK"} DO OTWARCIA! 🎁
                </h4>
                <p>
                  Odkryj unikalne karty zawodników i wzbogać swój klaser klubowy!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const first = unopenedPacks[0];
                const packDef = packDefinitions.find(p => p.id === first.pack_type_id) || packDefinitions[0];
                setActivePackToOpen(packDef);
              }}
              className="v104-open-pack-btn"
            >
              <Sparkles size={16} /> OTWÓRZ PACZKĘ ({unopenedPacks.length})
            </button>
          </div>
        )}

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
              const isLegend = pack.id === "legend_pack" || pack.theme === "legend";
              const isMatchday = pack.id === "matchday_booster";

              return (
                <div 
                  key={pack.id} 
                  className={`v104-booster-card ${isInferno ? "booster-inferno" : isLegend ? "booster-legend" : isMatchday ? "booster-matchday" : "booster-gold"}`}
                >
                  {/* Pack Top Crimp / Foil Tear Line */}
                  <div className="v104-booster-crimp top" />

                  {/* Shimmer Light Reflection */}
                  <div className="v104-booster-shimmer" />

                  {/* Pack Header Badge */}
                  <div className="v104-booster-top">
                    <span className="v104-booster-edition">DELTA GM 2018</span>
                    {packCount > 0 ? (
                      <span className="v104-booster-owned-badge active">
                        {packCount} DOSTĘPNE
                      </span>
                    ) : (
                      <span className="v104-booster-owned-badge">0 W ZASOBACH</span>
                    )}
                  </div>

                  {/* Pack Center Crest & Branding */}
                  <div className="v104-booster-center">
                    <div className="v104-booster-crest-wrap">
                      <img src="/teamlogos/gm.png" alt="DELTA" className="v104-booster-crest" />
                    </div>
                    <h4 className="v104-booster-name">{pack.name}</h4>
                    <span className="v104-booster-cards-count">{pack.cards_count} KART W PACZCE</span>
                  </div>

                  {/* Pack Specs & Action */}
                  <div className="v104-booster-bottom">
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

                  {/* Pack Bottom Crimp */}
                  <div className="v104-booster-crimp bottom" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= FILTER & SEARCH BAR ================= */}
      <div className="v104-filter-bar devil-card">
        {/* Search */}
        <div className="v104-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Szukaj zawodnika lub typu karty..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="v104-filter-controls">
          {/* Player Select */}
          <select
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            className="v104-select"
          >
            <option value="all">Wszyscy zawodnicy ({playerAlbums.length})</option>
            {playerAlbums.map(a => (
              <option key={a.player.id} value={a.player.id}>
                {a.player.display_name} ({a.ownedCount}/{a.cards.length})
              </option>
            ))}
          </select>

          {/* Rarity Select */}
          <select
            value={selectedRarity}
            onChange={e => setSelectedRarity(e.target.value)}
            className="v104-select"
          >
            <option value="all">Wszystkie rzadkości</option>
            <option value="common">Common (Zwykłe)</option>
            <option value="rare">Rare (Rzadkie)</option>
            <option value="epic">Epic (Epickie)</option>
            <option value="legendary">Legendary (Legendarne)</option>
            <option value="inferno">🔥 Inferno (Piekielne)</option>
          </select>

          {/* Ownership Toggle */}
          <div className="v104-toggle-group">
            <button
              onClick={() => setSelectedOwnership("all")}
              className={selectedOwnership === "all" ? "active" : ""}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setSelectedOwnership("owned")}
              className={selectedOwnership === "owned" ? "active" : ""}
            >
              Odblokowane
            </button>
            <button
              onClick={() => setSelectedOwnership("missing")}
              className={selectedOwnership === "missing" ? "active" : ""}
            >
              Brakujące
            </button>
          </div>
        </div>
      </div>

      {/* ================= ALBUM VIEW / CARDS GRID ================= */}
      {loading ? (
        <div className="v104-loading-state">
          <RefreshCw size={36} className="animate-spin text-gold" />
          <span>Ładowanie kolekcji kart DELTA...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="v104-empty-state devil-card">
          <Layers size={48} />
          <h3>Brak kart spełniających kryteria</h3>
          <p>
            Zmień filtry lub otwórz nową paczkę, aby wzbogacić swój klaser!
          </p>
        </div>
      ) : selectedPlayerId === "all" && selectedOwnership === "all" && !searchQuery.trim() ? (
        /* ================= GROUPED BY PLAYER ALBUM ================= */
        <div className="v104-player-albums-list">
          {playerAlbums.map(album => (
            <div 
              key={album.player.id}
              className="v104-player-album-card devil-card"
            >
              {/* Player Mini-Header */}
              <div className="v104-player-album-head">
                <div className="v104-player-info-group">
                  <div className="v104-player-avatar-ring">
                    <span className="v104-avatar-initials">
                      {album.player.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3>{album.player.display_name}</h3>
                    <small>
                      {album.player.position || "ZAWODNIK"} • #{album.player.shirt_number || "GM"}
                    </small>
                  </div>
                </div>

                <div className="v104-player-count-pill">
                  <b>{album.ownedCount} / {album.cards.length}</b>
                  <span>KART ODKRYTYCH</span>
                </div>
              </div>

              {/* Player's Cards Carousel / Grid */}
              <div className="v104-cards-row">
                {album.cards.map(card => {
                  const userCard = ownedCardsMap.get(card.id) || null;
                  const isLocked = !userCard;

                  return (
                    <div key={card.id} className="v104-card-wrapper">
                      <CollectibleCard3D
                        card={card}
                        userCard={userCard}
                        isLocked={isLocked}
                        size="md"
                        interactive={true}
                        showFlip={true}
                        onClick={() => setInspectCard({ card, userCard })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================= FLAT FILTERED GRID ================= */
        <div className="v104-flat-cards-grid">
          {filteredCards.map(card => {
            const userCard = ownedCardsMap.get(card.id) || null;
            const isLocked = !userCard;

            return (
              <div key={card.id} className="v104-card-wrapper">
                <CollectibleCard3D
                  card={card}
                  userCard={userCard}
                  isLocked={isLocked}
                  size="md"
                  interactive={true}
                  showFlip={true}
                  onClick={() => setInspectCard({ card, userCard })}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ================= FULL-SCREEN 3D CARD INSPECT MODAL ================= */}
      {inspectCard && (
        <div 
          className="v104-inspect-modal-backdrop"
          onClick={() => setInspectCard(null)}
        >
          <div 
            className="v104-inspect-modal-content"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setInspectCard(null)}
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
            />

            <span className="v104-inspect-hint">
              Kliknij ikonę obrotu na karcie, aby zobaczyć opis historii i statystyki na rewersie.
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
    </section>
  );
}
