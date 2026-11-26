"use client";

import React, { useState } from "react";
import {
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  Flame,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  Check
} from "lucide-react";
import {
  SYNTHETIC_QA_PLAYERS,
  SYNTHETIC_QA_TRAINING_SESSION,
  INITIAL_SYNTHETIC_ATTENDANCE,
  INITIAL_SYNTHETIC_GAMES,
  INITIAL_SYNTHETIC_GAME_PLAYERS,
  type SyntheticGamePlayer
} from "@/lib/qa/syntheticQaData";
import type { Player, TrainingSession, TrainingAttendance, TrainingGame } from "@/components/training/DeltaTrainingCenter20";

export default function InteractiveQaPlayground() {
  const [subTab, setSubTab] = useState<"center" | "teams" | "game" | "summary">("teams");

  // Local isolated simulation states (100% in-memory, ZERO database requests)
  const [session, setSession] = useState<TrainingSession>(SYNTHETIC_QA_TRAINING_SESSION);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>(INITIAL_SYNTHETIC_ATTENDANCE);
  const [games, setGames] = useState<TrainingGame[]>(INITIAL_SYNTHETIC_GAMES);
  const [gamePlayers, setGamePlayers] = useState<SyntheticGamePlayer[]>(INITIAL_SYNTHETIC_GAME_PLAYERS);
  const [selectedGameId, setSelectedGameId] = useState<string>(INITIAL_SYNTHETIC_GAMES[0]?.id || "");
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeGame = games.find(g => g.id === selectedGameId) || games[0] || null;

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Attendance actions (Coach simulation)
  const setAttendanceStatus = (playerId: string, status: "present" | "absent" | "yes" | "no" | "maybe") => {
    setAttendance(prev => [
      ...prev.filter(a => a.player_id !== playerId),
      { training_id: session.id, player_id: playerId, status }
    ]);
    const pName = SYNTHETIC_QA_PLAYERS.find(p => p.id === playerId)?.display_name || "Zawodnik";
    triggerFeedback(`✓ ${pName}: status zmieniony na ${status}`);
  };

  // Team Assignment Actions
  const assignPlayerToTeam = (playerId: string, team: "A" | "B" | "C" | "D" | null) => {
    if (!activeGame) return;
    if (team === null) {
      setGamePlayers(prev => prev.filter(x => !(x.game_id === activeGame.id && x.player_id === playerId)));
      triggerFeedback(`✓ Usunięto ze składu gry`);
      return;
    }

    setGamePlayers(prev => [
      ...prev.filter(x => !(x.game_id === activeGame.id && x.player_id === playerId)),
      { game_id: activeGame.id, player_id: playerId, team }
    ]);
    triggerFeedback(`✓ Przypisano do Drużyny ${team}`);
  };

  // Create new training game
  const handleCreateGame = () => {
    const num = games.length + 1;
    const newGame: TrainingGame = {
      id: `qa-game-sim-0${num}`,
      training_id: session.id,
      team_a_name: `Drużyna A (#${num})`,
      team_b_name: `Drużyna B (#${num})`,
      team_a_score: 0,
      team_b_score: 0,
      created_at: new Date().toISOString(),
    };
    setGames(prev => [newGame, ...prev]);
    setSelectedGameId(newGame.id);
    triggerFeedback(`✓ Utworzono nową grę kontrolną #${num}`);
  };

  // Delete training game
  const handleDeleteGame = (gameId: string) => {
    if (games.length <= 1) {
      triggerFeedback(`! Pozostaw przynajmniej jedną grę w symulacji`);
      return;
    }
    setGames(prev => prev.filter(g => g.id !== gameId));
    setGamePlayers(prev => prev.filter(gp => gp.game_id !== gameId));
    setSelectedGameId(games.find(g => g.id !== gameId)?.id || "");
    triggerFeedback(`✓ Usunięto grę kontrolną`);
  };

  // Update Score
  const handleUpdateScore = (team: "A" | "B", score: number) => {
    if (!activeGame) return;
    setGames(prev => prev.map(g => {
      if (g.id !== activeGame.id) return g;
      return {
        ...g,
        team_a_score: team === "A" ? Math.max(0, score) : g.team_a_score,
        team_b_score: team === "B" ? Math.max(0, score) : g.team_b_score,
      };
    }));
  };

  // Reset Scenario to initial state
  const handleResetScenario = () => {
    setSession(SYNTHETIC_QA_TRAINING_SESSION);
    setAttendance(INITIAL_SYNTHETIC_ATTENDANCE);
    setGames(INITIAL_SYNTHETIC_GAMES);
    setGamePlayers(INITIAL_SYNTHETIC_GAME_PLAYERS);
    setSelectedGameId(INITIAL_SYNTHETIC_GAMES[0]?.id || "");
    triggerFeedback(`✓ Zresetowano scenariusz do stanu początkowego`);
  };

  // Counts
  const presentCount = attendance.filter(a => a.status === "present").length;
  const teamACount = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === "A").length : 0;
  const teamBCount = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === "B").length : 0;
  const teamCCount = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === "C").length : 0;
  const teamDCount = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === "D").length : 0;

  return (
    <div className="space-y-6">
      
      {/* SIMULATION BANNER */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-bold">
          <ShieldAlert size={16} className="text-amber-400 shrink-0" />
          <span>SYMULACJA QA — BRAK ZAPISU DO BAZY (100% IN-MEMORY STATE)</span>
        </div>
        <button
          onClick={handleResetScenario}
          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 font-bold transition-all shrink-0"
        >
          <RotateCcw size={13} />
          <span>Reset Scenariusza</span>
        </button>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check size={14} />
          <span>{feedback}</span>
        </div>
      )}

      {/* SUB-TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setSubTab("center")}
          className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            subTab === "center"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-950/40"
              : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/10"
          }`}
        >
          <Calendar size={14} />
          <span>Centrum Treningowe</span>
        </button>
        <button
          onClick={() => setSubTab("teams")}
          className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            subTab === "teams"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-950/40"
              : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/10"
          }`}
        >
          <Users size={14} />
          <span>Tworzenie Drużyn</span>
        </button>
        <button
          onClick={() => setSubTab("game")}
          className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            subTab === "game"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-950/40"
              : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/10"
          }`}
        >
          <Trophy size={14} />
          <span>Gra Kontrolna</span>
        </button>
        <button
          onClick={() => setSubTab("summary")}
          className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            subTab === "summary"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-950/40"
              : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/10"
          }`}
        >
          <Sparkles size={14} />
          <span>Podsumowanie & XP</span>
        </button>
      </div>

      {/* SUBTAB 1: CENTRUM TRENINGOWE & CHECK-IN */}
      {subTab === "center" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                CENTRUM TRENINGOWE • TRYB CHECK-IN SZTABU
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                {session.title} • {session.training_date}
              </h3>
              <p className="text-xs text-slate-400 m-0">
                {session.location} ({session.start_time} - {session.end_time})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                Obecni: {presentCount} / {SYNTHETIC_QA_PLAYERS.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {SYNTHETIC_QA_PLAYERS.map(p => {
              const att = attendance.find(a => a.player_id === p.id);
              const status = att?.status || "undecided";
              const isPresent = status === "present";
              const isAbsent = status === "absent";

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-white/10 font-bold flex items-center justify-center text-[10px] text-amber-300 shrink-0">
                      #{p.shirt_number}
                    </span>
                    <span className="font-bold text-slate-200 truncate">{p.display_name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setAttendanceStatus(p.id, "present")}
                      className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] transition-all ${
                        isPresent
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                          : "bg-white/[0.04] text-slate-400 hover:text-white"
                      }`}
                    >
                      JEST
                    </button>
                    <button
                      onClick={() => setAttendanceStatus(p.id, "absent")}
                      className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] transition-all ${
                        isAbsent
                          ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                          : "bg-white/[0.04] text-slate-400 hover:text-white"
                      }`}
                    >
                      NIE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TWORZENIE DRUŻYN (A, B, C, D) */}
      {subTab === "teams" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                ZARZĄDZANIE DRUŻYNAMI TRENINGOWYMI (ELASTYCZNE 2, 3 LUB 4 SKŁADY)
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                Podział zawodników na drużyny A, B, C, D
              </h3>
              <p className="text-xs text-slate-400 m-0">
                Możesz dowolnie przypisywać i przesuwać graczy. Brak sztywnego limitu 5v5/6v6.
              </p>
            </div>

            <button
              onClick={handleCreateGame}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all shrink-0"
            >
              <Plus size={14} />
              <span>Dodaj Grę Kontrolną</span>
            </button>
          </div>

          {/* ACTIVE GAME SELECTOR */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 font-bold shrink-0">Aktywna Gra:</span>
            {games.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGameId(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeGame?.id === g.id
                    ? "bg-blue-600 text-white font-black"
                    : "bg-white/[0.04] text-slate-300 border border-white/10"
                }`}
              >
                {g.team_a_name} vs {g.team_b_name}
              </button>
            ))}
          </div>

          {/* SQUADS OVERVIEW BADGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-red-600/10 border border-red-500/20 text-center">
              <span className="text-[10px] text-red-300 uppercase font-bold block">Drużyna A (Czerwoni)</span>
              <strong className="text-base text-red-400 font-black">{teamACount} zawodników</strong>
            </div>
            <div className="p-3 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-center">
              <span className="text-[10px] text-amber-300 uppercase font-bold block">Drużyna B (Złoci)</span>
              <strong className="text-base text-amber-400 font-black">{teamBCount} zawodników</strong>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-300 uppercase font-bold block">Drużyna C (Zieloni)</span>
              <strong className="text-base text-emerald-400 font-black">{teamCCount} zawodników</strong>
            </div>
            <div className="p-3 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-center">
              <span className="text-[10px] text-purple-300 uppercase font-bold block">Drużyna D (Fioletowi)</span>
              <strong className="text-base text-purple-400 font-black">{teamDCount} zawodników</strong>
            </div>
          </div>

          {/* PLAYERS LIST & 1-CLICK TEAM CHIP ASSIGNMENT */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Lista Zawodników — Kliknij literę, aby przypisać lub przenieść:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYNTHETIC_QA_PLAYERS.map(p => {
                const currentAssignment = activeGame
                  ? gamePlayers.find(x => x.game_id === activeGame.id && x.player_id === p.id)?.team || null
                  : null;

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-white/10 font-bold flex items-center justify-center text-[10px] text-amber-300 shrink-0">
                        #{p.shirt_number}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-200 block truncate">{p.display_name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{p.position}</span>
                      </div>
                    </div>

                    {/* Team assignment buttons A, B, C, D and removal */}
                    <div className="flex items-center gap-1 shrink-0">
                      {(["A", "B", "C", "D"] as const).map(teamLetter => (
                        <button
                          key={teamLetter}
                          onClick={() => assignPlayerToTeam(p.id, currentAssignment === teamLetter ? null : teamLetter)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                            currentAssignment === teamLetter
                              ? teamLetter === "A"
                                ? "bg-red-600 text-white ring-2 ring-red-400"
                                : teamLetter === "B"
                                ? "bg-amber-500 text-black ring-2 ring-amber-300"
                                : teamLetter === "C"
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                                : "bg-purple-600 text-white ring-2 ring-purple-400"
                              : "bg-white/[0.05] text-slate-400 hover:text-white border border-white/5"
                          }`}
                        >
                          {teamLetter}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: GRA KONTROLNA (WYNIK, EDYCJA, USUNIĘCIE) */}
      {subTab === "game" && activeGame && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                SYMULACJA MECZU TRENINGOWEGO
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                {activeGame.team_a_name} vs {activeGame.team_b_name}
              </h3>
            </div>
            <button
              onClick={() => handleDeleteGame(activeGame.id)}
              className="px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={13} />
              <span>Usuń Grę</span>
            </button>
          </div>

          {/* SCOREBOARD */}
          <div className="p-6 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-around text-center">
            <div className="space-y-2">
              <span className="text-xs font-black text-red-400 uppercase tracking-wider block">
                {activeGame.team_a_name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateScore("A", activeGame.team_a_score - 1)}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm"
                >
                  -
                </button>
                <span className="text-3xl sm:text-4xl font-black text-white px-2">
                  {activeGame.team_a_score}
                </span>
                <button
                  onClick={() => handleUpdateScore("A", activeGame.team_a_score + 1)}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-slate-500 font-black text-xl">:</div>

            <div className="space-y-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                {activeGame.team_b_name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateScore("B", activeGame.team_b_score - 1)}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm"
                >
                  -
                </button>
                <span className="text-3xl sm:text-4xl font-black text-white px-2">
                  {activeGame.team_b_score}
                </span>
                <button
                  onClick={() => handleUpdateScore("B", activeGame.team_b_score + 1)}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PODSUMOWANIE & XP */}
      {subTab === "summary" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="border-b border-white/5 pb-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              SYMULACJA ZAKOŃCZENIA TRENINGU & XP ENGINE
            </span>
            <h3 className="text-base sm:text-lg font-black text-white m-0">
              Podsumowanie i symulacja nagród sportowych (+40 XP)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Potwierdzeni Obecni:</span>
              <strong className="text-lg text-emerald-400 font-black">{presentCount} zawodników</strong>
              <small className="text-slate-500 block">Uprawnieni do +40 XP</small>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Suma Przyznanego XP:</span>
              <strong className="text-lg text-amber-400 font-black">+{presentCount * 40} XP</strong>
              <small className="text-slate-500 block">Ścisłe 40 XP / zawodnik</small>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Gry Kontrolne:</span>
              <strong className="text-lg text-white font-black">{games.length} rozegranych</strong>
              <small className="text-slate-500 block">Statystyki gier zapisane w pamięci</small>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
            <strong className="text-white block font-bold mb-1">REGUŁA BEZPIECZEŃSTWA EKONOMII:</strong>
            Potwierdzenie obecności przez trenera jest jedynym stanem uprawniającym do +40 XP. Wszelkie deklaracje rodzica (`yes`, `no`, `maybe`) dają 0 XP.
          </div>
        </div>
      )}

    </div>
  );
}
