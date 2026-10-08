'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronRight,
  Medal,
  Calendar,
  Gift,
  Star,
  Activity,
  Zap
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

type CompTab = 'LEAGUE' | 'FRIENDLY' | 'DRAFT' | 'TOURNAMENT' | 'TEAM_GOALS';

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
  const [mounted, setMounted] = useState(false);

  // Friendly duel state
  const [selectedOpponentName, setSelectedOpponentName] = useState('Ryszard Rybacki');
  const [friendlyMode, setFriendlyMode] = useState<'1v1' | '3v3'>('1v1');
  const [challengeSentToast, setChallengeSentToast] = useState<string | null>(null);
  const [isSimulatingDuel, setIsSimulatingDuel] = useState(false);
  const [duelOutcome, setDuelOutcome] = useState<any>(null);

  // Draft mode state
  const [draftStep, setDraftStep] = useState<'pick' | 'playing' | 'result'>('pick');
  const [draftRounds, setDraftRounds] = useState<BattleCard[][]>([]);
  const [currentDraftRound, setCurrentDraftRound] = useState(0);
  const [pickedDraftCards, setPickedDraftCards] = useState<BattleCard[]>([]);
  const [draftResult, setDraftResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setIsSimulatingDuel(true);
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
        setTimeout(() => {
          setIsSimulatingDuel(false);
          setDuelOutcome({
            winner: userName,
            myScore: friendlyMode === '1v1' ? 2 : 3,
            oppScore: friendlyMode === '1v1' ? 1 : 1,
            xp: friendlyMode === '1v1' ? 60 : 120,
            opponent: selectedOpponentName
          });
          setChallengeSentToast(`Pojedynek z ${selectedOpponentName} rozstrzygnięty!`);
          fetchHubData();
          if (onRewardClaimed) onRewardClaimed();
        }, 1200);
      }
    } catch (err) {
      setIsSimulatingDuel(false);
      console.error('Send challenge error:', err);
    }
  };

  const handlePickDraftCard = async (card: BattleCard) => {
    const nextPicked = [...pickedDraftCards, card];
    setPickedDraftCards(nextPicked);

    if (currentDraftRound < draftRounds.length - 1) {
      setCurrentDraftRound(r => r + 1);
    } else {
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
      }, 1400);
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

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="v200-arena-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-arena-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* 1. TOP HEADER BANNER */}
        <div className="v200-arena-header">
          <div className="v200-arena-header-left">
            <div className="v200-arena-badge-crest">
              <Swords size={26} className="text-yellow-400" />
            </div>
            <div>
              <div className="v200-arena-eyebrow">
                <Sparkles size={13} /> DELTA ESPORTS & SOCIAL ARENA · ROCZNIK 2018
              </div>
              <h2 className="v200-arena-title">CENTRUM RYWALIZACJI DRUŻYNY</h2>
              <p className="v200-arena-subtitle">Sezonowa Liga Kartowa, Koleżeńskie Pojedynki 1v1, Puchar i Misje Składu</p>
            </div>
          </div>

          <div className="v200-arena-header-right">
            <div className="v200-arena-user-pill">
              <span className="user-label">TWÓJ PROFIL</span>
              <strong className="user-name">{userName}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="v200-arena-close-btn"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2. TAB NAVIGATION STRIP */}
        <div className="v200-arena-nav-tabs">
          {[
            { id: 'LEAGUE', label: '🏆 Liga Kartowa', desc: 'Tabela sezonowa' },
            { id: 'FRIENDLY', label: '⚔️ Wyzwania (1v1 / 3v3)', desc: 'Graj z kolegami' },
            { id: 'DRAFT', label: '🎴 Tryb Draft', desc: 'Równe szanse' },
            { id: 'TOURNAMENT', label: '🏅 Puchar & Drabinka', desc: 'Faza pucharowa' },
            { id: 'TEAM_GOALS', label: '🤝 Cele Drużyny', desc: 'Nagrody dla wszystkich' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CompTab)}
              className={`v200-arena-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-title">{tab.label}</span>
              <small className="tab-sub">{tab.desc}</small>
            </button>
          ))}
        </div>

        {/* 3. MAIN CONTENT BODY */}
        <div className="v200-arena-body">
          {/* ========================================================================= */}
          {/* 1. LIGA KARTOWA (SEASON LEAGUE STANDINGS) */}
          {/* ========================================================================= */}
          {activeTab === 'LEAGUE' && (
            <div className="v200-arena-league-pane animate-fadeIn">
              {/* Season Grand Ribbon */}
              <div className="v200-league-season-ribbon">
                <div className="ribbon-left">
                  <span className="ribbon-tag">SEZON 1 · JESIEŃ 2026</span>
                  <h3>OFICJALNA TABELA LIGI KARTOWEJ 2018</h3>
                  <p>Punkty przyznawane za zwycięstwa (3 pkt) i remisy (1 pkt) w pojedynkach składów.</p>
                </div>
                <div className="ribbon-right">
                  <div className="ribbon-countdown-box">
                    <Clock size={16} className="text-yellow-400" />
                    <div>
                      <small>FINAŁ SEZONU</small>
                      <strong>30 Listopada 2026</strong>
                    </div>
                  </div>
                  <div className="ribbon-prize-box">
                    <Gift size={16} className="text-emerald-400" />
                    <div>
                      <small>NAGRODY TOP 3</small>
                      <strong className="text-emerald-300">Paczka Legend + Puchar</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standings Table */}
              <div className="v200-league-table-wrapper">
                <table className="v200-league-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>POZ</th>
                      <th>ZAWODNIK / SKŁAD</th>
                      <th style={{ textAlign: 'center' }}>MECZE</th>
                      <th style={{ textAlign: 'center' }}>W - R - P</th>
                      <th style={{ textAlign: 'center' }}>FORMA</th>
                      <th style={{ textAlign: 'right', paddingRight: '20px' }}>PUNKTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hubData?.standings || [
                      { id: '1', display_name: 'Ryszard R. (C)', played: 12, won: 10, drawn: 1, lost: 1, form: ['W', 'W', 'D', 'W'], points: 31 },
                      { id: '2', display_name: 'Tomek N.', played: 12, won: 9, drawn: 2, lost: 1, form: ['W', 'W', 'W', 'D'], points: 29 },
                      { id: '3', display_name: 'Kuba P.', played: 11, won: 8, drawn: 1, lost: 2, form: ['L', 'W', 'W', 'W'], points: 25 },
                      { id: '4', display_name: `${userName} (TY)`, user_id: userId, played: 10, won: 7, drawn: 2, lost: 1, form: ['W', 'D', 'W', 'L'], points: 23 },
                      { id: '5', display_name: 'Janek O.', played: 11, won: 6, drawn: 2, lost: 3, form: ['W', 'L', 'W', 'W'], points: 20 },
                      { id: '6', display_name: 'Oliwier B.', played: 10, won: 5, drawn: 2, lost: 3, form: ['D', 'W', 'L', 'W'], points: 17 }
                    ]).map((row: any, idx: number) => {
                      const isMe = row.user_id === userId || row.display_name.includes('(TY)');
                      return (
                        <tr key={row.id || idx} className={isMe ? 'is-user-row' : ''}>
                          <td className="pos-cell">
                            {idx === 0 ? (
                              <span className="podium-badge gold">🥇 1</span>
                            ) : idx === 1 ? (
                              <span className="podium-badge silver">🥈 2</span>
                            ) : idx === 2 ? (
                              <span className="podium-badge bronze">🥉 3</span>
                            ) : (
                              <span className="rank-num">{idx + 1}</span>
                            )}
                          </td>
                          <td className="player-cell">
                            <div className="player-avatar-circle">
                              {row.display_name.charAt(0)}
                            </div>
                            <div className="player-meta">
                              <strong>{row.display_name}</strong>
                              <small>DELTA 2018 GM</small>
                            </div>
                            {isMe && <span className="you-tag">TWÓJ WYNIK</span>}
                          </td>
                          <td className="center-cell font-mono">{row.played}</td>
                          <td className="center-cell font-mono text-slate-300">
                            {row.won} - {row.drawn} - {row.lost}
                          </td>
                          <td className="center-cell">
                            <div className="form-pills-row">
                              {row.form?.slice(-4).map((f: string, fi: number) => (
                                <span 
                                  key={fi} 
                                  className={`form-pill ${f === 'W' ? 'win' : f === 'D' ? 'draw' : 'loss'}`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="pts-cell font-mono">
                            <strong>{row.points}</strong> <span>PKT</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Bar */}
              <div className="v200-league-action-footer">
                <span>Chcesz awansować w tabeli ligowej? Rzuć wyzwanie koledze w trybie 1v1 lub 3v3!</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('FRIENDLY')}
                  className="v200-arena-cta-btn"
                >
                  <Swords size={16} />
                  <span>Zagraj Pojedynek (+3 PKT)</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. FRIENDLY CHALLENGES (1v1 & 3v3) */}
          {/* ========================================================================= */}
          {activeTab === 'FRIENDLY' && (
            <div className="v200-arena-friendly-pane animate-fadeIn">
              {challengeSentToast && (
                <div className="v200-arena-toast-success">
                  <CheckCircle2 size={16} /> {challengeSentToast}
                </div>
              )}

              {/* Duel Arena Matchup Studio */}
              <div className="v200-duel-studio-card">
                <div className="studio-header">
                  <div>
                    <span className="studio-eyebrow">TRYB POJEDYNKU KOLEŻEŃSKIEGO</span>
                    <h3>WYBIERZ PRZECIWNIKA & FORMAT GRY</h3>
                  </div>
                  <div className="studio-mode-pills">
                    <button
                      type="button"
                      onClick={() => setFriendlyMode('1v1')}
                      className={`studio-pill ${friendlyMode === '1v1' ? 'active' : ''}`}
                    >
                      <User size={13} /> Pojedynek 1v1
                    </button>
                    <button
                      type="button"
                      onClick={() => setFriendlyMode('3v3')}
                      className={`studio-pill ${friendlyMode === '3v3' ? 'active' : ''}`}
                    >
                      <Users size={13} /> Starcie Składów 3v3
                    </button>
                  </div>
                </div>

                {/* Visual Card VS Card Presentation */}
                <div className="v200-clash-stage">
                  {/* Left Player */}
                  <div className="clash-fighter left">
                    <span className="fighter-side-tag">GOSPODARZ</span>
                    <div className="fighter-card-box">
                      <div className="fighter-crest">
                        <img src="/teamlogos/gm.png" alt="Crest" />
                      </div>
                      <h4>{userName}</h4>
                      <div className="fighter-ovr-tag">OVR 88</div>
                      <small>Najlepsza Karta w Składzie</small>
                    </div>
                  </div>

                  {/* VS Emblem */}
                  <div className="clash-center-vs">
                    <div className="vs-circle">VS</div>
                    <span className="vs-mode-label">{friendlyMode === '1v1' ? '1 RUNDA' : '3 RUNDY'}</span>
                  </div>

                  {/* Right Player */}
                  <div className="clash-fighter right">
                    <span className="fighter-side-tag">GOŚĆ</span>
                    <div className="fighter-card-box opponent">
                      <div className="fighter-crest">
                        <img src="/teamlogos/gm.png" alt="Crest" />
                      </div>
                      <h4>{selectedOpponentName}</h4>
                      <div className="fighter-ovr-tag opp">OVR 86</div>
                      <small>Rywale z Rocznika 2018</small>
                    </div>
                  </div>
                </div>

                {/* Opponent Selector & Launch */}
                <div className="studio-controls-bar">
                  <div className="select-box">
                    <label>WYBIERZ PRZECIWNIKA Z DRUŻYNY:</label>
                    <select
                      value={selectedOpponentName}
                      onChange={(e) => setSelectedOpponentName(e.target.value)}
                      className="v200-arena-select"
                    >
                      <option value="Ryszard Rybacki">Ryszard Rybacki (Kapitan)</option>
                      <option value="Tomek Napastnik">Tomek Napastnik</option>
                      <option value="Kuba Pomocnik">Kuba Pomocnik</option>
                      <option value="Janek Obrońca">Janek Obrońca</option>
                      <option value="Oliwier Bramkarz">Oliwier Bramkarz</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendChallenge}
                    disabled={isSimulatingDuel}
                    className="v200-arena-launch-btn"
                  >
                    {isSimulatingDuel ? (
                      <>
                        <div className="v200-btn-spinner" />
                        <span>Symulacja Pojedynku…</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Rozegraj Mecz z {selectedOpponentName.split(' ')[0]}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Duel Result Modal Card */}
                {duelOutcome && (
                  <div className="v200-duel-result-banner animate-fadeIn">
                    <div className="result-trophy">🏆</div>
                    <div>
                      <h4>ZWYCIĘSTWO W POJEDYNKU!</h4>
                      <p>Pokonałeś <strong>{duelOutcome.opponent}</strong> wynikiem <strong>{duelOutcome.myScore} : {duelOutcome.oppScore}</strong>!</p>
                    </div>
                    <div className="result-xp-tag">
                      <Sparkles size={14} /> +{duelOutcome.xp} XP do profilu
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. TRYB DRAFT (FAIR PLAY) */}
          {/* ========================================================================= */}
          {activeTab === 'DRAFT' && (
            <div className="v200-arena-draft-pane animate-fadeIn">
              <div className="v200-draft-info-strip">
                <div className="info-icon">🎴</div>
                <div>
                  <strong>TRYB DRAFT — PEŁNE ZASADY FAIR PLAY</strong>
                  <p>Każdy zawodnik wybiera karty z losowej puli rund. O sukcesie decydują statystyki i zbalansowany dobór składu!</p>
                </div>
              </div>

              {draftStep === 'pick' && (
                <div className="v200-draft-pick-stage">
                  <div className="draft-round-header">
                    <h4>Runda {currentDraftRound + 1} z {draftRounds.length || 3}: Wybierz 1 Kartę do Składu</h4>
                    <span className="draft-progress-pill">Wybrano: {pickedDraftCards.length}/3</span>
                  </div>

                  <div className="v200-draft-cards-grid">
                    {(draftRounds[currentDraftRound] || [
                      { id: 'c1', name: 'Ryszard Rybacki', position: 'ŚPO', overall: 89, pace: 88, shooting: 91, passing: 89, theme: 'gold' },
                      { id: 'c2', name: 'Tomek Snajper', position: 'N', overall: 87, pace: 90, shooting: 88, passing: 82, theme: 'inferno' },
                      { id: 'c3', name: 'Kuba Asystent', position: 'ŚP', overall: 86, pace: 84, shooting: 82, passing: 90, theme: 'matchday' }
                    ]).map((card: any) => (
                      <div
                        key={card.id}
                        onClick={() => handlePickDraftCard(card)}
                        className="v200-draft-card-item"
                      >
                        <div className="card-top">
                          <span className="card-ovr">{card.overall}</span>
                          <span className="card-pos">{card.position}</span>
                        </div>
                        <div className="card-center">
                          <img src="/teamlogos/gm.png" alt="Crest" className="card-crest" />
                          <h5>{card.name}</h5>
                        </div>
                        <div className="card-stats-grid">
                          <div><span>TEM</span> <b>{card.pace || 85}</b></div>
                          <div><span>STR</span> <b>{card.shooting || 87}</b></div>
                          <div><span>POD</span> <b>{card.passing || 86}</b></div>
                        </div>
                        <button type="button" className="card-pick-btn">
                          WYBIERZ TĘ KARTĘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draftStep === 'playing' && (
                <div className="v200-draft-sim-box">
                  <div className="sim-spinner" />
                  <h4>Symulacja Turnieju Draft…</h4>
                  <p>Twój wybrany 3-osobowy skład rywalizuje w meczu turniejowym</p>
                </div>
              )}

              {draftStep === 'result' && draftResult && (
                <div className="v200-draft-result-box animate-fadeIn">
                  <div className="res-icon">{draftResult.matchResult === 'win' ? '🏆' : '🤝'}</div>
                  <h3>{draftResult.matchResult === 'win' ? 'MISTRZOSTWO TURNIEJU DRAFT!' : 'ZAKOŃCZONO MECZ DRAFT'}</h3>
                  <p>Wynik pojedynku: <strong>{draftResult.playerScore} : {draftResult.cpuScore}</strong></p>
                  <div className="res-reward">
                    <Sparkles size={16} /> +{draftResult.xpAwarded || 150} XP & Nagroda Dodana!
                  </div>
                  <button type="button" onClick={startDraft} className="v200-arena-cta-btn">
                    Zagraj Nowy Draft
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. TURNIEJE & DRABINKA PUCHAROWA */}
          {/* ========================================================================= */}
          {activeTab === 'TOURNAMENT' && (
            <div className="v200-arena-tourn-pane animate-fadeIn">
              <div className="v200-tourn-hero-card">
                <div className="hero-left">
                  <span className="hero-badge">PUCHAR JESIENI 2026</span>
                  <h3>TURNIEJ MISTRZÓW DELTA GM</h3>
                  <p>Drabinka pojedynków pucharowych · System pucharowy BO3</p>
                </div>
                <div className="hero-status">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>TWÓJ SKŁAD ZAPISANY DO DRABINKI</span>
                </div>
              </div>

              {/* Tournament Tree Bracket */}
              <div className="v200-bracket-stage">
                {/* Quarterfinals */}
                <div className="bracket-col">
                  <span className="bracket-phase-title">ĆWIERĆFINAŁY</span>
                  <div className="bracket-match is-win">
                    <div className="match-row winner"><span>{userName}</span> <b>2</b></div>
                    <div className="match-row"><span>Rywal 1</span> <b>0</b></div>
                  </div>
                  <div className="bracket-match">
                    <div className="match-row winner"><span>Ryszard Rybacki</span> <b>2</b></div>
                    <div className="match-row"><span>Janek Obrońca</span> <b>1</b></div>
                  </div>
                </div>

                {/* Semifinals */}
                <div className="bracket-col">
                  <span className="bracket-phase-title">PÓŁFINAŁ</span>
                  <div className="bracket-match active-next">
                    <div className="match-row"><span>{userName}</span> <b>-</b></div>
                    <div className="match-row"><span>Ryszard Rybacki</span> <b>-</b></div>
                    <span className="match-live-tag">NASTĘPNY MECZ</span>
                  </div>
                </div>

                {/* Grand Final & Trophy */}
                <div className="bracket-col final">
                  <span className="bracket-phase-title gold">👑 WIELKI FINAŁ</span>
                  <div className="bracket-trophy-card">
                    <div className="trophy-gold-glow">🏆</div>
                    <strong>PUCHAR JESIENI</strong>
                    <small>Nagroda: Złota Odznaka + 300 DP</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. TEAM GOALS */}
          {/* ========================================================================= */}
          {activeTab === 'TEAM_GOALS' && (
            <div className="v200-arena-goals-pane animate-fadeIn">
              <div className="v200-goals-hero">
                <div>
                  <span className="hero-badge">WSPÓLNE CELE DRUŻYNY</span>
                  <h3>RAZEM BUDUJEMY SIŁĘ DELTA 2018 GM</h3>
                  <p>Każdy gol, trening i mecz wszystkich zawodników przybliża drużynę do odblokowania wspólnych nagród!</p>
                </div>
                <div className="goals-score">
                  <strong>3 / 5</strong>
                  <small>UKOŃCZONYCH CELÓW</small>
                </div>
              </div>

              <div className="v200-goals-list">
                {(hubData?.teamGoals || [
                  { id: 'g1', title: '50 Goli Drużynowych w Sezonie', description: 'Wspólnie strzelone bramki w oficjalnych meczach ligowych', current_value: 48, target_value: 50, reward_value: { xp: 200 } },
                  { id: 'g2', title: '100 Obecności na Treningach', description: 'Łączna frekwencja całego rocznika na treningach w tym miesiącu', current_value: 100, target_value: 100, completed: true, reward_value: { xp: 350 } },
                  { id: 'g3', title: '25 Czystych Kont w Pojedynkach', description: 'Bezbłędna defensywa we wszystkich starciach ligi kartowej', current_value: 18, target_value: 25, reward_value: { xp: 250 } }
                ]).map((goal: any) => {
                  const progressPct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
                  const isClaimed = hubData?.claimedGoalIds?.includes(goal.id);
                  const canClaim = (goal.completed || goal.current_value >= goal.target_value) && !isClaimed;

                  return (
                    <div key={goal.id} className="v200-goal-card">
                      <div className="goal-top">
                        <div>
                          <h4>{goal.title}</h4>
                          <p>{goal.description}</p>
                        </div>
                        <span className="goal-xp-badge">+{goal.reward_value?.xp || 200} XP</span>
                      </div>

                      <div className="goal-meter">
                        <div className="meter-labels">
                          <span>Postęp drużyny:</span>
                          <strong>{goal.current_value} / {goal.target_value} ({progressPct}%)</strong>
                        </div>
                        <div className="meter-track">
                          <div className="meter-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>

                      <div className="goal-footer">
                        {isClaimed ? (
                          <span className="goal-claimed-tag">
                            <CheckCircle2 size={15} /> Nagroda Odebrana
                          </span>
                        ) : canClaim ? (
                          <button
                            type="button"
                            onClick={() => handleClaimTeamGoal(goal.id)}
                            className="goal-claim-btn"
                          >
                            <Gift size={14} /> Odbierz Nagrodę Drużyny (+{goal.reward_value?.xp} XP)
                          </button>
                        ) : (
                          <span className="goal-in-progress">★ Cel w toku — zbieramy punkty wspólnie</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Helper user icon
function User({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default DeltaCompetitionHubModal;
