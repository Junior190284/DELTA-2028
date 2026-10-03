"use client";

import React, { useState, useEffect } from "react";
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
  ChevronRight,
  Filter,
  Check
} from "lucide-react";

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

// Mapa ikon Lucide
const ICON_MAP: Record<string, React.ReactNode> = {
  Award: <Award size={20} />,
  Trophy: <Trophy size={20} />,
  Sparkles: <Sparkles size={20} />,
  Flame: <Flame size={20} />,
  Crown: <Crown size={20} />,
  ShieldCheck: <ShieldCheck size={20} />,
  Target: <Target size={20} />,
  Zap: <Zap size={20} />,
  Compass: <Compass size={20} />,
  Star: <Star size={20} />,
  Shield: <Shield size={20} />,
  Users: <Users size={20} />,
  CheckCircle2: <CheckCircle2 size={20} />,
  Activity: <Activity size={20} />,
  Dumbbell: <Dumbbell size={20} />,
  Medal: <Medal size={20} />,
  Crosshair: <Crosshair size={20} />,
  Flag: <Flag size={20} />,
  Gift: <Gift size={20} />,
  Layers: <Layers size={20} />,
  RotateCw: <RotateCw size={20} />,
  ArrowLeftRight: <ArrowLeftRight size={20} />,
  Heart: <Heart size={20} />,
  Bell: <Bell size={20} />,
  CalendarCheck: <CalendarCheck size={20} />,
  Coins: <Coins size={20} />
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

  if (!isOpen) return null;

  const filtered = achievements.filter(a => {
    if (selectedCategory === "all") return true;
    return a.category === selectedCategory;
  });

  const totalCount = achievements.length;
  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const unclaimedCount = achievements.filter(a => a.is_unlocked && !a.claimed_reward).length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-black border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] text-white overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30">
              <Trophy size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  Klubowe Osiągnięcia i Odznaki
                </h2>
                {unclaimedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white font-black text-[10px] uppercase tracking-wider animate-bounce">
                    {unclaimedCount} do odbioru
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {playerName ? `Profil osiągnięć zawodnika: ${playerName}` : "System nagród i progresu DELTA 2018 GM"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {claimFeedback && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-amber-600/90 to-yellow-600/90 text-black font-black text-xs uppercase tracking-wider flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>{claimFeedback}</span>
            </div>
            <Check size={16} />
          </div>
        )}

        {/* PASEK GŁÓWNEGO PROGRESU */}
        <div className="p-4 sm:p-6 bg-slate-900/40 border-b border-slate-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              Całkowity postęp odznak: <strong className="text-amber-400">{unlockedCount} / {totalCount}</strong>
            </span>
            <span className="text-amber-400 font-mono font-bold text-sm">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* FILTRY KATEGORII */}
        <div className="flex items-center gap-2 p-3 sm:px-6 overflow-x-auto border-b border-slate-800/60 bg-slate-950/40 no-scrollbar">
          {[
            { id: "all", label: "Wszystkie", icon: <Trophy size={14} /> },
            { id: "match", label: "Mecze & Gole", icon: <Target size={14} /> },
            { id: "training", label: "Treningi", icon: <Activity size={14} /> },
            { id: "collection", label: "Karty & Paczki", icon: <Layers size={14} /> },
            { id: "parent", label: "Klub & Rodzic", icon: <Heart size={14} /> }
          ].map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* LISTA OSIĄGNIĘĆ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RotateCw size={32} className="animate-spin text-amber-400" />
              <p className="text-sm font-medium">Przeliczanie osiągnięć i odznak…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Brak osiągnięć w tej kategorii.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filtered.map(ach => {
                const current = Math.min(ach.current_value, ach.target_value);
                const pct = Math.round((current / ach.target_value) * 100);

                // Style krawędzi i tła w zależności od rangi
                let tierStyle = "border-slate-800 bg-slate-950/60";
                let badgeColor = "text-amber-400 bg-amber-950/40 border-amber-500/30";
                let tierLabel = "Brąz";

                if (ach.tier === "silver") {
                  tierLabel = "Srebro";
                  badgeColor = "text-slate-200 bg-slate-800/60 border-slate-400/40";
                } else if (ach.tier === "gold") {
                  tierLabel = "Złoto";
                  badgeColor = "text-yellow-400 bg-yellow-950/60 border-yellow-500/50";
                } else if (ach.tier === "diamond") {
                  tierLabel = "Diament";
                  badgeColor = "text-cyan-300 bg-cyan-950/60 border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]";
                }

                if (ach.is_unlocked && !ach.claimed_reward) {
                  tierStyle = "border-amber-500/60 bg-gradient-to-br from-amber-950/30 to-black shadow-[0_0_15px_rgba(245,158,11,0.15)]";
                }

                return (
                  <div
                    key={ach.id}
                    className={`relative p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${tierStyle}`}
                  >
                    <div>
                      {/* GÓRA KARTY */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${badgeColor}`}>
                            {ICON_MAP[ach.icon_name] || <Award size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white tracking-wide">
                                {ach.title}
                              </h3>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badgeColor}`}>
                                {tierLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                              {ach.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* PASEK POSTĘPU */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center text-[11px] mb-1 font-semibold">
                          <span className="text-slate-400">Postęp:</span>
                          <span className={ach.is_unlocked ? "text-emerald-400 font-bold" : "text-slate-300"}>
                            {current} / {ach.target_value} {ach.unit} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              ach.is_unlocked
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : "bg-gradient-to-r from-amber-500 to-yellow-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* DÓŁ KARTY / NAGRODA & PRZYCISK */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 text-[11px]">Nagroda:</span>
                        <span className="font-bold text-amber-400 flex items-center gap-0.5">
                          <Coins size={12} /> +{ach.reward_dp} DP
                        </span>
                        {ach.reward_pack_type && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                            <Gift size={10} /> Paczka
                          </span>
                        )}
                      </div>

                      <div>
                        {ach.claimed_reward ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg">
                            <Check size={12} /> Odebrano
                          </span>
                        ) : ach.is_unlocked ? (
                          <button
                            onClick={() => claimReward(ach)}
                            disabled={claimingId === ach.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse"
                          >
                            <Gift size={13} />
                            {claimingId === ach.id ? "Odbieranie…" : "Odbierz"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            W toku ({pct}%)
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

        {/* STOPKA */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Osiągnięcia aktualizują się automatycznie po każdym meczu i treningu.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all text-xs"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
