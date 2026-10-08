'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Award, 
  Flame, 
  Coins, 
  ArrowRight,
  ShieldCheck,
  Check
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
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

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

  const totalCompleted = currentMissions.filter(m => m.completed || m.currentCount >= m.targetCount).length;
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
      className="v200-mission-overlay" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true"
    >
      <div 
        className="v200-mission-sheet animate-fadeIn" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="v200-mission-top-header">
          <div className="header-left">
            <div className="v200-mission-badge-crest">
              <Target size={22} className="text-yellow-400" />
            </div>
            <div>
              <div className="v200-arena-eyebrow">
                <Sparkles size={12} className="text-yellow-400 inline mr-1" />
                DELTA PRO · SYSTEM PROGRESJI & MISJI
              </div>
              <h2 className="v200-mission-main-title">CENTRUM MISJI I WYZWAŃ</h2>
            </div>
          </div>

          <div className="header-right">
            <div className="v200-mission-xp-summary-pill">
              <Zap size={14} className="text-yellow-400" />
              <span>DO ZDOBYCIA: <strong>+{totalXPInTab} XP</strong></span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="v200-mission-close-circle"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ================= REWARD TOAST ================= */}
        {claimToast && (
          <div className="v200-mission-claim-toast animate-fadeIn">
            <Sparkles size={16} className="text-yellow-300 animate-bounce" />
            <span>WSPANIAŁA ROBOTA! NAGRODA ODEBRANA: <strong>{claimToast}</strong></span>
          </div>
        )}

        {/* ================= TAB NAVIGATION ================= */}
        <div className="v200-mission-tabs-bar">
          <button
            type="button"
            onClick={() => setActiveTab('DAILY')}
            className={`mission-tab-btn ${activeTab === 'DAILY' ? 'active' : ''}`}
          >
            <Clock size={16} />
            <div className="tab-text-group">
              <span className="tab-title">Zadania Dzienne</span>
              <small className="tab-sub">Reset co 24h o 00:00</small>
            </div>
            <span className="tab-count-pill">
              {currentDaily.filter(m => m.completed || m.currentCount >= m.targetCount).length}/{currentDaily.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WEEKLY')}
            className={`mission-tab-btn ${activeTab === 'WEEKLY' ? 'active' : ''}`}
          >
            <Trophy size={16} />
            <div className="tab-text-group">
              <span className="tab-title">Misje Tygodniowe</span>
              <small className="tab-sub">Reset w każdą niedzielę</small>
            </div>
            <span className="tab-count-pill gold">
              {currentWeekly.filter(m => m.completed || m.currentCount >= m.targetCount).length}/{currentWeekly.length}
            </span>
          </button>
        </div>

        {/* ================= MISSIONS LIST CONTAINER ================= */}
        <div className="v200-mission-body-scroll">
          {loading ? (
            <div className="v200-mission-loading-box">
              <div className="loading-spinner-ring" />
              <p>Ładowanie Twoich wyzwań DELTA PRO...</p>
            </div>
          ) : currentMissions.length === 0 ? (
            <div className="v200-mission-empty-box">
              <Trophy size={36} className="text-slate-600 mb-2" />
              <h4>Brak aktywnych misji w tej kategorii</h4>
              <p>Wszystkie zadania zostały ukończone. Wróć po resecie!</p>
            </div>
          ) : (
            <div className="v200-missions-grid">
              {currentMissions.map((mission) => {
                const progressPct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));
                const canClaim = (mission.completed || mission.currentCount >= mission.targetCount) && !mission.claimed;
                const isClaimed = mission.claimed;

                return (
                  <div
                    key={mission.id}
                    className={`v200-mission-card ${isClaimed ? 'is-claimed' : canClaim ? 'is-ready' : 'in-progress'}`}
                  >
                    {/* Top Row */}
                    <div className="mission-card-top">
                      <div className="mission-icon-box">
                        <span>{mission.icon || '🎯'}</span>
                      </div>

                      <div className="mission-meta-info">
                        <div className="mission-header-line">
                          <h4>{mission.title}</h4>
                          <span className={`mission-category-tag ${activeTab.toLowerCase()}`}>
                            {activeTab === 'DAILY' ? 'DZIENNA' : 'TYGODNIOWA'}
                          </span>
                        </div>
                        <p>{mission.description}</p>
                      </div>

                      <div className="mission-rewards-group">
                        <div className="reward-badge-xp">
                          <Zap size={13} className="text-yellow-400" />
                          <span>+{mission.xpReward} XP</span>
                        </div>
                        {mission.packReward && (
                          <div className="reward-badge-pack">
                            <Gift size={12} className="text-purple-300" />
                            <span>{mission.packReward}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="mission-progress-section">
                      <div className="progress-labels-row">
                        <span className="progress-label-title">
                          {isClaimed ? 'Status zadania:' : canClaim ? 'Gotowe do odbioru:' : 'Postęp realizacji:'}
                        </span>
                        <strong className="progress-label-value">
                          {mission.currentCount} / {mission.targetCount} ({progressPct}%)
                        </strong>
                      </div>

                      <div className="mission-progress-track">
                        <div 
                          className={`progress-fill-bar ${isClaimed ? 'claimed' : canClaim ? 'ready' : 'active'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mission-card-bottom">
                      {isClaimed ? (
                        <div className="claimed-status-badge">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span>Nagroda Odebrana</span>
                        </div>
                      ) : canClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(mission)}
                          disabled={claimingId === mission.id}
                          className="claim-reward-btn animate-pulse"
                        >
                          {claimingId === mission.id ? (
                            <div className="btn-spinner" />
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>ODBIERZ NAGRODĘ (+{mission.xpReward} XP)</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="in-progress-badge">
                          <Clock size={13} className="text-slate-400" />
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
        <div className="v200-mission-footer-bar">
          <div className="footer-left">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Punkty XP automatycznie podnoszą poziom w Przepustce Sezonu (Season Pass)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mission-footer-close-btn"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
