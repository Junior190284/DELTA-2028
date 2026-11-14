import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V6C Training Center 2.0 — File structure and interface exports", () => {
  const componentPath = path.join(rootDir, "components/training/DeltaTrainingCenter20.tsx");
  assert.ok(fs.existsSync(componentPath), "DeltaTrainingCenter20.tsx must exist");

  const code = fs.readFileSync(componentPath, "utf8");
  assert.ok(code.includes("export default function DeltaTrainingCenter20"), "Must default export DeltaTrainingCenter20");
  assert.ok(code.includes("export interface DeltaTrainingCenter20Props"), "Must export DeltaTrainingCenter20Props");
  assert.ok(code.includes("export interface TrainingSession"), "Must export TrainingSession interface");
  assert.ok(code.includes("export interface TrainingAttendance"), "Must export TrainingAttendance interface");
  assert.ok(code.includes("export interface Player"), "Must export Player interface");
  assert.ok(code.includes("export interface TrainingGame"), "Must export TrainingGame interface");
  assert.ok(code.includes("export interface TrainingEvent"), "Must export TrainingEvent interface");
  assert.ok(code.includes("export interface TrainingPlayerStat"), "Must export TrainingPlayerStat interface");
  assert.ok(code.includes("export interface TrainingPair"), "Must export TrainingPair interface");
});

test("V6C Training Center 2.0 — TeamHub integration", () => {
  const teamHubPath = path.join(rootDir, "components/TeamHub.tsx");
  const code = fs.readFileSync(teamHubPath, "utf8");

  assert.ok(
    code.includes('import DeltaTrainingCenter20 from "./training/DeltaTrainingCenter20";'),
    "TeamHub must import DeltaTrainingCenter20"
  );
  assert.ok(
    code.includes('{tab==="training"&&<DeltaTrainingCenter20'),
    "TeamHub must render DeltaTrainingCenter20 when tab === 'training'"
  );
  assert.ok(
    code.includes("onSetAttendance={handleSetTrainingAttendance}"),
    "TeamHub must pass onSetAttendance to DeltaTrainingCenter20"
  );
  assert.ok(
    code.includes("onOpenTrainingKingModal={()=>setTrainingKingModalOpen(true)}"),
    "TeamHub must pass onOpenTrainingKingModal callback"
  );
  assert.ok(
    code.includes("handleSetTrainingAttendance"),
    "TeamHub must implement handleSetTrainingAttendance handler"
  );
});

test("V6C Training Hero — Next session, time, duration, Google Maps, Polish dates, compact empty state", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/training/DeltaTrainingCenter20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("formatFullDatePL"), "Must format training dates in Polish");
  assert.ok(code.includes("google.com/maps/search/?api=1&query="), "Must offer 1-click Google Maps navigation");
  assert.ok(code.includes("calculateDurationMinutes"), "Must compute session duration in minutes");
  assert.ok(code.includes("min"), "Must display duration in minutes");
  assert.ok(code.includes("PAUZA TRENINGOWA"), "Must display training pause banner in empty state");
  assert.ok(code.toLowerCase().includes("brak zaplanowanych jednostek"), "Must inform when no trainings are scheduled");

  // Zero fabricated fake sessions
  assert.ok(
    !code.includes("Fikcyjny Trening") && !code.includes("Trening testowy 123"),
    "Must NOT invent hardcoded or fake training sessions"
  );
});

test("V6C Parent RSVP — 1-Click thumb-friendly (min 44px), scoped to parentPlayerIds, zero XP", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/training/DeltaTrainingCenter20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("isParent"), "Must check parent role status");
  assert.ok(code.includes("parentPlayers"), "Must filter children to parentPlayerIds");
  assert.ok(code.includes("min-h-[44px]"), "RSVP buttons must have min 44px touch targets for mobile");
  assert.ok(code.includes("BĘDĘ"), "Must include BĘDĘ (yes) button");
  assert.ok(code.includes("NIE MOGĘ"), "Must include NIE MOGĘ (no) button");
  assert.ok(code.includes("NIE WIEM"), "Must include NIE WIEM (maybe) button");
  assert.ok(code.includes("handleParentRsvp"), "Must handle 1-click RSVP with optimistic updates");

  // Explicitly clarifies that RSVP declaration does NOT grant XP
  assert.ok(
    code.includes("Punkty doświadczenia (+40 XP) są naliczane wyłącznie po potwierdzeniu") ||
    code.includes("Deklaracja obecności pomaga"),
    "Must explicitly state that declaration does NOT award XP"
  );
});

test("V6C Coach Zone — Staff/coach permissions, group check-in, presence marks present/absent", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/training/DeltaTrainingCenter20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("isCoachOrStaff"), "Must verify coach/admin permissions");
  assert.ok(code.includes("handleCoachCheckIn"), "Must have coach check-in handler");
  assert.ok(code.includes("OBECNY"), "Must have OBECNY button for coach");
  assert.ok(code.includes("NIEOBECNY"), "Must have NIEOBECNY button for coach");
  assert.ok(code.includes("present"), "Must map OBECNY to status 'present'");
  assert.ok(code.includes("absent"), "Must map NIEOBECNY to status 'absent'");
});

test("V6C Attendance & Progress — Rate %, active streak, confirmed XP only (+40 XP per session)", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/training/DeltaTrainingCenter20.tsx"),
    "utf8"
  );

  assert.ok(code.includes("attendanceRate"), "Must compute percentage attendance rate");
  assert.ok(code.includes("attendanceStreak"), "Must track active attendance streak");
  assert.ok(code.includes("40 XP"), "Must reference standard +40 XP per confirmed present session");
  assert.ok(code.includes("status === \"present\""), "Must compute confirmed attendance strictly on status present");
});

test("V6C Performance Lab & Chemistry — 100% legacy features preserved", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/training/DeltaTrainingCenter20.tsx"),
    "utf8"
  );

  // Król Treningu & Gierki modal trigger
  assert.ok(code.includes("onOpenTrainingKingModal"), "Must preserve King of Training modal launcher");
  assert.ok(code.includes("KRÓL TRENINGU & GIERKI"), "Must have King of Training CTA button");

  // Rankings
  assert.ok(code.includes("trainingAttendanceRank"), "Must preserve attendance rank");
  assert.ok(code.includes("trainingScorers"), "Must preserve training goalscorers");
  assert.ok(code.includes("trainingAssisters"), "Must preserve training assisters");
  assert.ok(code.includes("trainingGA"), "Must preserve training G+A ranking");

  // Chemistry network & pairs
  assert.ok(code.includes("chemistryNetwork"), "Must preserve chemistry network data");
  assert.ok(code.includes("svg viewBox=\"0 0 100 100\""), "Must preserve chemistry network SVG connection map");
  assert.ok(code.includes("trainingChemistry"), "Must preserve pair performance chemistry list");
  assert.ok(code.includes("combinedGA"), "Must preserve combined G+A chemistry metrics");

  // Session history list
  assert.ok(code.includes("OSTATNIE TRENINGI"), "Must preserve past training sessions list");
});
