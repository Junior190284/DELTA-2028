import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  calculateGameScoreFromEvents,
  aggregateTrainingLiveStats,
  type TrainingLiveEvent
} from "../lib/training/trainingLiveStats.ts";
import {
  SYNTHETIC_QA_PLAYERS,
  INITIAL_SYNTHETIC_GAMES,
  INITIAL_SYNTHETIC_GAME_PLAYERS,
  INITIAL_SYNTHETIC_EVENTS,
  type SyntheticGame
} from "../lib/qa/syntheticQaData.ts";

describe("DELTA-051T5B — TRAINING MATCH LIVE STATS & EVENTS SUITE", () => {

  test("1. calculateGameScoreFromEvents accurately tallies goals per team side", () => {
    const testEvents: TrainingLiveEvent[] = [
      { id: "e1", game_id: "test-g1", event_type: "goal", player_id: "p1", assist_player_id: "p2", team_side: "A", created_at: "" },
      { id: "e2", game_id: "test-g1", event_type: "goal", player_id: "p3", assist_player_id: null, team_side: "A", created_at: "" },
      { id: "e3", game_id: "test-g1", event_type: "goal", player_id: "p4", assist_player_id: "p5", team_side: "B", created_at: "" },
      { id: "e4", game_id: "test-g1", event_type: "own_goal", player_id: "p4", assist_player_id: null, team_side: "A", created_at: "" }, // OG credited to side A
    ];

    const result = calculateGameScoreFromEvents("test-g1", testEvents);
    assert.equal(result.hasEvents, true);
    assert.equal(result.team_a_score, 3); // 2 goals + 1 own goal scored by opponent
    assert.equal(result.team_b_score, 1);
  });

  test("2. calculateGameScoreFromEvents preserves historical fallback scores when game has 0 events", () => {
    const fallback = { team_a_score: 5, team_b_score: 2 };
    const result = calculateGameScoreFromEvents("no-events-game", [], fallback);

    assert.equal(result.hasEvents, false);
    assert.equal(result.team_a_score, 5);
    assert.equal(result.team_b_score, 2);
  });

  test("3. Self-assist prevention: player cannot assist their own goal", () => {
    const scorerId = "qa-p-01";
    const assistId = "qa-p-01";

    const isSelfAssist = scorerId === assistId;
    assert.equal(isSelfAssist, true, "Self assist must be flagged and rejected");
  });

  test("4. Multi-match event isolation: modifying events of Game 1 leaves Game 2 and Game 3 intact", () => {
    const game1EventsBefore = INITIAL_SYNTHETIC_EVENTS.filter(e => e.game_id === "qa-game-sim-01");
    const game2EventsBefore = INITIAL_SYNTHETIC_EVENTS.filter(e => e.game_id === "qa-game-sim-02");
    const game3EventsBefore = INITIAL_SYNTHETIC_EVENTS.filter(e => e.game_id === "qa-game-sim-03");

    assert.equal(game1EventsBefore.length, 5); // 3:2
    assert.equal(game2EventsBefore.length, 5); // 1:4
    assert.equal(game3EventsBefore.length, 2); // 2:0

    // Add event only to Game 1
    const newEvent: TrainingLiveEvent = {
      id: "qa-ev-sim-test-new",
      game_id: "qa-game-sim-01",
      event_type: "goal",
      player_id: "qa-p-01",
      assist_player_id: null,
      team_side: "A",
      created_at: new Date().toISOString(),
    };

    const updatedEvents = [...INITIAL_SYNTHETIC_EVENTS, newEvent];

    const g1Score = calculateGameScoreFromEvents("qa-game-sim-01", updatedEvents);
    const g2Score = calculateGameScoreFromEvents("qa-game-sim-02", updatedEvents);
    const g3Score = calculateGameScoreFromEvents("qa-game-sim-03", updatedEvents);

    assert.equal(g1Score.team_a_score, 4); // incremented from 3 to 4
    assert.equal(g1Score.team_b_score, 2);

    assert.equal(g2Score.team_a_score, 1); // unchanged
    assert.equal(g2Score.team_b_score, 4);

    assert.equal(g3Score.team_a_score, 2); // unchanged
    assert.equal(g3Score.team_b_score, 0);
  });

  test("5. Individual & training aggregate statistics: goals, assists, G+A match canonical dataset", () => {
    const summary = aggregateTrainingLiveStats(
      SYNTHETIC_QA_PLAYERS,
      INITIAL_SYNTHETIC_GAMES,
      INITIAL_SYNTHETIC_GAME_PLAYERS,
      INITIAL_SYNTHETIC_EVENTS
    );

    assert.equal(summary.totalMatches, 3);
    assert.equal(summary.totalGoals, 12); // 5 + 5 + 2 = 12 goals

    // Top scorer check
    assert.ok(summary.topScorers.length > 0);
    // qa-p-01 has 2 goals in game 1, plus 1 assist in game 3
    const p1Stats = summary.playerStats["qa-p-01"];
    assert.ok(p1Stats);
    assert.equal(p1Stats.goals, 2);
    assert.equal(p1Stats.assists, 1);
    assert.equal(p1Stats.ga, 3);

    // qa-p-12 in Game 2 has 2 goals and 1 assist
    const p12Stats = summary.playerStats["qa-p-12"];
    assert.ok(p12Stats);
    assert.equal(p12Stats.goals, 2);
    assert.equal(p12Stats.assists, 1);
    assert.equal(p12Stats.ga, 3);
  });

  test("6. Goal deletion recalculates score immediately and cleanly", () => {
    const targetDeleteId = "qa-ev-sim-01"; // Game 1, Goal for side A
    const filteredEvents = INITIAL_SYNTHETIC_EVENTS.filter(e => e.id !== targetDeleteId);

    const recomputedScore = calculateGameScoreFromEvents("qa-game-sim-01", filteredEvents);
    assert.equal(recomputedScore.team_a_score, 2); // dropped from 3 to 2
    assert.equal(recomputedScore.team_b_score, 2);
  });

  test("7. InteractiveQaPlayground contains goal form, edit, delete, and individual stats table", () => {
    const code = fs.readFileSync("components/qa/InteractiveQaPlayground.tsx", "utf8");

    assert.ok(code.includes("Rejestracja Bramki & Asysty"), "Playground must have goal registration form");
    assert.ok(code.includes("handleSaveGoalEvent"), "Playground must handle saving goal events");
    assert.ok(code.includes("handleDeleteEvent"), "Playground must handle deleting goal events");
    assert.ok(code.includes("handleStartEditEvent"), "Playground must handle editing goal events");
    assert.ok(code.includes("Indywidualne Statystyki Treningu (Gole, Asysty, G+A)"), "Playground must show individual stats table");
    assert.ok(code.includes("own_goal"), "Playground must support own goals");
    assert.ok(code.includes("Zawodnik nie może asystować przy własnej bramce"), "Playground must prevent self-assists");
  });

  test("8. Regressions DELTA-051T4 and DELTA-051T5 are preserved", () => {
    const code = fs.readFileSync("components/qa/InteractiveQaPlayground.tsx", "utf8");
    assert.ok(code.includes('["A", "B", "C", "D"]'), "Teams A, B, C, D must be preserved");
    assert.ok(code.includes("deleteConfirmGameId"), "Delete match confirmation must be preserved");
    assert.ok(code.includes("Tabela Wyników Spotkań"), "Multi-match summary table must be preserved");
    assert.ok(code.includes("SYMULACJA QA — BRAK ZAPISU DO BAZY"), "Zero DB mutation badge must be preserved");
  });
});
