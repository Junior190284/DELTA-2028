/**
 * DELTA INFERNO 2.0 — DESIGN FOUNDATION TEST SUITE (ETAP V2)
 * Tests for design tokens, touch targets, CSS containment, and foundational UI components
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DELTA_COLORS, DELTA_LAYOUT } from "../lib/ui/tokens.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("V2 Design Tokens — Paleta barw i wymiary ergonomiczne", () => {
  // Weryfikacja kolorów bazowych
  assert.equal(DELTA_COLORS.canvas, "#07080b", "Główne tło stadionu powinno wynosić #07080b");
  assert.equal(DELTA_COLORS.crimson.primary, "#dc2626", "Klubowa czerwień powinna wynosić #dc2626");
  assert.equal(DELTA_COLORS.gold.primary, "#f59e0b", "Złoto ekonomii i DP powinno wynosić #f59e0b");
  assert.equal(DELTA_COLORS.text.primary, "#f8fafc", "Wysoki kontrast tekstu głównego #f8fafc");

  // Wymiary touch-target WCAG 2.1
  assert.ok(DELTA_LAYOUT.touchMinPx >= 44, "Touch target minimum musi wynosić co najmniej 44px");
  assert.equal(DELTA_LAYOUT.touchOptimalPx, 48, "Optymalny touch target dla dzieci to 48px");
});

test("V2 CSS Tokens — Plik delta-tokens.css zawiera komplet zmiennych", () => {
  const cssPath = path.join(rootDir, "styles/delta-tokens.css");
  assert.ok(fs.existsSync(cssPath), "styles/delta-tokens.css musi istnieć");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.ok(css.includes("--delta-bg-canvas: #07080b;"), "delta-tokens.css zawiera --delta-bg-canvas");
  assert.ok(css.includes("--delta-crimson-primary: #dc2626;"), "delta-tokens.css zawiera czerwień klubową");
  assert.ok(css.includes("--delta-gold-primary: #f59e0b;"), "delta-tokens.css zawiera złoto nagród");
  assert.ok(css.includes("--delta-touch-min: 44px;"), "delta-tokens.css definiuje --delta-touch-min 44px");
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "delta-tokens.css wspiera prefers-reduced-motion");
  assert.ok(css.includes(".delta-touch-target"), "delta-tokens.css definiuje klasę pomocniczą .delta-touch-target");
});

test("V2 Root Layout — Importuje delta-tokens.css", () => {
  const layoutPath = path.join(rootDir, "app/layout.tsx");
  const layoutCode = fs.readFileSync(layoutPath, "utf-8");
  assert.ok(
    layoutCode.includes(`import "../styles/delta-tokens.css";`),
    "app/layout.tsx musi importować styles/delta-tokens.css"
  );
});

test("V2 DeltaButton — Wymusza min-h-[44px] i obsługuje a11y", () => {
  const btnPath = path.join(rootDir, "components/ui/DeltaButton.tsx");
  assert.ok(fs.existsSync(btnPath), "DeltaButton.tsx musi istnieć");
  const btnCode = fs.readFileSync(btnPath, "utf-8");

  assert.ok(btnCode.includes("min-h-[44px]"), "DeltaButton musi wymuszać min-h-[44px]");
  assert.ok(btnCode.includes("min-w-[44px]"), "DeltaButton musi wymuszać min-w-[44px]");
  assert.ok(btnCode.includes("aria-busy"), "DeltaButton musi obsługiwać aria-busy");
  assert.ok(btnCode.includes("variantStyles"), "DeltaButton definiuje system wariantów");
});

test("V2 DeltaCard — Obsługuje warianty, ramki i interaktywność", () => {
  const cardPath = path.join(rootDir, "components/ui/DeltaCard.tsx");
  assert.ok(fs.existsSync(cardPath), "DeltaCard.tsx musi istnieć");
  const cardCode = fs.readFileSync(cardPath, "utf-8");

  assert.ok(cardCode.includes("rounded-2xl"), "DeltaCard używa rounded-2xl");
  assert.ok(cardCode.includes(`role={isInteractive ? "button" : undefined}`), "DeltaCard interactive nadaje rolę button");
  assert.ok(cardCode.includes(`tabIndex={isInteractive ? 0 : undefined}`), "DeltaCard interactive wspiera nawigację klawiaturą");
});

test("V2 DeltaBadge — Warianty statusów i pulsujący wskaźnik live", () => {
  const badgePath = path.join(rootDir, "components/ui/DeltaBadge.tsx");
  assert.ok(fs.existsSync(badgePath), "DeltaBadge.tsx musi istnieć");
  const badgeCode = fs.readFileSync(badgePath, "utf-8");

  assert.ok(badgeCode.includes("animate-ping"), "DeltaBadge obsługuje pulsujący dot live");
  assert.ok(badgeCode.includes("variantStyles"), "DeltaBadge posiada system wariantów kolorystycznych");
});

test("V2 DeltaSkeleton — Efekt shimmer bez zewnętrznych bibliotek", () => {
  const skelPath = path.join(rootDir, "components/ui/DeltaSkeleton.tsx");
  assert.ok(fs.existsSync(skelPath), "DeltaSkeleton.tsx musi istnieć");
  const skelCode = fs.readFileSync(skelPath, "utf-8");

  assert.ok(skelCode.includes("animate-[shimmer"), "DeltaSkeleton posiada animację shimmer");
  assert.ok(skelCode.includes("variantStyles"), "DeltaSkeleton definiuje warianty");
});

test("V2 DeltaEmptyState — Pusty stan z tytułem, opisem i akcją", () => {
  const emptyPath = path.join(rootDir, "components/ui/DeltaEmptyState.tsx");
  assert.ok(fs.existsSync(emptyPath), "DeltaEmptyState.tsx musi istnieć");
  const emptyCode = fs.readFileSync(emptyPath, "utf-8");

  assert.ok(emptyCode.includes("title"), "DeltaEmptyState przyjmuje title");
  assert.ok(emptyCode.includes("DeltaButton"), "DeltaEmptyState korzysta z DeltaButton");
});

test("V2 DeltaSectionHeader — Standaryzowane nagłówki sekcji", () => {
  const headerPath = path.join(rootDir, "components/ui/DeltaSectionHeader.tsx");
  assert.ok(fs.existsSync(headerPath), "DeltaSectionHeader.tsx musi istnieć");
  const headerCode = fs.readFileSync(headerPath, "utf-8");

  assert.ok(headerCode.includes("kicker"), "DeltaSectionHeader obsługuje kicker");
  assert.ok(headerCode.includes("h2"), "DeltaSectionHeader renderuje semantyczny nagłówek h2");
});

test("V2 Barrel Export — components/ui/index.ts eksportuje wszystkie komponenty", () => {
  const indexPath = path.join(rootDir, "components/ui/index.ts");
  assert.ok(fs.existsSync(indexPath), "components/ui/index.ts musi istnieć");
  const indexCode = fs.readFileSync(indexPath, "utf-8");

  assert.ok(indexCode.includes("DeltaButton"), "Eksportuje DeltaButton");
  assert.ok(indexCode.includes("DeltaCard"), "Eksportuje DeltaCard");
  assert.ok(indexCode.includes("DeltaBadge"), "Eksportuje DeltaBadge");
  assert.ok(indexCode.includes("DeltaSkeleton"), "Eksportuje DeltaSkeleton");
  assert.ok(indexCode.includes("DeltaEmptyState"), "Eksportuje DeltaEmptyState");
  assert.ok(indexCode.includes("DeltaSectionHeader"), "Eksportuje DeltaSectionHeader");
});

test("V2 TeamHub — Brak automatycznego blokowania intro wideo na starcie", () => {
  const teamHubPath = path.join(rootDir, "components/TeamHub.tsx");
  const teamHubCode = fs.readFileSync(teamHubPath, "utf-8");

  // Upewnij się, że nie ma useEffect z setCinematicActive(true) na starcie
  const hasAutoPlayIntro = /useEffect\s*\(\s*\(\)\s*=>\s*\{\s*setCinematicActive\s*\(\s*true\s*\)\s*;\s*\}\s*,\s*\[\s*\]\s*\)/.test(teamHubCode);
  assert.equal(hasAutoPlayIntro, false, "TeamHub NIE MOŻE automatycznie uruchamiać intro wideo w useEffect([])");

  // Upewnij się, że zachowano ręczne uruchamianie intro
  assert.ok(teamHubCode.includes("setCinematicActive(true)"), "TeamHub musi zachować ręczne uruchamianie intro wideo przez przyciski");
});

test("V2 Globals CSS & Containment — Ochrona przed horyzontalnym overflow", () => {
  const globalsCss = fs.readFileSync(path.join(rootDir, "app/globals.css"), "utf-8");

  assert.ok(globalsCss.includes("overflow-x: hidden;"), "globals.css zawiera overflow-x: hidden dla html i body");
  assert.ok(globalsCss.includes(".login-public-back"), "globals.css zawiera ergonomiczny przycisk .login-public-back");
  assert.ok(globalsCss.includes(".admin-tabs button"), "globals.css zawiera dotykowe zakładki .admin-tabs");
  assert.ok(globalsCss.includes(".v101-atmosphere"), "globals.css zawiera containment dla .v101-atmosphere");
});
