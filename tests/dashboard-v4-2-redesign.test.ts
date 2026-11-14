import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const componentPath = path.join(
  rootDir,
  "components/dashboard/DeltaCinematicDashboard.tsx"
);
const cssPath = path.join(rootDir, "styles/delta-tokens.css");

test("V4.2 Dashboard — Shortened Cinematic Stadium Banner", () => {
  const code = fs.readFileSync(componentPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  // CSS padding shortened
  assert.ok(
    css.includes(".delta-stadium-header-box"),
    "Defines .delta-stadium-header-box"
  );
  assert.ok(
    css.includes("padding: 12px 18px"),
    "Shortens padding of stadium header box from 24px+ to compact 12px 18px"
  );

  // Crest size shortened to compact 46px
  assert.ok(
    code.includes('width: "46px", height: "46px"'),
    "Compact 46px crest with glowing border"
  );

  // Retains cinematic DELTA 2018 GM, Górny Mokotów, Sezon 2026/27
  assert.ok(code.includes("DELTA 2018 GM"), "Retains DELTA 2018 GM");
  assert.ok(code.includes("Górny Mokotów"), "Retains Górny Mokotów badge");
  assert.ok(code.includes("Sezon 2026/27"), "Retains Sezon 2026/27 badge");
  assert.ok(code.includes("ZOBACZ INTRO"), "Retains ZOBACZ INTRO button");
});

test("V4.2 Dashboard — Compact Match Empty State with Action", () => {
  const code = fs.readFileSync(componentPath, "utf8");

  // Verifies compact empty state instead of gigantic empty container
  assert.ok(
    code.includes("Brak zaplanowanych meczów ligowych"),
    "Features clean empty state title"
  );
  assert.ok(
    code.includes("TERMINARZ & WYNIKI"),
    "Provides direct actionable button to schedule & results"
  );
  assert.ok(
    code.includes("PRZERWA W ROZGRYWKACH"),
    "Displays status badge for league break"
  );
});

test("V4.2 Dashboard — High-Density Hero Command Grid (Match + Vault + Missions)", () => {
  const code = fs.readFileSync(componentPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  // Asymmetric hero grid
  assert.ok(
    css.includes(".delta-dashboard-hero-grid"),
    "CSS defines .delta-dashboard-hero-grid"
  );
  assert.ok(
    code.includes("delta-dashboard-hero-grid"),
    "Dashboard uses delta-dashboard-hero-grid to place match, vault, and missions high"
  );

  // Vault high on screen
  assert.ok(
    code.includes("KOLEKCJA INFERNO 3D"),
    "INFERNO 3D Vault card placed high in hero sidecar"
  );
  assert.ok(
    code.includes("OTWÓRZ PACZKĘ"),
    "Direct OTWÓRZ PACZKĘ CTA placed high in sidecar"
  );
  assert.ok(
    code.includes("ZAKRĘĆ KOŁEM"),
    "Direct ZAKRĘĆ KOŁEM CTA placed high in sidecar"
  );

  // Missions high on screen
  assert.ok(
    code.includes("PROFIL & MISJE DNIA"),
    "Profile & Daily Missions placed high in hero sidecar"
  );
});

test("V4.2 Dashboard — Instant Unopened Packs Quick Pill on Mobile & Desktop", () => {
  const code = fs.readFileSync(componentPath, "utf8");

  // Mobile unopened packs pill
  assert.ok(
    code.includes("{unopenedPacks} PACZEK"),
    "Mobile & desktop gamer bars display instant unopened packs badge"
  );
});

test("V4.2 Dashboard — Gaming Aesthetic Cards & Touch Targets", () => {
  const code = fs.readFileSync(componentPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.ok(
    css.includes(".delta-gaming-card"),
    "CSS defines .delta-gaming-card with gaming border highlights and shadows"
  );
  assert.ok(
    code.includes("delta-gaming-card"),
    "Applies delta-gaming-card across match, action tiles, vault, and news"
  );
  assert.ok(
    code.includes("touchTarget={true}"),
    "Enforces min 44x44px touch targets on interactive buttons"
  );
});

test("V4.2 Dashboard — Parent View & Zero Mock Data", () => {
  const code = fs.readFileSync(componentPath, "utf8");

  // Attendance for parent
  assert.ok(
    code.includes("childAttendanceStatus"),
    "Maintains clear attendance indicator for parents"
  );
  assert.ok(
    code.includes("POTWIERDŹ OBECNOŚĆ") || code.includes("ZMIEŃ OBECNOŚĆ"),
    "Maintains prominent attendance confirmation button"
  );

  // Zero fake data - uses real props & real endpoints
  assert.ok(code.includes("/api/game/missions?userId="), "Real missions API");
  assert.ok(code.includes("/api/game/notifications?userId="), "Real rewards API");
});
