import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDashboardUI4Model } from "../components/dashboard/ui4/adapter.ts";
import type { DashboardUI4AdapterInput } from "../components/dashboard/ui4/types.ts";
import { RoadToGloryDashboard } from "../components/dashboard/ui4/road-to-glory/road-to-glory-dashboard.tsx";

const root = process.cwd();
const rtgComponentSource = fs.readFileSync(
  path.join(root, "components/dashboard/ui4/road-to-glory/road-to-glory-dashboard.tsx"),
  "utf8"
);
const realDataPageSource = fs.readFileSync(
  path.join(root, "app/preview/dashboard-ui4/real-data/page.tsx"),
  "utf8"
);

test("DELTA-044G: RoadToGloryDashboard contains zero hardcoded fake demo numbers", () => {
  for (const fake of ["2 450", "2450", "17 / 25", "24 / 36", "Centrum Treningowe · Boisko Demo", "player_red_uniform_transparent"]) {
    assert.ok(!rtgComponentSource.includes(fake), `Found forbidden hardcoded demo literal: ${fake}`);
  }
  assert.match(rtgComponentSource, /DeltaDesktopSidebar/);
  assert.match(rtgComponentSource, /DeltaMobileBottomNav/);
  assert.match(rtgComponentSource, /subscribeCardEvents/);
  assert.match(rtgComponentSource, /DeltaCard/);
});

test("DELTA-044G: real-data route preserves auth guard and keeps ?view=home intact", () => {
  assert.match(realDataPageSource, /isGenuineLocalEnvironment/);
  assert.match(realDataPageSource, /result\.actor\.isAuthenticated/);
  assert.match(realDataPageSource, /view === "road-to-glory"/);
  assert.match(realDataPageSource, /<HomeDashboard model=\{result\.model\} \/>/);
  assert.match(realDataPageSource, /<CollectionDashboard model=\{result\.model\} \/>/);
});

test("DELTA-044G: renders empty and unavailable states cleanly without synthetic fallback in real-data mode", () => {
  const emptyInput: DashboardUI4AdapterInput = {
    profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" },
    teamName: "DELTA 2018",
    access: {
      canViewCollection: true,
      canViewAchievements: true,
      canViewTeamShowcase: true,
      canViewClubCommunications: true,
    },
    players: [],
    nextMatch: null,
    gameProfile: null,
    sportsXp: null,
    userCards: [],
    achievements: [],
    news: [],
  };

  const emptyModel = createDashboardUI4Model(emptyInput);
  const html = renderToStaticMarkup(
    React.createElement(RoadToGloryDashboard, { model: emptyModel, mode: "real-data", activeChildId: null })
  );

  assert.match(html, /Dostęp do paszportu zawodnika ograniczony|Brak powiązanego zawodnika/);
  assert.match(html, /Brak zaplanowanych wydarzeń/);
  assert.match(html, /Brak odblokowanych osiągnięć/);
  assert.match(html, /Album jest jeszcze pusty/);
  assert.match(html, /Brak nowych komunikatów klubowych/);
  assert.doesNotMatch(html, /Zawodnik Demo|2 450|POZIOM 12|DRUŻYNA RYWALA/);
});

test("DELTA-044G: strict sibling isolation and PII protection between Child 1 and Child 2", () => {
  const child1Input: DashboardUI4AdapterInput = {
    profile: { id: "parent-uuid-1", role: "parent", display_name: ["rodzic", "test.invalid"].join("@") },
    teamName: "DELTA 2018",
    access: {
      canViewCollection: true,
      canViewAchievements: true,
      canViewTeamShowcase: true,
      canViewClubCommunications: true,
    },
    parentPlayerIds: ["child-1-uuid"],
    players: [{ id: "child-1-uuid", display_name: "Zawodnik Jeden", shirt_number: 10, position: "Napastnik", active: true }],
    sportsXp: {
      sportsXp: 320,
      playerLevel: 4,
      currentLvlXp: 70,
      neededLvlXp: 150,
      progressPercent: 47,
      presentTrainings: 8,
      presentMatches: 2,
      attendanceRatePercent: 88,
      stadiumTierTitle: "Baza Treningowa",
    },
    achievements: [{ id: "ach-1", name: "Pierwszy Trening", icon: "Trophy", isUnlocked: true }],
  };

  const child2Input: DashboardUI4AdapterInput = {
    ...child1Input,
    parentPlayerIds: ["child-2-uuid"],
    players: [{ id: "child-2-uuid", display_name: "Zawodnik Dwa", shirt_number: 4, position: "Obrońca", active: true }],
    sportsXp: {
      sportsXp: 80,
      playerLevel: 1,
      currentLvlXp: 80,
      neededLvlXp: 100,
      progressPercent: 80,
      presentTrainings: 2,
      presentMatches: 0,
      attendanceRatePercent: 50,
      stadiumTierTitle: "Start Akademii",
    },
    achievements: [],
  };

  const htmlChild1 = renderToStaticMarkup(
    React.createElement(RoadToGloryDashboard, {
      model: createDashboardUI4Model(child1Input),
      mode: "real-data",
      activeChildId: "child-1-uuid",
    })
  );
  const htmlChild2 = renderToStaticMarkup(
    React.createElement(RoadToGloryDashboard, {
      model: createDashboardUI4Model(child2Input),
      mode: "real-data",
      activeChildId: "child-2-uuid",
    })
  );

  // Child 1 markers present in Child 1, absent in Child 2
  assert.match(htmlChild1, /Zawodnik Jeden/);
  assert.match(htmlChild1, /#10/);
  assert.match(htmlChild1, /POZIOM 4/);
  assert.doesNotMatch(htmlChild2, /Zawodnik Jeden|#10|POZIOM 4|Pierwszy Trening/);

  // Child 2 markers present in Child 2
  assert.match(htmlChild2, /Zawodnik Dwa/);
  assert.match(htmlChild2, /#4/);
  assert.match(htmlChild2, /POZIOM 1/);
  assert.match(htmlChild2, /Frekwencja 50%/);

  // PII protection: email must never leak into rendered UI
  assert.doesNotMatch(htmlChild1, /rodzic@tajny\.pl/);
  assert.doesNotMatch(htmlChild2, /rodzic@tajny\.pl/);
});
