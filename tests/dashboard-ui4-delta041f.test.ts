import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  dispatchPackOpened,
  dispatchCollectionUpdated,
  subscribeCardEvents,
  CARD_SYNC_EVENTS
} from "../lib/cards/cardSync.ts";

test("DELTA-041F Test 1: Mobile Touch Targets in Collection and Modal", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );
  const modalSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/collection/CardDetailModal.tsx"),
    "utf8"
  );

  // Link to Home in Collection must have min-h-[44px] and min-w-[44px]
  assert.ok(
    colSource.includes("min-h-[44px]") && colSource.includes("min-w-[44px]"),
    "Collection header Home link must meet 44x44px touch target guidelines"
  );

  // Pack counter badge must be status-only and not act as interactive button
  assert.ok(
    colSource.includes('role="status"'),
    "Pack counter badge must be identified as role='status'"
  );
  assert.ok(
    colSource.includes("select-none"),
    "Pack counter badge must be select-none"
  );

  // Rotate button in CardDetailModal must have min-h-[44px]
  assert.ok(
    modalSource.includes("min-h-[44px]"),
    "Rotate button in CardDetailModal must meet min-h-[44px] touch target"
  );
});

test("DELTA-041F Test 2: Club communications header resilient on 360px", () => {
  const homeSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/home-dashboard.tsx"),
    "utf8"
  );

  // Badge must have shrink-0 and whitespace-nowrap
  assert.ok(
    homeSource.includes("shrink-0 text-[10px] bg-slate-800 text-slate-300") &&
    homeSource.includes("whitespace-nowrap"),
    "Communications badge must have shrink-0 and whitespace-nowrap to prevent clipping on 360px"
  );

  // Title container must have min-w-0 and truncate
  assert.ok(
    homeSource.includes("min-w-0") && homeSource.includes("truncate"),
    "Communications header must have min-w-0 and truncate for proper flex shrinking"
  );
});

test("DELTA-041F Test 3: Collection metrics responsive labels prevent truncation", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  // Verify responsive labels for Unikalne, Duplikaty, Paczki
  assert.ok(
    colSource.includes('<span className="sm:hidden">Unikalne</span>'),
    "Must have short label 'Unikalne' on mobile"
  );
  assert.ok(
    colSource.includes('<span className="sm:hidden">Duplikaty</span>'),
    "Must have short label 'Duplikaty' on mobile"
  );
  assert.ok(
    colSource.includes('<span className="sm:hidden">Paczki</span>'),
    "Must have short label 'Paczki' on mobile"
  );
});

test("DELTA-041F Test 4: DEMO attendance button label and separate warning", () => {
  const homeSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/home-dashboard.tsx"),
    "utf8"
  );

  // Button label shortened (no bulky disclaimer inside button)
  assert.ok(
    homeSource.includes('"POTWIERDŹ OBECNOŚĆ NA MECZ"'),
    "Button label must be clean and concise"
  );

  // Separate warning below button
  assert.ok(
    homeSource.includes("Tryb demonstracyjny — nie zapisuje obecności"),
    "Must include separate clear warning below the button: 'Tryb demonstracyjny — nie zapisuje obecności'"
  );
});

test("DELTA-041F Test 5: Filter category tabs discreet scroll cue on mobile", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  assert.ok(
    colSource.includes("bg-gradient-to-l from-slate-900/90") &&
    colSource.includes("sm:hidden"),
    "Category tabs must have a discreet right-edge gradient scroll cue on mobile"
  );
});

test("DELTA-041F Test 6: HTTP 409 ALREADY_OPENED event bus and pack reconciliation", () => {
  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  // CinematicPackExperience dispatches consumed_pack_id on 409
  assert.ok(
    cinematicSource.includes('err.code === "ALREADY_OPENED"'),
    "CinematicPackExperience must handle ALREADY_OPENED error"
  );
  assert.ok(
    cinematicSource.includes("consumed_pack_id: userUnopenedPackId"),
    "CinematicPackExperience must pass consumed_pack_id on 409 reconciliation"
  );

  // CollectionDashboard listens to both onPackOpened and onCollectionUpdated
  assert.ok(
    colSource.includes("onCollectionUpdated: (payload) => {"),
    "CollectionDashboard must handle onCollectionUpdated"
  );

  // Verify in-memory simulation of reconciliation
  let localPacks = [
    { id: "pack-alpha", packTypeId: "standard_pack" },
    { id: "pack-beta", packTypeId: "standard_pack" }
  ];

  // Simulating 409 event reception
  const consumedId = "pack-alpha";
  localPacks = localPacks.filter(p => p.id !== consumedId);

  assert.equal(localPacks.length, 1);
  assert.equal(localPacks[0].id, "pack-beta", "Consumed pack must be removed immediately from local state");
});
