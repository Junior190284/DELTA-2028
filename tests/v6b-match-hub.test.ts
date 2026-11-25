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

test("V6B.1 Polish — Compact Header (~35-40% height reduction) and tighter vertical rhythm", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/matches/DeltaMatchHub20.tsx"),
    "utf8"
  );

  // Compact padding
  assert.ok(
    code.includes("p-3.5 sm:p-4 md:p-5"),
    "Header uses compact padding p-3.5 sm:p-4 md:p-5 for ~38% height reduction"
  );
  // Preserved stadium colors & gradients
  assert.ok(
    code.includes("from-[#141824] via-[#0d1017] to-[#07090d]"),
    "Header preserves dark stadium gradient"
  );
  assert.ok(
    code.includes("bg-[radial-gradient(circle_at_50%_0%,#dc2626_0%,transparent_60%)]"),
    "Header preserves red ambient stadium lighting"
  );
  assert.ok(
    code.includes("bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500"),
    "Header preserves gold trophy gradient typography"
  );
  // Tighter bottom margins
  assert.ok(
    code.includes("mb-3.5 sm:mb-4"),
    "Header and hero use compact mb-3.5 sm:mb-4 to bring schedule and results higher"
  );
});

test("V6B.1 Polish — Compact Empty State (~70% height reduction)", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/matches/DeltaMatchHub20.tsx"),
    "utf8"
  );

  // Horizontal layout & compact padding
  assert.ok(
    code.includes("flex-col sm:flex-row sm:items-center justify-between"),
    "Empty state uses horizontal layout on larger screens"
  );
  assert.ok(
    code.includes("w-10 h-10 rounded-xl"),
    "Empty state uses compact 40px icon box"
  );
});

test("V6B.1 Global PWA — Multi-session suppression, 7-day postpone, safe positioning, menu install", () => {
  const pwaCode = fs.readFileSync(
    path.join(rootDir, "components/DeltaPWAInstallPrompt.tsx"),
    "utf8"
  );
  const moreMenuCode = fs.readFileSync(
    path.join(rootDir, "components/DeltaMoreMenuSheet.tsx"),
    "utf8"
  );

  // Session suppression
  assert.ok(
    pwaCode.includes("delta_pwa_shown_session"),
    "PWA prompt prevents multiple appearances per session using delta_pwa_shown_session"
  );
  assert.ok(
    pwaCode.includes("delta_pwa_dismissed_session"),
    "PWA prompt checks session dismissal"
  );

  // 7-day postpone
  assert.ok(
    pwaCode.includes("delta_pwa_dismissed_until"),
    "PWA prompt respects 7-day postpone timestamp"
  );
  assert.ok(
    pwaCode.includes("7 * 24 * 60 * 60 * 1000"),
    "PWA prompt calculates 7 days"
  );

  // Safe positioning above bottom navigation
  assert.ok(
    pwaCode.includes("bottom-[84px]"),
    "PWA prompt uses safe area bottom-[84px] above bottom nav"
  );

  // Manual trigger from menu
  assert.ok(
    pwaCode.includes("delta_trigger_pwa_install"),
    "PWA prompt listens for manual delta_trigger_pwa_install custom event"
  );
  assert.ok(
    moreMenuCode.includes("delta_trigger_pwa_install"),
    "More menu dispatches delta_trigger_pwa_install custom event"
  );
  assert.ok(
    moreMenuCode.includes("ZAINSTALUJ APLIKACJĘ (PWA)"),
    "More menu provides direct manual install action"
  );
});
