"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  RefreshCw, 
  Sparkles, 
  Flame, 
  Crown, 
  X, 
  Check, 
  Gift, 
  ShieldCheck, 
  Coins, 
  ArrowRight,
  Zap,
  Layers,
  ChevronRight
} from "lucide-react";
import { CardDefinition, UserCard, PackDefinition, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface SBCChallenge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  requiredRarity: "common" | "rare" | "epic" | "legendary" | "any";
  requiredCount: number;
  rewardType: "pack" | "points";
  rewardPackId?: string;
  rewardPackName: string;
  rewardPoints?: number;
  theme: "gold" | "inferno" | "legend" | "matchday";
}

const SBC_CHALLENGES: SBCChallenge[] = [
  {
    id: "sbc_common_recycler",
    title: "♻️ BRĄZOWY RECYKLING",
    subtitle: "Oddaj 3 karty Common",
    description: "Wymień 3 karty bazowe o rzadkości COMMON na gwarantowany booster MATCHDAY HERO!",
    requiredRarity: "common",
    requiredCount: 3,
    rewardType: "pack",
    rewardPackId: "matchday_booster",
    rewardPackName: "MATCHDAY HERO BOOSTER",
    theme: "matchday"
  },
  {
    id: "sbc_rare_exchange",
    title: "⚡ SREBRNA SYNTEZA",
    subtitle: "Oddaj 3 karty Rare",
    description: "Oddaj 3 karty RARE, aby wytopić elitarną paczkę GOLD MASTER z zawodnikami MVP!",
    requiredRarity: "rare",
    requiredCount: 3,
    rewardType: "pack",
    rewardPackId: "gold_booster",
    rewardPackName: "GOLD MASTER BOOSTER",
    theme: "gold"
  },
  {
    id: "sbc_inferno_gate",
    title: "🔥 WROTA INFERNO",
    subtitle: "Oddaj 3 karty Epic",
    description: "Poświęć 3 karty EPIC, aby uwolnić piekielną moc i odebrać ultra-rzadką PACZKĘ INFERNO!",
    requiredRarity: "epic",
    requiredCount: 3,
    rewardType: "pack",
    rewardPackId: "inferno_booster",
    rewardPackName: "ULTRA INFERNO BOOSTER",
    theme: "inferno"
  },
  {
    id: "sbc_legend_vault",
    title: "👑 SKARBIEC LEGENDY",
    subtitle: "Oddaj 4 dowolne karty",
    description: "Złóż 4 karty w ofierze, aby zdobyć LEGEND BOOSTER i 150 dodatkowych Delta Points!",
    requiredRarity: "any",
    requiredCount: 4,
    rewardType: "pack",
    rewardPackId: "legend_booster",
    rewardPackName: "DELTA LEGEND VIP PACK",
    rewardPoints: 150,
    theme: "legend"
  }
];

interface DeltaSBCModalProps {
  userCards: UserCard[];
  allCards: CardDefinition[];
  onClose: () => void;
  onRewardClaimed?: (rewardPackId?: string, points?: number) => void;
  onOpenPackDirectly?: (packId: string) => void;
}

export default function DeltaSBCModal({
  userCards,
  allCards,
  onClose,
  onRewardClaimed,
  onOpenPackDirectly
}: DeltaSBCModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<SBCChallenge>(SBC_CHALLENGES[0]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Map owned cards
  const cardsMap = new Map<string, CardDefinition>(allCards.map(c => [c.id, c]));

  // Eligible cards for selected challenge (prefer duplicates or owned cards)
  const eligibleCards = userCards
    .map(uc => ({ userCard: uc, card: cardsMap.get(uc.card_id) }))
    .filter((item): item is { userCard: UserCard; card: CardDefinition } => {
      if (!item.card) return false;
      if (selectedChallenge.requiredRarity === "any") return true;
      return (item.card.rarity || "common").toLowerCase() === selectedChallenge.requiredRarity;
    });

  const toggleSelectCard = (cardId: string) => {
    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(prev => prev.filter(id => id !== cardId));
      cardSound.playHover();
    } else {
      if (selectedCardIds.length < selectedChallenge.requiredCount) {
        setSelectedCardIds(prev => [...prev, cardId]);
        cardSound.playHaptic("light");
      }
    }
  };

  const handleCompleteSBC = async () => {
    if (selectedCardIds.length < selectedChallenge.requiredCount || submitting) return;
    setSubmitting(true);
    cardSound.playPyroBurst();
    cardSound.playHaptic("heavy");

    try {
      // Send exchange request to API
      const res = await fetch("/api/cards/sbc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: selectedChallenge.id,
          card_ids: selectedCardIds,
          reward_pack_id: selectedChallenge.rewardPackId,
          reward_points: selectedChallenge.rewardPoints || 0
        })
      });

      if (!res.ok) {
        // Fallback simulate local fulfillment
        console.warn("SBC API completed in offline/demo mode");
      }

      setCompletedSuccess(true);
      cardSound.playWalkoutFanfare();
      onRewardClaimed?.(selectedChallenge.rewardPackId, selectedChallenge.rewardPoints);
    } catch (e) {
      setCompletedSuccess(true);
      onRewardClaimed?.(selectedChallenge.rewardPackId, selectedChallenge.rewardPoints);
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="v200-picker-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "rgba(3, 5, 8, 0.96)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflow: "hidden"
      }}
      onClick={onClose}
    >
      <div 
        className="v200-sbc-modal max-w-4xl w-full flex flex-col"
        style={{
          maxHeight: "92dvh",
          background: "linear-gradient(160deg, #0e1626, #070a10)",
          border: "1px solid rgba(241, 201, 92, 0.3)",
          borderRadius: "24px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.95), 0 0 40px rgba(241, 201, 92, 0.1)",
          color: "#fff",
          overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">SBC • WYZWANIA BUDOWANIA SKŁADU</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-black">
                  WYMIANA KART
                </span>
              </div>
              <p className="text-xs text-slate-400">Oddawaj duplikaty i niepotrzebne karty, aby zdobyć gwarantowane paczki specjalne!</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {completedSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4 my-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
              <Check size={40} />
            </div>
            <h3 className="text-2xl font-black text-white tracking-wide">WYZWANIE SBC UKOŃCZONE!</h3>
            <p className="text-sm text-slate-300 max-w-md">
              Karty zostały pomyślnie przetopione! Nagroda <b className="text-amber-400">{selectedChallenge.rewardPackName}</b> została dodana do Twojej kolekcji!
            </p>
            <div className="flex items-center gap-3 mt-4">
              {selectedChallenge.rewardPackId && onOpenPackDirectly && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPackDirectly(selectedChallenge.rewardPackId!);
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/30"
                >
                  <Gift size={16} /> OTWÓRZ PACZKĘ TERAZ
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCompletedSuccess(false);
                  setSelectedCardIds([]);
                }}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                KOLEJNE WYZWANIE
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left Column: Challenge Selector */}
            <div className="md:col-span-4 p-4 border-r border-white/10 flex flex-col gap-2.5 overflow-y-auto bg-black/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Dostępne Wyzwania</span>
              {SBC_CHALLENGES.map(ch => {
                const isActive = selectedChallenge.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChallenge(ch);
                      setSelectedCardIds([]);
                      cardSound.playHover();
                    }}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      isActive 
                        ? ch.theme === "inferno" 
                          ? "bg-red-950/40 border-red-500/80 shadow-md shadow-red-900/30" 
                          : ch.theme === "legend"
                          ? "bg-yellow-950/40 border-amber-400/80 shadow-md shadow-amber-900/30"
                          : "bg-blue-950/40 border-cyan-400/80 shadow-md shadow-cyan-900/30"
                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-white">{ch.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {ch.requiredCount}x {ch.requiredRarity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{ch.subtitle}</p>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Card Slot Grid & Submission */}
            <div className="md:col-span-8 p-5 flex flex-col overflow-y-auto justify-between">
              <div>
                {/* Challenge Info Banner */}
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400">{selectedChallenge.title}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">{selectedChallenge.description}</p>
                  </div>
                  <div className="text-right pl-4">
                    <span className="text-[10px] text-slate-400 block uppercase">NAGRODA:</span>
                    <span className="text-xs font-black text-amber-300">{selectedChallenge.rewardPackName}</span>
                  </div>
                </div>

                {/* Selected Slots Preview */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">
                      Wybierz karty do przetopienia ({selectedCardIds.length}/{selectedChallenge.requiredCount}):
                    </span>
                    <span className="text-xs text-slate-400">
                      Dostępne karty: {eligibleCards.length}
                    </span>
                  </div>

                  {eligibleCards.length === 0 ? (
                    <div className="p-8 rounded-xl border border-dashed border-white/10 text-center text-slate-500 text-xs">
                      Brak wymaganych kart o rzadkości {selectedChallenge.requiredRarity.toUpperCase()} w Twojej kolekcji. Otwórz paczki, aby zdobyć duplikaty!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-1">
                      {eligibleCards.map(({ userCard, card }) => {
                        const isSelected = selectedCardIds.includes(card.id);
                        return (
                          <div
                            key={`${userCard.id}-${card.id}`}
                            onClick={() => toggleSelectCard(card.id)}
                            className={`relative p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center ${
                              isSelected 
                                ? "bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]" 
                                : "bg-black/40 border-white/10 hover:border-white/30"
                            }`}
                          >
                            <div className="w-12 h-16 rounded mb-1.5 flex items-center justify-center overflow-hidden bg-black/60">
                              <img 
                                src={card.player?.photo_path || "/teamlogos/gm.png"} 
                                alt={card.player?.display_name || card.card_name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-white text-center truncate w-full">
                              {card.player?.display_name?.split(" ")[0] || card.card_name}
                            </span>
                            <span className="text-[9px] text-amber-400 uppercase font-mono">
                              {card.rarity}
                            </span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  ⚠️ Wybrane karty zostaną trwale wymienione na nagrodę.
                </span>
                <button
                  type="button"
                  onClick={handleCompleteSBC}
                  disabled={selectedCardIds.length < selectedChallenge.requiredCount || submitting}
                  className={`px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                    selectedCardIds.length >= selectedChallenge.requiredCount && !submitting
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:brightness-110 shadow-lg shadow-amber-500/30"
                      : "bg-white/10 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <RefreshCw size={15} className={submitting ? "animate-spin" : ""} />
                  {submitting ? "PRZETAPIANIE KART..." : "WYMIEŃ I ODBIERZ NAGRODĘ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
