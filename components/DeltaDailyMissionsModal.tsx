'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Sparkles, Gift, Trophy } from 'lucide-react';
import { GameMission } from '@/lib/game/economy';

interface DeltaDailyMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onRewardClaimed?: (xp: number) => void;
}

export const DeltaDailyMissionsModal: React.FC<DeltaDailyMissionsModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  onRewardClaimed
}) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [dailyMissions, setDailyMissions] = useState<GameMission[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<GameMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimToast, setClaimToast] = useState<string | null>(null);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/game/missions?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setDailyMissions(data.dailyMissions || []);
        setWeeklyMissions(data.weeklyMissions || []);
      }
    } catch (err) {
      console.error('Error fetching missions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMissions();
    }
  }, [isOpen, userId]);

  const handleClaim = async (mission: GameMission) => {
    try {
      setClaimingId(mission.id);
      const res = await fetch('/api/game/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          missionId: mission.id,
          category: mission.category
        })
      });
      const data = await res.json();
      if (data.success) {
        setClaimToast(`+${data.xpAwarded} XP ${mission.packReward ? '+ Paczka ' + mission.packReward : ''}!`);
        if (onRewardClaimed) onRewardClaimed(data.xpAwarded);
        await fetchMissions();
        setTimeout(() => setClaimToast(null), 3000);
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
    } finally {
      setClaimingId(null);
    }
  };

  if (!isOpen) return null;

  const currentMissions = activeTab === 'DAILY' ? dailyMissions : weeklyMissions;

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 shrink-0">
              🎯
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 m-0">
                Centrum Misji <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">DELTA PRO</span>
              </h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">Wykonuj zadania, zdobywaj XP i odblokowuj paczki</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="v200-modal-close"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-2 bg-slate-950/80 border-b border-white/5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('DAILY')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'DAILY'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400/50 shadow-lg shadow-red-600/30'
                : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" /> Dziennie (Reset 00:00)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WEEKLY')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'WEEKLY'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400/50 shadow-lg shadow-red-600/30'
                : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" /> Tygodniowe (Niedziela)
          </button>
        </div>

        {/* Toast Alert */}
        {claimToast && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center py-2 px-4 text-xs sm:text-sm font-black tracking-wider flex items-center justify-center gap-2 shadow-lg animate-fadeIn shrink-0">
            <Sparkles className="w-4 h-4 shrink-0" /> Nagroda odebrana: {claimToast}
          </div>
        )}

        {/* Mission List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs uppercase tracking-widest font-semibold m-0">Ładowanie misji...</p>
            </div>
          ) : currentMissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm m-0">Brak dostępnych misji w tej kategorii.</p>
            </div>
          ) : (
            currentMissions.map((mission) => {
              const progressPct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));
              const canClaim = (mission.completed || mission.currentCount >= mission.targetCount) && !mission.claimed;

              return (
                <div
                  key={mission.id}
                  className={`p-4 rounded-xl border transition-all ${
                    mission.claimed
                      ? 'bg-slate-950/40 border-white/5 opacity-60'
                      : canClaim
                      ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-red-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl shrink-0">{mission.icon || '🎯'}</div>
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base leading-snug m-0">{mission.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 m-0">{mission.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        +{mission.xpReward} XP
                      </span>
                      {mission.packReward && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <Gift className="w-2.5 h-2.5" /> Paczka
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Postęp:</span>
                    <span className="font-bold text-white">
                      {mission.currentCount} / {mission.targetCount}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        mission.claimed
                          ? 'bg-slate-600'
                          : canClaim
                          ? 'bg-gradient-to-r from-amber-400 to-red-500'
                          : 'bg-amber-500/70'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Claim Button */}
                  <div className="mt-3 flex justify-end">
                    {mission.claimed ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Odebrano
                      </div>
                    ) : canClaim ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(mission)}
                        disabled={claimingId === mission.id}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transform active:scale-95 transition-all cursor-pointer border-none"
                      >
                        {claimingId === mission.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Odbierz Nagrodę
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-500 font-medium italic">
                        W trakcie realizacji...
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
