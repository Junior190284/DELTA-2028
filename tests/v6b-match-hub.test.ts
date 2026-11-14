import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V6B Match Hub 2.0 — File structure and interface exports", () => {
  const componentPath = path.join(rootDir, "components/matches/DeltaMatchHub20.tsx");
  assert.ok(fs.existsSync(componentPath), "DeltaMatchHub20.tsx must exist");

  const code = fs.readFileSync(componentPath, "utf8");
  assert.ok(code.includes("export default function DeltaMatchHub20"), "Must default export DeltaMatchHub20");
  assert.ok(code.includes("export interface DeltaMatchHub20Props"), "Must export DeltaMatchHub20Props");
  assert.ok(code.includes("export interface Match"), "Must export Match interface");
  assert.ok(code.includes("export interface Player"), "Must export Player interface");
  assert.ok(code.includes("export interface Attendance"), "Must export Attendance interface");
  assert.ok(code.includes("export interface Lineup"), "Must export Lineup interface");
  assert.ok(code.includes("export interface Event"), "Must export Event interface");
});

test("V6B Match Hub 2.0 — TeamHub integration", () => {
  const teamHubPath = path.join(rootDir, "components/TeamHub.tsx");
  const code = fs.readFileSync(teamHubPath, "utf8");

  assert.ok(
    code.includes('import DeltaMatchHub20 from "./matches/DeltaMatchHub20";'),
    "TeamHub must import DeltaMatchHub20"
  );
  assert.ok(
    code.includes('{tab==="matches"&&<DeltaMatchHub20'),
    "TeamHub must render DeltaMatchHub20 when tab === 'matches'"
  );
  assert.ok(
    code.includes("onSetAttendance={setParentAttendance}"),
    "TeamHub must pass onSetAttendance to DeltaMatchHub20"
  );
  assert.ok(
    code.includes("onSwitchToTraining={()=>setTab(\"training\")} limit" ) ||
    code.includes("onSwitchToTraining={()=>setTab(\"training\")}"),
    "TeamHub must pass onSwitchToTraining callback"
  );
});

test("V6B Match Hero — Kick-off, real crests, Google Maps navigation, zero fake call time", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/matches/DeltaMatchHub20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("getTeamLogo"), "Must use getTeamLogo for real team crests");
  assert.ok(code.includes("formatTeamName"), "Must format team names cleanly");
  assert.ok(code.includes("google.com/maps/search/?api=1&query="), "Must offer 1-click Google Maps navigation");
  assert.ok(code.includes("formatFullDatePL"), "Must format match dates in Polish");
  assert.ok(code.includes("KOLEJKA"), "Must display league round number");

  // Zero fabricated fake call times
  assert.ok(
    !code.includes("09:15") && !code.includes("Zbiórka 09:15"),
    "Must NOT invent hardcoded or fake call times"
  );
});

test("V6B Parent RSVP — Scoped to parent's children, thumb-friendly buttons (min 44px)", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/matches/DeltaMatchHub20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("isParent"), "Must check parent role status");
  assert.ok(code.includes("parentPlayers"), "Must filter children to parentPlayerIds");
  assert.ok(code.includes("min-h-[44px]"), "RSVP buttons must have min 44px touch targets for mobile");
  assert.ok(code.includes("BĘDĘ"), "Must include BĘDĘ (yes) button");
  assert.ok(code.includes("NIE MOGĘ"), "Must include NIE MOGĘ (no) button");
  assert.ok(code.includes("NIEPEWNY"), "Must include NIEPEWNY (maybe) button");
  assert.ok(code.includes("handleParentRsvp"), "Must handle 1-click RSVP with optimistic updates");
});

test("V6B Empty State — Elegant pause state, zero fake matches", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/matches/DeltaMatchHub20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("PAUZA LIGOWA • DELTA 2018 GM"), "Must display league pause banner in empty state");
  assert.ok(code.includes("Mecze w trakcie ustalania"), "Must inform matches are being scheduled");
  assert.ok(code.includes("onSwitchToTraining"), "Must offer quick CTA to view trainings");
});

test("V6B Section Breakdown & Statistics — Schedule, Results, Stats & Form", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/matches/DeltaMatchHub20.tsx"),
    "utf8"
  );

  // Tabs
  assert.ok(code.includes('setActiveTab("upcoming")'), "Must support upcoming tab");
  assert.ok(code.includes('setActiveTab("results")'), "Must support results tab");
  assert.ok(code.includes('setActiveTab("stats")'), "Must support stats tab");
  assert.ok(code.includes('setActiveTab("all")'), "Must support all timeline tab");

  // Outcomes
  assert.ok(code.includes("ZWYCIĘSTWO"), "Must display victory badge for Delta wins");
  assert.ok(code.includes("REMIS"), "Must display draw badge");
  assert.ok(code.includes("PORAŻKA"), "Must display loss badge");

  // Goals and MVP
  assert.ok(code.includes("matchGoals"), "Must extract goalscorers from events");
  assert.ok(code.includes("mvpPlayer"), "Must display MVP badge when present in events");
  assert.ok(code.includes("topScorers"), "Must calculate top scorers from events");
  assert.ok(code.includes("teamStats.form"), "Must calculate team form streak (W/R/P)");
});
