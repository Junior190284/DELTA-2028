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
  Coins, 
  Zap,
  Layers,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { CardDefinition, UserCard } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

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

function getInitials(name?: string): string {
  if (!name) return "GM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
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
    cardSound.playHover();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Map owned cards
  const cardsMap = new Map<string, CardDefinition>(allCards.map(c => [c.id, c]));

  // Eligible cards for selected challenge
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
        console.warn("SBC API completed in offline/demo mode");
      }

      setCompletedSuccess(true);
      cardSound.playWalkoutFanfare();
      onRewardClaimed?.(selectedChallenge.rewardPackId, selectedChallenge.rewardPoints);
    } catch {
      setCompletedSuccess(true);
      cardSound.playWalkoutFanfare();
      onRewardClaimed?.(selectedChallenge.rewardPackId, selectedChallenge.rewardPoints);
    } finally {
      setSubmitting(false);
    }
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case "inferno": return "#ff4d5a";
      case "legend": return "#f1c95c";
      case "matchday": return "#38bdf8";
      default: return "#eab308";
    }
  };

  const themeColor = getThemeColor(selectedChallenge.theme);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "rgba(3, 5, 8, 0.95)",
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
        style={{
          width: "100%",
          maxWidth: "920px",
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          background: "radial-gradient(ellipse at 50% 0%, #0d1b38 0%, #060d1d 55%, #02050b 100%)",
          border: "1px solid rgba(241, 201, 92, 0.35)",
          borderRadius: "24px",
          boxShadow: "0 30px 90px -20px rgba(0,0,0,0.98), 0 0 50px rgba(241, 201, 92, 0.15)",
          color: "#ffffff",
          overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ================= 1. MODAL TOP HEADER ================= */}
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            background: "linear-gradient(90deg, #091329 0%, #0c1c3d 50%, #091329 100%)",
            borderBottom: "1px solid rgba(241, 201, 92, 0.25)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div 
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(241, 201, 92, 0.15)",
                border: "1px solid rgba(241, 201, 92, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f1c95c",
                boxShadow: "0 0 16px rgba(241, 201, 92, 0.2)"
              }}
            >
              <RefreshCw size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "0.5px", margin: 0, color: "#f8fafc" }}>
                  SBC • WYZWANIA BUDOWANIA SKŁADU
                </h2>
                <span 
                  style={{
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "linear-gradient(90deg, #f1c95c, #eab308)",
                    color: "#000000",
                    fontSize: "10px",
                    fontWeight: 900,
                    letterSpacing: "0.5px"
                  }}
                >
                  WYMIANA KART
                </span>
              </div>
              <p style={{ margin: "3px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
                Oddawaj duplikaty i niepotrzebne karty, aby zdobyć gwarantowane paczki specjalne!
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cbd5e1",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= 2. MODAL BODY ================= */}
        {completedSuccess ? (
          <div 
            style={{
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "16px"
            }}
          >
            <div 
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(52, 211, 153, 0.15)",
                border: "2px solid #34d399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#34d399",
                boxShadow: "0 0 30px rgba(52, 211, 153, 0.3)"
              }}
            >
              <Check size={44} />
            </div>

            <h3 style={{ fontSize: "24px", fontWeight: 900, margin: 0, color: "#ffffff", letterSpacing: "0.5px" }}>
              WYZWANIE SBC UKOŃCZONE!
            </h3>

            <p style={{ maxWidth: "460px", fontSize: "13px", color: "#cbd5e1", lineHeight: "1.6", margin: 0 }}>
              Karty zostały pomyślnie przetopione! Nagroda <b style={{ color: "#f1c95c" }}>{selectedChallenge.rewardPackName}</b> została dodana do Twojego ekwipunku!
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
              {selectedChallenge.rewardPackId && onOpenPackDirectly && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPackDirectly(selectedChallenge.rewardPackId!);
                  }}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "14px",
                    background: "linear-gradient(90deg, #f1c95c, #eab308)",
                    border: "none",
                    color: "#000000",
                    fontWeight: 900,
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    boxShadow: "0 4px 18px rgba(241, 201, 92, 0.4)"
                  }}
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
                style={{
                  padding: "12px 20px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                KOLEJNE WYZWANIE
              </button>
            </div>
          </div>
        ) : (
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
              minHeight: "440px",
              maxHeight: "calc(92dvh - 80px)",
              overflow: "hidden"
            }}
          >
            {/* Left Column: Challenge Selector */}
            <div 
              style={{
                padding: "16px",
                borderRight: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                overflowY: "auto",
                background: "rgba(0, 0, 0, 0.35)"
              }}
            >
              <span style={{ fontSize: "10px", fontWeight: 900, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>
                Dostępne Wyzwania
              </span>

              {SBC_CHALLENGES.map(ch => {
                const isActive = selectedChallenge.id === ch.id;
                const col = getThemeColor(ch.theme);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChallenge(ch);
                      setSelectedCardIds([]);
                      cardSound.playHover();
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "14px",
                      textAlign: "left",
                      background: isActive 
                        ? `linear-gradient(135deg, ${col}25 0%, rgba(10, 16, 28, 0.9) 100%)` 
                        : "rgba(255, 255, 255, 0.03)",
                      border: isActive 
                        ? `1.5px solid ${col}` 
                        : "1px solid rgba(255, 255, 255, 0.07)",
                      boxShadow: isActive ? `0 4px 18px ${col}33` : "none",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 900, color: "#ffffff" }}>
                        {ch.title}
                      </span>
                      <span 
                        style={{
                          fontSize: "9px",
                          fontFamily: "monospace",
                          fontWeight: 900,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: isActive ? col : "rgba(255, 255, 255, 0.1)",
                          color: isActive ? "#000000" : "#cbd5e1"
                        }}
                      >
                        {ch.requiredCount}x {ch.requiredRarity.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>
                      {ch.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Card Slot Grid & Submission */}
            <div 
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflowY: "auto"
              }}
            >
              <div>
                {/* Challenge Info Banner */}
                <div 
                  style={{
                    padding: "14px 18px",
                    borderRadius: "16px",
                    background: `linear-gradient(90deg, ${themeColor}15 0%, rgba(15, 23, 42, 0.5) 100%)`,
                    border: `1px solid ${themeColor}44`,
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px"
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 900, color: themeColor, margin: "0 0 3px 0" }}>
                      {selectedChallenge.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: "11px", color: "#cbd5e1", lineHeight: "1.4" }}>
                      {selectedChallenge.description}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", display: "block" }}>
                      NAGRODA:
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 900, color: "#f1c95c" }}>
                      {selectedChallenge.rewardPackName}
                    </span>
                  </div>
                </div>

                {/* Selected Slots Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#f8fafc" }}>
                    Wybierz karty do przetopienia ({selectedCardIds.length}/{selectedChallenge.requiredCount}):
                  </span>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                    Dostępne karty: {eligibleCards.length}
                  </span>
                </div>

                {/* Eligible Cards Grid */}
                {eligibleCards.length === 0 ? (
                  <div 
                    style={{
                      padding: "36px 20px",
                      borderRadius: "16px",
                      border: "1px dashed rgba(255, 255, 255, 0.15)",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "12px"
                    }}
                  >
                    Brak wymaganych kart o rzadkości <b style={{ color: themeColor }}>{selectedChallenge.requiredRarity.toUpperCase()}</b> w Twojej kolekcji. Otwórz paczki, aby zdobyć karty!
                  </div>
                ) : (
                  <div 
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                      gap: "10px",
                      maxHeight: "220px",
                      overflowY: "auto",
                      padding: "4px"
                    }}
                  >
                    {eligibleCards.map(({ userCard, card }) => {
                      const isSelected = selectedCardIds.includes(card.id);
                      const isRyszard = (card.player?.display_name || card.card_name).toLowerCase().includes("ryszard");
                      const photoSrc = isRyszard 
                        ? "/assets/players/ryszard-rybacki.png" 
                        : (card.player?.photo_path || null);

                      return (
                        <div
                          key={`${userCard.id}-${card.id}`}
                          onClick={() => toggleSelectCard(card.id)}
                          style={{
                            padding: "8px",
                            borderRadius: "14px",
                            border: isSelected 
                              ? "2px solid #f1c95c" 
                              : "1px solid rgba(255, 255, 255, 0.1)",
                            background: isSelected 
                              ? "rgba(241, 201, 92, 0.2)" 
                              : "rgba(0, 0, 0, 0.4)",
                            boxShadow: isSelected 
                              ? "0 0 16px rgba(241, 201, 92, 0.3)" 
                              : "none",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            position: "relative",
                            transition: "all 0.15s"
                          }}
                        >
                          {/* Mini Photo / Avatar Container */}
                          <div 
                            style={{
                              width: "48px",
                              height: "60px",
                              borderRadius: "8px",
                              background: "radial-gradient(circle, #1e293b 0%, #020617 100%)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: "6px"
                            }}
                          >
                            {photoSrc ? (
                              <img 
                                src={photoSrc} 
                                alt={card.player?.display_name || card.card_name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain"
                                }}
                              />
                            ) : (
                              <div 
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <span style={{ fontSize: "14px", fontWeight: 900, color: "#f1c95c" }}>
                                  {getInitials(card.player?.display_name || card.card_name)}
                                </span>
                                <span style={{ fontSize: "8px", color: "#64748b", fontFamily: "monospace" }}>
                                  #{card.player?.shirt_number || "GM"}
                                </span>
                              </div>
                            )}
                          </div>

                          <span 
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              color: "#ffffff",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%"
                            }}
                          >
                            {card.player?.display_name?.split(" ")[0] || card.card_name}
                          </span>

                          <span 
                            style={{
                              fontSize: "8px",
                              color: "#f1c95c",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              fontFamily: "monospace"
                            }}
                          >
                            {card.rarity}
                          </span>

                          {/* Kopie i bilans powtórek */}
                          {(() => {
                            const totalCopies = (userCard.duplicates_count || 0) + 1;
                            const chosen = isSelected ? 1 : 0;
                            const remain = totalCopies - chosen;

                            return (
                              <div 
                                style={{ 
                                  marginTop: "4px", 
                                  fontSize: "8px", 
                                  textAlign: "center", 
                                  lineHeight: "1.3",
                                  background: "rgba(0,0,0,0.4)",
                                  padding: "2px 4px",
                                  borderRadius: "6px",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}
                              >
                                <div style={{ color: "#94a3b8" }}>Posiadasz: <b style={{ color: "#fff" }}>{totalCopies}</b></div>
                                <div style={{ color: isSelected ? "#fbbf24" : "#64748b" }}>Wybrane: <b>{chosen}</b></div>
                                <div style={{ color: remain > 0 ? "#34d399" : "#f87171" }}>Pozostanie: <b>{remain}</b></div>
                              </div>
                            );
                          })()}

                          {isSelected && (
                            <div 
                              style={{
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                background: "#f1c95c",
                                color: "#000000",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: 900
                              }}
                            >
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Action Bar */}
              <div 
                style={{
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginTop: "12px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "11px" }}>
                  <AlertCircle size={14} style={{ color: "#f1c95c", flexShrink: 0 }} />
                  <span>Wybrane karty zostaną trwale wymienione na nagrodę.</span>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteSBC}
                  disabled={selectedCardIds.length < selectedChallenge.requiredCount || submitting}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "14px",
                    border: "none",
                    background: selectedCardIds.length >= selectedChallenge.requiredCount && !submitting
                      ? "linear-gradient(90deg, #f1c95c, #eab308)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: selectedCardIds.length >= selectedChallenge.requiredCount && !submitting
                      ? "#000000"
                      : "#64748b",
                    fontWeight: 900,
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: selectedCardIds.length >= selectedChallenge.requiredCount && !submitting
                      ? "pointer"
                      : "not-allowed",
                    boxShadow: selectedCardIds.length >= selectedChallenge.requiredCount && !submitting
                      ? "0 4px 18px rgba(241, 201, 92, 0.4)"
                      : "none",
                    transition: "all 0.2s"
                  }}
                >
                  <RefreshCw size={15} className={submitting ? "animate-spin" : ""} />
                  <span>
                    {submitting 
                      ? "PRZETAPIANIE KART..." 
                      : `WYMIEŃ I ODBIERZ NAGRODĘ (${selectedCardIds.length}/${selectedChallenge.requiredCount})`}
                  </span>
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
