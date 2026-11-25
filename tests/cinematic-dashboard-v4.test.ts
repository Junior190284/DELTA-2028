import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V4 Dashboard — DeltaCinematicDashboard exports & file structure", () => {
  const componentPath = path.join(
    rootDir,
    "components/dashboard/DeltaCinematicDashboard.tsx"
  );
  assert.ok(fs.existsSync(componentPath), "DeltaCinematicDashboard.tsx exists");

  const barrelPath = path.join(rootDir, "components/dashboard/index.ts");
  assert.ok(fs.existsSync(barrelPath), "components/dashboard/index.ts exists");

  const code = fs.readFileSync(componentPath, "utf8");
  assert.ok(
    code.includes("export default function DeltaCinematicDashboard"),
    "Component exports default DeltaCinematicDashboard"
  );
  assert.ok(
    code.includes("export interface DeltaCinematicDashboardProps"),
    "Component exports DeltaCinematicDashboardProps"
  );
});

test("V4 Desktop Requirements — Stadium Header, Intro without Autoplay, Season Badge", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/dashboard/DeltaCinematicDashboard.tsx"),
    "utf8"
  );

  // Big stadium header on desktop
  assert.ok(
    code.includes("stadium.png") || code.includes("stadium"),
    "Desktop header uses stadium atmosphere background"
  );
  assert.ok(
    code.includes("DELTA 2018 GM"),
    "Header features DELTA 2018 GM club title"
  );
  assert.ok(
    code.includes("ZOBACZ INTRO"),
    "Header provides manual ZOBACZ INTRO button"
  );
  assert.ok(
    !code.includes("autoPlay") && !code.includes("autoplay"),
    "Intro MUST NOT auto-play"
  );
});

test("V4 Mobile Requirements — Compact Gamer Bar, Above-the-fold Match, 4 Quick Actions", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/dashboard/DeltaCinematicDashboard.tsx"),
    "utf8"
  );

  // Compact gamer profile on mobile
  assert.ok(
    code.includes("delta-mobile-only") || code.includes("block sm:hidden"),
    "Mobile profile bar uses dedicated compact layout"
  );
  assert.ok(
    code.includes("LVL"),
    "Displays player level"
  );
  assert.ok(
    code.includes("progressPercent"),
    "Displays level XP progress bar"
  );

  // Exactly 4 mobile quick actions
  assert.ok(
    code.includes("delta-quick-actions-mobile-grid") || code.includes("grid grid-cols-2 gap-2.5 sm:hidden"),
    "Mobile layout renders 4 quick actions in a 2x2 grid"
  );
  assert.ok(code.includes("Terminarz"), "Tile 1: Terminarz");
  assert.ok(code.includes("Karty 3D"), "Tile 2: Karty 3D");
  assert.ok(code.includes("Typer DELTA"), "Tile 3: Typer DELTA");
  assert.ok(code.includes("Misje & XP"), "Tile 4: Misje & XP");
});

test("V4 Attendance Ergonomics — Min 44px Touch Target & Role Adaptability", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/dashboard/DeltaCinematicDashboard.tsx"),
    "utf8"
  );

  // Attendance button uses touchTarget={true} (enforcing min-h-[44px] min-w-[44px])
  assert.ok(
    code.includes("touchTarget={true}"),
    "Attendance buttons enforce WCAG 44x44px touch targets"
  );

  // Role adaptability: Parent vs Coach/Admin
  assert.ok(
    code.includes("childAttendanceStatus"),
    "Differentiates child attendance state for parent role"
  );
  assert.ok(
    code.includes("POTWIERDŹ OBECNOŚĆ") || code.includes("ZMIEŃ OBECNOŚĆ"),
    "Provides prominent attendance declaration actions"
  );
  assert.ok(
    code.includes("OBECNOŚCI ("),
    "Provides coach/staff squad attendance overview"
  );
});

test("V4 Data Authenticity — Zero Artificial Mock Data, Real API Contracts", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/dashboard/DeltaCinematicDashboard.tsx"),
    "utf8"
  );

  // Real missions API
  assert.ok(
    code.includes("/api/game/missions?userId="),
    "Fetches real missions from /api/game/missions"
  );

  // Real notifications/rewards API
  assert.ok(
    code.includes("/api/game/notifications?userId="),
    "Fetches real rewards from /api/game/notifications"
  );

  // Uses design system empty states when data is missing
  assert.ok(
    code.includes("<DeltaEmptyState"),
    "Uses DeltaEmptyState for empty matches or missions"
  );
});

test("V4 Design System 2.0 Primitives Integration", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/dashboard/DeltaCinematicDashboard.tsx"),
    "utf8"
  );

  assert.ok(code.includes("<DeltaCard"), "Uses DeltaCard primitive");
  assert.ok(code.includes("<DeltaButton"), "Uses DeltaButton primitive");
  assert.ok(code.includes("<DeltaBadge"), "Uses DeltaBadge primitive");
  assert.ok(code.includes("<DeltaSkeleton"), "Uses DeltaSkeleton for loading states");
  assert.ok(code.includes("<DeltaSectionHeader"), "Uses DeltaSectionHeader for consistent hierarchy");
});

test("V4 TeamHub Integration — Seamless Replacement with V3 Preservation", () => {
  const teamHubCode = fs.readFileSync(
    path.join(rootDir, "components/TeamHub.tsx"),
    "utf8"
  );

  assert.ok(
    teamHubCode.includes("import { DeltaCinematicDashboard } from \"./dashboard\";"),
    "TeamHub imports DeltaCinematicDashboard"
  );
  assert.ok(
    teamHubCode.includes("<DeltaCinematicDashboard"),
    "TeamHub renders DeltaCinematicDashboard"
  );
  assert.ok(
    teamHubCode.includes("<DeltaAppShell"),
    "V3 DeltaAppShell navigation remains active"
  );
  assert.ok(
    teamHubCode.includes("tab===\"home\""),
    "tab===home route preserved"
  );
});
