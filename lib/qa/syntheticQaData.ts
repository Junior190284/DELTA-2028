import type { Player, TrainingSession, TrainingAttendance, TrainingGame } from "@/components/training/DeltaTrainingCenter20";

export interface SyntheticGamePlayer {
  game_id: string;
  player_id: string;
  team: "A" | "B" | "C" | "D";
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
  { training_id: "qa-session-simulated-001", player_id: "qa-p-09", status: "yes" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-10", status: "yes" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-11", status: "maybe" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-12", status: "absent" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-13", status: "no" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-14", status: "" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-15", status: "" },
  { training_id: "qa-session-simulated-001", player_id: "qa-p-16", status: "" },
];

export const INITIAL_SYNTHETIC_GAMES: TrainingGame[] = [
  {
    id: "qa-game-sim-01",
    training_id: "qa-session-simulated-001",
    team_a_name: "Czerwoni QA",
    team_b_name: "Złoci QA",
    team_a_score: 2,
    team_b_score: 1,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_SYNTHETIC_GAME_PLAYERS: SyntheticGamePlayer[] = [
  { game_id: "qa-game-sim-01", player_id: "qa-p-01", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-02", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-03", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-04", team: "A" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-05", team: "B" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-06", team: "B" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-07", team: "B" },
  { game_id: "qa-game-sim-01", player_id: "qa-p-08", team: "B" },
];
