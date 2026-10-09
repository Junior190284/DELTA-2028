"use client";

import React, { useState } from "react";
import NextBestActionWidget, { UserGamificationState } from "@/components/gamification/NextBestActionWidget";
import ProgressionSummaryPanel, { ProgressionSummaryData } from "@/components/gamification/ProgressionSummaryPanel";
import AchievementUnlockToast, { AchievementUnlockToastData } from "@/components/gamification/AchievementUnlockToast";
import WeeklyRecapModal, { WeeklyRecapData } from "@/components/gamification/WeeklyRecapModal";
import DailyInfernoSpin from "@/components/DailyInfernoSpin";
import AchievementUnlock from "@/components/AchievementUnlock";
import { Sparkles, Play, RefreshCw, Flame, Trophy, Gift, Eye, Layers } from "lucide-react";

export default function GamificationDevPreviewPage() {
  // State for Next Best Action testing
  const [nbaState, setNbaState] = useState<UserGamificationState>({
    canDailySpin: true,
    unopenedPacksCount: 2,
    unclaimedAchievementsCount: 1,
    availableQuizCount: 1,
    streakCount: 4,
    collectionProgressPercent: 48
  });

  // State for Progression Summary testing
  const [progressionData, setProgressionData] = useState<ProgressionSummaryData>({
    streakCount: 5,
    maxStreak: 7,
    collectionUnlockedCards: 36,
    collectionTotalCards: 75,
    collectionPercentage: 48,
    achievementsUnlocked: 12,
    achievementsTotal: 24,
    unclaimedAchievementsCount: 2,
    unopenedPacksCount: 3,
    currentPoints: 850,
    playerLevel: 4,
    currentXp: 350,
    nextLevelXp: 500
  });

  // Modals & Toasts visibility
  const [isSpinOpen, setIsSpinOpen] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AchievementUnlockToastData | null>(null);
  const [selected3DAchievement, setSelected3DAchievement] = useState<any | null>(null);

  // Weekly Recap data
  const recapData: WeeklyRecapData = {
    weekLabel: "Tydzień 41 (6 - 12 Października 2026)",
    activeDaysCount: 6,
    streakCount: 6,
    cardsAcquiredCount: 14,
    achievementsCompletedCount: 3,
    packsOpenedCount: 4,
    topCardName: "Ryszard Rybacki (Inferno Captain)",
    topCardRarity: "Inferno"
  };

  const triggerToast = (tier: "bronze" | "silver" | "gold" | "inferno") => {
    const mockToasts: Record<string, AchievementUnlockToastData> = {
      bronze: {
        id: "ach_bronze",
        title: "Pierwszy Trening DELTA",
        description: "Ukończono pierwszy trening w barwach Górnego Mokotowa!",
        tier: "bronze",
        rewardDp: 25,
        celebrationTier: 1
      },
      silver: {
        id: "ach_silver",
        title: "10 Treningów w Sezonie",
        description: "Systematyczność to klucz do mistrzostwa. 10 sesji treningowych zaliczonych.",
        tier: "silver",
        rewardDp: 50,
        celebrationTier: 2
      },
      gold: {
        id: "ach_gold",
        title: "Hat-trick w Meczu Ligowym",
        description: "Zdobyto 3 bramki w jednym oficjalnym spotkaniu ligi DELTA!",
        tier: "gold",
        rewardDp: 100,
        rewardPackType: "gold_booster",
        celebrationTier: 3
      },
      inferno: {
        id: "ach_inferno",
        title: "Legenda Górnego Mokotowa",
        description: "Kompletna dominacja na boisku i w quizach. Status Legendy DELTA odblokowany!",
        tier: "inferno",
        rewardDp: 200,
        rewardPackType: "legend_pack",
        celebrationTier: 4
      }
    };
    setActiveToast(mockToasts[tier]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans">
      {/* Dev Header */}
      <header className="max-w-6xl mx-auto pb-6 border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                ETAP 14E · DEV PREVIEW
              </span>
              <span className="text-xs text-slate-400 font-mono">2026-10-balanced-v1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2">
              <Sparkles className="text-amber-400" /> Gamification & Retention Experience Harness
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Wizualny podgląd modułów gamifikacji: Next Best Action, Progression Panel, Toasty, 3D Badges, Weekly Recap i Daily Spin.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 space-y-10">
        {/* SECTION 1: NEXT BEST ACTION WIDGET */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-200 flex items-center gap-2">
              <Play size={18} className="text-amber-400" /> 1. Next Best Action Widget
            </h2>
            <span className="text-xs text-slate-400">Priorytety: Paczki &gt; Spin &gt; Odznaki &gt; Quiz &gt; All Clear</span>
          </div>

          <NextBestActionWidget
            userState={nbaState}
            onActionClick={(actionType) => {
              if (actionType === "DAILY_SPIN") setIsSpinOpen(true);
              else if (actionType === "CLAIM_ACHIEVEMENTS") triggerToast("gold");
              else alert(`Kliknięto akcję: ${actionType}`);
            }}
          />

          {/* Controls to test different NBA states */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-2 items-center text-xs">
            <span className="font-bold text-slate-400 mr-2">Symuluj stan gracza:</span>
            <button
              type="button"
              onClick={() => setNbaState({ ...nbaState, unopenedPacksCount: 2, canDailySpin: true })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
            >
              📦 Ma Paczki (Priorytet 1)
            </button>
            <button
              type="button"
              onClick={() => setNbaState({ ...nbaState, unopenedPacksCount: 0, canDailySpin: true })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
            >
              🔥 Dostępny Spin (Priorytet 2)
            </button>
            <button
              type="button"
              onClick={() => setNbaState({ ...nbaState, unopenedPacksCount: 0, canDailySpin: false, unclaimedAchievementsCount: 2 })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
            >
              🏆 Odznaki do odebrania (Priorytet 3)
            </button>
            <button
              type="button"
              onClick={() => setNbaState({ ...nbaState, unopenedPacksCount: 0, canDailySpin: false, unclaimedAchievementsCount: 0, availableQuizCount: 1 })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
            >
              ❓ Dostępny Quiz (Priorytet 4)
            </button>
            <button
              type="button"
              onClick={() => setNbaState({ ...nbaState, unopenedPacksCount: 0, canDailySpin: false, unclaimedAchievementsCount: 0, availableQuizCount: 0 })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
            >
              ✅ Wszystko zrobione (All Clear)
            </button>
          </div>
        </section>

        {/* SECTION 2: PROGRESSION SUMMARY PANEL */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-200 flex items-center gap-2">
              <Layers size={18} className="text-blue-400" /> 2. Progression Summary Panel
            </h2>
            <span className="text-xs text-slate-400">Kompaktowy panel "Twój Progres"</span>
          </div>

          <ProgressionSummaryPanel
            data={progressionData}
            onNavigateToSpin={() => setIsSpinOpen(true)}
            onNavigateToAchievements={() => triggerToast("silver")}
            onNavigateToCollection={() => alert("Nawigacja do Albumu")}
            onNavigateToPacks={() => alert("Nawigacja do Sklepu Paczek")}
          />
        </section>

        {/* SECTION 3: CELEBRATION TIERS & TOASTS */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-200 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" /> 3. Celebration Tiers & Toast Notifications
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => triggerToast("bronze")}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-600/60 text-left transition-all"
            >
              <span className="text-[10px] font-black uppercase text-amber-500">Tier 1 · Toast</span>
              <h4 className="text-sm font-bold text-white mt-1">Brązowa Odznaka</h4>
              <p className="text-xs text-slate-400 mt-1">Prosty toast powiadomienia</p>
            </button>

            <button
              type="button"
              onClick={() => triggerToast("silver")}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-400 text-left transition-all"
            >
              <span className="text-[10px] font-black uppercase text-slate-300">Tier 2 · Srebro</span>
              <h4 className="text-sm font-bold text-white mt-1">Srebrna Odznaka</h4>
              <p className="text-xs text-slate-400 mt-1">+50 DP z opcją 3D</p>
            </button>

            <button
              type="button"
              onClick={() => triggerToast("gold")}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-yellow-400 text-left transition-all"
            >
              <span className="text-[10px] font-black uppercase text-yellow-400">Tier 3 · Złoto / Paczka</span>
              <h4 className="text-sm font-bold text-white mt-1">Złoty Hat-trick</h4>
              <p className="text-xs text-slate-400 mt-1">+100 DP + Gold Pack</p>
            </button>

            <button
              type="button"
              onClick={() => triggerToast("inferno")}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-red-500 text-left transition-all"
            >
              <span className="text-[10px] font-black uppercase text-red-400">Tier 4 · Inferno</span>
              <h4 className="text-sm font-bold text-white mt-1">Legenda DELTA</h4>
              <p className="text-xs text-slate-400 mt-1">+200 DP + Legend Pack</p>
            </button>
          </div>
        </section>

        {/* SECTION 4: FULL MODALS (DAILY SPIN & WEEKLY RECAP) */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-200 flex items-center gap-2">
            <Eye size={18} className="text-purple-400" /> 4. Pełne Modale Gamifikacji
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsSpinOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              <Flame size={16} />
              <span>Otwórz Daily Spin Modal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRecapOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              <Trophy size={16} />
              <span>Otwórz Weekly Recap Modal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelected3DAchievement({
                  id: "ach_3d_hattrick",
                  title: "Hat-trick w Meczu Ligowym",
                  description: "Zdobyto 3 bramki w jednym oficjalnym spotkaniu ligowym DELTA!",
                  variant: "gold",
                  progress: { current: 3, max: 3, unit: "goli" }
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Otwórz 3D Shield Celebration</span>
            </button>
          </div>
        </section>
      </main>

      {/* RENDER ACTIVE MODALS */}
      {isSpinOpen && (
        <DailyInfernoSpin
          onClose={() => setIsSpinOpen(false)}
          onRewardClaimed={(newBal) => alert(`Nowe saldo DP: ${newBal}`)}
        />
      )}

      {isRecapOpen && (
        <WeeklyRecapModal
          isOpen={isRecapOpen}
          onClose={() => setIsRecapOpen(false)}
          data={recapData}
          playerName="Tomasz Rybacki"
        />
      )}

      {selected3DAchievement && (
        <AchievementUnlock
          title={selected3DAchievement.title}
          description={selected3DAchievement.description}
          variant={selected3DAchievement.variant}
          progress={selected3DAchievement.progress}
          playerName="Tomasz Rybacki"
          playerNumber="10"
          isDevPreview={true}
          onClose={() => setSelected3DAchievement(null)}
        />
      )}

      {/* TOAST NOTIFICATION */}
      <AchievementUnlockToast
        achievement={activeToast}
        onDismiss={() => setActiveToast(null)}
        onViewDetails={(ach) => {
          setSelected3DAchievement({
            id: ach.id,
            title: ach.title,
            description: ach.description,
            variant: ach.tier === "inferno" || ach.tier === "diamond" ? "inferno" : "gold"
          });
          setActiveToast(null);
        }}
        onClaim={(ach) => {
          alert(`Odebrano nagrodę za odznakę: +${ach.rewardDp} DP`);
          setActiveToast(null);
        }}
      />
    </div>
  );
}
