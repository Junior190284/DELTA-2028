"use client";

import React, { useState, useMemo } from "react";
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
  Swords,
  Edit2,
  Medal,
  Target
} from "lucide-react";
import {
  SYNTHETIC_QA_PLAYERS,
  SYNTHETIC_QA_TRAINING_SESSION,
  INITIAL_SYNTHETIC_ATTENDANCE,
  INITIAL_SYNTHETIC_GAMES,
  INITIAL_SYNTHETIC_GAME_PLAYERS,
  INITIAL_SYNTHETIC_EVENTS,
  INITIAL_SYNTHETIC_CALENDAR_EVENTS,
  type SyntheticGamePlayer,
  type TeamLetter
} from "@/lib/qa/syntheticQaData";
import SmartCalendarPro from "@/components/calendar/SmartCalendarPro";
import type { SmartCalendarItem } from "@/lib/calendar/smartCalendarTypes";
import {
  calculateGameScoreFromEvents,
  aggregateTrainingLiveStats,
  type TrainingLiveEvent,
  type TrainingEventType
} from "@/lib/training/trainingLiveStats";
import type { Player, TrainingSession, TrainingAttendance, TrainingGame } from "@/components/training/DeltaTrainingCenter20";

const TEAM_OPTIONS: { letter: TeamLetter; name: string; color: string; border: string; bg: string }[] = [
  { letter: "A", name: "Drużyna A (Czerwoni)", color: "text-red-400", border: "border-red-500", bg: "bg-red-600" },
  { letter: "B", name: "Drużyna B (Złoci)", color: "text-amber-400", border: "border-amber-500", bg: "bg-amber-500" },
  { letter: "C", name: "Drużyna C (Zieloni)", color: "text-emerald-400", border: "border-emerald-500", bg: "bg-emerald-600" },
  { letter: "D", name: "Drużyna D (Fioletowi)", color: "text-purple-400", border: "border-purple-500", bg: "bg-purple-600" },
];

export default function InteractiveQaPlayground() {
  const [subTab, setSubTab] = useState<"center" | "teams" | "game" | "summary" | "calendar">("calendar");

  // Local isolated simulation states (100% in-memory, ZERO database requests)
  const [calendarEvents, setCalendarEvents] = useState<SmartCalendarItem[]>(INITIAL_SYNTHETIC_CALENDAR_EVENTS);
  const [session, setSession] = useState<TrainingSession>(SYNTHETIC_QA_TRAINING_SESSION);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>(INITIAL_SYNTHETIC_ATTENDANCE);
  const [games, setGames] = useState<TrainingGame[]>(INITIAL_SYNTHETIC_GAMES);
  const [gamePlayers, setGamePlayers] = useState<SyntheticGamePlayer[]>(INITIAL_SYNTHETIC_GAME_PLAYERS);
  const [events, setEvents] = useState<TrainingLiveEvent[]>(INITIAL_SYNTHETIC_EVENTS);
  const [selectedGameId, setSelectedGameId] = useState<string>(INITIAL_SYNTHETIC_GAMES[0]?.id || "");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal / Confirm delete dialog state
  const [deleteConfirmGameId, setDeleteConfirmGameId] = useState<string | null>(null);

  // Goal Creation / Editing Form State for Active Game
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [goalSide, setGoalSide] = useState<"A" | "B">("A");
  const [goalType, setGoalType] = useState<TrainingEventType>("goal");
  const [selectedScorerId, setSelectedScorerId] = useState<string>(""); // "" = brak/nieznany
  const [selectedAssistId, setSelectedAssistId] = useState<string>(""); // "" = bez asysty

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
    setEvents(prev => prev.filter(e => e.game_id !== gameId));
    setSelectedGameId(games.find(g => g.id !== gameId)?.id || "");
    setDeleteConfirmGameId(null);
    triggerFeedback(`✓ Usunięto mecz: ${targetGame?.team_a_name || ""} vs ${targetGame?.team_b_name || ""}`);
  };

  // Synchronize game score from events whenever events change
  const syncGameScoreFromEvents = (gameId: string, updatedEvents: TrainingLiveEvent[]) => {
    const targetGame = games.find(g => g.id === gameId);
    if (!targetGame) return;
    const { team_a_score, team_b_score } = calculateGameScoreFromEvents(gameId, updatedEvents, {
      team_a_score: targetGame.team_a_score,
      team_b_score: targetGame.team_b_score
    });
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, team_a_score, team_b_score } : g));
  };

  // Manual fallback score update (when coach modifies raw score directly)
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

  // Live Goals & Events Management
  const handleSaveGoalEvent = () => {
    if (!activeGame) return;

    // Rule: Zawodnik nie może asystować przy własnej bramce
    if (selectedScorerId && selectedAssistId && selectedScorerId === selectedAssistId) {
      alert("Zawodnik nie może asystować przy własnej bramce!");
      return;
    }

    if (editingEventId) {
      // Edit existing event
      const updated = events.map(ev => {
        if (ev.id !== editingEventId) return ev;
        return {
          ...ev,
          event_type: goalType,
          team_side: goalSide,
          player_id: selectedScorerId || null,
          assist_player_id: goalType === "goal" ? (selectedAssistId || null) : null,
        };
      });
      setEvents(updated);
      syncGameScoreFromEvents(activeGame.id, updated);
      setEditingEventId(null);
      triggerFeedback(`✓ Zaktualizowano zdarzenie bramkowe`);
    } else {
      // Create new event
      const newEvent: TrainingLiveEvent = {
        id: `qa-ev-sim-${Date.now()}`,
        game_id: activeGame.id,
        event_type: goalType,
        team_side: goalSide,
        player_id: selectedScorerId || null,
        assist_player_id: goalType === "goal" ? (selectedAssistId || null) : null,
        created_at: new Date().toISOString(),
      };
      const updated = [...events, newEvent];
      setEvents(updated);
      syncGameScoreFromEvents(activeGame.id, updated);
      triggerFeedback(`✓ Dodano gol dla ${goalSide === "A" ? activeGame.team_a_name : activeGame.team_b_name}`);
    }

    // Reset form fields
    setSelectedScorerId("");
    setSelectedAssistId("");
    setGoalType("goal");
  };

  const handleStartEditEvent = (ev: TrainingLiveEvent) => {
    setEditingEventId(ev.id);
    setGoalSide(ev.team_side);
    setGoalType(ev.event_type);
    setSelectedScorerId(ev.player_id || "");
    setSelectedAssistId(ev.assist_player_id || "");
  };

  const handleCancelEditEvent = () => {
    setEditingEventId(null);
    setSelectedScorerId("");
    setSelectedAssistId("");
    setGoalType("goal");
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!activeGame) return;
    const updated = events.filter(e => e.id !== eventId);
    setEvents(updated);
    syncGameScoreFromEvents(activeGame.id, updated);
    if (editingEventId === eventId) handleCancelEditEvent();
    triggerFeedback(`✓ Usunięto zdarzenie bramkowe i przeliczono wynik`);
  };

  // Reset Scenario to initial state
  const handleResetScenario = () => {
    setSession(SYNTHETIC_QA_TRAINING_SESSION);
    setAttendance(INITIAL_SYNTHETIC_ATTENDANCE);
    setGames(INITIAL_SYNTHETIC_GAMES);
    setGamePlayers(INITIAL_SYNTHETIC_GAME_PLAYERS);
    setEvents(INITIAL_SYNTHETIC_EVENTS);
    setSelectedGameId(INITIAL_SYNTHETIC_GAMES[0]?.id || "");
    setDeleteConfirmGameId(null);
    setEditingEventId(null);
    triggerFeedback(`✓ Zresetowano scenariusz do 3 meczów kanonicznych ze zdarzeniami live`);
  };

  // Derived calculations
  const presentCount = attendance.filter(a => a.status === "present").length;
  const activePair = activeGame ? getGameTeamLetters(activeGame) : { teamA: "A" as TeamLetter, teamB: "B" as TeamLetter };

  // Eligible players per side for activeGame
  // Strona A odpowiada Drużynie activePair.teamA, Strona B odpowiada activePair.teamB
  const sideAPlayers = useMemo(() => {
    if (!activeGame) return [];
    const assignedIds = new Set(
      gamePlayers
        .filter(gp => gp.game_id === activeGame.id && gp.team === activePair.teamA)
        .map(gp => gp.player_id)
    );
    return SYNTHETIC_QA_PLAYERS.filter(p => assignedIds.has(p.id));
  }, [activeGame, gamePlayers, activePair.teamA]);

  const sideBPlayers = useMemo(() => {
    if (!activeGame) return [];
    const assignedIds = new Set(
      gamePlayers
        .filter(gp => gp.game_id === activeGame.id && gp.team === activePair.teamB)
        .map(gp => gp.player_id)
    );
    return SYNTHETIC_QA_PLAYERS.filter(p => assignedIds.has(p.id));
  }, [activeGame, gamePlayers, activePair.teamB]);

  // Dla bramek samobójczych strzelec pochodzi z drużyny PRZECIWNEJ
  const eligibleScorers = useMemo(() => {
    if (goalType === "own_goal") {
      return goalSide === "A" ? sideBPlayers : sideAPlayers;
    }
    return goalSide === "A" ? sideAPlayers : sideBPlayers;
  }, [goalType, goalSide, sideAPlayers, sideBPlayers]);

  const eligibleAssisters = useMemo(() => {
    if (goalType === "own_goal") return []; // Przy samobóju nie ma asysty
    const currentSidePlayers = goalSide === "A" ? sideAPlayers : sideBPlayers;
    // Wyklucz aktualnie wybranego strzelca (nie można asystować samemu sobie)
    return currentSidePlayers.filter(p => p.id !== selectedScorerId);
  }, [goalType, goalSide, sideAPlayers, sideBPlayers, selectedScorerId]);

  // Match events for active game sorted chronologically
  const activeGameEvents = useMemo(() => {
    if (!activeGame) return [];
    return events.filter(e => e.game_id === activeGame.id);
  }, [activeGame, events]);

  // Aggregate live stats for the entire training
  const liveStatsSummary = useMemo(() => {
    return aggregateTrainingLiveStats(SYNTHETIC_QA_PLAYERS, games, gamePlayers, events);
  }, [games, gamePlayers, events]);

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
          <span>Reset Scenariusza (Live Stats)</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setSubTab("calendar")}
          className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            subTab === "calendar"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-950/40"
              : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/10"
          }`}
        >
          <Calendar size={14} />
          <span>Smart Kalendarz Pro</span>
        </button>
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
          <span>Podsumowanie & XP (Statystyki)</span>
        </button>
      </div>

      {/* SUBTAB 0: SMART CALENDAR PRO (SIMULATION) */}
      {subTab === "calendar" && (
        <SmartCalendarPro
          initialEvents={calendarEvents}
          currentUser={{
            id: "parent-qa-user",
            role: "parent",
            name: "Rodzic QA",
          }}
          userChildPlayerIds={["qa-p-01"]}
          isSimulation={true}
          onNavigateToMatchHub={() => {
            triggerFeedback("Przejście do Match Hub (Symulacja)");
          }}
          onNavigateToTrainingCenter={() => {
            setSubTab("center");
            triggerFeedback("Przełączono do Centrum Treningowego");
          }}
        />
      )}

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
                Lokalizacja: {session.location} ({session.start_time} - {session.end_time})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                Obecni: {presentCount} / {SYNTHETIC_QA_PLAYERS.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SYNTHETIC_QA_PLAYERS.map(p => {
              const att = attendance.find(a => a.player_id === p.id);
              const status = att?.status || "none";

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                      #{p.shirt_number}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-white block truncate">{p.display_name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Pozycja: {p.position}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setAttendanceStatus(p.id, "present")}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1 ${
                        status === "present"
                          ? "bg-emerald-500 text-black shadow-md shadow-emerald-950/40"
                          : "bg-white/[0.05] text-slate-300 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      <span className="hidden sm:inline">Obecny</span>
                    </button>
                    <button
                      onClick={() => setAttendanceStatus(p.id, "absent")}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1 ${
                        status === "absent"
                          ? "bg-red-500 text-white shadow-md shadow-red-950/40"
                          : "bg-white/[0.05] text-slate-300 hover:text-white"
                      }`}
                    >
                      <XCircle size={13} />
                      <span className="hidden sm:inline">Nieobecny</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TWORZENIE DRUŻYN (MULTI-MATCH ROSTERS & PAIR SELECTOR) */}
      {subTab === "teams" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                ZARZĄDZANIE DRUŻYNAMI • NIEZALEŻNE SKŁADY DLA KAŻDEGO MECZU
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                Wybierz mecz i przypisuj składy do par A, B, C, D
              </h3>
            </div>
            <button
              onClick={() => handleCreateGameWithPair("A", "B")}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 transition-all shrink-0"
            >
              <Plus size={14} />
              <span>Dodaj Grę Kontrolną</span>
            </button>
          </div>

          {/* MATCH SELECTOR TABS */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Aktywny mecz do edycji składów:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {games.map((g, idx) => {
                const pair = getGameTeamLetters(g);
                const countA = gamePlayers.filter(x => x.game_id === g.id && x.team === pair.teamA).length;
                const countB = gamePlayers.filter(x => x.game_id === g.id && x.team === pair.teamB).length;

                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGameId(g.id)}
                    className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                      activeGame?.id === g.id
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/30"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-black">{g.team_a_name} vs {g.team_b_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-amber-400">
                      {countA}v{countB}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE GAME CONFIGURATION PANEL */}
          {activeGame && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Swords size={16} className="text-amber-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Konfiguracja Par Meczu: {activeGame.team_a_name} vs {activeGame.team_b_name}
                  </span>
                </div>

                {/* Team Pair Dropdowns */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Gospodarz:</span>
                    <select
                      value={activePair.teamA}
                      onChange={(e) => handleChangeGamePair(activeGame.id, "A", e.target.value as TeamLetter)}
                      className="bg-[#121622] text-amber-300 border border-white/10 rounded-lg px-2 py-1 font-bold"
                    >
                      {(["A", "B", "C", "D"] as TeamLetter[]).map(l => (
                        <option key={l} value={l}>Drużyna {l}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-500 font-bold">vs</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Gość:</span>
                    <select
                      value={activePair.teamB}
                      onChange={(e) => handleChangeGamePair(activeGame.id, "B", e.target.value as TeamLetter)}
                      className="bg-[#121622] text-amber-300 border border-white/10 rounded-lg px-2 py-1 font-bold"
                    >
                      {(["A", "B", "C", "D"] as TeamLetter[]).map(l => (
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
                                : "bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.1]"
                            }`}
                            title={`Przypisz do Drużyny ${teamLetter}`}
                          >
                            {teamLetter}
                          </button>
                        ))}
                        {currentAssignment && (
                          <button
                            onClick={() => assignPlayerToTeam(p.id, null)}
                            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all ml-1"
                            title="Usuń z tego meczu"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: GRA KONTROLNA (TABLICA WYNIKÓW, REJESTRACJA BRAMEK & ASYST LIVE) */}
      {subTab === "game" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                TABLICA WYNIKÓW GIER KONTROLNYCH • LIVE STATS
              </span>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                Gole, asysty i automatyczne przeliczanie wyniku meczu
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
                onClick={() => {
                  setSelectedGameId(g.id);
                  handleCancelEditEvent();
                }}
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
            <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-6">
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

              {/* SCOREBOARD COUNTER */}
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

              {/* GOAL / EVENT REGISTRATION FORM (MOBILE OPTIMIZED) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-amber-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      {editingEventId ? "Edycja Zdarzenia Bramkowego" : "Rejestracja Bramki & Asysty"}
                    </span>
                  </div>
                  {editingEventId && (
                    <button
                      onClick={handleCancelEditEvent}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Anuluj edycję
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  {/* Wybór drużyny (komu dopisać bramkę) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Dla drużyny:</label>
                    <select
                      value={goalSide}
                      onChange={(e) => {
                        setGoalSide(e.target.value as "A" | "B");
                        setSelectedScorerId("");
                        setSelectedAssistId("");
                      }}
                      className="w-full bg-[#121622] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                    >
                      <option value="A">{activeGame.team_a_name}</option>
                      <option value="B">{activeGame.team_b_name}</option>
                    </select>
                  </div>

                  {/* Typ bramki: normalny / samobójcza */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Rodzaj bramki:</label>
                    <select
                      value={goalType}
                      onChange={(e) => {
                        setGoalType(e.target.value as TrainingEventType);
                        setSelectedScorerId("");
                        setSelectedAssistId("");
                      }}
                      className="w-full bg-[#121622] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                    >
                      <option value="goal">Standardowy Gol</option>
                      <option value="own_goal">Gol Samobójczy (OG)</option>
                    </select>
                  </div>

                  {/* Strzelec */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      {goalType === "own_goal" ? "Strzelec samobója:" : "Strzelec gola:"}
                    </label>
                    <select
                      value={selectedScorerId}
                      onChange={(e) => {
                        setSelectedScorerId(e.target.value);
                        if (selectedAssistId === e.target.value) {
                          setSelectedAssistId("");
                        }
                      }}
                      className="w-full bg-[#121622] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                    >
                      <option value="">(Bez znanego strzelca)</option>
                      {eligibleScorers.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.shirt_number} {p.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Asysta */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Asystent:</label>
                    <select
                      value={selectedAssistId}
                      disabled={goalType === "own_goal"}
                      onChange={(e) => setSelectedAssistId(e.target.value)}
                      className={`w-full bg-[#121622] text-white border border-white/10 rounded-xl px-3 py-2 font-bold ${
                        goalType === "own_goal" ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="">(Bez asysty)</option>
                      {eligibleAssisters.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.shirt_number} {p.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={handleSaveGoalEvent}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-950/40"
                  >
                    <Plus size={14} />
                    <span>{editingEventId ? "Zapisz Zmianę Bramki" : "Zatwierdź Bramkę (+ Wynik)"}</span>
                  </button>
                </div>
              </div>

              {/* TIMELINE / LIST OF GOALS FOR ACTIVE GAME */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Historia bramek tego meczu ({activeGameEvents.length}):
                </span>

                {activeGameEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-white/[0.02]">
                    Brak zarejestrowanych bramek w tym spotkaniu. Wynik można ustawić manualnie lub dodać bramkę powyżej.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activeGameEvents.map((ev, idx) => {
                      const scorer = SYNTHETIC_QA_PLAYERS.find(p => p.id === ev.player_id);
                      const assist = SYNTHETIC_QA_PLAYERS.find(p => p.id === ev.assist_player_id);
                      const teamName = ev.team_side === "A" ? activeGame.team_a_name : activeGame.team_b_name;

                      return (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">
                                {ev.event_type === "own_goal" ? "⚠️ Gol Samobójczy" : "⚽ Bramka"} dla:{" "}
                                <b className={ev.team_side === "A" ? "text-red-400" : "text-amber-400"}>
                                  {teamName}
                                </b>
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                Strzelec:{" "}
                                <strong className="text-slate-200">
                                  {scorer ? scorer.display_name : "(Nieznany)"}
                                </strong>
                                {ev.event_type === "goal" && (
                                  <>
                                    {" "}• Asysta:{" "}
                                    <strong className="text-slate-300">
                                      {assist ? assist.display_name : "Brak"}
                                    </strong>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleStartEditEvent(ev)}
                              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                              title="Edytuj strzelca / asystenta"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                              title="Usuń bramkę"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: PODSUMOWANIE & STATYSTYKI WSZYSTKICH SPOTKAŃ */}
      {subTab === "summary" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6">
          <div className="border-b border-white/5 pb-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              ZBIORCZE PODSUMOWANIE TRENINGU & LIVE STATYSTYKI
            </span>
            <h3 className="text-base sm:text-lg font-black text-white m-0">
              Wyniki meczów, statystyki strzelców, asystentów oraz bilans G+A
            </h3>
          </div>

          {/* GLOBAL TILES (XP & AGGREGATE GOALS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Obecni zawodnicy:</span>
              <strong className="text-lg text-emerald-400 font-black">{presentCount}</strong>
              <small className="text-slate-500 block">+{presentCount * 40} XP łącznego</small>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Rozegrane mecze:</span>
              <strong className="text-lg text-white font-black">{liveStatsSummary.totalMatches}</strong>
              <small className="text-slate-500 block">Wszystkie w pamięci</small>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Zdobyte bramki:</span>
              <strong className="text-lg text-amber-400 font-black">{liveStatsSummary.totalGoals}</strong>
              <small className="text-slate-500 block">Samobójcze: {liveStatsSummary.totalOwnGoals}</small>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 block">Liczba asyst:</span>
              <strong className="text-lg text-sky-400 font-black">{liveStatsSummary.totalAssists}</strong>
              <small className="text-slate-500 block">G+A: {liveStatsSummary.totalGoals + liveStatsSummary.totalAssists}</small>
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
                const matchEvCount = events.filter(e => e.game_id === g.id).length;

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
                          Składy: {countA} ({pair.teamA}) vs {countB} ({pair.teamB}) • {matchEvCount} zdarzeń bramkowych
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

          {/* INDIVIDUAL PLAYER STATS TABLE (GOALS, ASSISTS, G+A) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Indywidualne Statystyki Treningu (Gole, Asysty, G+A):
            </span>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                    <th className="p-3">Zawodnik</th>
                    <th className="p-3 text-center">Mecze</th>
                    <th className="p-3 text-center">⚽ Gole</th>
                    <th className="p-3 text-center">👟 Asysty</th>
                    <th className="p-3 text-center font-bold text-amber-300">G+A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.values(liveStatsSummary.playerStats)
                    .sort((a, b) => b.ga - a.ga || b.goals - a.goals || b.games - a.games)
                    .map(stat => (
                      <tr key={stat.player_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-white/10 text-[10px] font-bold flex items-center justify-center text-amber-300">
                            #{stat.shirt_number}
                          </span>
                          <span className="font-bold text-white">{stat.display_name}</span>
                          <span className="text-[10px] text-slate-500">({stat.position})</span>
                        </td>
                        <td className="p-3 text-center text-slate-300">{stat.games}</td>
                        <td className="p-3 text-center font-bold text-emerald-400">{stat.goals}</td>
                        <td className="p-3 text-center font-bold text-sky-400">{stat.assists}</td>
                        <td className="p-3 text-center font-black text-amber-300 text-sm">{stat.ga}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
              Czy na pewno chcesz usunąć ten mecz kontrolny? Przypisania zawodników oraz bramki z tego meczu zostaną wyczyszczone.
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
