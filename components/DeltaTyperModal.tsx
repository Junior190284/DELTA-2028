"use client";

import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Target, 
  Sparkles, 
  Flame, 
  Crown, 
  CalendarDays, 
  Check, 
  X, 
  ChevronRight, 
  RotateCw, 
  Coins, 
  Award, 
  TrendingUp, 
  Plus, 
  Minus, 
  Users, 
  Clock, 
  MapPin, 
  HelpCircle 
} from "lucide-react";
import PlayerPhoto from "./PlayerPhoto";

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

const CLUB = "K.S. Delta Warszawa GM";

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

  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([]);
  const [communityStats, setCommunityStats] = useState<Record<string, any>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Formularz edycji typów w pamięci
  const [formPredictions, setFormPredictions] = useState<Record<string, { home: number; away: number; scorer: string | null }>>({});

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

        // Inicjalizuj lokalny stan formularza
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

      setSaveFeedback("Typ zapisany! Możesz go zmienić do rozpoczęcia meczu.");
      window.setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      alert(`Błąd: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  }

  if (!isOpen) return null;

  const scheduledMatches = matches.filter(m => m.status === "scheduled");
  const playedMatches = matches.filter(m => m.status === "played");
  const userRank = leaderboard.findIndex(l => l.userId === currentUserId) + 1;
  const userStats = leaderboard.find(l => l.userId === currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-black border border-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.18)] text-white overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30">
              <Target size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  Klubowy Typer Meczowy DELTA
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-[10px] uppercase tracking-wider">
                  Sezon 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Typuj wyniki meczów i pierwszych strzelców • Zbieraj Delta Points na paczki kart!
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
        {saveFeedback && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>{saveFeedback}</span>
            </div>
            <Check size={16} />
          </div>
        )}

        {/* STATS STRIP */}
        <div className="grid grid-cols-3 divide-x divide-slate-800/80 bg-slate-900/40 border-b border-slate-800/60 p-3 sm:px-6 text-center text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Twoja pozycja:</span>
            <strong className="text-amber-400 font-black text-sm">
              {userRank > 0 ? `#${userRank}` : "—"}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Zdobyte punkty DP:</span>
            <strong className="text-emerald-400 font-black text-sm flex items-center justify-center gap-1">
              <Coins size={14} /> {userStats?.totalPoints || 0} DP
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Trafione dokładne:</span>
            <strong className="text-cyan-400 font-black text-sm">
              {userStats?.exactHits || 0} / {userStats?.predictionsCount || 0}
            </strong>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 p-3 sm:px-6 overflow-x-auto border-b border-slate-800/60 bg-slate-950/40 no-scrollbar">
          {[
            { id: "predict", label: "Typuj Mecze", icon: <Target size={14} />, badge: scheduledMatches.length },
            { id: "history", label: "Historia Twoich Typów", icon: <CalendarDays size={14} />, badge: myPredictions.length },
            { id: "leaderboard", label: "Tabela Liderów", icon: <Trophy size={14} /> },
            { id: "rules", label: "Zasady Punktacji", icon: <HelpCircle size={14} /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? "bg-black text-amber-400" : "bg-amber-500/20 text-amber-300"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RotateCw size={32} className="animate-spin text-amber-400" />
              <p className="text-sm font-medium">Ładowanie terminarza i typów…</p>
            </div>
          ) : activeTab === "predict" ? (
            /* TAB 1: TYPUJ NAJBLIŻSZE MECZE */
            scheduledMatches.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                <CalendarDays size={36} className="text-slate-600" />
                <h3 className="font-bold text-base text-white">Brak zaplanowanych meczów do typowania</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Gdy trener lub administrator doda kolejne spotkanie do terminarza, pojawi się ono tutaj natychmiast.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledMatches.map(m => {
                  const formVal = getFormValue(m.id);
                  const isSaved = myPredictions.some(p => p.match_id === m.id);
                  const comm = communityStats[m.id] || { total: 0, deltaWinPct: 0, drawPct: 0, oppWinPct: 0 };
                  const homeLogo = TEAM_LOGOS[m.home_team] || "/teamlogos/gm.png";
                  const awayLogo = TEAM_LOGOS[m.away_team] || "/teamlogos/alfa.png";

                  return (
                    <div
                      key={m.id}
                      className={`relative p-5 rounded-2xl border transition-all ${
                        isSaved 
                          ? "border-amber-500/40 bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-lg shadow-amber-500/5" 
                          : "border-slate-800 bg-slate-950/60"
                      }`}
                    >
                      {/* HEADER MECZU */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/60 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock size={13} className="text-amber-400" />
                          <span className="font-bold">
                            {new Date(m.match_date).toLocaleDateString("pl-PL", { weekday: "short", day: "2-digit", month: "2-digit" })}
                            {m.match_time ? ` • godz. ${m.match_time.slice(0, 5)}` : ""}
                          </span>
                          {m.venue && (
                            <span className="text-slate-400 flex items-center gap-1">
                              • <MapPin size={12} /> {m.venue}
                            </span>
                          )}
                        </div>

                        {isSaved ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Check size={12} /> Twój typ jest zapisany
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                            Czeka na Twój typ
                          </span>
                        )}
                      </div>

                      {/* ARENA DRUŻYN & WYNIKU */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-4">
                        {/* GOSPODARZ */}
                        <div className="flex items-center gap-3">
                          <img src={homeLogo} alt={m.home_team} className="w-12 h-12 object-contain drop-shadow" />
                          <div>
                            <strong className="block text-sm font-bold text-white">{m.home_team}</strong>
                            <span className="text-[11px] text-slate-400 font-medium">Gospodarz</span>
                          </div>
                        </div>

                        {/* INTERAKTYWNY WSKAŹNIK WYNIKU */}
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-3 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-inner">
                            {/* HOME CONTROLS */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateScore(m.id, "home", -1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 active:scale-95"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-xl font-black text-amber-400 font-mono">
                                {formVal.home}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateScore(m.id, "home", 1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 active:scale-95"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="text-slate-600 font-black text-lg">:</span>

                            {/* AWAY CONTROLS */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateScore(m.id, "away", -1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 active:scale-95"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-xl font-black text-amber-400 font-mono">
                                {formVal.away}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateScore(m.id, "away", 1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 active:scale-95"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* GOŚĆ */}
                        <div className="flex items-center justify-start md:justify-end gap-3">
                          <div className="text-left md:text-right">
                            <strong className="block text-sm font-bold text-white">{m.away_team}</strong>
                            <span className="text-[11px] text-slate-400 font-medium">Gość</span>
                          </div>
                          <img src={awayLogo} alt={m.away_team} className="w-12 h-12 object-contain drop-shadow" />
                        </div>
                      </div>

                      {/* PIERWSZY STRZELEC & ZAPISZ */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/60 items-center">
                        {/* SELECT STRZELCA */}
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            ⚽ Bonus (+50 DP): Pierwszy strzelec bramki dla DELTY
                          </label>
                          <select
                            value={formVal.scorer || ""}
                            onChange={e => updateScorer(m.id, e.target.value || null)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-amber-400 focus:outline-none"
                          >
                            <option value="">-- Dowolny zawodnik / brak typu --</option>
                            {players.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.display_name} {p.shirt_number ? `(#${p.shirt_number})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* PRZYCISK ZAPISZ */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => savePrediction(m.id)}
                            disabled={savingId === m.id}
                            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 active:scale-95 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                          >
                            <Check size={14} />
                            {savingId === m.id ? "Zapisywanie…" : isSaved ? "Zaktualizuj typ" : "Zatwierdź typ"}
                          </button>
                        </div>
                      </div>

                      {/* PASEK ROZKŁADU SPOŁECZNOŚCI */}
                      {comm.total > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800/40 text-[11px] text-slate-400">
                          <div className="flex justify-between items-center mb-1">
                            <span>Społeczność ({comm.total} typów):</span>
                            <span className="font-semibold text-slate-300">
                              DELTA: {comm.deltaWinPct}% • Remis: {comm.drawPct}% • Rywal: {comm.oppWinPct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full flex overflow-hidden">
                            <div style={{ width: `${comm.deltaWinPct}%` }} className="bg-amber-400" />
                            <div style={{ width: `${comm.drawPct}%` }} className="bg-slate-500" />
                            <div style={{ width: `${comm.oppWinPct}%` }} className="bg-rose-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === "history" ? (
            /* TAB 2: HISTORIA TYPÓW */
            myPredictions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                <CalendarDays size={36} className="text-slate-600" />
                <h3 className="font-bold text-base text-white">Brak zapisanych typów</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Przejdź do zakładki „Typuj Mecze” i postaw swoje pierwsze przewidywania na nadchodzące mecze DELTY!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myPredictions.map(pred => {
                  const match = matches.find(m => m.id === pred.match_id);
                  const scorer = players.find(p => p.id === pred.first_scorer_id);
                  const isFinished = match?.status === "played";

                  return (
                    <div
                      key={pred.id}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                        pred.exact_score_hit 
                          ? "bg-gradient-to-r from-amber-950/40 to-slate-950 border-amber-500/50" 
                          : pred.outcome_hit
                          ? "bg-gradient-to-r from-emerald-950/30 to-slate-950 border-emerald-500/40"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <span>{match?.home_team} vs {match?.away_team}</span>
                          <span className="text-slate-500">• {match ? new Date(match.match_date).toLocaleDateString("pl-PL") : ""}</span>
                        </div>
                        <div className="text-sm font-black text-white mt-1 flex items-center gap-2">
                          <span>Twój typ: <strong className="text-amber-400 font-mono">{pred.predicted_home_score} : {pred.predicted_away_score}</strong></span>
                          {isFinished && (
                            <span className="text-slate-400 font-normal text-xs">
                              (Wynik: <strong className="text-white font-mono">{match?.home_score}:{match?.away_score}</strong>)
                            </span>
                          )}
                        </div>
                        {scorer && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Strzelec: {scorer.display_name} {pred.scorer_hit ? "⚽ (Trafiony!)" : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isFinished ? (
                          pred.exact_score_hit ? (
                            <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1">
                              <Trophy size={14} /> Dokładny wynik (+{pred.points_awarded} DP)
                            </span>
                          ) : pred.outcome_hit ? (
                            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1">
                              <Check size={14} /> Trafione rozstrzygnięcie (+{pred.points_awarded} DP)
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold">
                              Nietrafione (0 DP)
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold flex items-center gap-1">
                            <Clock size={12} /> Czeka na mecz
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === "leaderboard" ? (
            /* TAB 3: TABELA LIDERÓW TYPERA */
            <div className="space-y-4">
              {/* PODIUM TOP 3 */}
              {leaderboard.length >= 1 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pb-4 pt-2">
                  {/* 2ND PLACE */}
                  {leaderboard[1] ? (
                    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-950 border border-slate-600/40 text-center flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-black text-sm mb-1">
                        🥈 2
                      </div>
                      <strong className="text-xs sm:text-sm font-bold truncate max-w-full text-white">
                        {leaderboard[1].name}
                      </strong>
                      <span className="text-emerald-400 font-mono font-bold text-xs mt-1">
                        {leaderboard[1].totalPoints} DP
                      </span>
                      <small className="text-[10px] text-slate-400">{leaderboard[1].exactHits} dokładnych</small>
                    </div>
                  ) : <div />}

                  {/* 1ST PLACE */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-950/60 via-slate-900 to-black border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-center flex flex-col items-center -translate-y-2">
                    <Crown size={24} className="text-amber-400 mb-1 animate-bounce" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black text-base shadow mb-1">
                      🥇 1
                    </div>
                    <strong className="text-sm sm:text-base font-black truncate max-w-full text-amber-300">
                      {leaderboard[0].name}
                    </strong>
                    <span className="text-emerald-400 font-mono font-black text-sm mt-1">
                      {leaderboard[0].totalPoints} DP
                    </span>
                    <small className="text-[11px] text-amber-400/80 font-bold">{leaderboard[0].exactHits} dokładnych trafień</small>
                  </div>

                  {/* 3RD PLACE */}
                  {leaderboard[2] ? (
                    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-950 border border-amber-800/40 text-center flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-900/80 flex items-center justify-center text-amber-300 font-black text-sm mb-1">
                        🥉 3
                      </div>
                      <strong className="text-xs sm:text-sm font-bold truncate max-w-full text-white">
                        {leaderboard[2].name}
                      </strong>
                      <span className="text-emerald-400 font-mono font-bold text-xs mt-1">
                        {leaderboard[2].totalPoints} DP
                      </span>
                      <small className="text-[10px] text-slate-400">{leaderboard[2].exactHits} dokładnych</small>
                    </div>
                  ) : <div />}
                </div>
              )}

              {/* LISTA RANKINGOWA */}
              <div className="space-y-1.5">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                      entry.userId === currentUserId 
                        ? "bg-amber-950/30 border-amber-500/50 font-bold" 
                        : "bg-slate-950/50 border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-mono font-black ${index < 3 ? "text-amber-400" : "text-slate-500"}`}>
                        #{index + 1}
                      </span>
                      <div>
                        <strong className="text-white block">{entry.name} {entry.userId === currentUserId ? "(Ty)" : ""}</strong>
                        <span className="text-[10px] text-slate-400">
                          {entry.predictionsCount} typów • {entry.exactHits} trafionych wyników
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className="text-emerald-400 font-mono font-bold text-sm block">
                        +{entry.totalPoints} DP
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* TAB 4: ZASADY PUNKTACJI */
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase">
                  <Sparkles size={18} /> Jak działa punktacja Klubowego Typera?
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 font-black text-sm">🎯 100 DP</span>
                    <div>
                      <strong className="text-white block text-sm">Trafienie Dokładnego Wyniku</strong>
                      Gdy wytypujesz idealny wynik meczu (np. typ 6:2 i mecz zakończy się 6:2).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-sm">⚽ 50 DP</span>
                    <div>
                      <strong className="text-white block text-sm">Zwycięzca i Różnica Bramek</strong>
                      Gdy trafisz zwycięzcę oraz dokładną różnicę bramek (np. typ 5:2, wynik 4:1 — różnica +3).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-sm">🏅 25 DP</span>
                    <div>
                      <strong className="text-white block text-sm">Trafienie Rozstrzygnięcia (1X2)</strong>
                      Gdy trafisz sam fakt wygranej DELTY, remisu lub przegranej z inną różnicą bramek.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="p-2 rounded-lg bg-purple-500/20 text-purple-400 font-black text-sm">🔥 50 DP</span>
                    <div>
                      <strong className="text-white block text-sm">Bonus: Pierwszy Strzelec DELTY</strong>
                      Gdy poprawnie wskażesz zawodnika, który strzeli pierwszego gola w spotkaniu.
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  * Zdobyte punkty Delta Points automatycznie zasilają Twój stan konta, umożliwiając zakup unikalnych paczek kart!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Typy można zmieniać dowolną liczbę razy przed pierwszym gwizdkiem.</span>
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
