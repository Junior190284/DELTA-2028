import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V5.2 — DeltaDailyMissionsModal: Proper overlay, portal, aria attributes and containment", () => {
  const modalPath = path.join(rootDir, "components", "DeltaDailyMissionsModal.tsx");
  const modalCode = fs.readFileSync(modalPath, "utf8");

  // Portal & Dialog
  assert.ok(modalCode.includes("createPortal(modalContent, document.body)"), "Renders via React portal to document.body");
  assert.ok(modalCode.includes('role="dialog"'), 'Has role="dialog"');
  assert.ok(modalCode.includes('aria-modal="true"'), 'Has aria-modal="true"');
  assert.ok(modalCode.includes('aria-labelledby="missions-modal-title"'), "Has accessible labelling");

  // Fixed Overlay & Z-index
  assert.ok(modalCode.includes("fixed inset-0"), "Has fixed inset-0 overlay");
  assert.ok(modalCode.includes("z-[99999]"), "Has high z-index overlay");
  assert.ok(modalCode.includes("backdrop-blur"), "Has backdrop blur");

  // Sheet containment
  assert.ok(modalCode.includes("max-w-2xl"), "Sheet is properly constrained to max-w-2xl");
  assert.ok(modalCode.includes("max-h-[90vh]"), "Sheet is constrained to 90vh");
  assert.ok(modalCode.includes("overflow-hidden"), "Sheet prevents outer overflow");

  // Escape key & body scroll lock
  assert.ok(modalCode.includes("e.key === 'Escape'"), "Handles Escape key to close");
  assert.ok(modalCode.includes("document.body.style.overflow = 'hidden'"), "Locks body scroll while open");
});

test("V5.2 — TeamHub: Closes all modals on tab navigation and hash sync", () => {
  const hubPath = path.join(rootDir, "components", "TeamHub.tsx");
  const hubCode = fs.readFileSync(hubPath, "utf8").replace(/\r\n/g, "\n");

  assert.ok(hubCode.includes("const closeAllModals = () => {"), "Defines closeAllModals function");
  assert.ok(hubCode.includes("setMissionsModalOpen(false);"), "Resets missionsModalOpen in closeAllModals");
  assert.ok(hubCode.includes("closeAllModals();\n    setTab(targetTab);"), "Calls closeAllModals in handleSelectTab");
  assert.ok(hubCode.includes("closeAllModals();\n        setTab(raw as any);"), "Calls closeAllModals in handleHashSync");
});

test("V5.2 — globals.css: Defines v200-mission-overlay with fixed positioning fallback", () => {
  const cssPath = path.join(rootDir, "app", "globals.css");
  const cssCode = fs.readFileSync(cssPath, "utf8");

  assert.ok(cssCode.includes(".v200-mission-overlay {"), "Defines .v200-mission-overlay");
  assert.ok(cssCode.includes("position: fixed !important;"), "Enforces fixed positioning for overlay");
  assert.ok(cssCode.includes("z-index: 99999 !important;"), "Enforces z-index 99999 for overlay");
  assert.ok(cssCode.includes(".v200-mission-sheet {"), "Defines .v200-mission-sheet");
});

test("V5.2 — DeltaCollectionAlbum & PWA Prompt: Bottom clearance and safe dismissal", () => {
  const albumPath = path.join(rootDir, "components", "DeltaCollectionAlbum.tsx");
  const albumCode = fs.readFileSync(albumPath, "utf8");
  assert.ok(albumCode.includes("pb-24 sm:pb-16"), "Collection album has generous bottom clearance padding");

  const pwaPath = path.join(rootDir, "components", "DeltaPWAInstallPrompt.tsx");
  const pwaCode = fs.readFileSync(pwaPath, "utf8");
  assert.ok(pwaCode.includes("delta_pwa_dismissed_session"), "PWA prompt checks session dismissal");
});
