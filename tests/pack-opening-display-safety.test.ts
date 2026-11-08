/**
 * DELTA WARSAW 2018 GM — PACK OPENING DISPLAY SAFETY & REGRESSION TEST SUITE
 * 
 * Verifies the complete fix for DELTA INFERNO / Kolekcja 2.0 pack opening animation:
 * 1. Crest Sizing & Containment (1254px PNG blowout prevention, inline guards, CSS rules)
 * 2. Element Stacking & Layout Collision Prevention (dedicated attribute spotlight, upper ribbon)
 * 3. Screen Alignment & Centered Ray Rotation (no horizontal/vertical scrollbars or offset rays)
 * 4. Stacking Context & Dashboard Bleed-Through Prevention (isolation: isolate, solid #020408, 9999999 z-index)
 * 5. Body Scroll Locking (overflow hidden on mount, restored on unmount)
 * 6. Close (X) & Skip (Pomiń) Button Availability
 * 7. Architecture Hook for Future Video Pack Opening (with graceful animation fallback)
 * 8. Economy, DP Balance & Collection Invariants
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ----------------------------------------------------------------------------
// 1. CREST SIZING & CONTAINMENT VERIFICATION (Blowout Prevention)
// ----------------------------------------------------------------------------

test("TEST 1.1: collection-3d.css enforces strict bounds on reverse watermark crest", () => {
  const cssPath = path.resolve(process.cwd(), "components/collection-3d/collection-3d.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(
    css,
    /\.inferno-back-watermark\s*img\s*\{[^}]*max-width:\s*72% !important;/s,
    ".inferno-back-watermark img must have max-width: 72% !important"
  );
  assert.match(
    css,
    /\.inferno-back-watermark\s*img\s*\{[^}]*object-fit:\s*contain !important;/s,
    ".inferno-back-watermark img must have object-fit: contain !important"
  );
});

test("TEST 1.2: collection-3d.css enforces strict bounds on reverse crest medallion", () => {
  const cssPath = path.resolve(process.cwd(), "components/collection-3d/collection-3d.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(
    css,
    /\.inferno-back-crest-medallion\s*\{[^}]*max-width:\s*80px !important;/s,
    ".inferno-back-crest-medallion must have max-width: 80px !important"
  );
  assert.match(
    css,
    /\.inferno-back-crest-medallion\s*img\s*\{[^}]*max-width:\s*100% !important;/s,
    ".inferno-back-crest-medallion img must have max-width: 100% !important"
  );
  assert.match(
    css,
    /\.inferno-back-crest-medallion\s*img\s*\{[^}]*object-fit:\s*contain !important;/s,
    ".inferno-back-crest-medallion img must have object-fit: contain !important"
  );
});

test("TEST 1.3: Card3DEngine.tsx defines defensive inline sizing on reverse crest images", () => {
  const tsxPath = path.resolve(process.cwd(), "components/collection-3d/Card3DEngine.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  // Watermark img inline styles
  assert.match(
    code,
    /<img[^>]*src=\{crestSrc\}[^>]*style=\{\{[^}]*maxWidth:\s*"72%"/s,
    "Watermark img in Card3DEngine must have defensive maxWidth: 72% inline style"
  );

  // Medallion img inline styles
  assert.match(
    code,
    /<img[^>]*src=\{crestSrc\}[^>]*style=\{\{[^}]*maxWidth:\s*"100%"/s,
    "Medallion img in Card3DEngine must have defensive maxWidth: 100% inline style"
  );
});

test("TEST 1.4: globals.css strictly bounds .v101-walkout-crest size", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(
    css,
    /\.v101-walkout-crest\s*\{[^}]*max-width:\s*min\(84px,\s*24vw\)\s*!important;/s,
    ".v101-walkout-crest must be constrained to max-width: min(84px, 24vw) !important"
  );
  assert.match(
    css,
    /\.v101-walkout-crest\s*\{[^}]*object-fit:\s*contain\s*!important;/s,
    ".v101-walkout-crest must have object-fit: contain !important"
  );
  assert.match(
    css,
    /\.v101-walkout-crest\s*\{[^}]*flex-shrink:\s*0\s*!important;/s,
    ".v101-walkout-crest must have flex-shrink: 0 !important"
  );
});

test("TEST 1.5: InfernoWalkoutReveal bounds player image when crest fallback is used", () => {
  const tsxPath = path.resolve(process.cwd(), "components/InfernoWalkoutReveal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(
    code,
    /data\.playerImage\?\.includes\("gm\.png"\)\s*\?\s*"min\(160px,\s*28vh\)"/s,
    "InfernoWalkoutReveal must bound gm.png crest images to max 160px"
  );
});

// ----------------------------------------------------------------------------
// 2. ELEMENT STACKING & OVERLAP PREVENTION
// ----------------------------------------------------------------------------

test("TEST 2.1: PackOpeningModal walkout sequence uses single-spotlight logic (no overlap)", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningModal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  // Step 1: Flag spotlight
  assert.match(code, /\{step === "flag" && \(/, "Flag step must render exclusively when active");
  // Step 2: Position spotlight
  assert.match(code, /\{step === "pos" && \(/, "Position step must render exclusively when active");
  // Step 3: Club spotlight
  assert.match(code, /\{step === "club" && \(/, "Club step must render exclusively when active");
  // Step 4: Rating spotlight
  assert.match(code, /\{step === "rating" && \(/, "Rating step must render exclusively when active");

  // Upper ribbon tracker exists for revealed attributes
  assert.match(
    code,
    /step === "pos" \|\| step === "club" \|\| step === "rating"/,
    "Upper ribbon displays already revealed attributes cleanly"
  );
});

test("TEST 2.2: collection-3d.css provides full structured layout for card back content", () => {
  const cssPath = path.resolve(process.cwd(), "components/collection-3d/collection-3d.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(css, /\.inferno-back-content\s*\{[^}]*display:\s*flex;/s);
  assert.match(css, /\.inferno-back-content\s*\{[^}]*flex-direction:\s*column;/s);
  assert.match(css, /\.inferno-back-content\s*\{[^}]*justify-content:\s*space-between;/s);
  assert.match(css, /\.inferno-back-creds-grid\s*\{[^}]*display:\s*grid;/s);
  assert.match(css, /\.inferno-back-creds-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\);/s);
});

// ----------------------------------------------------------------------------
// 3. SCREEN POSITIONING & RAY CENTERING
// ----------------------------------------------------------------------------

test("TEST 3.1: globals.css centers pack background rays and eliminates translateX displacement", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(
    css,
    /\.v101-pack-bg-rays\s*\{[^}]*top:\s*50%;[^}]*left:\s*50%;[^}]*transform:\s*translate\(-50%,\s*-50%\);/s,
    ".v101-pack-bg-rays must be centered at 50% / 50% with translate(-50%, -50%)"
  );
  assert.match(
    css,
    /@keyframes v101-spin-rays-centered\s*\{[^}]*from\s*\{[^}]*transform:\s*translate\(-50%,\s*-50%\)\s*rotate\(0deg\);/s,
    "@keyframes v101-spin-rays-centered must preserve translate(-50%, -50%) during spin"
  );
});

// ----------------------------------------------------------------------------
// 4. STACKING CONTEXT & DASHBOARD BLEED-THROUGH PREVENTION
// ----------------------------------------------------------------------------

test("TEST 4.1: PackOpeningExperience portal sets isolation: isolate, solid bg and max z-index", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningExperience.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /className="[^"]*z-\[9999999\]/s, "PackOpeningExperience must have z-[9999999]");
  assert.match(code, /className="[^"]*isolate/s, "PackOpeningExperience must have isolate class");
  assert.match(code, /isolation:\s*"isolate"/s, "PackOpeningExperience must have inline isolation: isolate");
  assert.match(code, /background:\s*"#020408"/s, "PackOpeningExperience must have solid opaque background #020408");
});

test("TEST 4.2: UniversalWalkoutModal portal sets isolation: isolate and max z-index", () => {
  const tsxPath = path.resolve(process.cwd(), "components/collection-3d/UniversalWalkoutModal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /className="[^"]*z-\[9999999\]/s, "UniversalWalkoutModal must have z-[9999999]");
  assert.match(code, /className="[^"]*isolate/s, "UniversalWalkoutModal must have isolate class");
  assert.match(code, /isolation:\s*"isolate"/s, "UniversalWalkoutModal must have inline isolation: isolate");
  assert.match(code, /background:\s*"#020408"/s, "UniversalWalkoutModal must have solid opaque background #020408");
});

test("TEST 4.3: globals.css sets isolation: isolate and solid background on .v101-pack-modal-backdrop", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(css, /\.v101-pack-modal-backdrop\s*\{[^}]*z-index:\s*9999999;/s);
  assert.match(css, /\.v101-pack-modal-backdrop\s*\{[^}]*background:\s*#020408;/s);
  assert.match(css, /\.v101-pack-modal-backdrop\s*\{[^}]*isolation:\s*isolate;/s);
});

// ----------------------------------------------------------------------------
// 5. BODY SCROLL LOCKING ON MOUNT & RESTORATION ON UNMOUNT
// ----------------------------------------------------------------------------

test("TEST 5.1: PackOpeningModal locks document.body.style.overflow and restores on unmount", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningModal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /const prevOverflow = document\.body\.style\.overflow;/);
  assert.match(code, /document\.body\.style\.overflow = "hidden";/);
  assert.match(code, /document\.body\.style\.overflow = prevOverflow;/);
});

test("TEST 5.2: UniversalWalkoutModal locks document.body.style.overflow and restores on unmount", () => {
  const tsxPath = path.resolve(process.cwd(), "components/collection-3d/UniversalWalkoutModal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /const prevOverflow = document\.body\.style\.overflow;/);
  assert.match(code, /document\.body\.style\.overflow = "hidden";/);
  assert.match(code, /document\.body\.style\.overflow = prevOverflow;/);
});

// ----------------------------------------------------------------------------
// 6. CLOSE (X) & SKIP BUTTONS FUNCTIONALITY
// ----------------------------------------------------------------------------

test("TEST 6.1: PackOpeningExperience provides skip and close buttons", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningExperience.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /Pomiń Animację/, "PackOpeningExperience must render Pomiń Animację button");
  assert.match(code, /aria-label="Zamknij"/, "PackOpeningExperience must render accessible close button");
});

test("TEST 6.2: UniversalWalkoutModal provides skip and close buttons", () => {
  const tsxPath = path.resolve(process.cwd(), "components/collection-3d/UniversalWalkoutModal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /<span>Pomiń<\/span>/, "UniversalWalkoutModal must render Pomiń button");
  assert.match(code, /aria-label="Zamknij"/, "UniversalWalkoutModal must render accessible close button");
});

test("TEST 6.3: PackOpeningModal provides skip and close buttons", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningModal.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /className="v101-walkout-skip"/, "PackOpeningModal must render skip button");
  assert.match(code, /className="v101-pack-close-btn"/, "PackOpeningModal must render close button");
});

// ----------------------------------------------------------------------------
// 7. ARCHITECTURE HOOK FOR FUTURE VIDEO PACK OPENING
// ----------------------------------------------------------------------------

test("TEST 7.1: PackOpeningExperience supports videoOpeningUrl and enableVideoPackOpening props", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningExperience.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  assert.match(code, /videoOpeningUrl\?: string;/, "Must declare videoOpeningUrl prop");
  assert.match(code, /enableVideoPackOpening\?: boolean;/, "Must declare enableVideoPackOpening prop");
  assert.match(
    code,
    /<video[^>]*src=\{videoOpeningUrl \|\| \(pack\.theme === "inferno" \? "\/media\/walkouts\/inferno-pack-opening\.mp4" : undefined\)\}/s,
    "Must support inferno-pack-opening.mp4 video path"
  );
  assert.match(code, /setVideoTearError\(true\)/, "Must catch video errors and fallback gracefully to animation");
});

// ----------------------------------------------------------------------------
// 8. ECONOMY & BALANCE INVARIANTS
// ----------------------------------------------------------------------------

test("TEST 8.1: Pack opening does not alter server-authoritative balance contracts", () => {
  const tsxPath = path.resolve(process.cwd(), "components/PackOpeningExperience.tsx");
  const code = fs.readFileSync(tsxPath, "utf-8");

  // Verifies that balance changes come strictly from server JSON response
  assert.match(code, /data\.new_points_balance/, "Balance must be synchronized strictly from server response");
  assert.match(code, /data\.total_delta_points_earned/, "Points earned must be strictly from server response");
  assert.doesNotMatch(code, /supabase\.from\("user_points"\)\.update/, "Client must NEVER directly mutate user_points");
});
