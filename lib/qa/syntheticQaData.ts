import type { Player, TrainingSession, TrainingAttendance, TrainingGame } from "@/components/training/DeltaTrainingCenter20";
import type { TrainingLiveEvent } from "@/lib/training/trainingLiveStats";

export type SyntheticGame = TrainingGame;
export type TeamLetter = "A" | "B" | "C" | "D";
export type SyntheticTrainingEvent = TrainingLiveEvent;

export interface SyntheticGamePlayer {
  game_id: string;
  player_id: string;
  team: TeamLetter;
}

export const SYNTHETIC_QA_PLAYERS: Player[] = [
  { id: "qa-p-01", display_name: "Zawodnik QA 01", shirt_number: "1", position: "BR", photo_path: null, active: true },
  { id: "qa-p-02", display_name: "Zawodnik QA 02", shirt_number: "2", position: "OBR", photo_path: null, active: true },
  { id: "qa-p-03", display_name: "Zawodnik QA 03", shirt_number: "3", position: "OBR", photo_path: null, active: true },
  { id: "qa-p-04", display_name: "Zawodnik QA 04", shirt_number: "4", position: "OBR", photo_path: null, active: true },
  { id: "qa-p-05", display_name: "Zawodnik QA 05", shirt_number: "5", position: "POM", photo_path: null, active: true },
  { id: "qa-p-06", display_name: "Zawodnik QA 06", shirt_number: "6", position: "POM", photo_path: null, active: true },
  { id: "qa-p-07", display_name: "Zawodnik QA 07", shirt_number: "7", position: "NAP", photo_path: null, active: true },
  { id: "qa-p-08", display_name: "Zawodnik QA 08", shirt_number: "8", position: "POM", photo_path: null, active: true },
  { id: "qa-p-09", display_name: "Zawodnik QA 09", shirt_number: "9", position: "NAP", photo_path: null, active: true },
  { id: "qa-p-10", display_name: "Zawodnik QA 10", shirt_number: "10", position: "POM", photo_path: null, active: true },
  { id: "qa-p-11", display_name: "Zawodnik QA 11", shirt_number: "11", position: "NAP", photo_path: null, active: true },
  { id: "qa-p-12", display_name: "Zawodnik QA 12", shirt_number: "12", position: "BR", photo_path: null, active: true },
  { id: "qa-p-13", display_name: "Zawodnik QA 13", shirt_number: "13", position: "OBR", photo_path: null, active: true },
  { id: "qa-p-14", display_name: "Zawodnik QA 14", shirt_number: "14", position: "POM", photo_path: null, active: true },
  { id: "qa-p-15", display_name: "Zawodnik QA 15", shirt_number: "15", position: "NAP", photo_path: null, active: true },
  { id: "qa-p-16", display_name: "Zawodnik QA 16", shirt_number: "16", position: "POM", photo_path: null, active: true },
];

export const SYNTHETIC_QA_TRAINING_SESSION: TrainingSession = {
  id: "qa-session-simulated-001",
  training_date: new Date().toISOString().slice(0, 10),
  start_time: "17:30",
  end_time: "19:00",
  location: "Warszawianka Boisko A (Symulacja QA)",
  title: "Trening Taktyczny U-9 • QA Playground",
  notes: "Sesja weryfikacyjna tworzenia drużyn i obecności",
  created_at: new Date().toISOString(),
};

export const INITIAL_SYNTHETIC_ATTENDANCE: TrainingAttendance[] = [
  { training_id: "qa-session-simulated-001", player_id: "qa-p-01", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-02", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-03", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-04", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-05", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-06", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-07", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-08", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-09", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-10", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-11", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-12", status: "present" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-13", status: "no" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-14", status: "absent" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-15", status: "maybe" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-16", status: "" },
];

/**
 * 3 Canonical matches as specified in DELTA-051T5:
 * Mecz 1: A-B, wynik 3:2
 * Mecz 2: C-D, wynik 1:4
 * Mecz 3: A-C, wynik 2:0
 */
export const INITIAL_SYNTHETIC_GAMES: TrainingGame[] = [
  {
    id: "qa-game-sim-01",
    training_id: "qa-session-simulated-001",
    team_a_name: "Drużyna A",
    team_b_name: "Drużyna B",
    team_a_score: 3,
    team_b_score: 2,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-game-sim-02",
    training_id: "qa-session-simulated-001",
    team_a_name: "Drużyna C",
    team_b_name: "Drużyna D",
    team_a_score: 1,
    team_b_score: 4,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-game-sim-03",
    training_id: "qa-session-simulated-001",
    team_a_name: "Drużyna A",
    team_b_name: "Drużyna C",
    team_a_score: 2,
    team_b_score: 0,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_SYNTHETIC_GAME_PLAYERS: SyntheticGamePlayer[] = [
  // Mecz 1: A-B (4v4)
  { game_id: "qa-game-sim-01", player_id: "qa-p-01", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-02", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-03", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-04", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-05", team: "B" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-06", team: "B" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-07", team: "B" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-08", team: "B" },

  // Mecz 2: C-D (3v3)
  { game_id: "qa-game-sim-02", player_id: "qa-p-09", team: "C" },
  { game_id: "qa-game-sim-02", player_id: "qa-p-10", team: "C" },
  { game_id: "qa-game-sim-02", player_id: "qa-p-11", team: "C" },
  { game_id: "qa-game-sim-02", player_id: "qa-p-12", team: "D" },
  { game_id: "qa-game-sim-02", player_id: "qa-p-13", team: "D" },
  { game_id: "qa-game-sim-02", player_id: "qa-p-14", team: "D" },

  // Mecz 3: A-C (3v3)
  { game_id: "qa-game-sim-03", player_id: "qa-p-01", team: "A" },
  { game_id: "qa-game-sim-03", player_id: "qa-p-02", team: "A" },
  { game_id: "qa-game-sim-03", player_id: "qa-p-03", team: "A" },
  { game_id: "qa-game-sim-03", player_id: "qa-p-09", team: "C" },
  { game_id: "qa-game-sim-03", player_id: "qa-p-10", team: "C" },
  { game_id: "qa-game-sim-03", player_id: "qa-p-11", team: "C" },
];

export const INITIAL_SYNTHETIC_EVENTS: TrainingLiveEvent[] = [
  // Mecz 1: A vs B (3:2)
  // Gole dla Drużyny A (3):
  {
    id: "qa-ev-sim-01",
    game_id: "qa-game-sim-01",
    event_type: "goal",
    player_id: "qa-p-01", // Zawodnik 01
    assist_player_id: "qa-p-02", // Asysta Zawodnik 02
    team_side: "A",
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-02",
    game_id: "qa-game-sim-01",
    event_type: "goal",
    player_id: "qa-p-03", // Zawodnik 03
    assist_player_id: null, // Bez asysty
    team_side: "A",
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-03",
    game_id: "qa-game-sim-01",
    event_type: "goal",
    player_id: "qa-p-01", // Zawodnik 01 (drugi gol)
    assist_player_id: "qa-p-04", // Asysta Zawodnik 04
    team_side: "A",
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  // Gole dla Drużyny B (2):
  {
    id: "qa-ev-sim-04",
    game_id: "qa-game-sim-01",
    event_type: "goal",
    player_id: "qa-p-05", // Zawodnik 05
    assist_player_id: "qa-p-06", // Asysta Zawodnik 06
    team_side: "B",
    created_at: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-05",
    game_id: "qa-game-sim-01",
    event_type: "goal",
    player_id: "qa-p-07", // Zawodnik 07
    assist_player_id: null, // Bez asysty
    team_side: "B",
    created_at: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
  },

  // Mecz 2: C vs D (1:4)
  // Gol dla Drużyny C (1):
  {
    id: "qa-ev-sim-06",
    game_id: "qa-game-sim-02",
    event_type: "goal",
    player_id: "qa-p-09", // Zawodnik 09
    assist_player_id: "qa-p-10",
    team_side: "A", // Dla Mecz 2 strona A to Drużyna C
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  // Gole dla Drużyny D (4):
  {
    id: "qa-ev-sim-07",
    game_id: "qa-game-sim-02",
    event_type: "goal",
    player_id: "qa-p-12",
    assist_player_id: "qa-p-13",
    team_side: "B", // Dla Mecz 2 strona B to Drużyna D
    created_at: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-08",
    game_id: "qa-game-sim-02",
    event_type: "goal",
    player_id: "qa-p-12", // Drugi gol Zawodnika 12
    assist_player_id: null,
    team_side: "B",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-09",
    game_id: "qa-game-sim-02",
    event_type: "goal",
    player_id: "qa-p-14",
    assist_player_id: "qa-p-12",
    team_side: "B",
    created_at: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-10",
    game_id: "qa-game-sim-02",
    event_type: "goal",
    player_id: null, // Gol bez znanego strzelca (wymaganie nr 4)
    assist_player_id: null,
    team_side: "B",
    created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
  },

  // Mecz 3: A vs C (2:0)
  {
    id: "qa-ev-sim-11",
    game_id: "qa-game-sim-03",
    event_type: "goal",
    player_id: "qa-p-02",
    assist_player_id: "qa-p-01",
    team_side: "A",
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: "qa-ev-sim-12",
    game_id: "qa-game-sim-03",
    event_type: "goal",
    player_id: "qa-p-03",
    assist_player_id: null,
    team_side: "A",
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];
