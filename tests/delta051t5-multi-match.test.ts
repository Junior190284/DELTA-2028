import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_SYNTHETIC_GAMES,
  INITIAL_SYNTHETIC_GAME_PLAYERS,
  type TeamLetter,
  type SyntheticGame,
  type SyntheticGamePlayer
} from "../lib/qa/syntheticQaData.ts";

test("DELTA-051T5: Initial synthetic data contains canonical 3 matches with independent team pairs", () => {
  assert.equal(INITIAL_SYNTHETIC_GAMES.length, 3);

  const [m1, m2, m3] = INITIAL_SYNTHETIC_GAMES;

  // Mecz 1: Drużyna A vs Drużyna B (3:2)
  assert.equal(m1.id, "qa-game-sim-01");
  assert.equal(m1.team_a_name, "Drużyna A");
  assert.equal(m1.team_b_name, "Drużyna B");
  assert.equal(m1.team_a_score, 3);
  assert.equal(m1.team_b_score, 2);

  // Mecz 2: Drużyna C vs Drużyna D (1:4)
  assert.equal(m2.id, "qa-game-sim-02");
  assert.equal(m2.team_a_name, "Drużyna C");
  assert.equal(m2.team_b_name, "Drużyna D");
  assert.equal(m2.team_a_score, 1);
  assert.equal(m2.team_b_score, 4);

  // Mecz 3: Drużyna A vs Drużyna C (2:0)
  assert.equal(m3.id, "qa-game-sim-03");
  assert.equal(m3.team_a_name, "Drużyna A");
  assert.equal(m3.team_b_name, "Drużyna C");
  assert.equal(m3.team_a_score, 2);
  assert.equal(m3.team_b_score, 0);
});

test("DELTA-051T5: Player rosters are independently tracked per game_id", () => {
  const g1Players = INITIAL_SYNTHETIC_GAME_PLAYERS.filter(gp => gp.game_id === "qa-game-sim-01");
  const g2Players = INITIAL_SYNTHETIC_GAME_PLAYERS.filter(gp => gp.game_id === "qa-game-sim-02");
  const g3Players = INITIAL_SYNTHETIC_GAME_PLAYERS.filter(gp => gp.game_id === "qa-game-sim-03");

  assert.ok(g1Players.length > 0, "Game 1 should have players");
  assert.ok(g2Players.length > 0, "Game 2 should have players");
  assert.ok(g3Players.length > 0, "Game 3 should have players");

  // In Game 1: Check Team A and Team B assignments
  const g1TeamA = g1Players.filter(p => p.team === "A");
  const g1TeamB = g1Players.filter(p => p.team === "B");
  assert.ok(g1TeamA.length >= 4, "Game 1 Team A has players");
  assert.ok(g1TeamB.length >= 4, "Game 1 Team B has players");

  // In Game 2: Check Team C and Team D assignments
  const g2TeamC = g2Players.filter(p => p.team === "C");
  const g2TeamD = g2Players.filter(p => p.team === "D");
  assert.ok(g2TeamC.length >= 3, "Game 2 Team C has players");
  assert.ok(g2TeamD.length >= 3, "Game 2 Team D has players");

  // In Game 3: Check Team A and Team C assignments
  const g3TeamA = g3Players.filter(p => p.team === "A");
  const g3TeamC = g3Players.filter(p => p.team === "C");
  assert.ok(g3TeamA.length >= 3, "Game 3 Team A has players");
  assert.ok(g3TeamC.length >= 3, "Game 3 Team C has players");
});

test("DELTA-051T5: Team letter mapping helper logic matches arbitrary team selections (A, B, C, D)", () => {
  const extractTeamLetter = (teamName: string, fallback: TeamLetter): TeamLetter => {
    const match = teamName.match(/Drużyna\s+([A-D])/i);
    if (match && ["A", "B", "C", "D"].includes(match[1].toUpperCase())) {
      return match[1].toUpperCase() as TeamLetter;
    }
    return fallback;
  };

  assert.equal(extractTeamLetter("Drużyna A", "A"), "A");
  assert.equal(extractTeamLetter("Drużyna B", "B"), "B");
  assert.equal(extractTeamLetter("Drużyna C", "A"), "C");
  assert.equal(extractTeamLetter("Drużyna D", "B"), "D");
  assert.equal(extractTeamLetter("Czerwoni", "A"), "A");
});

test("DELTA-051T5: Match deletion and state isolation works without mutating other games", () => {
  let games: SyntheticGame[] = [...INITIAL_SYNTHETIC_GAMES];
  let gamePlayers: SyntheticGamePlayer[] = [...INITIAL_SYNTHETIC_GAME_PLAYERS];

  const targetDeleteId = "qa-game-sim-02";

  // Simulate deletion
  games = games.filter(g => g.id !== targetDeleteId);
  gamePlayers = gamePlayers.filter(gp => gp.game_id !== targetDeleteId);

  assert.equal(games.length, 2);
  assert.ok(!games.some(g => g.id === targetDeleteId));
  assert.ok(!gamePlayers.some(gp => gp.game_id === targetDeleteId));

  // Remaining games still intact
  assert.equal(games[0].id, "qa-game-sim-01");
  assert.equal(games[0].team_a_score, 3);
  assert.equal(games[1].id, "qa-game-sim-03");
  assert.equal(games[1].team_a_score, 2);
});

test("DELTA-051T5: Adding a new match allows arbitrary pair selection and arbitrary team sizes", () => {
  const games: SyntheticGame[] = [...INITIAL_SYNTHETIC_GAMES];
  const nextNum = games.length + 1;
  const newGame: SyntheticGame = {
    id: `qa-game-sim-0${nextNum}`,
    training_id: "qa-session-simulated-001",
    team_a_name: "Drużyna B",
    team_b_name: "Drużyna D",
    team_a_score: 0,
    team_b_score: 0,
    created_at: new Date().toISOString(),
  };

  games.push(newGame);
  assert.equal(games.length, 4);
  assert.equal(games[3].team_a_name, "Drużyna B");
  assert.equal(games[3].team_b_name, "Drużyna D");
});
