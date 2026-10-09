"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Crown, 
  Flame, 
  Star, 
  Layers, 
  RotateCw, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight,
  Shield,
  Award,
  Clock,
  Shirt,
  LayoutGrid
} from "lucide-react";
import { CardDefinition, UserCard, CardRarity } from "@/lib/cards/types";
import { DeltaCard } from "@/components/cards";
import { DeltaCardModel, adaptLegacyToDeltaCardModel, DELTA_THEME_CONFIGS } from "@/lib/cards/deltaCardModel";
import { CardDetailModal } from "@/components/collection";
import { cardSound } from "@/lib/cards/audio";
import { subscribeCardEvents, toggleFavoriteWithRollback, dispatchFavoriteUpdated } from "@/lib/cards/cardSync";

export interface LockerRoom3DProps {
  ownedCards?: CardDefinition[];
  userCardsMap?: Map<string, UserCard>;
  userCards?: UserCard[];
  featuredCardId?: string | null;
  formationSlots?: any[];
  squadSlots?: Record<string, CardDefinition>;
  captainSlotId?: string;
  onSlotClick?: (slot: any) => void;
  onSelectCaptain?: (slotId: string) => void;
  onSelectCard?: (card: DeltaCardModel) => void;
  onNavigateToCollection?: () => void;
  onNavigateToSquad?: () => void;
  className?: string;
}

export default function LockerRoom3D({
  ownedCards = [],
  userCardsMap = new Map(),
  userCards = [],
  featuredCardId,
  formationSlots,
  squadSlots,
  captainSlotId,
  onSlotClick,
  onSelectCaptain,
  onSelectCard,
  onNavigateToCollection,
  onNavigateToSquad,
  className = ""
}: LockerRoom3DProps) {
  const [inspectedCard, setInspectedCard] = useState<DeltaCardModel | null>(null);
  const [selectedHeroCardId, setSelectedHeroCardId] = useState<string | null>(featuredCardId || null);
  const [heroFlipped, setHeroFlipped] = useState(false);
  const [localOwnedCards, setLocalOwnedCards] = useState<CardDefinition[]>(ownedCards);
  const [localUserCardsMap, setLocalUserCardsMap] = useState<Map<string, UserCard>>(userCardsMap);

  // Sync with prop updates
  useEffect(() => {
    setLocalOwnedCards(ownedCards);
  }, [ownedCards]);

  useEffect(() => {
    setLocalUserCardsMap(userCardsMap);
  }, [userCardsMap]);

  // Subscribe to global card events
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/cards/collection");
        if (res.ok) {
          const data = await res.json();
          const uCards: UserCard[] = data.userCards || [];
          const uMap = new Map<string, UserCard>();
          uCards.forEach(uc => {
            if (uc.card_id) uMap.set(uc.card_id, uc);
          });
          const oCards = uCards.map(uc => uc.card_definition).filter(Boolean);
          setLocalOwnedCards(oCards);
          setLocalUserCardsMap(uMap);
        }
      } catch (err) {
        console.warn("Could not revalidate locker room cards:", err);
      }
    };

    const unsubscribe = subscribeCardEvents({
      onPackOpened: () => {
        fetchLatest();
      },
      onCollectionUpdated: () => {
        fetchLatest();
      },
      onFavoriteUpdated: (fav) => {
        if (!fav.card_id) return;
        setLocalUserCardsMap(prev => {
          const next = new Map(prev);
          const existing = next.get(fav.card_id);
          if (existing) {
            next.set(fav.card_id, { ...existing, is_favorite: fav.is_favorite });
          }
          return next;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Convert raw cards into unified DeltaCardModel list
  const allCardModels: DeltaCardModel[] = useMemo(() => {
    if (localOwnedCards.length > 0) {
      return localOwnedCards.map(card => {
        const userCard = localUserCardsMap.get(card.id) || null;
        return adaptLegacyToDeltaCardModel({
          card,
          player: card.player,
          userCard,
          isLocked: false
        });
      });
    }

    if (userCards.length > 0) {
      return userCards.map(uc => {
        return adaptLegacyToDeltaCardModel({
          card: uc.card_definition,
          player: uc.card_definition?.player,
          userCard: uc,
          isLocked: false
        });
      });
    }

    return [];
  }, [localOwnedCards, localUserCardsMap, userCards]);

  // Deterministically select Hero Card (featured -> favorite -> rarest -> first owned)
  const heroCard: DeltaCardModel | null = useMemo(() => {
    if (allCardModels.length === 0) return null;

    if (selectedHeroCardId) {
      const found = allCardModels.find(c => c.id === selectedHeroCardId);
      if (found) return found;
    }

    if (featuredCardId) {
      const found = allCardModels.find(c => c.id === featuredCardId);
      if (found) return found;
    }

    // Favorite first
    const fav = allCardModels.find(c => c.isFavorite);
    if (fav) return fav;

    // Rarest first (Inferno -> Icon -> Gold -> Matchday -> Standard)
    const rarityRank: Record<string, number> = {
      inferno: 5,
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1
    };

    const sortedByRarity = [...allCardModels].sort((a, b) => {
      const rA = rarityRank[a.rarity.toLowerCase()] || 0;
      const rB = rarityRank[b.rarity.toLowerCase()] || 0;
      return rB - rA;
    });

    return sortedByRarity[0] || null;
  }, [allCardModels, selectedHeroCardId, featuredCardId]);

  // Showcase Categories
  const favoriteCards = useMemo(() => allCardModels.filter(c => c.isFavorite), [allCardModels]);
  const infernoCards = useMemo(() => allCardModels.filter(c => c.cardType === "INFERNO"), [allCardModels]);
  const iconCards = useMemo(() => allCardModels.filter(c => c.cardType === "DELTA_ICON" || c.rarity === "legendary"), [allCardModels]);
  const goldMasterCards = useMemo(() => allCardModels.filter(c => c.cardType === "GOLD_MASTER" || c.rarity === "epic"), [allCardModels]);
  const recentCards = useMemo(() => {
    return [...allCardModels].sort((a, b) => (b.obtainedAt || "").localeCompare(a.obtainedAt || "")).slice(0, 10);
  }, [allCardModels]);

  const handleCardClick = (card: DeltaCardModel) => {
    setInspectedCard(card);
    if (onSelectCard) onSelectCard(card);
  };

  const handleSetAsHero = (card: DeltaCardModel, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHeroCardId(card.id);
    setHeroFlipped(false);
    cardSound?.playPurchase?.();
  };

  // Carousel Render Helper
  const renderCarousel = (title: string, icon: React.ReactNode, cards: DeltaCardModel[], accentColor: string) => {
    if (cards.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-black/40 border border-white/10" style={{ color: accentColor }}>
              {icon}
            </span>
            <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white">
              {title}
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({cards.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin snap-x px-1">
          {cards.map(card => {
            const isCurrentHero = heroCard?.id === card.id;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`shrink-0 w-[120px] sm:w-[140px] md:w-[160px] aspect-[2/3] snap-start relative group cursor-pointer transition-all duration-300 hover:scale-105 ${
                  isCurrentHero ? "ring-2 ring-amber-400 rounded-[4cqw] shadow-xl shadow-amber-500/20" : ""
                }`}
              >
                <DeltaCard
                  card={card}
                  size="responsive"
                  interactive={false}
                  showFlip={false}
                />

                {/* Quick Action: Set as Hero on Pedestal */}
                <button
                  type="button"
                  onClick={(e) => handleSetAsHero(card, e)}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-black/80 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-[9px] uppercase tracking-wider border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-30"
                  title="Pokaż na głównym podeście showroomu"
                >
                  Podest
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // If 0 cards owned
  if (allCardModels.length === 0) {
    return (
      <div className={`relative w-full rounded-3xl bg-slate-950 border border-white/15 p-8 md:p-12 shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center space-y-6 ${className}`}>
        {/* Background Lights */}
        <div className="absolute inset-0 bg-radial-gradient from-red-950/30 via-slate-950 to-black pointer-events-none" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-red-600/20 border border-white/15 flex items-center justify-center text-amber-400 shadow-2xl">
          <Shirt className="w-10 h-10" />
        </div>

        <div className="relative max-w-md space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            SHOWROOM DELTA 2018 GM
          </span>
          <h2 className="text-2xl font-[1000] tracking-tight text-white uppercase">
            Twoja Kolekcja Dopiero Się Zaczyna
          </h2>
          <p className="text-sm text-slate-400">
            Szatnia VIP ożyje, gdy odblokujesz swoje pierwsze karty z paczek. Wybierz i wyeksponuj na centralnym podeście swoje najcenniejsze trofea!
          </p>
        </div>

        {onNavigateToCollection && (
          <button
            onClick={onNavigateToCollection}
            className="relative px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl transition-all cursor-pointer"
          >
            Przejdź Do Kolekcji
          </button>
        )}
      </div>
    );
  }

  const heroThemeConfig = heroCard ? (DELTA_THEME_CONFIGS[heroCard.cardType] || DELTA_THEME_CONFIGS.STANDARD) : DELTA_THEME_CONFIGS.STANDARD;

  return (
    <div className={`relative w-full rounded-3xl bg-slate-950 border border-white/15 p-4 sm:p-6 md:p-8 shadow-2xl overflow-hidden space-y-10 ${className}`}>
      {/* Stadium Showroom Architectural Lighting */}
      <div 
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-96 pointer-events-none opacity-30 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${heroThemeConfig.accentGlow} 0%, transparent 70%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 pointer-events-none" />

      {/* Top Showroom Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <img
            src="/teamlogos/gm.png"
            alt="DELTA"
            className="w-9 h-9 object-contain filter drop-shadow(0 0 10px rgba(255,255,255,0.4))"
          />
          <div>
            <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">
              PREMIUM STADIUM SHOWROOM
            </span>
            <h2 className="text-lg sm:text-xl font-[1000] tracking-tight text-white uppercase">
              Szatnia Gwiazd DELTA 2018 GM
            </h2>
          </div>
        </div>

        {/* Quick Navigation Pills */}
        <div className="flex items-center gap-2">
          {onNavigateToSquad && (
            <button
              onClick={onNavigateToSquad}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Moja 11</span>
            </button>
          )}

          {onNavigateToCollection && (
            <button
              onClick={onNavigateToCollection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Kolekcja</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CENTRAL HERO PEDESTAL DISPLAY                                          */}
      {/* ========================================================================= */}
      {heroCard && (
        <div className="relative z-10 flex flex-col items-center justify-center pt-2 pb-6">
          {/* Volumetric Spotlight Overhead */}
          <div 
            className="w-48 h-12 rounded-full filter blur-2xl opacity-70 pointer-events-none mb-2"
            style={{ backgroundColor: heroThemeConfig.primaryColor }}
          />

          {/* Pedestal Stage */}
          <div className="relative flex flex-col items-center">
            {/* Crown Ribbon */}
            <div className="mb-3 px-3 py-1 rounded-full bg-black/70 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>KARTA GŁÓWNA SHOWROOMU</span>
            </div>

            {/* Large 3D DeltaCard on Pedestal */}
            <div 
              onClick={() => handleCardClick(heroCard)}
              className="cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
              style={{
                width: "min(75vw, 260px)",
                aspectRatio: "2 / 3"
              }}
            >
              <DeltaCard
                card={heroCard}
                size="responsive"
                isFlipped={heroFlipped}
                onFlipChange={(f) => setHeroFlipped(f)}
                interactive={true}
                showFlip={true}
              />
            </div>

            {/* Circular Metal Pedestal Base with Floor Reflection */}
            <div 
              className="w-[280px] sm:w-[320px] h-8 mt-4 rounded-full border border-white/20 shadow-2xl relative overflow-hidden flex items-center justify-center"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, #27272a 0%, #09090b 80%, #000000 100%)",
                boxShadow: `0 10px 30px -5px ${heroThemeConfig.accentGlow}, inset 0 2px 6px rgba(255,255,255,0.3)`
              }}
            >
              <div className="w-2/3 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
            </div>

            {/* Hero Card Quick Controls */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setHeroFlipped(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{heroFlipped ? "Pokaż Awers" : "Obróć na Rewers"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCardClick(heroCard)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                <span>Inspekcja 3D</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SHOWCASE CAROUSELS                                                     */}
      {/* ========================================================================= */}
      <div className="relative z-10 space-y-8 pt-4 border-t border-white/10">
        {/* Inferno Ultra Cards */}
        {renderCarousel(
          "Płomienne Karty Inferno",
          <Flame className="w-4 h-4" />,
          infernoCards,
          "#ff4d5a"
        )}

        {/* Delta Icon / Legendary Cards */}
        {renderCarousel(
          "Ikony i Legendy Klubu",
          <Crown className="w-4 h-4" />,
          iconCards,
          "#f59e0b"
        )}

        {/* Favorites */}
        {renderCarousel(
          "Twoje Ulubione Karty",
          <Star className="w-4 h-4 fill-current" />,
          favoriteCards,
          "#fbbf24"
        )}

        {/* Gold Master Cards */}
        {renderCarousel(
          "Złota Seria Mistrzowska",
          <Award className="w-4 h-4" />,
          goldMasterCards,
          "#eab308"
        )}

        {/* Recently Acquired */}
        {renderCarousel(
          "Ostatnio Zdobyte Karty",
          <Clock className="w-4 h-4" />,
          recentCards,
          "#38bdf8"
        )}
      </div>

      {/* Shared Card Detail Modal */}
      <CardDetailModal
        card={inspectedCard}
        isOpen={!!inspectedCard}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
}
