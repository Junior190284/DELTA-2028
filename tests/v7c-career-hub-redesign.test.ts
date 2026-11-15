import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7C Player Career Hub Premium Redesign — CSS gap elimination and responsive design", () => {
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");
  assert.ok(fs.existsSync(cssPath), "player-career-hub.css must exist");

  const css = fs.readFileSync(cssPath, "utf8");

  // Likwidacja pustej przestrzeni nad profilem (negative margin compensation)
  assert.ok(
    css.includes("margin: -36px auto 0 !important") || css.includes("margin-top: -36px"),
    "Must compensate hub-main padding with desktop negative top margin to eliminate gap"
  );
  assert.ok(
    css.includes("margin-top: -16px !important") || css.includes("margin-top: -16px"),
    "Must compensate mobile padding with negative top margin"
  );

  // Stadionowy styl, czerwono-złote oświetlenie
  assert.ok(
    css.includes("radial-gradient") && (css.includes("#f6c952") || css.includes("rgba(246, 201, 82")),
    "Must include crimson and gold ambient volumetric lighting"
  );

  // Przyklejony pasek zakładek (sticky header)
  assert.ok(
    css.includes("position: sticky") && css.includes("top: 60px"),
    "Must have sticky tab bar at top: 60px with blur backdrop"
  );
  assert.ok(css.includes("backdrop-filter: blur"), "Must have glassmorphism blur on sticky navigation");

  // Minimalne wymiary dotykowe (min 44px)
  assert.ok(
    css.includes("min-height: 44px") && css.includes("min-width: 44px"),
    "Must ensure interactive buttons meet min 44px accessibility touch target"
  );

  // Prefers-reduced-motion
  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "Must support prefers-reduced-motion"
  );

  // Breakpoints: 320px, 390px, 768px, 1440px, 1920px
  assert.ok(css.includes("@media (max-width: 480px)"), "Must support 390px / small mobile breakpoint");
  assert.ok(css.includes("@media (max-width: 360px)"), "Must support 320px ultra-compact mobile breakpoint");
  assert.ok(css.includes("@media (min-width: 1920px)"), "Must support 1920px wide desktop");
  assert.ok(css.includes("max-width: 1440px"), "Must support 1440px desktop container");
});

test("V7C Player Hero — Silhouette safety and Level calculation", () => {
  const photoPath = path.join(rootDir, "components/PlayerPhoto.tsx");
  const hubPath = path.join(rootDir, "components/player/PlayerCareerHub.tsx");

  const photoCode = fs.readFileSync(photoPath, "utf8");
  const hubCode = fs.readFileSync(hubPath, "utf8");

  // Wizerunek: neutralna sylwetka zamiast zdjęcia obcego dziecka
  assert.ok(
    photoCode.includes("NeutralPlayerSilhouette"),
    "PlayerPhoto must import NeutralPlayerSilhouette"
  );
  assert.ok(
    photoCode.includes("data-testid=\"player-photo-silhouette-fallback\""),
    "PlayerPhoto must render NeutralPlayerSilhouette when photo is unavailable"
  );
  assert.ok(
    photoCode.includes("shirtNumber={shirtNumber}"),
    "PlayerPhoto must forward shirtNumber to NeutralPlayerSilhouette"
  );

  // Obliczanie poziomu zawodnika z XP sportowego (frekwencja)
  assert.ok(
    hubCode.includes("Math.floor(individualAttendanceXp / 250) + 1"),
    "Level must be dynamically calculated: Math.floor(individualAttendanceXp / 250) + 1"
  );
  assert.ok(
    hubCode.includes("POZIOM {playerLevel}"),
    "Hero must display calculated player level"
  );
});

test("V7C 5 Core Sections Structure and Polish", () => {
  const hubCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerCareerHub.tsx"), "utf8");
  const timelineCode = fs.readFileSync(path.join(rootDir, "components/player/CareerTimeline.tsx"), "utf8");
  const cardsCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerInfernoCards.tsx"), "utf8");

  // 1. PRZEGLĄD (KPIs, Radar, 1-Click RSVP)
  assert.ok(hubCode.includes("v7b-kpi-grid"), "Overview must have KPI grid layout");
  assert.ok(hubCode.includes("v7b-overview-duo-grid"), "Overview must have duo grid layout");
  assert.ok(hubCode.includes("v7b-rsvp-buttons"), "Overview must have 1-Click RSVP widget buttons");
  assert.ok(hubCode.includes("PlayerSkillRadar"), "Overview must render PlayerSkillRadar");

  // 2. MOJA KARIERA (Timeline, milestones, empty state)
  assert.ok(timelineCode.includes("v7b-timeline-empty"), "CareerTimeline must include rich empty state");
  assert.ok(timelineCode.includes("v7b-timeline-filter-bar"), "CareerTimeline must have filter bar");
  assert.ok(timelineCode.includes("v7b-timeline-filter-btn"), "CareerTimeline must have filter buttons");

  // 3. STATYSTYKI (Brak fikcyjnych danych, Grassroots)
  assert.ok(hubCode.includes("v7b-stats-grid"), "Stats tab must have grid layout");
  assert.ok(hubCode.includes("v7b-stats-col-card"), "Stats tab must have clean statistical cards");
  assert.ok(hubCode.includes("ZASADY ROZWOJU MŁODEGO SPORTOWCA"), "Stats must feature Grassroots educational disclaimer");

  // 4. OSIĄGNIĘCIA (Badges, categories, progress)
  const achPath = path.join(rootDir, "components/AchievementsHub.tsx");
  const achCode = fs.readFileSync(achPath, "utf8");
  assert.ok(hubCode.includes("<AchievementsHub"), "CareerHub must render AchievementsHub in achievements tab");
  assert.ok(achCode.includes("v200-ach-category-tabs"), "Achievements must have category filter tabs");
  assert.ok(achCode.includes("v200-ach-banner"), "Achievements must have hero progress banner");

  // 5. MOJE KARTY (Card3DEngine modal inspection, rarity)
  assert.ok(cardsCode.includes("v7b-player-card-tile"), "Cards tab must render cards grid");
  assert.ok(cardsCode.includes("Card3DEngine"), "Cards tab must allow 3D inspection modal");
  assert.ok(cardsCode.includes("shirtNumber={player.shirt_number}"), "Cards tab must pass player shirtNumber to PlayerPhoto");
});
