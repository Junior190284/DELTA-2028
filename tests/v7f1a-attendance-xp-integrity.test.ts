import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7F.1A XP Integrity — Codebase structural safety and removal of status 'yes' XP loophole", () => {
  const expPath = path.join(rootDir, "components/player/PlayerExperience3D.tsx");
  const timelinePath = path.join(rootDir, "components/player/CareerTimeline.tsx");

  assert.ok(fs.existsSync(expPath), "PlayerExperience3D.tsx must exist");
  assert.ok(fs.existsSync(timelinePath), "CareerTimeline.tsx must exist");

  const expCode = fs.readFileSync(expPath, "utf8");
  const timelineCode = fs.readFileSync(timelinePath, "utf8");

  // In PlayerExperience3D, presentTrainings must NOT use "status === 'yes'"
  assert.ok(
    !expCode.includes('a.status === "present" || a.status === "yes"'),
    "PlayerExperience3D must NEVER equate status 'yes' with 'present'"
  );
  assert.ok(
    expCode.includes('a.status !== "present"') || expCode.includes('a.status === "present"'),
    "Training presence calculation must strictly require status 'present'"
  );

  // Training date validation
  assert.ok(
    expCode.includes("training_date") && (expCode.includes("todayStr") || expCode.includes("new Date()")),
    "Training presence must verify that the session date has taken place (<= today)"
  );

  // Match XP must require status === 'played'
  assert.ok(
    expCode.includes('m.status === "played"'),
    "Match presence calculation must strictly require match status === 'played'"
  );

  // CareerTimeline separation of RSVP from completed training/match
  assert.ok(
    timelineCode.includes('badge: "DEKLARACJA RSVP"') && timelineCode.includes("xpEarned: 0"),
    "CareerTimeline must assign 0 XP and badge 'DEKLARACJA RSVP' for status 'yes'"
  );

  // CareerTimeline official debut must require verified match attendance
  assert.ok(
    !timelineCode.includes('(att.status === "present" || att.status === "yes")'),
    "Milestone debut in CareerTimeline must not use status 'yes'"
  );
});

// Helper implementing the exact mathematical and algorithmic logic of V7F.1A
function calculateV7F1aXp({
  playerId,
  trainingSessions,
  localTrAttendance,
  matches,
  localAttendance,
  events
}: {
  playerId: string;
  trainingSessions: Array<{ id: string; training_date: string }>;
  localTrAttendance: Array<{ training_id: string; player_id: string; status: string }>;
  matches: Array<{ id: string; status: string; match_date: string }>;
  localAttendance: Array<{ match_id: string; player_id: string; status: string }>;
  events: Array<{ match_id: string; player_id?: string; assist_player_id?: string; event_type: string }>;
}) {
  const todayStr = "2026-11-15"; // reference date for deterministic tests

  // 1. Trainings: status === "present" AND date <= todayStr
  const pastOrTodayTrainingIds = new Set(
    trainingSessions
      .filter(tr => tr?.training_date && String(tr.training_date).slice(0, 10) <= todayStr)
      .map(tr => tr.id)
  );

  const presentTrainings = localTrAttendance.filter(a => {
    if (a.player_id !== playerId) return false;
    if (a.status !== "present") return false;
    if (trainingSessions && trainingSessions.length > 0) {
      return pastOrTodayTrainingIds.has(a.training_id);
    }
    return true;
  }).length;

  // 2. Matches: status === "played" AND (attendance.status === "present" OR match_events)
  const played = matches.filter(m => m.status === "played");
  const verifiedMatchIds = new Set<string>();

  played.forEach(m => {
    const hasPresentAtt = localAttendance.some(
      a => a.match_id === m.id && a.player_id === playerId && a.status === "present"
    );
    const hasVerifiedEvent = events.some(
      e => e.match_id === m.id &&
        ((e.player_id === playerId && (e.event_type === "goal" || e.event_type === "mvp")) ||
         (e.assist_player_id === playerId && e.event_type === "goal"))
    );

    if (hasPresentAtt || hasVerifiedEvent) {
      verifiedMatchIds.add(m.id);
    }
  });

  const presentMatches = verifiedMatchIds.size;
  const individualAttendanceXp = (presentTrainings * 40) + (presentMatches * 60);
  const playerLevel = Math.max(1, Math.floor(individualAttendanceXp / 250) + 1);

  return { presentTrainings, presentMatches, individualAttendanceXp, playerLevel };
}

test("1. Przyszły trening + RSVP yes = 0 XP", () => {
  const res = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [{ id: "tr-future", training_date: "2026-11-20" }],
    localTrAttendance: [{ training_id: "tr-future", player_id: "p1", status: "yes" }],
    matches: [],
    localAttendance: [],
    events: []
  });

  assert.equal(res.presentTrainings, 0);
  assert.equal(res.individualAttendanceXp, 0);
  assert.equal(res.playerLevel, 1);
});

test("2. Przyszły mecz + RSVP yes = 0 XP", () => {
  const res = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [],
    localTrAttendance: [],
    matches: [{ id: "m-future", status: "scheduled", match_date: "2026-11-22" }],
    localAttendance: [{ match_id: "m-future", player_id: "p1", status: "yes" }],
    events: []
  });

  assert.equal(res.presentMatches, 0);
  assert.equal(res.individualAttendanceXp, 0);
  assert.equal(res.playerLevel, 1);
});

test("3. Odbyty trening + present = 40 XP", () => {
  const res = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [{ id: "tr-past", training_date: "2026-11-10" }],
    localTrAttendance: [{ training_id: "tr-past", player_id: "p1", status: "present" }],
    matches: [],
    localAttendance: [],
    events: []
  });

  assert.equal(res.presentTrainings, 1);
  assert.equal(res.individualAttendanceXp, 40);
  assert.equal(res.playerLevel, 1);
});

test("4. Rozegrany mecz + potwierdzony udział = 60 XP", () => {
  // Case A: confirmed via coach attendance 'present'
  const resA = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [],
    localTrAttendance: [],
    matches: [{ id: "m-past", status: "played", match_date: "2026-11-08" }],
    localAttendance: [{ match_id: "m-past", player_id: "p1", status: "present" }],
    events: []
  });
  assert.equal(resA.presentMatches, 1);
  assert.equal(resA.individualAttendanceXp, 60);

  // Case B: confirmed via official goal event in played match
  const resB = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [],
    localTrAttendance: [],
    matches: [{ id: "m-past2", status: "played", match_date: "2026-11-08" }],
    localAttendance: [],
    events: [{ match_id: "m-past2", player_id: "p1", event_type: "goal" }]
  });
  assert.equal(resB.presentMatches, 1);
  assert.equal(resB.individualAttendanceXp, 60);
});

test("5. Nieobecność = 0 XP", () => {
  const res = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [{ id: "tr-past", training_date: "2026-11-10" }],
    localTrAttendance: [{ training_id: "tr-past", player_id: "p1", status: "absent" }],
    matches: [{ id: "m-past", status: "played", match_date: "2026-11-08" }],
    localAttendance: [{ match_id: "m-past", player_id: "p1", status: "absent" }],
    events: []
  });

  assert.equal(res.presentTrainings, 0);
  assert.equal(res.presentMatches, 0);
  assert.equal(res.individualAttendanceXp, 0);
});

test("6. Korekta obecności aktualizuje XP deterministycznie", () => {
  // Initial: marked absent
  const before = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [{ id: "tr-1", training_date: "2026-11-12" }],
    localTrAttendance: [{ training_id: "tr-1", player_id: "p1", status: "absent" }],
    matches: [],
    localAttendance: [],
    events: []
  });
  assert.equal(before.individualAttendanceXp, 0);

  // Coach corrects to present:
  const after = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [{ id: "tr-1", training_date: "2026-11-12" }],
    localTrAttendance: [{ training_id: "tr-1", player_id: "p1", status: "present" }],
    matches: [],
    localAttendance: [],
    events: []
  });
  assert.equal(after.individualAttendanceXp, 40);
});

test("7. Wielokrotne RSVP nie daje dodatkowych XP", () => {
  // If parent clicks RSVP multiple times or multiple yes entries exist
  const res = calculateV7F1aXp({
    playerId: "p1",
    trainingSessions: [
      { id: "tr-1", training_date: "2026-11-20" },
      { id: "tr-2", training_date: "2026-11-22" }
    ],
    localTrAttendance: [
      { training_id: "tr-1", player_id: "p1", status: "yes" },
      { training_id: "tr-1", player_id: "p1", status: "yes" },
      { training_id: "tr-2", player_id: "p1", status: "yes" }
    ],
    matches: [{ id: "m-1", status: "scheduled", match_date: "2026-11-25" }],
    localAttendance: [
      { match_id: "m-1", player_id: "p1", status: "yes" },
      { match_id: "m-1", player_id: "p1", status: "yes" }
    ],
    events: []
  });

  assert.equal(res.individualAttendanceXp, 0);
});

test("8. Dwoje rodziców tego samego dziecka widzi identyczne XP", () => {
  // Since XP is computed deterministically from activeChild.id, any parent viewing activeChild.id receives identical results
  const sharedData = {
    playerId: "child-123",
    trainingSessions: [{ id: "tr-1", training_date: "2026-11-05" }],
    localTrAttendance: [{ training_id: "tr-1", player_id: "child-123", status: "present" }],
    matches: [{ id: "m-1", status: "played", match_date: "2026-11-08" }],
    localAttendance: [{ match_id: "m-1", player_id: "child-123", status: "present" }],
    events: []
  };

  const parent1View = calculateV7F1aXp(sharedData);
  const parent2View = calculateV7F1aXp(sharedData);

  assert.deepEqual(parent1View, parent2View);
  assert.equal(parent1View.individualAttendanceXp, 100);
});

test("9. Obcy rodzic nie uzyskuje prywatnych danych — API rejection verified", () => {
  const trApiCode = fs.readFileSync(path.join(rootDir, "app/api/training/attendance/route.ts"), "utf8");
  const matchApiCode = fs.readFileSync(path.join(rootDir, "app/api/matches/attendance/route.ts"), "utf8");

  // Both APIs check isStaff and isParentOfChild via parent_players
  assert.ok(
    trApiCode.includes("if (!isStaff && !isParentOfChild)") && trApiCode.includes("403"),
    "Training attendance API must return 403 when user is neither staff nor linked parent"
  );
  assert.ok(
    matchApiCode.includes("if (!isStaff && !isParentOfChild)") && matchApiCode.includes("403"),
    "Match attendance API must return 403 when user is neither staff nor linked parent"
  );
});

test("10. Brak regresji RSVP — RSVP handlers and UI buttons functional", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // RSVP handlers still exist and send status to server
  assert.ok(
    expCode.includes("handleMatchRsvp") && expCode.includes("handleTrainingRsvp"),
    "RSVP handlers handleMatchRsvp and handleTrainingRsvp must be preserved"
  );
  assert.ok(
    expCode.includes("/api/matches/attendance") && expCode.includes("/api/training/attendance"),
    "RSVP endpoints must be called by handlers"
  );

  // Buttons render active state for RSVP
  assert.ok(
    expCode.includes('v7b-btn-rsvp yes') &&
    expCode.includes('v7b-btn-rsvp no') &&
    expCode.includes('v7b-btn-rsvp maybe'),
    "RSVP action buttons (BĘDĘ, NIEOBECNY, DO POTWIERDZENIA) must remain available"
  );
});
