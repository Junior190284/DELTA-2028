'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trophy, 
  Swords, 
  Users, 
  Flame, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  Layers, 
  Award,
  Crown,
  Send,
  Play,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { BattleCard } from '@/lib/game/battles';

interface DeltaCompetitionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  playerCards?: any[];
  onRewardClaimed?: () => void;
}

type CompTab = 'LEAGUE' | 'FRIENDLY' | 'TOURNAMENT' | 'DRAFT' | 'TEAM_GOALS';

export const DeltaCompetitionHubModal: React.FC<DeltaCompetitionHubModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  userName = 'Zawodnik DELTA',
  playerCards = [],
  onRewardClaimed
}) => {
  const [activeTab, setActiveTab] = useState<CompTab>('LEAGUE');
  const [hubData, setHubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Friendly duel state
  const [selectedOpponentName, setSelectedOpponentName] = useState('Kuba Pomocnik');
  const [friendlyMode, setFriendlyMode] = useState<'1v1' | '3v3'>('1v1');
  const [challengeSentToast, setChallengeSentToast] = useState<string | null>(null);

  // Draft mode state
  const [draftStep, setDraftStep] = useState<'pick' | 'playing' | 'result'>('pick');
  const [draftRounds, setDraftRounds] = useState<BattleCard[][]>([]);
  const [currentDraftRound, setCurrentDraftRound] = useState(0);
  const [pickedDraftCards, setPickedDraftCards] = useState<BattleCard[]>([]);
  const [draftResult, setDraftResult] = useState<any>(null);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/social/hub?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setHubData(data);
      }
    } catch (err) {
      console.error('Fetch social hub error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startDraft = async () => {
    try {
      const res = await fetch('/api/social/draft');
      const data = await res.json();
      if (data.success) {
        setDraftRounds(data.draftRounds || []);
        setCurrentDraftRound(0);
        setPickedDraftCards([]);
        setDraftStep('pick');
        setDraftResult(null);
      }
    } catch (err) {
      console.error('Draft load error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHubData();
      startDraft();
    }
  }, [isOpen, userId]);

  const handleSendChallenge = async () => {
    try {
      const res = await fetch('/api/social/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          challengerId: userId,
          challengerName: userName,
          challengedId: 'opp_friend',
          challengedName: selectedOpponentName,
          mode: friendlyMode,
          playerCards: playerCards.slice(0, friendlyMode === '1v1' ? 1 : 3)
        })
      });
      const data = await res.json();
      if (data.success) {
        setChallengeSentToast(`Wysłano wyzwanie ${friendlyMode} do ${selectedOpponentName}!`);
        setTimeout(() => setChallengeSentToast(null), 3000);
      }
    } catch (err) {
      console.error('Send challenge error:', err);
    }
  };

  const handlePickDraftCard = async (card: BattleCard) => {
    const nextPicked = [...pickedDraftCards, card];
    setPickedDraftCards(nextPicked);

    if (currentDraftRound < draftRounds.length - 1) {
      setCurrentDraftRound(r => r + 1);
    } else {
      // Draft complete -> Simulate Match
      setDraftStep('playing');
      setTimeout(async () => {
        const res = await fetch('/api/social/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickedCards: nextPicked, difficulty: 'medium' })
        });
        const matchData = await res.json();
        if (matchData.success) {
          setDraftResult(matchData.matchResult);
          setDraftStep('result');
          if (onRewardClaimed) onRewardClaimed();
        }
      }, 1500);
    }
  };

  const handleClaimTeamGoal = async (goalId: string) => {
    try {
      const res = await fetch('/api/social/team-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, goalId })
      });
      const data = await res.json();
      if (data.success) {
        fetchHubData();
        if (onRewardClaimed) onRewardClaimed();
      }
    } catch (err) {
      console.error('Claim team goal error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-3xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-xl shadow-lg shadow-red-600/30 shrink-0">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider m-0">
                  Centrum Rywalizacji
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  DELTA ARENA
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0 mt-0.5">Ligi kartowe, turnieje, tryb draft i wyzwania koleżeńskie</p>
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

        {/* Tab Switcher */}
        <div className="flex p-2 bg-slate-950/80 border-b border-white/5 gap-1.5 overflow-x-auto text-xs font-bold uppercase tracking-wider">
          {[
            { id: 'LEAGUE', label: '🏆 Liga Kartowa' },
            { id: 'FRIENDLY', label: '⚔️ Wyzwania (1v1/3v3)' },
            { id: 'DRAFT', label: '🎴 Tryb Draft' },
            { id: 'TOURNAMENT', label: '🏅 Turnieje' },
            { id: 'TEAM_GOALS', label: '🤝 Cele Drużyny' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CompTab)}
              className={`py-2 px-3 rounded-xl shrink-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* ========================================================================= */}
          {/* 1. LIGA KARTOWA */}
          {/* ========================================================================= */}
          {activeTab === 'LEAGUE' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">SEZON 1 · JESIEŃ 2026</span>
                  <h3 className="text-base font-black text-white uppercase">Liga Kartowa DELTA 2018</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Zdobywaj punkty za wygrane pojedynki kart i awansuj w rankingu</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-bold">Koniec Sezonu:</span>
                  <span className="text-xs font-black text-amber-400">30 Listopada</span>
                </div>
              </div>

              {/* Standings Table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-white/10 text-[10px]">
                    <tr>
                      <th className="p-3 text-center">Poz</th>
                      <th className="p-3">Zawodnik</th>
                      <th className="p-3 text-center">M</th>
                      <th className="p-3 text-center">W-R-P</th>
                      <th className="p-3 text-center">Forma</th>
                      <th className="p-3 text-right">Punkty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {hubData?.standings?.map((row: any, idx: number) => {
                      const isMe = row.user_id === userId;
                      return (
                        <tr 
                          key={row.id || idx} 
                          className={`transition-colors ${isMe ? 'bg-amber-500/10 font-bold text-amber-300' : 'hover:bg-white/5 text-slate-200'}`}
                        >
                          <td className="p-3 text-center font-black">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </td>
                          <td className="p-3 font-bold text-white flex items-center gap-1.5">
                            {row.display_name} {isMe && <span className="text-[9px] px-1 rounded bg-amber-500 text-black">TY</span>}
                          </td>
                          <td className="p-3 text-center">{row.played}</td>
                          <td className="p-3 text-center text-slate-400">{row.won}-{row.drawn}-{row.lost}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              {row.form?.slice(-4).map((f: string, fi: number) => (
                                <span 
                                  key={fi} 
                                  className={`w-3.5 h-3.5 rounded text-[9px] font-black flex items-center justify-center ${
                                    f === 'W' ? 'bg-emerald-500 text-black' : f === 'D' ? 'bg-amber-500 text-black' : 'bg-red-500 text-white'
                                  }`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-right font-black text-amber-400 text-sm">{row.points} pkt</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. FRIENDLY CHALLENGES (1v1 & 3v3) */}
          {/* ========================================================================= */}
          {activeTab === 'FRIENDLY' && (
            <div className="space-y-4 animate-fadeIn">
              {challengeSentToast && (
                <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-black text-center shadow-lg animate-fadeIn flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} /> {challengeSentToast}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/10 space-y-4">
                <h4 className="font-black text-white text-sm uppercase tracking-wider">
                  Rzuć Wyzwanie Koledze z Drużyny:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Wybierz Przeciwnika:</label>
                    <select
                      value={selectedOpponentName}
                      onChange={(e) => setSelectedOpponentName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-amber-500 outline-none"
                    >
                      <option value="Ryszard Rybacki">Ryszard Rybacki</option>
                      <option value="Kuba Pomocnik">Kuba Pomocnik</option>
                      <option value="Tomek Napastnik">Tomek Napastnik</option>
                      <option value="Janek Obrońca">Janek Obrońca</option>
                      <option value="Oliwier Bramkarz">Oliwier Bramkarz</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Tryb Pojedynku:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFriendlyMode('1v1')}
                        className={`p-2 rounded-xl border text-center font-bold text-xs ${
                          friendlyMode === '1v1' ? 'bg-red-600/30 border-red-500 text-white' : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        Pojedynek 1v1
                      </button>
                      <button
                        onClick={() => setFriendlyMode('3v3')}
                        className={`p-2 rounded-xl border text-center font-bold text-xs ${
                          friendlyMode === '3v3' ? 'bg-red-600/30 border-red-500 text-white' : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        Bitwa Składów 3v3
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendChallenge}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Wyślij Zaproszenie do Gry
                </button>
              </div>

              {/* Active / Pending challenges */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ostatnie Pojedynki Koleżeńskie:</h5>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚔️</span>
                    <div>
                      <p className="font-bold text-white">Pojedynek 1v1 vs Ryszard Rybacki</p>
                      <span className="text-[10px] text-emerald-400 font-bold">Wygrana 2:1 (+60 XP)</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">Wczoraj</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. TRYB DRAFT (FAIR PLAY) */}
          {/* ========================================================================= */}
          {activeTab === 'DRAFT' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 text-xs text-slate-300">
                <span className="font-black text-purple-400 block mb-0.5">TRYB DRAFT — PEŁEN FAIR PLAY</span>
                Wszyscy zawodnicy wybierają karty z tej samej puli losowej. O wygranej decyduje wyłącznie Twoja taktyka i dobór formacji!
              </div>

              {draftStep === 'pick' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">
                      Runda {currentDraftRound + 1} z {draftRounds.length}: Wybierz 1 Kartę
                    </h4>
                    <span className="text-xs text-amber-400 font-bold">
                      Wybrane: {pickedDraftCards.length}/3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {draftRounds[currentDraftRound]?.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handlePickDraftCard(c)}
                        className="p-4 rounded-2xl bg-slate-800/80 border border-white/10 hover:border-amber-500/80 cursor-pointer transition-all transform hover:scale-102 flex flex-col justify-between space-y-3 shadow-lg group"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-2xl font-black text-white">{c.overall}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {c.position}
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl mb-1">⚽</div>
                          <h5 className="font-bold text-white text-xs leading-snug">{c.name}</h5>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] text-center text-slate-300 bg-black/40 p-1.5 rounded-lg">
                          <div>PAC <strong>{c.pace}</strong></div>
                          <div>SHO <strong>{c.shooting}</strong></div>
                          <div>PAS <strong>{c.passing}</strong></div>
                        </div>
                        <button className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 text-white font-bold text-[10px] uppercase tracking-wider group-hover:from-amber-400 group-hover:to-red-500">
                          Wybierz Kartę
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draftStep === 'playing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-red-500 flex items-center justify-center text-3xl shadow-xl shadow-purple-600/40 animate-bounce">
                    ⚔️
                  </div>
                  <h4 className="font-black text-white text-sm uppercase tracking-wider">Symulacja Meczu Draft...</h4>
                  <p className="text-xs text-slate-400">Twój wybrany skład rywalizuje w turnieju błyskawicznym</p>
                </div>
              )}

              {draftStep === 'result' && draftResult && (
                <div className="space-y-4 p-5 rounded-2xl bg-slate-800/60 border border-white/10 text-center animate-fadeIn">
                  <div className="text-3xl">
                    {draftResult.matchResult === 'win' ? '🏆' : '🤝'}
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-wider text-white">
                    {draftResult.matchResult === 'win' ? 'ZWYCIĘSTWO W TURNIEJU DRAFT!' : 'ZAKOŃCZONO MECZ DRAFT'}
                  </h4>
                  <p className="text-xs text-slate-300">
                    Sektory wygrane: {draftResult.playerScore} - {draftResult.cpuScore}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                    <Sparkles size={13} /> +{draftResult.xpAwarded} XP do profilu
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={startDraft}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-xs uppercase tracking-wider"
                    >
                      Zagraj Nowy Draft
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. TURNIEJE & DRABINKA */}
          {/* ========================================================================= */}
          {activeTab === 'TOURNAMENT' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-red-950/30 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">TURNIEJ PUCHAROWY</span>
                  <h4 className="text-base font-black text-white uppercase">Puchar Jesieni DELTA 2018</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Drabinka 8 drużyn · Finał w weekend</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  ZAPISANY
                </span>
              </div>

              {/* Bracket UI */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ćwierćfinał</span>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 font-bold text-emerald-400">
                    TY (2:0) Rywal 1
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 font-bold text-slate-300">
                    Ryszard (2:1) Rywal 2
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Półfinał</span>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 font-bold text-amber-300">
                    TY vs Ryszard
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">👑 Finał</span>
                  <div className="p-3 rounded-xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/40 font-black text-white">
                    Puchar i Złota Karta
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. TEAM GOALS */}
          {/* ========================================================================= */}
          {activeTab === 'TEAM_GOALS' && (
            <div className="space-y-3 animate-fadeIn">
              {hubData?.teamGoals?.map((goal: any) => {
                const progressPct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
                const isClaimed = hubData?.claimedGoalIds?.includes(goal.id);
                const canClaim = goal.completed && !isClaimed;

                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-2xl bg-slate-800/40 border border-white/10 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{goal.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{goal.description}</p>
                      </div>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        +{goal.reward_value?.xp} XP
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Postęp Drużyny:</span>
                        <span className="font-bold text-white">{goal.current_value} / {goal.target_value}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-amber-400 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      {isClaimed ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Nagroda Odebrana
                        </span>
                      ) : canClaim ? (
                        <button
                          onClick={() => handleClaimTeamGoal(goal.id)}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-md"
                        >
                          Odbierz Nagrodę Drużyny
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Cel w trakcie realizacji...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
