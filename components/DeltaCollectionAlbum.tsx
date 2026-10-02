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
        fetchCollection();
      }
    } catch (e) {
      console.error("Error syncing rewards:", e);
    } finally {
      setSyncing(false);
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
    <section className="section v104-collection-section animate-fadeIn">
      {/* ================= HERO & COMPLETION BANNER ================= */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-neutral-900 via-stone-950 to-black shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-[450px] h-[300px] bg-gradient-to-bl from-amber-500/15 via-red-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black tracking-widest uppercase">
              <Sparkles size={14} /> OFICJALNY KLASER KART KLUBOWYCH
            </div>
            <h1 className="text-2xl sm:text-4xl font-black italic tracking-wide text-white">
              DELTA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">COLLECTION</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Zbieraj unikalne cyfrowe karty zawodników DELTA Warszawa 2018 GM. Zdobywaj paczki za mecze, treningi i osiągnięcia lub wymieniaj duplikaty na Delta Points!
            </p>
          </div>

          {/* KPI COUNTERS */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Completion Box */}
            <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-black/50 border border-slate-800 backdrop-blur-md min-w-[130px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">KOLEKCJA</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-white">{ownedCount}</span>
                <span className="text-xs font-bold text-slate-500">/ {totalCount}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Delta Points Box */}
            <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-black/50 border border-slate-800 backdrop-blur-md min-w-[130px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Coins size={12} /> DELTA POINTS
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-amber-300">{deltaPoints}</span>
                <span className="text-xs font-bold text-amber-500/70">DP</span>
              </div>
              <span className="text-[9px] text-slate-500 mt-1">Wymiana duplikatów</span>
            </div>

            {/* Sync Rewards Button */}
            <button
              type="button"
              onClick={handleSyncRewards}
              disabled={syncing}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-slate-800 text-slate-300 hover:text-white transition-all flex flex-col items-center justify-center gap-1"
              title="Sprawdź nowe nagrody za mecze i treningi"
            >
              <RefreshCw size={18} className={syncing ? "animate-spin text-amber-400" : ""} />
              <span className="text-[9px] font-bold">SYNCHRONIZUJ</span>
            </button>
          </div>
        </div>

        {/* ================= UNOPENED PACKS CALLOUT BANNER ================= */}
        {unopenedPacks.length > 0 && (
          <div className="relative z-10 mt-6 pt-5 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-red-500/10 to-black border border-amber-500/30 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Gift size={24} />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  MASZ {unopenedPacks.length} {unopenedPacks.length === 1 ? "NOWĄ PACZKĘ" : unopenedPacks.length < 5 ? "NOWE PACZKI" : "NOWYCH PACZEK"} DO OTWARCIA! 🎁
                </h4>
                <p className="text-xs text-amber-200/80">
                  Odkryj karty zawodników i powiększ swoją kolekcję klubową!
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg hover:shadow-amber-500/40 shrink-0 transform transition hover:-translate-y-0.5"
            >
              OTWÓRZ PACZKĘ ({unopenedPacks.length})
            </button>
          </div>
        )}
      </div>

      {/* ================= FILTER & SEARCH BAR ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj zawodnika lub typu karty..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Player Select */}
          <select
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">Wszyscy zawodnicy</option>
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
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">Wszystkie rzadkości</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
            <option value="inferno">🔥 Inferno</option>
          </select>

          {/* Ownership Toggle */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setSelectedOwnership("all")}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedOwnership === "all" ? "bg-amber-500 text-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setSelectedOwnership("owned")}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedOwnership === "owned" ? "bg-amber-500 text-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Odblokowane
            </button>
            <button
              onClick={() => setSelectedOwnership("missing")}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedOwnership === "missing" ? "bg-amber-500 text-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Brakujące
            </button>
          </div>
        </div>
      </div>

      {/* ================= ALBUM VIEW / CARDS GRID ================= */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
          <RefreshCw size={32} className="animate-spin text-amber-500" />
          <span className="text-xs font-bold tracking-wider uppercase">Ładowanie kolekcji DELTA...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-slate-950/40 border border-slate-800">
          <Layers size={48} className="text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">Brak kart spełniających kryteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Zmień filtry lub otwórz nową paczkę, aby wzbogacić swój klaser!
          </p>
        </div>
      ) : selectedPlayerId === "all" && selectedOwnership === "all" && !searchQuery.trim() ? (
        /* ================= GROUPED BY PLAYER ALBUM ================= */
        <div className="space-y-10">
          {playerAlbums.map(album => (
            <div 
              key={album.player.id}
              className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800/80 space-y-4"
            >
              {/* Player Mini-Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-500/40">
                    <PlayerPhoto playerId={album.player.id} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {album.player.display_name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {album.player.position || "ZAWODNIK"} • #{album.player.shirt_number || "GM"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    {album.ownedCount} / {album.cards.length} KART
                  </span>
                </div>
              </div>

              {/* Player's Cards Carousel / Grid */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                {album.cards.map(card => {
                  const userCard = ownedCardsMap.get(card.id) || null;
                  const isLocked = !userCard;

                  return (
                    <div key={card.id} className="relative">
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
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6">
          {filteredCards.map(card => {
            const userCard = ownedCardsMap.get(card.id) || null;
            const isLocked = !userCard;

            return (
              <div key={card.id} className="relative">
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
          className="fixed inset-0 z-[9990] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setInspectCard(null)}
        >
          <div 
            className="relative flex flex-col items-center gap-4 max-w-sm w-full p-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setInspectCard(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X size={20} />
            </button>

            <CollectibleCard3D
              card={inspectCard.card}
              userCard={inspectCard.userCard}
              isLocked={!inspectCard.userCard}
              size="xl"
              interactive={true}
              showFlip={true}
            />

            <span className="text-xs text-slate-400 text-center">
              Dotknij lub kliknij ikonę obrotu, aby zobaczyć historię i statystyki na rewersie.
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
