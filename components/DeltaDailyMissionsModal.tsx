'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Gift, 
  Trophy, 
  Target, 
  Zap, 
  ShieldCheck
} from 'lucide-react';
import { GameMission } from '@/lib/game/economy';
import { cardSound } from '@/lib/cards/audio';

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
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [dailyMissions, setDailyMissions] = useState<GameMission[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<GameMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimToast, setClaimToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchMissions = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchMissions();
    }
  }, [isOpen, fetchMissions]);

  // Fallback missions if offline or empty
  const defaultDailyMissions: GameMission[] = useMemo(() => [
    {
      id: 'd1',
      title: 'Dzienny Zakręć Kołem Fortuny',
      description: 'Zakręć Kołem Fortuny INFERNO w Szatni i odbierz dzisiejszą darmową nagrodę.',
      icon: '🎡',
      category: 'DAILY',
      xpReward: 35,
      currentCount: 0,
      targetCount: 1,
      completed: false,
      claimed: false
    },
    {
      id: 'd2',
      title: 'Pojedynek Kart 1v1',
      description: 'Zagraj minimum 1 mecz w Arenie Pojedynków Kart przeciwko rywalowi z ligi.',
      icon: '⚔️',
      category: 'DAILY',
      xpReward: 50,
      packReward: 'Brązowa Paczka',
      currentCount: 0,
      targetCount: 1,
      completed: false,
      claimed: false
    },
    {
      id: 'd3',
      title: 'Trening Celności i Refleksu',
      description: 'Zagraj w dowolną minigrę treningową (Celność 3D lub Refleks Bramkarza).',
      icon: '🎯',
      category: 'DAILY',
      xpReward: 40,
      currentCount: 0,
      targetCount: 1,
      completed: false,
      claimed: false
    }
  ], []);

  const defaultWeeklyMissions: GameMission[] = useMemo(() => [
    {
      id: 'w1',
      title: 'Mistrzowski Skład Tygodnia',
      description: 'Ustaw swoją pierwszą 11-tkę i zgłoś obecność na 3 treningach w tym tygodniu.',
      icon: '🏃',
      category: 'WEEKLY',
      xpReward: 120,
      packReward: 'Paczka Srebrna',
      currentCount: 1,
      targetCount: 3,
      completed: false,
      claimed: false
    },
    {
      id: 'w2',
      title: 'Klubowy Erudyta i Quiz',
      description: 'Zalicz min. 2 lekcje taktyczne w Kąciku Wiedzy z wynikiem powyżej 80%.',
      icon: '📚',
      category: 'WEEKLY',
      xpReward: 100,
      currentCount: 0,
      targetCount: 2,
      completed: false,
      claimed: false
    },
    {
      id: 'w3',
      title: 'Kolekcjonerski Łowca Gwiazd',
      description: 'Zdobądź min. 5 nowych kart do albumu lub wymień 2 duplikaty na Giełdzie Szatni.',
      icon: '🎴',
      category: 'WEEKLY',
      xpReward: 150,
      packReward: 'Złota Paczka Gwiazd',
      currentCount: 2,
      targetCount: 5,
      completed: false,
      claimed: false
    }
  ], []);

  const currentDaily = dailyMissions.length > 0 ? dailyMissions : defaultDailyMissions;
  const currentWeekly = weeklyMissions.length > 0 ? weeklyMissions : defaultWeeklyMissions;
  const currentMissions = activeTab === 'DAILY' ? currentDaily : currentWeekly;

  const totalXPInTab = currentMissions.reduce((acc, m) => acc + m.xpReward, 0);

  const handleClaim = async (mission: GameMission) => {
    try {
      setClaimingId(mission.id);
      cardSound.playWalkoutFanfare();
      cardSound.playHaptic('walkout');

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
        setClaimToast(`+${data.xpAwarded} XP ${mission.packReward ? '+ ' + mission.packReward : ''}!`);
        if (onRewardClaimed) onRewardClaimed(data.xpAwarded);
        await fetchMissions();
        setTimeout(() => setClaimToast(null), 3000);
      } else {
        // Fallback local update
        setClaimToast(`+${mission.xpReward} XP!`);
        if (onRewardClaimed) onRewardClaimed(mission.xpReward);
        mission.claimed = true;
        setTimeout(() => setClaimToast(null), 3000);
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      setClaimToast(`+${mission.xpReward} XP!`);
      if (onRewardClaimed) onRewardClaimed(mission.xpReward);
      mission.claimed = true;
      setTimeout(() => setClaimToast(null), 3000);
    } finally {
      setClaimingId(null);
    }
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const modalContent = (
    <div 
      className="v200-modal-overlay v200-mission-overlay fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain animate-fadeIn" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="missions-modal-title"
    >
      <div 
        className="v200-mission-sheet relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#141824] via-[#0d1017] to-[#08090d] border border-amber-500/35 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.15)] overflow-hidden my-auto shrink-0" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="v200-mission-top-header flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-red-600/10 via-amber-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#121624] flex items-center justify-center">
                <Target size={22} className="text-amber-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black tracking-wider text-amber-400 uppercase">
                <Sparkles size={12} className="text-amber-400 shrink-0" />
                <span>DELTA PRO · SYSTEM PROGRESJI & MISJI</span>
              </div>
              <h2 id="missions-modal-title" className="text-base sm:text-lg font-black uppercase tracking-wider text-white truncate m-0">
                CENTRUM MISJI I WYZWAŃ
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Zap size={14} className="text-amber-400 shrink-0" />
              <span>DO ZDOBYCIA: <strong>+{totalXPInTab} XP</strong></span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              aria-label="Zamknij"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= REWARD TOAST ================= */}
        {claimToast && (
          <div className="flex items-center gap-2.5 mx-4 sm:mx-5 mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold shadow-lg animate-fadeIn">
            <Sparkles size={16} className="text-amber-300 animate-bounce shrink-0" />
            <span>WSPANIAŁA ROBOTA! NAGRODA ODEBRANA: <strong className="text-white">{claimToast}</strong></span>
          </div>
        )}

        {/* ================= TAB NAVIGATION ================= */}
        <div className="flex items-stretch gap-2 p-2.5 sm:p-3 bg-black/40 border-b border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('DAILY')}
            className={`flex-1 flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'DAILY'
                ? 'bg-gradient-to-r from-amber-500/20 to-red-600/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/10'
                : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'DAILY' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                <Clock size={16} />
              </div>
              <div className="text-left min-w-0">
                <span className="block font-black text-xs sm:text-sm leading-tight text-white">Zadania Dzienne</span>
                <span className="block text-[10px] text-slate-400 truncate">Reset co 24h o 00:00</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${activeTab === 'DAILY' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-slate-400'}`}>
              {currentDaily.filter(m => m.completed || m.currentCount >= m.targetCount).length}/{currentDaily.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WEEKLY')}
            className={`flex-1 flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'WEEKLY'
                ? 'bg-gradient-to-r from-amber-500/20 to-red-600/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/10'
                : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'WEEKLY' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                <Trophy size={16} />
              </div>
              <div className="text-left min-w-0">
                <span className="block font-black text-xs sm:text-sm leading-tight text-white">Misje Tygodniowe</span>
                <span className="block text-[10px] text-slate-400 truncate">Reset w każdą niedzielę</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${activeTab === 'WEEKLY' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-slate-400'}`}>
              {currentWeekly.filter(m => m.completed || m.currentCount >= m.targetCount).length}/{currentWeekly.length}
            </span>
          </button>
        </div>

        {/* ================= MISSIONS LIST CONTAINER ================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <p className="text-xs sm:text-sm font-medium">Ładowanie Twoich wyzwań DELTA PRO...</p>
            </div>
          ) : currentMissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
              <Trophy size={40} className="text-slate-600 mb-1" />
              <h4 className="font-bold text-white text-sm">Brak aktywnych misji w tej kategorii</h4>
              <p className="text-xs text-slate-400 max-w-xs">Wszystkie zadania zostały ukończone. Wróć po resecie!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {currentMissions.map((mission) => {
                const progressPct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));
                const canClaim = (mission.completed || mission.currentCount >= mission.targetCount) && !mission.claimed;
                const isClaimed = mission.claimed;

                return (
                  <div
                    key={mission.id}
                    className={`relative p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col gap-3 ${
                      isClaimed
                        ? 'bg-slate-900/40 border-white/5 opacity-60'
                        : canClaim
                        ? 'bg-gradient-to-br from-amber-500/15 via-red-950/25 to-slate-900/90 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : 'bg-[#10141f]/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner">
                          <span>{mission.icon || '🎯'}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-xs sm:text-sm leading-snug m-0">
                              {mission.title}
                            </h4>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300">
                              {activeTab === 'DAILY' ? 'DZIENNA' : 'TYGODNIOWA'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {mission.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                          <Zap size={12} className="text-amber-400 shrink-0" />
                          <span>+{mission.xpReward} XP</span>
                        </div>
                        {mission.packReward && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                            <Gift size={11} className="text-purple-300 shrink-0" />
                            <span className="truncate max-w-[100px]">{mission.packReward}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px] font-medium">
                          {isClaimed ? 'Status zadania:' : canClaim ? 'Gotowe do odbioru:' : 'Postęp realizacji:'}
                        </span>
                        <strong className="text-white text-xs font-black">
                          {mission.currentCount} / {mission.targetCount} ({progressPct}%)
                        </strong>
                      </div>

                      <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isClaimed
                              ? 'bg-slate-600'
                              : canClaim
                              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400'
                              : 'bg-gradient-to-r from-amber-500 to-red-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-0.5">
                      {isClaimed ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          <span>Nagroda Odebrana</span>
                        </div>
                      ) : canClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(mission)}
                          disabled={claimingId === mission.id}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer animate-pulse"
                        >
                          {claimingId === mission.id ? (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>ODBIERZ NAGRODĘ (+{mission.xpReward} XP)</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>W trakcie realizacji ({mission.currentCount}/{mission.targetCount})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 bg-black/50 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 text-center sm:text-left">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Punkty XP automatycznie podnoszą poziom w Przepustce Sezonu</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer text-center"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
