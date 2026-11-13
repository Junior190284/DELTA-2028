/**
 * DELTA INFERNO 2.0 — NAVIGATION & LAYOUT TEST SUITE (ETAP V3)
 * Tests the 4-pillar navigation architecture, role-based visibility,
 * touch targets (min 44px), safe-area insets, and preservation of all 16 tabs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getNavigationSections,
  mapTabToSection,
  getSectionSubtabs,
  type DeltaTabId,
  type DeltaPrimarySectionId,
} from "../components/navigation/DeltaNavigationConfig.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("V3 Navigation Config — Cztery główne sekcje (Pulpit, Drużyna, Kolekcja, Więcej)", () => {
  const sections = getNavigationSections({
    role: "parent",
    isParent: true,
    staff: false,
    isAdmin: false,
  });

  assert.equal(sections.length, 4, "Nawigacja musi posiadać dokładnie 4 główne filary");
  assert.equal(sections[0].id, "home", "Sekcja 1 to Pulpit (home)");
  assert.equal(sections[1].id, "team", "Sekcja 2 to Drużyna (team)");
  assert.equal(sections[2].id, "collection", "Sekcja 3 to Kolekcja (collection)");
  assert.equal(sections[3].id, "more", "Sekcja 4 to Więcej (more)");

  assert.equal(sections[0].label, "PULPIT");
  assert.equal(sections[1].label, "DRUŻYNA");
  assert.equal(sections[2].label, "KOLEKCJA");
  assert.equal(sections[3].label, "WIĘCEJ");
});

test("V3 Navigation Config — Wszystkie 16 istniejących modułów jest zachowanych", () => {
  const all16Tabs: DeltaTabId[] = [
    "home",
    "teamcenter",
    "mychild",
    "matchday",
    "matches",
    "calendar",
    "training",
    "players",
    "stats",
    "hall",
    "achievements",
    "chronicle",
    "news",
    "club",
    "league",
    "collection",
  ];

  // Każda z 16 zakładek musi mapować się do poprawnej sekcji
  all16Tabs.forEach((tab) => {
    const section = mapTabToSection(tab);
    assert.ok(
      ["home", "team", "collection", "more"].includes(section),
      `Zakładka '${tab}' musi być przypisana do jednej z 4 sekcji (zwrócono: ${section})`
    );
  });

  // Weryfikacja przypisań
  assert.equal(mapTabToSection("home"), "home");
  assert.equal(mapTabToSection("teamcenter"), "home");
  assert.equal(mapTabToSection("mychild"), "home");

  assert.equal(mapTabToSection("matches"), "team");
  assert.equal(mapTabToSection("training"), "team");
  assert.equal(mapTabToSection("players"), "team");
  assert.equal(mapTabToSection("league"), "team");
  assert.equal(mapTabToSection("calendar"), "team");
  assert.equal(mapTabToSection("stats"), "team");
  assert.equal(mapTabToSection("matchday"), "team");

  assert.equal(mapTabToSection("collection"), "collection");
  assert.equal(mapTabToSection("achievements"), "collection");
  assert.equal(mapTabToSection("hall"), "collection");
  assert.equal(mapTabToSection("chronicle"), "collection");

  assert.equal(mapTabToSection("news"), "more");
  assert.equal(mapTabToSection("club"), "more");
});

test("V3 Role Authorization — Kontrola widoczności zakładek dla ról", () => {
  // 1. Rodzic: widzi 'mychild', nie widzi 'matchday'
  const parentSections = getNavigationSections({
    role: "parent",
    isParent: true,
    staff: false,
    isAdmin: false,
  });
  const parentHomeItems = parentSections.find((s) => s.id === "home")?.items || [];
  const parentTeamItems = parentSections.find((s) => s.id === "team")?.items || [];

  assert.ok(
    parentHomeItems.some((item) => item.id === "mychild"),
    "Rodzic musi widzieć 'Moje Dziecko' w sekcji Pulpit"
  );
  assert.equal(
    parentTeamItems.some((item) => item.id === "matchday"),
    false,
    "Rodzic NIE MOŻE widzieć panelu 'Match Day LIVE'"
  );

  // 2. Trener / Staff: widzi 'matchday', nie widzi 'mychild' jeśli nie jest rodzicem
  const coachSections = getNavigationSections({
    role: "coach",
    isParent: false,
    staff: true,
    isAdmin: false,
  });
  const coachHomeItems = coachSections.find((s) => s.id === "home")?.items || [];
  const coachTeamItems = coachSections.find((s) => s.id === "team")?.items || [];

  assert.equal(
    coachHomeItems.some((item) => item.id === "mychild"),
    false,
    "Trener bez dzieci nie widzi 'Moje Dziecko'"
  );
  assert.ok(
    coachTeamItems.some((item) => item.id === "matchday"),
    "Trener musi widzieć 'Match Day LIVE' w sekcji Drużyna"
  );
});

test("V3 Subnav Pills — Bezpośrednie przełączanie podstron bez wielopoziomowych szuflad", () => {
  const teamSubtabs = getSectionSubtabs("team", { staff: true, isParent: false });
  assert.ok(teamSubtabs.length >= 6, "Sekcja Drużyna musi udostępniać bezpośrednie pigułki podstron");
  assert.ok(teamSubtabs.some((t) => t.id === "matches"), "Zawiera Mecze");
  assert.ok(teamSubtabs.some((t) => t.id === "training"), "Zawiera Treningi");
  assert.ok(teamSubtabs.some((t) => t.id === "players"), "Zawiera Skład");
  assert.ok(teamSubtabs.some((t) => t.id === "league"), "Zawiera Tabelę");

  const collectionSubtabs = getSectionSubtabs("collection", {});
  assert.ok(collectionSubtabs.length >= 4, "Sekcja Kolekcja zawiera klaser, trofea, legendy, kronikę");
});

test("V3 DeltaBottomNav — Wymusza min-h-[44px], safe-area i 4 ikony", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/navigation/DeltaBottomNav.tsx"),
    "utf-8"
  );

  assert.ok(code.includes("grid-cols-4"), "Bottom nav musi mieć dokładnie 4 kolumny");
  assert.ok(code.includes("min-h-[44px]"), "Wymusza minimalną wysokość touch target 44px");
  assert.ok(code.includes("min-w-[44px]"), "Wymusza minimalną szerokość touch target 44px");
  assert.ok(
    code.includes("env(safe-area-inset-bottom"),
    "Obsługuje wcięcie safe-area na iOS/Android"
  );
  assert.ok(code.includes("Pulpit"), "Zawiera etykietę Pulpit");
  assert.ok(code.includes("Drużyna"), "Zawiera etykietę Drużyna");
  assert.ok(code.includes("Kolekcja"), "Zawiera etykietę Kolekcja");
  assert.ok(code.includes("Więcej"), "Zawiera etykietę Więcej");
  assert.ok(code.includes("overflow-hidden"), "Chroni przed horyzontalnym overflow");
});

test("V3 DeltaSidebar — Zwijany pasek boczny z 4 sekcjami, intro i panelem admina", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/navigation/DeltaSidebar.tsx"),
    "utf-8"
  );

  assert.ok(code.includes("isCollapsed"), "Obsługuje stan zwinięcia (isCollapsed)");
  assert.ok(code.includes("onToggleCollapse"), "Obsługuje przełącznik zwijania");
  assert.ok(code.includes("ZOBACZ INTRO"), "Zawiera przycisk ZOBACZ INTRO");
  assert.ok(code.includes("PANEL ADMINA"), "Zawiera skrót PANEL ADMINA dla uprawnionych");
});

test("V3 DeltaAppShell — Łączy sidebar, bottom nav, topbar i subnav pills", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/navigation/DeltaAppShell.tsx"),
    "utf-8"
  );

  assert.ok(code.includes("DeltaSidebar"), "Integruje DeltaSidebar");
  assert.ok(code.includes("DeltaBottomNav"), "Integruje DeltaBottomNav");
  assert.ok(code.includes("showSubnavPills"), "Renderuje pasek pigułek podstron (showSubnavPills)");
  assert.ok(code.includes("weeklysummary"), "Udostępnia otwarcie podsumowania tygodnia");
});

test("V3 TeamHub — Integracja DeltaAppShell, deep linking i historia przeglądarki", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/TeamHub.tsx"),
    "utf-8"
  );

  assert.ok(code.includes("<DeltaAppShell"), "TeamHub renderuje DeltaAppShell");
  assert.ok(
    code.includes("handleSelectTab"),
    "TeamHub obsługuje ujednolicone przełączanie zakładek handleSelectTab"
  );
  assert.ok(
    code.includes("window.addEventListener(\"hashchange\""),
    "Obsługuje zdarzenie hashchange dla deep linking"
  );
  assert.ok(
    code.includes("window.addEventListener(\"popstate\""),
    "Obsługuje przyciski Wstecz/Dalej przeglądarki (popstate)"
  );
  assert.ok(
    code.includes("window.history.pushState"),
    "Synchronizuje historię przeglądarki bez przeładowania strony"
  );

  // Weryfikacja obecności wszystkich 16 modułów
  assert.ok(code.includes('tab==="home"'), "Moduł home obecny");
  assert.ok(code.includes('tab==="matches"'), "Moduł matches obecny");
  assert.ok(code.includes('tab==="training"'), "Moduł training obecny");
  assert.ok(code.includes('tab==="players"'), "Moduł players obecny");
  assert.ok(code.includes('tab==="collection"'), "Moduł collection obecny");
  assert.ok(code.includes('tab==="league"'), "Moduł league obecny");
  assert.ok(code.includes('tab==="calendar"'), "Moduł calendar obecny");
  assert.ok(code.includes('tab==="stats"'), "Moduł stats obecny");
  assert.ok(code.includes('tab==="mychild"'), "Moduł mychild obecny");
  assert.ok(code.includes('tab==="matchday"'), "Moduł matchday obecny");
  assert.ok(code.includes('tab==="achievements"'), "Moduł achievements obecny");
  assert.ok(code.includes('tab==="hall"'), "Moduł hall obecny");
  assert.ok(code.includes('tab==="chronicle"'), "Moduł chronicle obecny");
  assert.ok(code.includes('tab==="news"'), "Moduł news obecny");
  assert.ok(code.includes('tab==="club"'), "Moduł club obecny");
  assert.ok(code.includes('tab==="teamcenter"'), "Moduł teamcenter obecny");
});
