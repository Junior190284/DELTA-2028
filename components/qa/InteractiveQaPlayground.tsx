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
  Check,
  AlertTriangle,
  ChevronRight,
  Settings,
  Swords
} from "lucide-react";
import {
  SYNTHETIC_QA_PLAYERS,
  SYNTHETIC_QA_TRAINING_SESSION,
  INITIAL_SYNTHETIC_ATTENDANCE,
  INITIAL_SYNTHETIC_GAMES,
  INITIAL_SYNTHETIC_GAME_PLAYERS,
  type SyntheticGamePlayer,
  type TeamLetter
} from "@/lib/qa/syntheticQaData";
import type { Player, TrainingSession, TrainingAttendance, TrainingGame } from "@/components/training/DeltaTrainingCenter20";

const TEAM_OPTIONS: { letter: TeamLetter; name: string; color: string; border: string; bg: string }[] = [
  { letter: "A", name: "Drużyna A (Czerwoni)", color: "text-red-400", border: "border-red-500", bg: "bg-red-600" },
  { letter: "B", name: "Drużyna B (Złoci)", color: "text-amber-400", border: "border-amber-500", bg: "bg-amber-500" },
  { letter: "C", name: "Drużyna C (Zieloni)", color: "text-emerald-400", border: "border-emerald-500", bg: "bg-emerald-600" },
  { letter: "D", name: "Drużyna D (Fioletowi)", color: "text-purple-400", border: "border-purple-500", bg: "bg-purple-600" },
];

export default function InteractiveQaPlayground() {
  const [subTab, setSubTab] = useState<"center" | "teams" | "game" | "summary">("teams");

  // Local isolated simulation states (100% in-memory, ZERO database requests)
  const [session, setSession] = useState<TrainingSession>(SYNTHETIC_QA_TRAINING_SESSION);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>(INITIAL_SYNTHETIC_ATTENDANCE);
  const [games, setGames] = useState<TrainingGame[]>(INITIAL_SYNTHETIC_GAMES);
  const [gamePlayers, setGamePlayers] = useState<SyntheticGamePlayer[]>(INITIAL_SYNTHETIC_GAME_PLAYERS);
  const [selectedGameId, setSelectedGameId] = useState<string>(INITIAL_SYNTHETIC_GAMES[0]?.id || "");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal / Confirm delete dialog state
  const [deleteConfirmGameId, setDeleteConfirmGameId] = useState<string | null>(null);

  // Active game resolver
  const activeGame = games.find(g => g.id === selectedGameId) || games[0] || null;

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Helper to extract pair letters from team names (e.g. "Drużyna A" -> "A")
  const getGameTeamLetters = (game: TrainingGame): { teamA: TeamLetter; teamB: TeamLetter } => {
    const letterA = (game.team_a_name.match(/[A-D]/) || ["A"])[0] as TeamLetter;
    const letterB = (game.team_b_name.match(/[A-D]/) || ["B"])[0] as TeamLetter;
    return { teamA: letterA, teamB: letterB };
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

  // Team Assignment Actions for activeGame
  const assignPlayerToTeam = (playerId: string, team: TeamLetter | null) => {
    if (!activeGame) return;
    if (team === null) {
      setGamePlayers(prev => prev.filter(x => !(x.game_id === activeGame.id && x.player_id === playerId)));
      triggerFeedback(`✓ Usunięto ze składu meczu ${activeGame.team_a_name} vs ${activeGame.team_b_name}`);
      return;
    }

    setGamePlayers(prev => [
      ...prev.filter(x => !(x.game_id === activeGame.id && x.player_id === playerId)),
      { game_id: activeGame.id, player_id: playerId, team }
    ]);
    triggerFeedback(`✓ Przypisano do Drużyny ${team}`);
  };

  // Create new training game with custom or default pair
  const handleCreateGameWithPair = (pairA: TeamLetter = "A", pairB: TeamLetter = "B") => {
    const num = games.length + 1;
    const newGame: TrainingGame = {
      id: `qa-game-sim-${String(num).padStart(2, "0")}`,
      training_id: session.id,
      team_a_name: `Drużyna ${pairA}`,
      team_b_name: `Drużyna ${pairB}`,
      team_a_score: 0,
      team_b_score: 0,
      created_at: new Date().toISOString(),
    };
    setGames(prev => [...prev, newGame]);
    setSelectedGameId(newGame.id);
    triggerFeedback(`✓ Utworzono Mecz ${num}: ${newGame.team_a_name} vs ${newGame.team_b_name}`);
  };

  // Change active game teams pair (e.g. from A-B to A-C)
  const handleChangeGamePair = (gameId: string, side: "A" | "B", letter: TeamLetter) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        team_a_name: side === "A" ? `Drużyna ${letter}` : g.team_a_name,
        team_b_name: side === "B" ? `Drużyna ${letter}` : g.team_b_name,
      };
    }));
    triggerFeedback(`✓ Zmieniono parę meczu na: ${side === "A" ? `Drużyna ${letter}` : activeGame?.team_a_name} vs ${side === "B" ? `Drużyna ${letter}` : activeGame?.team_b_name}`);
  };

  // Delete training game with confirmation
  const handleConfirmDeleteGame = (gameId: string) => {
    if (games.length <= 1) {
      triggerFeedback(`! Pozostaw przynajmniej jedną grę w symulacji`);
      setDeleteConfirmGameId(null);
      return;
    }
    const targetGame = games.find(g => g.id === gameId);
    setGames(prev => prev.filter(g => g.id !== gameId));
    setGamePlayers(prev => prev.filter(gp => gp.game_id !== gameId));
    setSelectedGameId(games.find(g => g.id !== gameId)?.id || "");
    setDeleteConfirmGameId(null);
    triggerFeedback(`✓ Usunięto mecz: ${targetGame?.team_a_name || ""} vs ${targetGame?.team_b_name || ""}`);
  };

  // Update Score for specific game
  const handleUpdateScore = (gameId: string, side: "A" | "B", score: number) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        team_a_score: side === "A" ? Math.max(0, score) : g.team_a_score,
        team_b_score: side === "B" ? Math.max(0, score) : g.team_b_score,
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
    setDeleteConfirmGameId(null);
    triggerFeedback(`✓ Zresetowano scenariusz do 3 meczów kanonicznych (A-B, C-D, A-C)`);
  };

  // Counts for active game
  const presentCount = attendance.filter(a => a.status === "present").length;
  const activePair = activeGame ? getGameTeamLetters(activeGame) : { teamA: "A" as TeamLetter, teamB: "B" as TeamLetter };

  const activeRosterA = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === activePair.teamA) : [];
  const activeRosterB = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === activePair.teamB) : [];
  const activeRosterC = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === "C") : [];
  const activeRosterD = activeGame ? gamePlayers.filter(x => x.game_id === activeGame.id && x.team === "D") : [];

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
          <span>Reset Scenariusza (3 Mecze)</span>
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
          <span>Gra Kontrolna ({games.length})</span>
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
                Obecni na boisku: {presentCount} / {SYNTHETIC_QA_PLAYERS.length}
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

      {/* SUBTAB 2: TWORZENIE DRUŻYN (MULTI-MATCH COMPONENT) */}
      {subTab === "teams" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                ZARZĄDZANIE DRUŻYNAMI TRENINGOWYMI (MULTI-MATCH ENGINE)
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                Składy meczu: {activeGame?.team_a_name || ""} vs {activeGame?.team_b_name || ""}
              </h3>
              <p className="text-xs text-slate-400 m-0">
                Wybierz dowolny mecz z listy poniżej lub utwórz kolejny. Każdy mecz posiada w pełni niezależny skład i wynik.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCreateGameWithPair("A", "B")}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all shrink-0"
              >
                <Plus size={14} />
                <span>Nowy Mecz</span>
              </button>
            </div>
          </div>

          {/* LISTA WSZYSTKICH GIER KONTROLNYCH (MULTI-MATCH LIST) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase">
              <span>Wszystkie Gry Kontrolne ({games.length}):</span>
              <span className="text-[11px] text-slate-500 lowercase">kliknij mecz, aby edytować jego skład</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {games.map((g, idx) => {
                const isSelected = activeGame?.id === g.id;
                const pair = getGameTeamLetters(g);
                const countA = gamePlayers.filter(x => x.game_id === g.id && x.team === pair.teamA).length;
                const countB = gamePlayers.filter(x => x.game_id === g.id && x.team === pair.teamB).length;

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGameId(g.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-950/50"
                        : "bg-white/[0.03] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-400">
                        Mecz {idx + 1}
                      </span>
                      <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-black/40 border border-white/10">
                        {g.team_a_score} : {g.team_b_score}
                      </span>
                    </div>

                    <div>
                      <b className="text-sm font-bold text-white block">
                        {g.team_a_name} vs {g.team_b_name}
                      </b>
                      <span className="text-[11px] text-slate-400">
                        Skład: {countA} ({pair.teamA}) vs {countB} ({pair.teamB}) zawodników
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? "text-blue-400 font-bold" : "text-slate-500"}>
                        {isSelected ? "● Edytowany" : "Wybierz"}
                      </span>
                      {games.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmGameId(g.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Usuń ten mecz"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE GAME PAIR CHANGER & DETAILS */}
          {activeGame && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Swords size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase">
                    Konfiguracja Par Drużyn dla aktywnego meczu:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Gospodarz:</span>
                    <select
                      value={activePair.teamA}
                      onChange={(e) => handleChangeGamePair(activeGame.id, "A", e.target.value as TeamLetter)}
                      className="bg-black/60 border border-white/20 rounded-lg px-2 py-1 text-xs font-bold text-white"
                    >
                      {(["A", "B", "C", "D"] as const).map(l => (
                        <option key={l} value={l}>Drużyna {l}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-500 font-black">vs</span>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Gość:</span>
                    <select
                      value={activePair.teamB}
                      onChange={(e) => handleChangeGamePair(activeGame.id, "B", e.target.value as TeamLetter)}
                      className="bg-black/60 border border-white/20 rounded-lg px-2 py-1 text-xs font-bold text-white"
                    >
                      {(["A", "B", "C", "D"] as const).map(l => (
                        <option key={l} value={l}>Drużyna {l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ACTIVE SQUADS COUNT FOR CURRENT GAME */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {TEAM_OPTIONS.map(opt => {
                  const count = gamePlayers.filter(x => x.game_id === activeGame.id && x.team === opt.letter).length;
                  const isPlaying = activePair.teamA === opt.letter || activePair.teamB === opt.letter;

                  return (
                    <div
                      key={opt.letter}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isPlaying
                          ? `${opt.color} bg-white/[0.04] ${opt.border}/40`
                          : "text-slate-500 bg-white/[0.01] border-white/5 opacity-60"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold block">
                        {opt.name} {isPlaying ? "★" : ""}
                      </span>
                      <strong className="text-sm font-black">{count} zawodników</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PLAYERS LIST & 1-CLICK TEAM CHIP ASSIGNMENT (FOR ACTIVE GAME ONLY) */}
          {activeGame && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Przypisz zawodników do meczu ({activeGame.team_a_name} vs {activeGame.team_b_name}):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SYNTHETIC_QA_PLAYERS.map(p => {
                  const currentAssignment = gamePlayers.find(
                    x => x.game_id === activeGame.id && x.player_id === p.id
                  )?.team || null;

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
          )}
        </div>
      )}

      {/* SUBTAB 3: GRA KONTROLNA (TABLICA WYNIKÓW I LISTA SPOTKAŃ) */}
      {subTab === "game" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                TABLICA WYNIKÓW GIER KONTROLNYCH
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                Wybierz mecz i wprowadzaj bramki niezależnie
              </h3>
            </div>
            <button
              onClick={() => handleCreateGameWithPair("C", "D")}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase flex items-center gap-1.5 transition-all shrink-0"
            >
              <Plus size={13} />
              <span>Dodaj Następny Mecz</span>
            </button>
          </div>

          {/* GAME SELECTOR PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {games.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => setSelectedGameId(g.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  activeGame?.id === g.id
                    ? "bg-amber-500 text-black font-black shadow-md shadow-amber-950/40"
                    : "bg-white/[0.04] text-slate-300 border border-white/10"
                }`}
              >
                <span>Mecz {idx + 1}: {g.team_a_name} vs {g.team_b_name}</span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-black">
                  {g.team_a_score}:{g.team_b_score}
                </span>
              </button>
            ))}
          </div>

          {/* ACTIVE GAME SCOREBOARD */}
          {activeGame && (
            <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Wynik na żywo: <b className="text-white">{activeGame.team_a_name} vs {activeGame.team_b_name}</b>
                </span>
                {games.length > 1 && (
                  <button
                    onClick={() => setDeleteConfirmGameId(activeGame.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Usuń ten mecz</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-around text-center py-2">
                <div className="space-y-2">
                  <span className="text-xs font-black text-red-400 uppercase tracking-wider block">
                    {activeGame.team_a_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateScore(activeGame.id, "A", activeGame.team_a_score - 1)}
                      className="w-9 h-9 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/20"
                    >
                      -
                    </button>
                    <span className="text-4xl sm:text-5xl font-black text-white px-3 font-mono">
                      {activeGame.team_a_score}
                    </span>
                    <button
                      onClick={() => handleUpdateScore(activeGame.id, "A", activeGame.team_a_score + 1)}
                      className="w-9 h-9 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/20"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-slate-500 font-black text-2xl">:</div>

                <div className="space-y-2">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                    {activeGame.team_b_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateScore(activeGame.id, "B", activeGame.team_b_score - 1)}
                      className="w-9 h-9 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/20"
                    >
                      -
                    </button>
                    <span className="text-4xl sm:text-5xl font-black text-white px-3 font-mono">
                      {activeGame.team_b_score}
                    </span>
                    <button
                      onClick={() => handleUpdateScore(activeGame.id, "B", activeGame.team_b_score + 1)}
                      className="w-9 h-9 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/20"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: PODSUMOWANIE & STATYSTYKI WSZYSTKICH SPOTKAŃ */}
      {subTab === "summary" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              ZBIORCZE PODSUMOWANIE TRENINGU & WSZYSTKICH GIER KONTROLNYCH
            </span>
            <h3 className="text-base sm:text-lg font-black text-white m-0">
              Wyniki wszystkich meczów oraz podsumowanie sportowego XP
            </h3>
          </div>

          {/* GLOBAL ATTENDANCE & XP TILES */}
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
              <span className="text-slate-400 block">Rozegrane Mecze:</span>
              <strong className="text-lg text-white font-black">{games.length} spotkań</strong>
              <small className="text-slate-500 block">Wszystkie mecze w pamięci lokalnej</small>
            </div>
          </div>

          {/* TABLE OF ALL MATCHES */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Tabela Wyników Spotkań:
            </span>

            <div className="space-y-2">
              {games.map((g, idx) => {
                const pair = getGameTeamLetters(g);
                const countA = gamePlayers.filter(x => x.game_id === g.id && x.team === pair.teamA).length;
                const countB = gamePlayers.filter(x => x.game_id === g.id && x.team === pair.teamB).length;

                return (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-white/10 font-black text-amber-400 flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <b className="text-sm font-bold text-white block">
                          {g.team_a_name} vs {g.team_b_name}
                        </b>
                        <span className="text-[11px] text-slate-400">
                          Składy: {countA} ({pair.teamA}) vs {countB} ({pair.teamB}) zawodników
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-amber-300 font-mono px-3 py-1 rounded-xl bg-black/40 border border-white/10">
                        {g.team_a_score} : {g.team_b_score}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedGameId(g.id);
                          setSubTab("game");
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-bold text-[11px] flex items-center gap-1"
                      >
                        <span>Edytuj</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmGameId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#121622] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Potwierdzenie Usunięcia</span>
            </div>
            <p className="text-xs text-slate-300 m-0">
              Czy na pewno chcesz usunąć ten mecz kontrolny? Przypisania zawodników do tego meczu zostaną wyczyszczone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmGameId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] text-slate-300 hover:text-white"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleConfirmDeleteGame(deleteConfirmGameId)}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40"
              >
                Usuń Mecz
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
