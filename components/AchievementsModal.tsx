"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Flame, 
  Crown, 
  ShieldCheck, 
  Target, 
  Zap, 
  Compass, 
  Star, 
  Shield, 
  Users, 
  CheckCircle2, 
  Activity, 
  Dumbbell, 
  Medal, 
  Crosshair, 
  Flag, 
  Gift, 
  Layers, 
  RotateCw, 
  ArrowLeftRight, 
  Heart, 
  Bell, 
  CalendarCheck, 
  Coins, 
  X, 
  Check
} from "lucide-react";
import AchievementUnlock from "./AchievementUnlock";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "match" | "training" | "collection" | "parent" | "special";
  tier: "bronze" | "silver" | "gold" | "diamond";
  target_value: number;
  unit: string;
  icon_name: string;
  reward_dp: number;
  reward_pack_type: string | null;
  for_entity: "player" | "user" | "both";
  sort_order: number;
  current_value: number;
  is_unlocked: boolean;
  claimed_reward: boolean;
  unlocked_at?: string;
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId?: string | null;
  playerName?: string;
  onPointsUpdated?: (newPoints: number) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Award: <Award size={18} />,
  Trophy: <Trophy size={18} />,
  Sparkles: <Sparkles size={18} />,
  Flame: <Flame size={18} />,
  Crown: <Crown size={18} />,
  ShieldCheck: <ShieldCheck size={18} />,
  Target: <Target size={18} />,
  Zap: <Zap size={18} />,
  Compass: <Compass size={18} />,
  Star: <Star size={18} />,
  Shield: <Shield size={18} />,
  Users: <Users size={18} />,
  CheckCircle2: <CheckCircle2 size={18} />,
  Activity: <Activity size={18} />,
  Dumbbell: <Dumbbell size={18} />,
  Medal: <Medal size={18} />,
  Crosshair: <Crosshair size={18} />,
  Flag: <Flag size={18} />,
  Gift: <Gift size={18} />,
  Layers: <Layers size={18} />,
  RotateCw: <RotateCw size={18} />,
  ArrowLeftRight: <ArrowLeftRight size={18} />,
  Heart: <Heart size={18} />,
  Bell: <Bell size={18} />,
  CalendarCheck: <CalendarCheck size={18} />,
  Coins: <Coins size={18} />
};

export default function AchievementsModal({
  isOpen,
  onClose,
  playerId,
  playerName,
  onPointsUpdated
}: AchievementsModalProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);
  const [selectedUnlockAchievement, setSelectedUnlockAchievement] = useState<Achievement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadAchievements();
  }, [isOpen, playerId]);

  async function loadAchievements() {
    setLoading(true);
    try {
      const url = playerId ? `/api/achievements/sync?playerId=${playerId}` : `/api/achievements/sync`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.achievements) {
        setAchievements(data.achievements);
      }
    } catch (e) {
      console.error("Błąd ładowania osiągnięć:", e);
    } finally {
      setLoading(false);
    }
  }

  async function claimReward(ach: Achievement) {
    if (ach.claimed_reward || !ach.is_unlocked || claimingId) return;

    setClaimingId(ach.id);
    try {
      const res = await fetch("/api/achievements/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          achievementId: ach.id,
          playerId: playerId || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd odbierania nagrody");

      setAchievements(prev =>
        prev.map(a => (a.id === ach.id ? { ...a, claimed_reward: true } : a))
      );

      setClaimFeedback(data.message || `+${ach.reward_dp} DP odebrane!`);
      if (onPointsUpdated) {
        onPointsUpdated(ach.reward_dp);
      }

      window.setTimeout(() => setClaimFeedback(null), 3500);
    } catch (e: any) {
      alert(`Błąd: ${e.message}`);
    } finally {
      setClaimingId(null);
    }
  }

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const filtered = achievements.filter(a => {
    if (selectedCategory === "all") return true;
    return a.category === selectedCategory;
  });

  const totalCount = achievements.length;
  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const unclaimedCount = achievements.filter(a => a.is_unlocked && !a.claimed_reward).length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return createPortal(
    <div className="v200-ach-modal-backdrop" onClick={onClose}>
      <div className="v200-ach-modal-content" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="v200-ach-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: "8px 10px", borderRadius: 12, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
              <Trophy size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2>Klubowe Osiągnięcia i Odznaki</h2>
                {unclaimedCount > 0 && (
                  <span style={{ padding: "2px 8px", borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 900 }}>
                    {unclaimedCount} DO ODBIORU
                  </span>
                )}
              </div>
              <p>
                {playerName ? `Profil osiągnięć zawodnika: ${playerName}` : "System nagród i progresu DELTA 2018 GM"}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="v200-modal-close-btn" type="button">
            <X size={18} />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {claimFeedback && (
          <div style={{ padding: "8px 20px", background: "linear-gradient(90deg, #f59e0b, #eab308)", color: "#000", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={15} /> {claimFeedback}
            </span>
            <Check size={16} />
          </div>
        )}

        {/* GLOBAL PROGRESS STRIP */}
        <div style={{ padding: "12px 22px", background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: "#cbd5e1" }}>
              Całkowity postęp odznak: <strong style={{ color: "#f1c95c" }}>{unlockedCount} / {totalCount}</strong>
            </span>
            <span style={{ color: "#f1c95c", fontFamily: "monospace", fontWeight: 900 }}>{progressPercent}%</span>
          </div>
          <div style={{ width: "100%", height: 8, background: "#0a0f1d", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg, #f59e0b, #fde047)", borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* TABS */}
        <div className="v200-typer-tabs-row">
          {[
            { id: "all", label: "Wszystkie", icon: <Trophy size={14} /> },
            { id: "match", label: "Mecze & Gole", icon: <Target size={14} /> },
            { id: "training", label: "Treningi", icon: <Activity size={14} /> },
            { id: "collection", label: "Karty & Paczki", icon: <Layers size={14} /> },
            { id: "parent", label: "Klub & Rodzic", icon: <Heart size={14} /> }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`v200-typer-tab-btn ${selectedCategory === cat.id ? "active" : ""}`}
              type="button"
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* BODY LIST */}
        <div className="v200-typer-body">
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
              <RotateCw size={32} className="animate-spin" style={{ color: "#f59e0b", margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontSize: 13 }}>Przeliczanie osiągnięć i odznak…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
              Brak osiągnięć w tej kategorii.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
              {filtered.map(ach => {
                const current = Math.min(ach.current_value, ach.target_value);
                const pct = Math.round((current / ach.target_value) * 100);

                let badgeBorder = "rgba(245, 158, 11, 0.3)";
                let badgeBg = "rgba(245, 158, 11, 0.1)";
                let tierLabel = "Brąz";

                if (ach.tier === "silver") {
                  tierLabel = "Srebro";
                  badgeBorder = "rgba(203, 213, 225, 0.4)";
                  badgeBg = "rgba(148, 163, 184, 0.15)";
                } else if (ach.tier === "gold") {
                  tierLabel = "Złoto";
                  badgeBorder = "rgba(250, 204, 21, 0.5)";
                  badgeBg = "rgba(234, 179, 8, 0.2)";
                } else if (ach.tier === "diamond") {
                  tierLabel = "Diament";
                  badgeBorder = "rgba(56, 189, 248, 0.6)";
                  badgeBg = "rgba(56, 189, 248, 0.2)";
                }

                return (
                  <div
                    key={ach.id}
                    onClick={() => {
                      if (ach.is_unlocked) {
                        setSelectedUnlockAchievement(ach);
                      }
                    }}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: ach.is_unlocked && !ach.claimed_reward ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(15,23,42,0.9))" : "rgba(18,24,38,0.85)",
                      border: ach.is_unlocked && !ach.claimed_reward ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 10,
                      cursor: ach.is_unlocked ? "pointer" : "default",
                      transition: "transform 0.15s ease, border-color 0.15s ease"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ padding: 8, borderRadius: 10, background: badgeBg, border: `1px solid ${badgeBorder}`, color: "#f1c95c", flexShrink: 0 }}>
                          {ICON_MAP[ach.icon_name] || <Award size={18} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <strong style={{ fontSize: 13, color: "#fff" }}>{ach.title}</strong>
                            <span style={{ padding: "1px 6px", borderRadius: 4, background: badgeBg, border: `1px solid ${badgeBorder}`, fontSize: 9, fontWeight: 900, color: "#f1c95c" }}>
                              {tierLabel}
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.35 }}>
                            {ach.description}
                          </p>
                        </div>
                      </div>

                      {/* PROGRESS BAR */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>
                          <span>Postęp:</span>
                          <span style={{ color: ach.is_unlocked ? "#34d399" : "#f1c95c", fontWeight: 700 }}>
                            {current} / {ach.target_value} {ach.unit} ({pct}%)
                          </span>
                        </div>
                        <div style={{ width: "100%", height: 5, background: "#0a0f1d", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: ach.is_unlocked ? "#10b981" : "#f59e0b", borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>

                    {/* REWARD & BUTTON */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, fontSize: 11 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#94a3b8" }}>Nagroda:</span>
                        <strong style={{ color: "#f1c95c", display: "flex", alignItems: "center", gap: 2 }}>
                          <Coins size={12} /> +{ach.reward_dp} DP
                        </strong>
                        {ach.reward_pack_type && (
                          <span style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", color: "#d8b4fe", fontSize: 9, fontWeight: 900 }}>
                            🎁 Paczka
                          </span>
                        )}
                      </div>

                      <div>
                        {ach.claimed_reward ? (
                          <span style={{ color: "#34d399", fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center", gap: 2 }}>
                            ✓ Zobacz
                          </span>
                        ) : ach.is_unlocked ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUnlockAchievement(ach);
                            }}
                            disabled={claimingId === ach.id}
                            style={{ padding: "5px 12px", borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "1px solid #fde047", color: "#000", fontWeight: 900, fontSize: 10, cursor: "pointer", textTransform: "uppercase" }}
                          >
                            {claimingId === ach.id ? "…" : "Odbierz"}
                          </button>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 10 }}>W toku ({pct}%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,15,26,0.95)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8" }}>
          <span>Osiągnięcia aktualizują się automatycznie po każdym meczu i treningu.</span>
          <button onClick={onClose} type="button" style={{ padding: "6px 16px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Zamknij
          </button>
        </div>
      </div>

      {/* ACHIEVEMENT UNLOCK CELEBRATION MODAL */}
      {selectedUnlockAchievement && (
        <AchievementUnlock
          grantId={selectedUnlockAchievement.id}
          title={selectedUnlockAchievement.title}
          description={selectedUnlockAchievement.description}
          variant={
            selectedUnlockAchievement.tier === "diamond" || selectedUnlockAchievement.id.includes("inferno")
              ? "inferno"
              : selectedUnlockAchievement.tier === "silver"
              ? "platinum" as any
              : "gold"
          }
          eyebrow={
            selectedUnlockAchievement.tier === "diamond"
              ? "LEGENDARNE OSIĄGNIĘCIE DIAMENTOWE"
              : "ODBLOKOWANA ODZNAKA DELTA"
          }
          grantDate={
            selectedUnlockAchievement.unlocked_at
              ? new Date(selectedUnlockAchievement.unlocked_at).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })
              : new Date().toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })
          }
          serialNumber={`#${selectedUnlockAchievement.sort_order.toString().padStart(3, "0")} / 2018 GM`}
          playerName={playerName || "Zawodnik DELTA"}
          progress={
            selectedUnlockAchievement.target_value > 1
              ? {
                  current: Math.min(selectedUnlockAchievement.current_value, selectedUnlockAchievement.target_value),
                  max: selectedUnlockAchievement.target_value,
                  unit: selectedUnlockAchievement.unit,
                  label: "Zrealizowany cel:"
                }
              : undefined
          }
          onClose={() => {
            const achToClaim = selectedUnlockAchievement;
            setSelectedUnlockAchievement(null);
            if (achToClaim && !achToClaim.claimed_reward) {
              claimReward(achToClaim);
            }
          }}
          onClaim={async () => {
            const achToClaim = selectedUnlockAchievement;
            setSelectedUnlockAchievement(null);
            if (achToClaim && !achToClaim.claimed_reward) {
              await claimReward(achToClaim);
            }
          }}
        />
      )}
    </div>,
    document.body
  );
}
