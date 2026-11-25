import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7D.1 Architecture & Profile Consolidation — PlayerExperience3D unification", () => {
  const expPath = path.join(rootDir, "components/player/PlayerExperience3D.tsx");
  const hubPath = path.join(rootDir, "components/player/PlayerCareerHub.tsx");
  const myChildPath = path.join(rootDir, "components/MyChildCenter.tsx");
  const teamHubPath = path.join(rootDir, "components/TeamHub.tsx");

  assert.ok(fs.existsSync(expPath), "PlayerExperience3D.tsx must exist");
  assert.ok(fs.existsSync(hubPath), "PlayerCareerHub.tsx must exist as alias/wrapper");
  assert.ok(fs.existsSync(myChildPath), "MyChildCenter.tsx must exist");
  assert.ok(fs.existsSync(teamHubPath), "TeamHub.tsx must exist");

  const expCode = fs.readFileSync(expPath, "utf8");
  const teamHubCode = fs.readFileSync(teamHubPath, "utf8");
  const myChildCode = fs.readFileSync(myChildPath, "utf8");

  // TeamHub mounts PlayerExperience3D in modal mode
  assert.ok(
    teamHubCode.includes("<PlayerExperience3D") && teamHubCode.includes('mode="modal"'),
    "TeamHub must mount PlayerExperience3D with mode='modal'"
  );

  // MyChildCenter uses PlayerExperience3D
  assert.ok(
    myChildCode.includes("PlayerExperience3D"),
    "MyChildCenter must use PlayerExperience3D"
  );

  // Modal mode supports portal to document.body
  assert.ok(
    expCode.includes("createPortal(") && expCode.includes("document.body"),
    "PlayerExperience3D modal mode must mount via createPortal to document.body"
  );

  // Body scroll lock on modal open
  assert.ok(
    expCode.includes('body.style.position = "fixed"') && expCode.includes('html.style.overflow = "hidden"'),
    "Modal mode must lock body scroll"
  );

  // Escape key support
  assert.ok(
    expCode.includes('e.key === "Escape"') && expCode.includes("onClose()"),
    "Modal mode must handle Escape key navigation"
  );
});

test("V7D.1 Official Player Card vs Collectible INFERNO Cards Separation", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // Official card is always accessible in Hero, with real level from attendance
  assert.ok(
    expCode.includes("v7b-hero-card") && expCode.includes("POZIOM {playerLevel}"),
    "Official player card in Hero must display real calculated level"
  );
  assert.ok(
    expCode.includes("v7c-quick-stats-strip"),
    "Official player card must display 4 core KPIs"
  );

  // Collectibles are in separate tab and modal inspection via Card3DEngine
  assert.ok(
    expCode.includes("<PlayerInfernoCards"),
    "Collectible cards must be rendered in separate tab via PlayerInfernoCards"
  );
  assert.ok(
    expCode.includes("Card3DEngine"),
    "3D inspection must use Card3DEngine"
  );

  // No cards awarded automatically on profile open (no write queries to user_cards on mount)
  assert.ok(
    !expCode.includes(".insert(") && !expCode.includes(".upsert("),
    "PlayerExperience3D must be read-only and NOT award cards automatically on open"
  );
});

test("V7D.1 Elimination of Fictional Data — No 65 OVR, No 777, No Mystery Pack Wrap", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");
  const radarCode = fs.readFileSync(path.join(rootDir, "components/PlayerSkillRadar.tsx"), "utf8");
  const teamHubCode = fs.readFileSync(path.join(rootDir, "components/TeamHub.tsx"), "utf8");

  // Radar empty state guard: no fake 65 OVR computed when no stats exist
  assert.ok(
    radarCode.includes("if (!hasStats) return null;"),
    "PlayerSkillRadar must not compute fake OVR when player has no recorded activity"
  );
  assert.ok(
    radarCode.includes('<strong>{ovr !== null ? ovr : "—"}</strong>'),
    "PlayerSkillRadar must display '—' instead of 65 OVR when empty"
  );

  // Empty state in Overview when player has no matches or trainings
  assert.ok(
    expCode.includes("Brak oceny umiejętności"),
    "Overview must show friendly empty state when player has no stats"
  );

  // No mystery wrap from localStorage
  assert.ok(
    !expCode.includes("??? TAJEMNICZY ZAWODNIK ???"),
    "PlayerExperience3D must NOT contain legacy mystery player pack wrap"
  );
  assert.ok(
    !teamHubCode.includes("localStorage.getItem(`delta_packs_"),
    "TeamHub must not read delta_packs_ from localStorage"
  );

  // Shirt number uses real shirt_number with neutral fallback, never hardcoded 777
  assert.ok(
    expCode.includes("activeChild.shirt_number ? `#${activeChild.shirt_number}` : \"DELTA\""),
    "Shirt number must fall back to DELTA, never fake 777"
  );
});

test("V7D.1 Strict Attendance XP Rules & Permissions Isolation", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // Strict attendance XP formula: 40 per training, 60 per match
  assert.ok(
    expCode.includes("(presentTrainings * 40) + (presentMatches * 60)"),
    "XP calculation must strictly use +40 for training and +60 for match"
  );

  // Level: Math.floor(individualAttendanceXp / 250) + 1
  assert.ok(
    expCode.includes("Math.floor(individualAttendanceXp / 250) + 1"),
    "Player level must be calculated as Math.floor(XP / 250) + 1"
  );

  // Role context check: isParentOfActivePlayer
  assert.ok(
    expCode.includes("isParentOfActivePlayer"),
    "Must determine if logged-in user is parent of active player"
  );

  // RSVP buttons only shown if isParentOfActivePlayer
  assert.ok(
    expCode.includes("{isParentOfActivePlayer && (") && expCode.includes("v7b-rsvp-buttons"),
    "RSVP buttons must only be accessible for the verified parent of that child"
  );

  // Checklist only shown if isParentOfActivePlayer
  assert.ok(
    expCode.includes("v7b-checklist-card"),
    "Pre-match checklist must be scoped to parent zone"
  );

  // Sibling selector only shown if isParentOfActivePlayer and children.length > 1
  assert.ok(
    expCode.includes("isParentOfActivePlayer && children.length > 1"),
    "Sibling selector must only be shown when parent has multiple children"
  );
});

test("V7D.1 Navigation & 5 Core Sections Preserved", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // 5 tabs
  assert.ok(expCode.includes('activeTab === "overview"'), "Must have Overview tab");
  assert.ok(expCode.includes('activeTab === "career"'), "Must have Career tab");
  assert.ok(expCode.includes('activeTab === "stats"'), "Must have Stats tab");
  assert.ok(expCode.includes('activeTab === "achievements"'), "Must have Achievements tab");
  assert.ok(expCode.includes('activeTab === "cards"'), "Must have Cards tab");

  // Back button
  assert.ok(expCode.includes("Wróć do drużyny"), "Must have back to team button");

  // Grassroots educational note in stats
  assert.ok(
    expCode.includes("ZASADY ROZWOJU MŁODEGO SPORTOWCA"),
    "Stats tab must feature Grassroots educational disclaimer"
  );
});

test("V7D.3 Visual Regression Guards — Hero bounds, Silhouette containment, Tab Bar and Stat Cards", () => {
  const expPath = path.join(rootDir, "components/player/PlayerExperience3D.tsx");
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");

  const expCode = fs.readFileSync(expPath, "utf8");
  const cssCode = fs.readFileSync(cssPath, "utf8");

  // 1. Ograniczenie sylwetki zawodnika do kontrolowanego kontenera 76x76px
  assert.ok(
    expCode.includes('className="v7b-hero-avatar-wrap"'),
    "PlayerExperience3D must place PlayerPhoto inside .v7b-hero-avatar-wrap"
  );
  assert.ok(
    !expCode.includes('className="v7b-portrait-wrapper"'),
    "PlayerExperience3D must NOT contain unconstrained v7b-portrait-wrapper"
  );
  assert.ok(
    cssCode.includes(".v7b-hero-avatar-wrap {") &&
    cssCode.includes("width: 76px;") &&
    cssCode.includes("height: 76px;") &&
    cssCode.includes("overflow: hidden;"),
    "CSS must strictly constrain .v7b-hero-avatar-wrap to 76x76px with overflow hidden"
  );
  assert.ok(
    cssCode.includes(".v7b-hero-avatar-wrap [data-testid=\"neutral-player-silhouette\"]") &&
    cssCode.includes("max-width: 76px !important") &&
    cssCode.includes("max-height: 76px !important"),
    "CSS must clamp silhouette SVG/div to max 76x76px"
  );

  // 2. Zwarta kompozycja Player Hero
  assert.ok(
    expCode.includes('className="v7b-hero-top-strip"') &&
    expCode.includes('className="v7b-hero-main-row"') &&
    expCode.includes('className="v7b-hero-identity"') &&
    expCode.includes('className="v7b-hero-xp-widget"'),
    "Hero must have proper 3-column row layout (identity, xp widget, 3d preview col)"
  );
  assert.ok(
    !expCode.includes('className="v7c-hero-content-grid"'),
    "Hero must NOT use regressed v7c-hero-content-grid"
  );

  // 3. Panel 4 statystyk z właściwym ostylowaniem kart
  assert.ok(
    expCode.includes('className="v7c-quick-stats-strip"') &&
    expCode.includes('className="v7c-stat-card"'),
    "Must use .v7c-quick-stats-strip with .v7c-stat-card"
  );
  assert.ok(
    !expCode.includes('className="v7c-quick-stat-box"'),
    "Must NOT use unstyled v7c-quick-stat-box"
  );
  assert.ok(
    cssCode.includes(".v7c-quick-stats-strip {") &&
    cssCode.includes("grid-template-columns: repeat(4, 1fr)"),
    "CSS must define 4-column grid for desktop stats strip"
  );

  // 4. Belka 5 zakładek z ostylowaniem sticky i touch targets
  assert.ok(
    expCode.includes('className="v7b-nav-tabs-bar"') &&
    expCode.includes('className={`v7b-nav-tab-btn'),
    "Must use styled .v7b-nav-tabs-bar and .v7b-nav-tab-btn"
  );
  assert.ok(
    !expCode.includes('className="v7b-career-tabs-bar"'),
    "Must NOT use unstyled v7b-career-tabs-bar"
  );
  assert.ok(
    cssCode.includes(".v7b-nav-tabs-bar {") &&
    cssCode.includes("position: sticky;") &&
    cssCode.includes("top: 60px;"),
    "CSS must define sticky navigation bar with backdrop blur"
  );

  // 5. Ograniczenie wymiarów karty 3D w Hero i w modalu
  assert.ok(
    expCode.includes('className="v7c-hero-3d-preview-box"') &&
    expCode.includes('className="v7c-mini-card-icon"'),
    "Hero must feature compact .v7c-hero-3d-preview-box"
  );
  assert.ok(
    cssCode.includes(".v7b-modal-card-container {") &&
    cssCode.includes("max-width: 560px;"),
    "3D inspector modal must have max-width constraint to prevent screen stretch"
  );

  // 6. V7D.4 Mobile responsiveness & modal containment (390px / 320px)
  assert.ok(
    cssCode.includes(".v7b-modal-overlay {") &&
    cssCode.includes("overflow-y: auto;") &&
    cssCode.includes("-webkit-overflow-scrolling: touch;"),
    "Modal overlay must support safe vertical scroll on compact mobile screens"
  );
  assert.ok(
    cssCode.includes(".v7b-modal-header {") &&
    cssCode.includes("position: sticky;") &&
    cssCode.includes("top: 0;"),
    "Modal header with close button must remain sticky and permanently accessible"
  );
  assert.ok(
    cssCode.includes("@media (max-width: 360px)") &&
    cssCode.includes(".v7b-nav-tab-btn {") &&
    cssCode.includes("min-width: 96px;") &&
    cssCode.includes("flex-shrink: 0;"),
    "Nav tabs on <=360px must maintain minimum tap width and horizontal scrollability without disappearing"
  );
});
