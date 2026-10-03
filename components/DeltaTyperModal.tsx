"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Target, 
  Sparkles, 
  Flame, 
  Crown, 
  CalendarDays, 
  Check, 
  X, 
  RotateCw, 
  Coins, 
  Plus, 
  Minus, 
  Clock, 
  MapPin, 
  HelpCircle,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Percent
} from "lucide-react";

interface Match {
  id: string;
  round_no: number | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "played" | "cancelled" | string;
}

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
}

interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  first_scorer_id: string | null;
  points_awarded: number;
  is_evaluated: boolean;
  exact_score_hit: boolean;
  outcome_hit: boolean;
  scorer_hit: boolean;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  role: string;
  totalPoints: number;
  predictionsCount: number;
  exactHits: number;
  outcomeHits: number;
  scorerHits: number;
}

interface DeltaTyperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPointsUpdated?: (newPoints: number) => void;
}

const TEAM_LOGOS: Record<string, string> = {
  "K.S. Delta Warszawa GM": "/teamlogos/gm.png",
  "Alfa Przymierze Rodzin": "/teamlogos/alfa.png",
  "FC Vizja Warszawa": "/teamlogos/vizja.png",
  "RKS Ursus Warszawa": "/teamlogos/ursus.png",
  "MUKS Julianów": "/teamlogos/julianow.png",
};

export default function DeltaTyperModal({
  isOpen,
  onClose,
  onPointsUpdated
}: DeltaTyperModalProps) {
  const [activeTab, setActiveTab] = useState<"predict" | "history" | "leaderboard" | "rules">("predict");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([]);
  const [communityStats, setCommunityStats] = useState<Record<string, any>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [formPredictions, setFormPredictions] = useState<Record<string, { home: number; away: number; scorer: string | null }>>({});
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadTyperData();
  }, [isOpen]);

  async function loadTyperData() {
    setLoading(true);
    try {
      const res = await fetch("/api/typer");
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches || []);
        setPlayers(data.players || []);
        setMyPredictions(data.myPredictions || []);
        setCommunityStats(data.communityStats || {});
        setLeaderboard(data.leaderboard || []);
        setCurrentUserId(data.currentUserId || "");

        const initialForm: Record<string, { home: number; away: number; scorer: string | null }> = {};
        (data.myPredictions || []).forEach((p: Prediction) => {
          initialForm[p.match_id] = {
            home: p.predicted_home_score,
            away: p.predicted_away_score,
            scorer: p.first_scorer_id
          };
        });
        setFormPredictions(initialForm);
      }
    } catch (e) {
      console.error("Błąd ładowania danych typera:", e);
    } finally {
      setLoading(false);
    }
  }

  function getFormValue(matchId: string) {
    return formPredictions[matchId] || { home: 3, away: 1, scorer: null };
  }

  function updateScore(matchId: string, side: "home" | "away", delta: number) {
    const cur = getFormValue(matchId);
    const newVal = Math.max(0, Math.min(25, cur[side] + delta));
    setFormPredictions(prev => ({
      ...prev,
      [matchId]: { ...cur, [side]: newVal }
    }));
  }

  function updateScorer(matchId: string, scorerId: string | null) {
    const cur = getFormValue(matchId);
    setFormPredictions(prev => ({
      ...prev,
      [matchId]: { ...cur, scorer: scorerId }
    }));
  }

  function applyQuickBet(matchId: string, betType: "1" | "X" | "2" | "1X" | "X2" | "12", isDeltaHome: boolean) {
    const cur = getFormValue(matchId);
    let home = 3;
    let away = 1;

    if (betType === "1") {
      home = isDeltaHome ? 3 : 2;
      away = isDeltaHome ? 1 : 1;
    } else if (betType === "X") {
      home = 2;
      away = 2;
    } else if (betType === "2") {
      home = isDeltaHome ? 1 : 1;
      away = isDeltaHome ? 2 : 3;
    } else if (betType === "1X") {
      home = isDeltaHome ? 2 : 1;
      away = isDeltaHome ? 1 : 1;
    } else if (betType === "X2") {
      home = isDeltaHome ? 1 : 1;
      away = isDeltaHome ? 1 : 2;
    } else if (betType === "12") {
      home = isDeltaHome ? 3 : 1;
      away = isDeltaHome ? 2 : 3;
    }

    setFormPredictions(prev => ({
      ...prev,
      [matchId]: { ...cur, home, away }
    }));
  }

  function getMatchInsight(m: Match) {
    const deltaIsHome = m.home_team.toLowerCase().includes("delta");
    const p1 = deltaIsHome ? 68 : 22;
    const px = 20;
    const p2 = deltaIsHome ? 12 : 58;

    const odds1 = (100 / p1).toFixed(2);
    const oddsX = (100 / px).toFixed(2);
    const odds2 = (100 / p2).toFixed(2);
    const odds1X = (100 / (p1 + px)).toFixed(2);
    const oddsX2 = (100 / (p2 + px)).toFixed(2);
    const odds12 = (100 / (p1 + p2)).toFixed(2);

    const suggestedScore = deltaIsHome ? { home: 3, away: 1, tip: "1 (Zwycięstwo DELTY)", doubleChance: "1X" } : { home: 1, away: 3, tip: "2 (Zwycięstwo DELTY)", doubleChance: "X2" };

    return {
      deltaIsHome,
      p1,
      px,
      p2,
      odds1,
      oddsX,
      odds2,
      odds1X,
      oddsX2,
      odds12,
      suggestedScore,
      homeForm: deltaIsHome ? ["W", "W", "W", "R", "W"] : ["P", "R", "P", "W", "P"],
      awayForm: deltaIsHome ? ["P", "R", "P", "W", "P"] : ["W", "W", "W", "R", "W"],
      analysisText: deltaIsHome 
        ? `DELTA na własnym boisku strzela średnio 4.2 gola na mecz przy wysokiej kontroli gry. ${m.away_team} traci średnio 2.7 bramki w meczach wyjazdowych.`
        : `DELTA w meczach wyjazdowych gra ofensywnie i z wysokim pressingiem. Rywal ${m.home_team} szuka szans w kontratakach.`
    };
  }

  async function savePrediction(matchId: string) {
    const formVal = getFormValue(matchId);
    setSavingId(matchId);
    try {
      const res = await fetch("/api/typer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          predictedHomeScore: formVal.home,
          predictedAwayScore: formVal.away,
          firstScorerId: formVal.scorer
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd zapisu typu");

      setMyPredictions(prev => [
        ...prev.filter(p => p.match_id !== matchId),
        data.prediction
      ]);

      setSaveFeedback("Twój typ został pomyślnie zapisany!");
      window.setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      alert(`Błąd: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  }

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const scheduledMatches = matches.filter(m => m.status === "scheduled");
  const userRank = leaderboard.findIndex(l => l.userId === currentUserId) + 1;
  const userStats = leaderboard.find(l => l.userId === currentUserId);

  return createPortal(
    <div className="v200-typer-backdrop" onClick={onClose}>
      <div className="v200-typer-modal" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="v200-typer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: "8px 10px", borderRadius: 12, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
              <Target size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2>Klubowy Typer Meczowy DELTA</h2>
                <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)", fontSize: 10, fontWeight: 900 }}>
                  SEZON 2026
                </span>
              </div>
              <p>Typuj wyniki meczów i pierwszych strzelców • Zbieraj Delta Points na paczki kart!</p>
            </div>
          </div>

          <button onClick={onClose} className="v200-modal-close-btn" type="button">
            <X size={18} />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {saveFeedback && (
          <div style={{ padding: "8px 20px", background: "linear-gradient(90deg, #10b981, #059669)", color: "#fff", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={15} /> {saveFeedback}
            </span>
            <Check size={16} />
          </div>
        )}

        {/* STATS STRIP */}
        <div className="v200-typer-stats-strip">
          <div>
            <span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Twoja pozycja:</span>
            <strong style={{ fontSize: 15, fontWeight: 900, color: "#f1c95c" }}>
              {userRank > 0 ? `#${userRank}` : "—"}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Zdobyte punkty DP:</span>
            <strong style={{ fontSize: 15, fontWeight: 900, color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Coins size={14} /> {userStats?.totalPoints || 0} DP
            </strong>
          </div>
          <div>
            <span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Trafione dokładne:</span>
            <strong style={{ fontSize: 15, fontWeight: 900, color: "#38bdf8" }}>
              {userStats?.exactHits || 0} / {userStats?.predictionsCount || 0}
            </strong>
          </div>
        </div>

        {/* TABS */}
        <div className="v200-typer-tabs-row">
          {[
            { id: "predict", label: "Typuj Mecze", icon: <Target size={14} />, badge: scheduledMatches.length },
            { id: "history", label: "Historia Twoich Typów", icon: <CalendarDays size={14} />, badge: myPredictions.length },
            { id: "leaderboard", label: "Tabela Liderów", icon: <Trophy size={14} /> },
            { id: "rules", label: "Zasady Punktacji", icon: <HelpCircle size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`v200-typer-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              type="button"
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span style={{ padding: "1px 6px", borderRadius: 999, background: activeTab === tab.id ? "#000" : "rgba(245,158,11,0.3)", color: activeTab === tab.id ? "#f59e0b" : "#fde68a", fontSize: 10, fontWeight: 900 }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="v200-typer-body">
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
              <RotateCw size={32} className="animate-spin" style={{ color: "#f59e0b", margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontSize: 13 }}>Ładowanie terminarza i typów…</p>
            </div>
          ) : activeTab === "predict" ? (
            scheduledMatches.length === 0 ? (
              <div style={{ padding: "50px 20px", textAlign: "center", background: "rgba(15,23,42,0.4)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <CalendarDays size={36} style={{ color: "#64748b", margin: "0 auto 10px" }} />
                <h3 style={{ margin: 0, fontSize: 15, color: "#fff" }}>Brak zaplanowanych meczów do typowania</h3>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Kolejne spotkania pojawią się tutaj natychmiast po dodaniu ich do terminarza przez trenera.
                </p>
              </div>
            ) : (
              scheduledMatches.map(m => {
                const formVal = getFormValue(m.id);
                const isSaved = myPredictions.some(p => p.match_id === m.id);
                const comm = communityStats[m.id] || { total: 0, deltaWinPct: 0, drawPct: 0, oppWinPct: 0 };
                const homeLogo = TEAM_LOGOS[m.home_team] || "/teamlogos/gm.png";
                const awayLogo = TEAM_LOGOS[m.away_team] || "/teamlogos/alfa.png";
                const insight = getMatchInsight(m);
                const isInsightOpen = expandedInsights[m.id] !== false; // domyślnie otwarta

                return (
                  <div key={m.id} className={`v200-typer-card ${isSaved ? "saved" : ""}`}>
                    {/* Top match meta */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10, fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#cbd5e1" }}>
                        <Clock size={13} style={{ color: "#f59e0b" }} />
                        <strong>
                          {new Date(m.match_date).toLocaleDateString("pl-PL", { weekday: "short", day: "2-digit", month: "2-digit" })}
                          {m.match_time ? ` • godz. ${m.match_time.slice(0, 5)}` : ""}
                        </strong>
                        {m.venue && <span style={{ color: "#94a3b8" }}>• <MapPin size={11} style={{ display: "inline" }} /> {m.venue}</span>}
                      </div>

                      {isSaved ? (
                        <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", fontSize: 10, fontWeight: 900 }}>
                          ✓ ZAPISANO TYP
                        </span>
                      ) : (
                        <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", fontSize: 10, fontWeight: 900 }}>
                          CZEKA NA TWÓJ TYP
                        </span>
                      )}
                    </div>

                    {/* SZYBKIE TYPOWANIE BUKMACHERSKIE 1, X, 2, 1X, X2, 12 */}
                    <div className="v200-quick-bet-strip">
                      <span className="quick-bet-label">SZYBKI TYP (1, X, 2, PODWÓJNA SZANSA):</span>
                      <div className="quick-bet-buttons">
                        <button 
                          type="button" 
                          className={`v200-bet-pill ${formVal.home > formVal.away ? "active" : ""}`}
                          onClick={() => applyQuickBet(m.id, "1", insight.deltaIsHome)}
                          title="Wygrana Gospodarzy (1)"
                        >
                          <b>1</b>
                          <small>{insight.odds1}</small>
                        </button>
                        <button 
                          type="button" 
                          className={`v200-bet-pill ${formVal.home === formVal.away ? "active" : ""}`}
                          onClick={() => applyQuickBet(m.id, "X", insight.deltaIsHome)}
                          title="Remis (X)"
                        >
                          <b>X</b>
                          <small>{insight.oddsX}</small>
                        </button>
                        <button 
                          type="button" 
                          className={`v200-bet-pill ${formVal.away > formVal.home ? "active" : ""}`}
                          onClick={() => applyQuickBet(m.id, "2", insight.deltaIsHome)}
                          title="Wygrana Gości (2)"
                        >
                          <b>2</b>
                          <small>{insight.odds2}</small>
                        </button>
                        <button 
                          type="button" 
                          className="v200-bet-pill double"
                          onClick={() => applyQuickBet(m.id, "1X", insight.deltaIsHome)}
                          title="Wygrana Gospodarzy lub Remis (1X)"
                        >
                          <b>1X</b>
                          <small>{insight.odds1X}</small>
                        </button>
                        <button 
                          type="button" 
                          className="v200-bet-pill double"
                          onClick={() => applyQuickBet(m.id, "X2", insight.deltaIsHome)}
                          title="Remis lub Wygrana Gości (X2)"
                        >
                          <b>X2</b>
                          <small>{insight.oddsX2}</small>
                        </button>
                        <button 
                          type="button" 
                          className="v200-bet-pill double"
                          onClick={() => applyQuickBet(m.id, "12", insight.deltaIsHome)}
                          title="Wygrana którejkolwiek drużyny (12)"
                        >
                          <b>12</b>
                          <small>{insight.odds12}</small>
                        </button>
                      </div>
                    </div>

                    {/* Arena */}
                    <div className="v200-typer-match-arena">
                      <div className="v200-typer-team-block">
                        <img src={homeLogo} alt={m.home_team} style={{ width: 44, height: 44, objectFit: "contain" }} />
                        <div>
                          <strong style={{ display: "block", fontSize: 13, color: "#fff" }}>{m.home_team}</strong>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>Gospodarz</span>
                        </div>
                      </div>

                      <div className="v200-typer-score-controls">
                        <button type="button" onClick={() => updateScore(m.id, "home", -1)} className="v200-typer-step-btn">
                          <Minus size={13} />
                        </button>
                        <span className="v200-typer-score-num">{formVal.home}</span>
                        <button type="button" onClick={() => updateScore(m.id, "home", 1)} className="v200-typer-step-btn">
                          <Plus size={13} />
                        </button>

                        <span style={{ color: "#64748b", fontWeight: 900, margin: "0 4px" }}>:</span>

                        <button type="button" onClick={() => updateScore(m.id, "away", -1)} className="v200-typer-step-btn">
                          <Minus size={13} />
                        </button>
                        <span className="v200-typer-score-num">{formVal.away}</span>
                        <button type="button" onClick={() => updateScore(m.id, "away", 1)} className="v200-typer-step-btn">
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="v200-typer-team-block right">
                        <div>
                          <strong style={{ display: "block", fontSize: 13, color: "#fff" }}>{m.away_team}</strong>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>Gość</span>
                        </div>
                        <img src={awayLogo} alt={m.away_team} style={{ width: 44, height: 44, objectFit: "contain" }} />
                      </div>
                    </div>

                    {/* KARTA ANALIZY FORMY I SUGEROWANYCH TYPÓW EKSPERTA */}
                    <div className="v200-typer-insight-card">
                      <div 
                        className="v200-insight-header"
                        onClick={() => setExpandedInsights(prev => ({ ...prev, [m.id]: !isInsightOpen }))}
                      >
                        <div className="v200-insight-title">
                          <TrendingUp size={15} />
                          <span>ANALIZA FORMY & SZANSE WEDŁUG TABELI</span>
                        </div>
                        <div className="v200-insight-badge">
                          <span>Faworyt: <b>{insight.suggestedScore.tip}</b></span>
                          {isInsightOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </div>
                      </div>

                      {isInsightOpen && (
                        <div className="v200-insight-body">
                          <div className="v200-insight-probs">
                            <div className="prob-item">
                              <div className="prob-top">
                                <span>1 ({m.home_team})</span>
                                <b>{insight.p1}%</b>
                              </div>
                              <div className="prob-bar"><div className="fill gold" style={{ width: `${insight.p1}%` }} /></div>
                            </div>
                            <div className="prob-item">
                              <div className="prob-top">
                                <span>X (Remis)</span>
                                <b>{insight.px}%</b>
                              </div>
                              <div className="prob-bar"><div className="fill gray" style={{ width: `${insight.px}%` }} /></div>
                            </div>
                            <div className="prob-item">
                              <div className="prob-top">
                                <span>2 ({m.away_team})</span>
                                <b>{insight.p2}%</b>
                              </div>
                              <div className="prob-bar"><div className="fill red" style={{ width: `${insight.p2}%` }} /></div>
                            </div>
                          </div>

                          <p className="v200-insight-analysis">{insight.analysisText}</p>

                          <div className="v200-insight-action-row">
                            <div className="v200-insight-rec">
                              <span>Sugerowany wynik: <b>{insight.suggestedScore.home}:{insight.suggestedScore.away}</b> (podwójna szansa: <b>{insight.suggestedScore.doubleChance}</b>)</span>
                            </div>
                            <button
                              type="button"
                              className="v200-btn-apply-suggestion"
                              onClick={() => {
                                setFormPredictions(prev => ({
                                  ...prev,
                                  [m.id]: {
                                    ...getFormValue(m.id),
                                    home: insight.suggestedScore.home,
                                    away: insight.suggestedScore.away
                                  }
                                }));
                              }}
                            >
                              <Sparkles size={13} />
                              <span>ZASTOSUJ SUGEROWANY WYNIK</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom controls: first scorer & save */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>
                          ⚽ Bonus (+50 DP): Pierwszy strzelec dla DELTY
                        </label>
                        <select
                          value={formVal.scorer || ""}
                          onChange={e => updateScorer(m.id, e.target.value || null)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 8, background: "#0a0f1d", color: "#fff", border: "1px solid #334155", fontSize: 11 }}
                        >
                          <option value="">-- Dowolny zawodnik / brak typu --</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.display_name} {p.shirt_number ? `(#${p.shirt_number})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => savePrediction(m.id)}
                        disabled={savingId === m.id}
                        className="v200-typer-save-btn"
                      >
                        <Check size={14} />
                        {savingId === m.id ? "Zapisywanie…" : isSaved ? "Zaktualizuj typ" : "Zatwierdź typ"}
                      </button>
                    </div>

                    {comm.total > 0 && (
                      <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span>Głosy społeczności ({comm.total}):</span>
                          <span>DELTA {comm.deltaWinPct}% • Remis {comm.drawPct}% • Rywal {comm.oppWinPct}%</span>
                        </div>
                        <div style={{ width: "100%", height: 4, background: "#0a0f1d", borderRadius: 999, display: "flex", overflow: "hidden" }}>
                          <div style={{ width: `${comm.deltaWinPct}%`, background: "#f59e0b" }} />
                          <div style={{ width: `${comm.drawPct}%`, background: "#64748b" }} />
                          <div style={{ width: `${comm.oppWinPct}%`, background: "#ef4444" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : activeTab === "history" ? (
            myPredictions.length === 0 ? (
              <div style={{ padding: "50px 20px", textAlign: "center", background: "rgba(15,23,42,0.4)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <CalendarDays size={36} style={{ color: "#64748b", margin: "0 auto 10px" }} />
                <h3 style={{ margin: 0, fontSize: 15, color: "#fff" }}>Brak zapisanych typów</h3>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Przejdź do zakładki „Typuj Mecze” i postaw swój pierwszy typ!
                </p>
              </div>
            ) : (
              myPredictions.map(pred => {
                const match = matches.find(m => m.id === pred.match_id);
                const scorer = players.find(p => p.id === pred.first_scorer_id);
                const isFinished = match?.status === "played";

                return (
                  <div key={pred.id} style={{ padding: 14, borderRadius: 14, background: "rgba(18,24,38,0.8)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {match?.home_team} vs {match?.away_team} • {match ? new Date(match.match_date).toLocaleDateString("pl-PL") : ""}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginTop: 2 }}>
                        Twój typ: <strong style={{ color: "#f59e0b", fontFamily: "monospace" }}>{pred.predicted_home_score} : {pred.predicted_away_score}</strong>
                        {isFinished && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>(Wynik: <strong style={{ color: "#fff" }}>{match?.home_score}:{match?.away_score}</strong>)</span>}
                      </div>
                      {scorer && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Strzelec: {scorer.display_name} {pred.scorer_hit ? "⚽ (Trafiony!)" : ""}</div>}
                    </div>

                    <div>
                      {isFinished ? (
                        pred.exact_score_hit ? (
                          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.5)", color: "#fde68a", fontSize: 11, fontWeight: 900 }}>
                            🎯 Dokładny wynik (+{pred.points_awarded} DP)
                          </span>
                        ) : pred.outcome_hit ? (
                          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)", color: "#6ee7b7", fontSize: 11, fontWeight: 900 }}>
                            ✓ Trafione rozstrzygnięcie (+{pred.points_awarded} DP)
                          </span>
                        ) : (
                          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(100,116,139,0.2)", border: "1px solid rgba(100,116,139,0.4)", color: "#94a3b8", fontSize: 11 }}>
                            Nietrafione (0 DP)
                          </span>
                        )
                      ) : (
                        <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 11, fontWeight: 800 }}>
                          ⏳ Czeka na mecz
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : activeTab === "leaderboard" ? (
            <div className="v200-typer-podium-wrap">
              {/* Monthly Championship Banner */}
              <div className="v200-typer-championship-banner">
                <div className="v200-typer-champ-left">
                  <div className="v200-typer-champ-tag">
                    <Trophy size={13} />
                    <span>MISTRZOSTWA TYPERÓW</span>
                  </div>
                  <h4>Miesięczny Ranking Rodziców & Sztabu</h4>
                  <p>Top 3 na koniec miesiąca otrzymuje paczki kart i bonusowe punkty DP!</p>
                </div>
                <div className="v200-typer-champ-rewards">
                  <span>🥇 +1000 DP & Złota Paczka</span>
                  <span>🥈 +500 DP & Paczka</span>
                  <span>🥉 +250 DP</span>
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ padding: "50px 20px", textAlign: "center", background: "rgba(15,23,42,0.4)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Trophy size={40} style={{ color: "#f59e0b", margin: "0 auto 10px" }} />
                  <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Ranking czeka na pierwsze rozliczone mecze</h3>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
                    Zatwierdź swój typ w zakładce „Typuj Mecze”, aby po zakończonym meczu zdobyć punkty DP!
                  </p>
                </div>
              ) : (
                <>
                  {/* Top 3 Podium (2nd, 1st, 3rd) */}
                  <div className="v200-podium-stage">
                    {/* 2nd Place */}
                    {leaderboard[1] && (
                      <div className={`v200-podium-slot rank-2 ${leaderboard[1].userId === currentUserId ? "is-me" : ""}`}>
                        <div className="v200-podium-medal silver">🥈</div>
                        <div className="v200-podium-user">
                          <strong>{leaderboard[1].name} {leaderboard[1].userId === currentUserId ? "(Ty)" : ""}</strong>
                          <small>{leaderboard[1].exactHits} trafień</small>
                        </div>
                        <div className="v200-podium-plinth plinth-2">
                          <span className="v200-plinth-rank">2</span>
                          <b className="v200-plinth-pts">+{leaderboard[1].totalPoints} DP</b>
                        </div>
                      </div>
                    )}

                    {/* 1st Place (Winner) */}
                    {leaderboard[0] && (
                      <div className={`v200-podium-slot rank-1 ${leaderboard[0].userId === currentUserId ? "is-me" : ""}`}>
                        <div className="v200-podium-crown">
                          <Crown size={22} />
                        </div>
                        <div className="v200-podium-medal gold">🥇</div>
                        <div className="v200-podium-user">
                          <div className="v200-champ-badge">MISTRZ TYPERA</div>
                          <strong>{leaderboard[0].name} {leaderboard[0].userId === currentUserId ? "(Ty)" : ""}</strong>
                          <small>{leaderboard[0].exactHits} trafień</small>
                        </div>
                        <div className="v200-podium-plinth plinth-1">
                          <span className="v200-plinth-rank">1</span>
                          <b className="v200-plinth-pts">+{leaderboard[0].totalPoints} DP</b>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {leaderboard[2] && (
                      <div className={`v200-podium-slot rank-3 ${leaderboard[2].userId === currentUserId ? "is-me" : ""}`}>
                        <div className="v200-podium-medal bronze">🥉</div>
                        <div className="v200-podium-user">
                          <strong>{leaderboard[2].name} {leaderboard[2].userId === currentUserId ? "(Ty)" : ""}</strong>
                          <small>{leaderboard[2].exactHits} trafień</small>
                        </div>
                        <div className="v200-podium-plinth plinth-3">
                          <span className="v200-plinth-rank">3</span>
                          <b className="v200-plinth-pts">+{leaderboard[2].totalPoints} DP</b>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rest of the table (4th place and below) */}
                  {leaderboard.length > 3 && (
                    <div className="v200-typer-list-table">
                      {leaderboard.slice(3).map((entry, index) => (
                        <div
                          key={entry.userId}
                          className={`v200-typer-table-row ${entry.userId === currentUserId ? "is-me" : ""}`}
                        >
                          <div className="v200-typer-table-left">
                            <span className="v200-typer-table-rank">#{index + 4}</span>
                            <div>
                              <strong className="v200-typer-table-name">
                                {entry.name} {entry.userId === currentUserId ? "(Ty)" : ""}
                              </strong>
                              <span className="v200-typer-table-meta">
                                {entry.predictionsCount} typów • {entry.exactHits} trafionych dokładnych
                              </span>
                            </div>
                          </div>

                          <strong className="v200-typer-table-pts">
                            +{entry.totalPoints} DP
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 16, background: "rgba(18,24,38,0.8)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#f1c95c", textTransform: "uppercase" }}>
                Jak zdobywać punkty w Typerze DELTA?
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "#cbd5e1" }}>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <strong style={{ color: "#f59e0b" }}>🎯 +100 DP — Dokładny wynik</strong>: Idealnie trafiony wynik meczu (np. 6:2).
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <strong style={{ color: "#34d399" }}>⚽ +50 DP — Zwycięzca i różnica bramek</strong>: Trafiony zwycięzca i różnica goli (np. typ 5:2, wynik 4:1).
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <strong style={{ color: "#38bdf8" }}>🏅 +25 DP — Samo rozstrzygnięcie (1X2)</strong>: Trafiony sam fakt wygranej, remisu lub przegranej.
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <strong style={{ color: "#c084fc" }}>🔥 +50 DP — Pierwszy strzelec DELTY</strong>: Trafiony zawodnik, który strzeli pierwszego gola.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,15,26,0.95)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8" }}>
          <span>Typy można zmieniać przed pierwszym gwizdkiem spotkania.</span>
          <button onClick={onClose} type="button" style={{ padding: "6px 16px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Zamknij
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
