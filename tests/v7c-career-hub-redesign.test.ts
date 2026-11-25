import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7C Player Career Hub Premium Redesign — CSS gap elimination and responsive design", () => {
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");
  assert.ok(fs.existsSync(cssPath), "player-career-hub.css must exist");

  const css = fs.readFileSync(cssPath, "utf8");

  // Likwidacja pustej przestrzeni nad profilem (przyczyna usunięta u źródła, bez ujemnych marginesów)
  assert.ok(
    css.includes("margin: 0 auto !important"),
    "Must enforce clean margin: 0 auto !important without negative margin masking"
  );
  assert.ok(
    !css.includes("margin: -36px"),
    "Must NOT use negative margin hacks on container"
  );

  // Stadionowy styl, czerwono-złote oświetlenie via pseudo-element
  assert.ok(
    css.includes(".v7b-hero-card::before") && css.includes("radial-gradient"),
    "Must use ::before pseudo-element for hero volumetric lighting to prevent layout flow distortion"
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

test("V7C Player Hero — Silhouette safety, Level, and 3D Card Preview", () => {
  const photoPath = path.join(rootDir, "components/PlayerPhoto.tsx");
  const hubPath = fs.existsSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"))
    ? path.join(rootDir, "components/player/PlayerExperience3D.tsx")
    : path.join(rootDir, "components/player/PlayerCareerHub.tsx");

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

  // Podgląd karty INFERNO 3D w Hero i przycisk otwierający inspekcję 3D
  assert.ok(
    hubCode.includes("v7c-hero-3d-preview-box"),
    "Hero must feature an INFERNO 3D card preview box"
  );
  assert.ok(
    hubCode.includes("v7c-btn-inspect-3d") && hubCode.includes("PODGLĄD KARTY"),
    "Hero must include button with 'PODGLĄD KARTY' fallback for unowned cards"
  );
  assert.ok(
    hubCode.includes("Card3DEngine"),
    "Hero must support 3D inspection modal via Card3DEngine"
  );
});

test("V7C 5 Core Sections, 4-Stat Panel, Radar Fallback, and Next Objective", () => {
  const hubFile = fs.existsSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"))
    ? path.join(rootDir, "components/player/PlayerExperience3D.tsx")
    : path.join(rootDir, "components/player/PlayerCareerHub.tsx");
  const hubCode = fs.readFileSync(hubFile, "utf8");
  const timelineCode = fs.readFileSync(path.join(rootDir, "components/player/CareerTimeline.tsx"), "utf8");
  const cardsCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerInfernoCards.tsx"), "utf8");

  // 1. PANEL 4 STATYSTYK BEZPOŚREDNIO POD HERO (Mecze, Treningi, Gole, Asysty)
  assert.ok(hubCode.includes("v7c-quick-stats-strip"), "Must render 4-stat panel directly under hero");
  assert.ok(hubCode.includes("MECZE LIGOWE") || hubCode.includes("MECZE"), "Panel must include matches");
  assert.ok(hubCode.includes("TRENINGI"), "Panel must include trainings");
  assert.ok(hubCode.includes("BRAMKI") || hubCode.includes("GOLE"), "Panel must include goals");
  assert.ok(hubCode.includes("ASYSTY"), "Panel must include assists");

  // 2. PRZEGLĄD (Skills Radar z fallbackiem "Brak oceny umiejętności", Następny cel, 1-Click RSVP)
  assert.ok(hubCode.includes("v7b-overview-duo-grid"), "Overview must have duo grid layout");
  assert.ok(hubCode.includes("Brak oceny umiejętności"), "Skills section must show friendly empty state when no stats exist");
  assert.ok(hubCode.includes("PlayerSkillRadar"), "Overview must render PlayerSkillRadar when stats exist");
  assert.ok(hubCode.includes("v7c-next-goal-panel") && hubCode.includes("NASTĘPNY CEL ROZWOJOWY"), "Overview must render next objective widget");
  assert.ok(hubCode.includes("calculatePlayerAchievements"), "Next objective must be derived from calculatePlayerAchievements");
  assert.ok(hubCode.includes("v7b-rsvp-buttons"), "Overview must have 1-Click RSVP widget buttons");

  // 3. MOJA KARIERA (Timeline, milestones, empty state)
  assert.ok(timelineCode.includes("v7b-timeline-empty"), "CareerTimeline must include rich empty state");
  assert.ok(timelineCode.includes("v7b-timeline-filter-bar"), "CareerTimeline must have filter bar");
  assert.ok(timelineCode.includes("v7b-timeline-filter-btn"), "CareerTimeline must have filter buttons");

  // 4. STATYSTYKI (Brak fikcyjnych danych, Grassroots)
  assert.ok(hubCode.includes("v7b-stats-grid"), "Stats tab must have grid layout");
  assert.ok(hubCode.includes("v7b-stats-col-card"), "Stats tab must have clean statistical cards");
  assert.ok(hubCode.includes("ZASADY ROZWOJU MŁODEGO SPORTOWCA"), "Stats must feature Grassroots educational disclaimer");

  // 5. OSIĄGNIĘCIA (Badges, categories, progress)
  const achPath = path.join(rootDir, "components/AchievementsHub.tsx");
  const achCode = fs.readFileSync(achPath, "utf8");
  assert.ok(hubCode.includes("<AchievementsHub"), "CareerHub must render AchievementsHub in achievements tab");
  assert.ok(achCode.includes("v200-ach-category-tabs"), "Achievements must have category filter tabs");
  assert.ok(achCode.includes("v200-ach-banner"), "Achievements must have hero progress banner");

  // 6. MOJE KARTY (Card3DEngine modal inspection, rarity)
  assert.ok(cardsCode.includes("v7b-player-card-tile"), "Cards tab must render cards grid");
  assert.ok(cardsCode.includes("Card3DEngine"), "Cards tab must allow 3D inspection modal");
  assert.ok(cardsCode.includes("shirtNumber={player.shirt_number}"), "Cards tab must pass player shirtNumber to PlayerPhoto");
});
