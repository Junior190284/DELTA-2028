import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const dashboardPath = path.join(
  rootDir,
  "components/dashboard/DeltaCinematicDashboard.tsx"
);
const pwaPromptPath = path.join(
  rootDir,
  "components/DeltaPWAInstallPrompt.tsx"
);
const appShellPath = path.join(
  rootDir,
  "components/navigation/DeltaAppShell.tsx"
);
const sidebarPath = path.join(
  rootDir,
  "components/navigation/DeltaSidebar.tsx"
);

test("V4.4 Zadanie 1 — Usunięcie duplikatów: Pojedynczy responsywny zestaw 4 szybkich akcji", () => {
  const code = fs.readFileSync(dashboardPath, "utf8");

  // 4 canonical quick action titles
  assert.ok(code.includes("Terminarz"), "Includes Terminarz");
  assert.ok(code.includes("Karty 3D") || code.includes("Kolekcja kart 3D"), "Includes Karty 3D");
  assert.ok(code.includes("Misje & XP") || code.includes("Misje & Cele"), "Includes Misje & XP");
  assert.ok(code.includes("Typer DELTA"), "Includes Typer DELTA");

  // Handlers preserved
  assert.ok(code.includes('onSelectTab("matches")'), "Preserves matches tab handler");
  assert.ok(code.includes('onSelectTab("collection")'), "Preserves collection tab handler");
  assert.ok(code.includes('onOpenModalAction("missions")'), "Preserves missions modal handler");
  assert.ok(code.includes('onOpenModalAction("typer")'), "Preserves typer modal handler");

  // Grid responsiveness
  assert.ok(
    code.includes("grid-cols-2 lg:grid-cols-4"),
    "Uses single unified responsive grid for mobile (2 cols) and desktop (4 cols)"
  );
});

test("V4.4 Zadanie 2 — Profil zawodnika: Pojedynczy zunifikowany panel HUD bez powtórzeń XP", () => {
  const code = fs.readFileSync(dashboardPath, "utf8");

  // Single authoritative gamer profile panel
  assert.ok(
    code.includes("delta-unified-profile-box"),
    "Defines delta-unified-profile-box"
  );
  assert.ok(
    code.includes("LVL"),
    "Displays player level in profile panel"
  );
  assert.ok(
    code.includes("progressPercent"),
    "Displays XP progress bar in profile panel"
  );
  assert.ok(
    code.includes("streak"),
    "Displays activity streak in profile panel"
  );
  assert.ok(
    code.includes("MISJE & CELE"),
    "Provides quick access to missions from gamer profile"
  );

  // Parent vs Child separation
  assert.ok(
    code.includes('profile.role === "parent" && myChild'),
    "Distinguishes parent account from child player account"
  );
  assert.ok(
    code.includes("Konto rodzica:"),
    "Explicitly labels parent account"
  );
  assert.ok(
    code.includes("Zawodnik"),
    "Explicitly identifies child player name, position and number"
  );
});

test("V4.4 Zadanie 3 — INFERNO Collection Showcase: Ciemne tło, karty 3D, empty state z wzorami i obsługa paczek", () => {
  const code = fs.readFileSync(dashboardPath, "utf8");

  // Header & atmosphere
  assert.ok(
    code.includes("KOLEKCJA INFERNO 3D"),
    "Features INFERNO 3D Collection Showcase header"
  );
  assert.ok(
    code.includes("from-[#14101e] via-[#0d0f17] to-[#07080b]"),
    "Uses premium dark stadium gaming gradient"
  );

  // 3D Player Cards
  assert.ok(
    code.includes("<PlayerCard"),
    "Renders 3D PlayerCard primitive"
  );
  assert.ok(
    code.includes('templateOverride="inferno"'),
    "Applies inferno template override"
  );

  // Empty State with Preview Designs
  assert.ok(
    code.includes("Twój album czeka na pierwsze karty!"),
    "Presents high-value empty state headline"
  );
  assert.ok(
    code.includes("WZÓR"),
    "Watermarks preview cards clearly as WZÓR"
  );
  assert.ok(
    code.includes("Wzory kart klubowych do zdobycia w paczkach"),
    "Informs user that preview cards are obtainable via packs"
  );

  // Conditional Pack Opening CTA Logic
  assert.ok(
    code.includes("unopenedPacks > 0 ?"),
    "Implements conditional logic for pack opening button"
  );
  assert.ok(
    code.includes("OTWÓRZ PACZKĘ"),
    "Shows OTWÓRZ PACZKĘ when packs are available"
  );
  assert.ok(
    code.includes("PRZEJDŹ DO KOLEKCJI"),
    "Shows PRZEJDŹ DO KOLEKCJI when no packs are available"
  );
});

test("V4.4 Zadanie 4 — Sport First: Najbliższy mecz LUB trening, status obecności, brak sztucznych meczów", () => {
  const code = fs.readFileSync(dashboardPath, "utf8");

  // Match hero
  assert.ok(
    code.includes("NAJBLIŻSZY MECZ"),
    "Displays upcoming match hero when match exists"
  );
  assert.ok(
    code.includes("POTWIERDŹ OBECNOŚĆ") || code.includes("ZMIEŃ OBECNOŚĆ"),
    "Provides match attendance RSVP CTA"
  );

  // Training hero fallback
  assert.ok(
    code.includes("nextTraining"),
    "Supports upcoming training fallback"
  );
  assert.ok(
    code.includes("NAJBLIŻSZY TRENING"),
    "Renders upcoming training hero when no match is scheduled"
  );

  // Empty state when neither exists
  assert.ok(
    code.includes("PRZERWA W ROZGRYWKACH"),
    "Provides clean league break empty state"
  );
  assert.ok(
    code.includes("TERMINARZ & WYNIKI"),
    "Provides direct link to full schedule"
  );
});

test("V4.4 Zadanie 5 — Sidebar: Obsługa stanu zwiniętego, localStorage i dostępność", () => {
  const appShellCode = fs.readFileSync(appShellPath, "utf8");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf8");

  // LocalStorage persistence
  assert.ok(
    appShellCode.includes("delta_sidebar_collapsed"),
    "DeltaAppShell reads and writes delta_sidebar_collapsed in localStorage"
  );

  // Accessibility in collapsed mode
  assert.ok(
    sidebarCode.includes("aria-label={isCollapsed ? item.label : undefined}"),
    "DeltaSidebar sets aria-label on nav items in collapsed state"
  );
  assert.ok(
    sidebarCode.includes("focus-visible:ring-amber-400"),
    "DeltaSidebar enforces visible keyboard focus outlines"
  );
});

test("V4.4 Zadanie 6 — PWA Install Prompt: Bezpieczna pozycja, 7 dni dismiss, tryb standalone", () => {
  const pwaCode = fs.readFileSync(pwaPromptPath, "utf8");

  // Safe area above bottom nav
  assert.ok(
    pwaCode.includes("bottom-[84px]"),
    "PWA prompt sits safely above bottom navigation (84px)"
  );

  // 7-day dismiss persistence
  assert.ok(
    pwaCode.includes("delta_pwa_dismissed_until"),
    "PWA prompt stores 7-day dismissal timestamp in localStorage"
  );
  assert.ok(
    pwaCode.includes("7 * 24 * 60 * 60 * 1000"),
    "Calculates 7 days expiration period"
  );

  // Standalone mode detection
  assert.ok(
    pwaCode.includes("display-mode: standalone"),
    "PWA prompt detects standalone display-mode"
  );
  assert.ok(
    pwaCode.includes("delta_pwa_installed"),
    "PWA prompt tracks installed status"
  );
});
