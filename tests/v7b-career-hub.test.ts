import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7B Player Career Hub 2.0 — File structure and exports", () => {
  const hubPath = path.join(rootDir, "components/player/PlayerCareerHub.tsx");
  const timelinePath = path.join(rootDir, "components/player/CareerTimeline.tsx");
  const cardsPath = path.join(rootDir, "components/player/PlayerInfernoCards.tsx");
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");
  const myChildPath = path.join(rootDir, "components/MyChildCenter.tsx");

  assert.ok(fs.existsSync(hubPath), "PlayerCareerHub.tsx must exist");
  assert.ok(fs.existsSync(timelinePath), "CareerTimeline.tsx must exist");
  assert.ok(fs.existsSync(cardsPath), "PlayerInfernoCards.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "player-career-hub.css must exist");
  assert.ok(fs.existsSync(myChildPath), "MyChildCenter.tsx must exist");

  const hubCode = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubCode.includes("export function PlayerCareerHub"), "PlayerCareerHub must be exported");
  assert.ok(hubCode.includes("export default PlayerCareerHub"), "PlayerCareerHub must be default exported");
  assert.ok(hubCode.includes("export interface PlayerCareerHubProps"), "PlayerCareerHubProps must be exported");

  const timelineCode = fs.readFileSync(timelinePath, "utf8");
  assert.ok(timelineCode.includes("export function CareerTimeline"), "CareerTimeline must be exported");
  assert.ok(timelineCode.includes("export interface TimelineItem"), "TimelineItem must be exported");

  const cardsCode = fs.readFileSync(cardsPath, "utf8");
  assert.ok(cardsCode.includes("export function PlayerInfernoCards"), "PlayerInfernoCards must be exported");
  assert.ok(cardsCode.includes("export interface PlayerInfernoCardsProps"), "PlayerInfernoCardsProps must be exported");

  const myChildCode = fs.readFileSync(myChildPath, "utf8");
  assert.ok(myChildCode.includes("export { PlayerCareerHub }"), "MyChildCenter must re-export PlayerCareerHub");
});

test("V7B Player Hero 2.0 — Structure, sibling switcher and transparent XP", () => {
  const hubCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerCareerHub.tsx"), "utf8");

  // Awatar, numer, pozycja, herb
  assert.ok(hubCode.includes("PlayerPhoto"), "Hero must include PlayerPhoto");
  assert.ok(hubCode.includes("activeChild.shirt_number"), "Hero must display shirt number");
  assert.ok(hubCode.includes("activeChild.position"), "Hero must display position");
  assert.ok(hubCode.includes("/teamlogos/gm.png"), "Hero must display DELTA GM crest");

  // Transparentne rozróżnienie XP
  assert.ok(hubCode.includes("individualAttendanceXp"), "Must calculate individual attendance XP");
  assert.ok(hubCode.includes("presentTrainings * 40"), "Training presence must award 40 XP");
  assert.ok(hubCode.includes("presentMatches * 60"), "Match presence must award 60 XP");
  assert.ok(hubCode.includes("XP ZAWODNIKA"), "Must label individual XP distinctly");

  // Przełącznik rodzeństwa
  assert.ok(hubCode.includes("children.length > 1"), "Must support multi-child sibling switcher");
  assert.ok(hubCode.includes("setSelectedChildId(c.id)"), "Must allow switching active child");

  // Pamiątkowa karta A4
  assert.ok(hubCode.includes("handleDownloadPlayerCard"), "Must include commemorative A4 card generator");
});

test("V7B Navigation — 5 Canonical Tabs", () => {
  const hubCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerCareerHub.tsx"), "utf8");

  assert.ok(hubCode.includes('activeTab === "overview"'), "Must support PRZEGLĄD tab");
  assert.ok(hubCode.includes('activeTab === "career"'), "Must support MOJA KARIERA tab");
  assert.ok(hubCode.includes('activeTab === "stats"'), "Must support STATYSTYKI tab");
  assert.ok(hubCode.includes('activeTab === "achievements"'), "Must support OSIĄGNIĘCIA tab");
  assert.ok(hubCode.includes('activeTab === "cards"'), "Must support MOJE KARTY tab");

  assert.ok(hubCode.includes("PRZEGLĄD"), "Must label PRZEGLĄD");
  assert.ok(hubCode.includes("MOJA KARIERA"), "Must label MOJA KARIERA");
  assert.ok(hubCode.includes("STATYSTYKI"), "Must label STATYSTYKI");
  assert.ok(hubCode.includes("OSIĄGNIĘCIA"), "Must label OSIĄGNIĘCIA");
  assert.ok(hubCode.includes("MOJE KARTY"), "Must label MOJE KARTY");
});

test("V7B CareerTimeline — Chronological events, XP gains & filters", () => {
  const timelineCode = fs.readFileSync(path.join(rootDir, "components/player/CareerTimeline.tsx"), "utf8");

  // Filtry
  assert.ok(timelineCode.includes('activeFilter === "all"'), "Must have all filter");
  assert.ok(timelineCode.includes('activeFilter === "matches"'), "Must have matches filter");
  assert.ok(timelineCode.includes('activeFilter === "trainings"'), "Must have trainings filter");
  assert.ok(timelineCode.includes('activeFilter === "achievements"'), "Must have achievements filter");

  // Typy zdarzeń i XP
  assert.ok(timelineCode.includes('xpEarned: 40'), "Training presence must grant 40 XP");
  assert.ok(timelineCode.includes('xpEarned: 60'), "Match participation must grant 60 XP");
  assert.ok(timelineCode.includes("milestone-debut"), "Must record debut milestone");
  assert.ok(timelineCode.includes("milestone-first-goal"), "Must record first goal milestone");

  // Sortowanie
  assert.ok(timelineCode.includes("b.date.localeCompare(a.date)"), "Must sort chronological events newest first");
});

test("V7B Stats & Grassroots Pedagogical Principles", () => {
  const hubCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerCareerHub.tsx"), "utf8");

  // Podział na mecze ligowe i treningi
  assert.ok(hubCode.includes("MECZE OFICJALNE MZPN"), "Must have official matches section");
  assert.ok(hubCode.includes("TRENING I ROZWÓJ"), "Must have separate training development section");

  // Pedagogiczna klauzula Grassroots
  assert.ok(hubCode.includes("ZASADY ROZWOJU MŁODEGO SPORTOWCA (GRASSROOTS)"), "Must include Grassroots section header");
  assert.ok(hubCode.includes("brak negatywnej selekcji") || hubCode.includes("nie prowadzimy negatywnej selekcji"), "Must state no negative selection");
  assert.ok(hubCode.includes("motywacyjny"), "Must emphasize motivational nature of statistics for 8-year-olds");
});

test("V7B PlayerInfernoCards — Ownership check & 3D inspection", () => {
  const cardsCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerInfernoCards.tsx"), "utf8");

  // Sprawdzanie własności
  assert.ok(cardsCode.includes("ownedMap.has(card.id)"), "Must verify ownership against user_cards");
  assert.ok(cardsCode.includes("W TWOIM ALBUMIE"), "Must show W TWOIM ALBUMIE for owned cards");
  assert.ok(cardsCode.includes("DO ZDOBYCIA"), "Must show DO ZDOBYCIA for locked cards");

  // 3D Engine
  assert.ok(cardsCode.includes("Card3DEngine"), "Must integrate Card3DEngine");
  assert.ok(cardsCode.includes("fromProductionCard"), "Must use fromProductionCard adapter");
  assert.ok(cardsCode.includes("autoRotate"), "Must support 360 degree rotation");
  assert.ok(cardsCode.includes("isFlipped"), "Must support card flipping");
});

test("V7B Empty State — Graceful handling of unlinked parent accounts", () => {
  const hubCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerCareerHub.tsx"), "utf8");

  assert.ok(hubCode.includes("!children.length || !activeChild"), "Must check for empty children array");
  assert.ok(hubCode.includes("Administrator lub trener nie przypisał jeszcze zawodnika"), "Must instruct user to contact coach/admin");
});
