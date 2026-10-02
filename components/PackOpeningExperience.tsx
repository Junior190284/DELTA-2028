"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  Sparkles, 
  X, 
  ChevronRight, 
  Check, 
  Coins, 
  RefreshCw,
  Gift,
  Crown,
  Volume2,
  VolumeX
} from "lucide-react";
import { PackDefinition, PackOpeningResult, CardDefinition, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface PackOpeningExperienceProps {
  pack: PackDefinition;
  onClose: () => void;
  onOpenAnother?: () => void;
  unopenedCount?: number;
}

type Stage = "sealed" | "tearing" | "burst" | "revealing" | "summary";

export default function PackOpeningExperience({
  pack,
  onClose,
  onOpenAnother,
  unopenedCount = 0
}: PackOpeningExperienceProps) {
  const [stage, setStage] = useState<Stage>("sealed");
  const [loading, setLoading] = useState(false);
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);
  const [infernoCinematic, setInfernoCinematic] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  // Trigger server-side opening API
  const handleTearPack = async () => {
    if (loading || stage !== "sealed") return;
    setLoading(true);
    setStage("tearing");
    cardSound.playPackTear();

    try {
      const res = await fetch("/api/cards/open-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_type_id: pack.id })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd otwierania paczki");
      }

      const data: PackOpeningResult = await res.json();
      setOpeningResult(data);
      setRevealedCards(new Array(data.cards.length).fill(false));

      // Timing for burst animation
      setTimeout(() => {
        setStage("burst");
        setTimeout(() => {
          setStage("revealing");
          setCurrentCardIndex(0);
        }, 800);
      }, 700);
    } catch (e: any) {
      alert(e.message || "Nie udało się otworzyć paczki.");
      setStage("sealed");
    } finally {
      setLoading(false);
    }
  };

  // Reveal current card in sequence
  const handleRevealCurrentCard = () => {
    if (!openingResult) return;
    const cardItem = openingResult.cards[currentCardIndex];
    if (!cardItem) return;

    const rarity = cardItem.card.rarity || "common";

    // Play sound
    if (!soundMuted) {
      cardSound.playReveal(rarity);
    }

    // Inferno special cinematic
    if (rarity === "inferno") {
      setInfernoCinematic(true);
      setTimeout(() => {
        setInfernoCinematic(false);
      }, 2400);
    }

    setRevealedCards(prev => {
      const updated = [...prev];
      updated[currentCardIndex] = true;
      return updated;
    });
  };

  // Next card in pack
  const handleNextCard = () => {
    if (!openingResult) return;
    if (currentCardIndex + 1 < openingResult.cards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setStage("summary");
    }
  };

  // Reveal all cards instantly
  const handleRevealAll = () => {
    if (!openingResult) return;
    setRevealedCards(new Array(openingResult.cards.length).fill(true));
    setStage("summary");
  };

  const packTheme = pack.theme || "gold";
  const packBg = 
    packTheme === "inferno"
      ? "from-red-900 via-stone-900 to-black"
      : packTheme === "legend"
        ? "from-amber-800 via-zinc-900 to-black"
        : "from-amber-600 via-stone-900 to-black";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none animate-fadeIn">
      {/* BACKGROUND STADIUM LIGHTS / AMBIENT GLOW */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b ${packBg} opacity-30 blur-[120px] rounded-full`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/60 to-black" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <div className="relative z-50 w-full max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/teamlogos/gm.png" alt="DELTA GM" className="w-8 h-8 object-contain drop-shadow" />
          <div>
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-400 uppercase block">
              DELTA CARDS & COLLECTION
            </span>
            <h2 className="text-sm sm:text-lg font-black text-white">{pack.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stage === "revealing" && (
            <button
              onClick={handleRevealAll}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 transition-colors"
            >
              Pomiń animację
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ================= INFERNO CINEMATIC OVERLAY ================= */}
      {infernoCinematic && (
        <div className="fixed inset-0 z-[10000] pointer-events-none flex flex-col items-center justify-center bg-black/90 animate-pulse">
          <div className="absolute inset-0 bg-radial from-red-600/40 via-orange-950/60 to-black blur-xl" />
          <div className="relative z-10 flex flex-col items-center gap-4 text-center px-4 animate-bounce">
            <div className="p-4 rounded-full bg-red-600/30 border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)]">
              <Flame size={64} className="text-red-500 animate-spin" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 drop-shadow-[0_0_35px_rgba(255,100,0,0.9)]">
              🔥 INFERNO DROP! 🔥
            </h1>
            <p className="text-sm sm:text-lg font-bold tracking-widest text-red-200 uppercase">
              NAJRZADSZA KARTA W GRZE!
            </p>
          </div>
        </div>
      )}

      {/* ================= STAGE 1: SEALED FOIL PACK ================= */}
      {stage === "sealed" && (
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-auto text-center">
          {/* 3D PACK FOIL */}
          <div 
            onClick={handleTearPack}
            className="relative w-[260px] sm:w-[300px] h-[390px] sm:h-[450px] rounded-2xl cursor-pointer group transition-all duration-500 hover:scale-105 shadow-2xl overflow-hidden border-2 flex flex-col justify-between p-6"
            style={{
              background: packTheme === "inferno"
                ? "linear-gradient(145deg, #7f1d1d, #450a0a, #1c0303)"
                : packTheme === "legend"
                  ? "linear-gradient(145deg, #a16207, #713f12, #241403)"
                  : "linear-gradient(145deg, #ca8a04, #854d0e, #1c1917)",
              borderColor: packTheme === "inferno" ? "#ef4444" : "#eab308",
              boxShadow: packTheme === "inferno"
                ? "0 0 45px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(239, 68, 68, 0.3)"
                : "0 0 45px rgba(234, 179, 8, 0.4), inset 0 0 30px rgba(234, 179, 8, 0.3)"
            }}
          >
            {/* Metallic Foil Sheen */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
              style={{
                backgroundImage: "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,1) 50%, transparent 60%)",
                backgroundSize: "200% 200%",
                animation: "cardShimmer 3s infinite linear"
              }}
            />

            {/* Tear Line Indicator at Top */}
            <div className="relative z-10 flex items-center justify-between border-b-2 border-dashed border-white/40 pb-2">
              <span className="text-[10px] font-black tracking-widest text-white/80 uppercase">
                ROZERWIJ PACZKĘ
              </span>
              <Sparkles size={16} className="text-amber-300 animate-spin" />
            </div>

            {/* Pack Center Branding */}
            <div className="relative z-10 flex flex-col items-center gap-3 my-auto">
              <img src="/teamlogos/gm.png" alt="DELTA" className="w-20 h-20 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-black tracking-widest text-amber-300 uppercase">
                  OFICJALNA PACZKA
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white italic tracking-wide uppercase drop-shadow-md">
                  {pack.name}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-black/50 border border-white/20 text-xs font-bold text-white/90">
                {pack.cards_count} {pack.cards_count === 1 ? "KARTA" : pack.cards_count < 5 ? "KARTY" : "KART"}
              </span>
            </div>

            {/* Pack Footer */}
            <div className="relative z-10 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-white/70 font-bold">
              <span>MIN. RZADKOŚĆ:</span>
              <span className="uppercase text-amber-300">{pack.min_rarity}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTearPack}
            className="mt-6 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm tracking-wider uppercase shadow-xl hover:shadow-amber-500/50 transform transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <Sparkles size={18} /> KLIKNIJ, ABY OTWORZYĆ
          </button>
        </div>
      )}

      {/* ================= STAGE 2: TEARING & BURST ================= */}
      {(stage === "tearing" || stage === "burst") && (
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-auto">
          <div className="relative w-[280px] h-[420px] flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-amber-400 animate-ping opacity-75 blur-xl" />
            <Sparkles size={64} className="text-amber-300 animate-spin" />
            <span className="absolute bottom-6 font-black text-lg text-white tracking-widest uppercase animate-pulse">
              OTWIERANIE...
            </span>
          </div>
        </div>
      )}

      {/* ================= STAGE 3: REVEALING CARDS ONE BY ONE ================= */}
      {stage === "revealing" && openingResult && (
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-auto max-w-lg w-full">
          {/* Progress Indicator */}
          <div className="mb-4 flex items-center gap-2">
            {openingResult.cards.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentCardIndex
                    ? "w-8 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                    : idx < currentCardIndex || revealedCards[idx]
                      ? "w-4 bg-emerald-400"
                      : "w-4 bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Current Card Stage */}
          {(() => {
            const currentItem = openingResult.cards[currentCardIndex];
            if (!currentItem) return null;
            const isRevealed = revealedCards[currentCardIndex];

            return (
              <div className="flex flex-col items-center gap-6">
                {!isRevealed ? (
                  /* Card Back (Click to reveal) */
                  <div 
                    onClick={handleRevealCurrentCard}
                    className="relative w-[260px] sm:w-[290px] h-[380px] sm:h-[420px] rounded-2xl cursor-pointer group shadow-2xl border-2 border-amber-400/60 bg-gradient-to-br from-slate-900 via-neutral-900 to-black flex flex-col items-center justify-between p-6 transform transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <img src="/teamlogos/gm.png" alt="DELTA" className="w-6 h-6 object-contain" />
                      <span className="text-xs font-black text-slate-300 tracking-wider">DELTA GM</span>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <Sparkles size={36} className="animate-pulse" />
                      </div>
                      <span className="text-base font-black text-white tracking-widest uppercase">
                        KARTA #{currentCardIndex + 1} Z {openingResult.cards.length}
                      </span>
                      <span className="text-xs text-amber-400 font-bold animate-bounce">
                        KLIKNIJ, ABY ODKRYĆ!
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">SEZON 2026/27</span>
                  </div>
                ) : (
                  /* Card Front (Revealed) */
                  <div className="flex flex-col items-center gap-4 animate-scaleUp">
                    <CollectibleCard3D
                      card={currentItem.card}
                      size="lg"
                      interactive={true}
                      showFlip={true}
                    />

                    {/* Duplicate Indicator */}
                    {currentItem.is_duplicate && (
                      <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-lg animate-fadeIn">
                        <Coins size={16} /> DUPLIKAT! +{currentItem.duplicate_points} DELTA POINTS
                      </div>
                    )}

                    {/* Action Button: Next Card or Summary */}
                    <button
                      type="button"
                      onClick={handleNextCard}
                      className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-sm tracking-wider uppercase shadow-xl hover:shadow-amber-500/50 flex items-center gap-2 transform transition hover:-translate-y-0.5"
                    >
                      {currentCardIndex + 1 < openingResult.cards.length ? (
                        <>KOLEJNA KARTA <ChevronRight size={18} /></>
                      ) : (
                        <>PODSUMOWANIE PACZKI <Check size={18} /></>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= STAGE 4: SUMMARY SHOWCASE ================= */}
      {stage === "summary" && openingResult && (
        <div className="relative z-10 flex flex-col items-center justify-between flex-1 my-auto max-w-5xl w-full py-4 overflow-y-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
              GRATULACJE!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              OTRZYMANE KARTY
            </h2>
            {openingResult.total_delta_points_earned > 0 && (
              <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-black">
                <Coins size={16} /> Łącznie zdobyto +{openingResult.total_delta_points_earned} Delta Points za duplikaty
              </div>
            )}
          </div>

          {/* Cards Grid Showcase */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 my-auto max-w-4xl">
            {openingResult.cards.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <CollectibleCard3D
                  card={item.card}
                  size="md"
                  interactive={true}
                  showFlip={true}
                />
                {item.is_duplicate && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    +{item.duplicate_points} DP (Duplikat)
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Summary Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wider uppercase transition-colors"
            >
              Przejdź do kolekcji
            </button>

            {unopenedCount > 0 && onOpenAnother && (
              <button
                type="button"
                onClick={() => {
                  setStage("sealed");
                  setOpeningResult(null);
                  setRevealedCards([]);
                  onOpenAnother();
                }}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-sm tracking-wider uppercase shadow-xl hover:shadow-amber-500/50 flex items-center gap-2"
              >
                <Gift size={18} /> Otwórz następną ({unopenedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="relative z-10 text-center py-2 text-[10px] text-slate-500">
        Karty zostają trwale przypisane do Twojego profilu klubowego w DELTA Warszawa 2018 GM.
      </div>
    </div>
  );
}
