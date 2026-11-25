import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { 
  calculateStadiumProgression, 
  isStadiumUnlocked, 
  STADIUM_TIERS 
} from "../lib/stadium/progression.ts";

const rootDir = process.cwd();

test("V7F.1B Stadium Tiers Configuration — 5 Canonical Tiers and Thresholds", () => {
  assert.equal(STADIUM_TIERS.length, 5);
  
  assert.deepEqual(
    STADIUM_TIERS.map(t => ({ id: t.id, minXp: t.minXp })),
    [
      { id: "debiutant", minXp: 0 },
      { id: "mlody_talent", minXp: 400 },
      { id: "wschodzaca_gwiazda", minXp: 1200 },
      { id: "gwiazda_akademii", minXp: 2400 },
      { id: "legenda_delty", minXp: 4000 }
    ]
  );

  // Debiutant & Młody Talent have approved graphics, higher tiers have neutral locked state
  const debiutant = STADIUM_TIERS.find(t => t.id === "debiutant");
  const mlodyTalent = STADIUM_TIERS.find(t => t.id === "mlody_talent");
  const wschodzaca = STADIUM_TIERS.find(t => t.id === "wschodzaca_gwiazda");
  const gwiazda = STADIUM_TIERS.find(t => t.id === "gwiazda_akademii");
  const legenda = STADIUM_TIERS.find(t => t.id === "legenda_delty");

  assert.equal(debiutant?.hasGraphic, true);
  assert.equal(mlodyTalent?.hasGraphic, true);
  assert.equal(wschodzaca?.hasGraphic, false);
  assert.equal(gwiazda?.hasGraphic, false);
  assert.equal(legenda?.hasGraphic, false);
});

test("V7F.1B Exact Threshold Boundaries (0, 399, 400, 1199, 1200, 2399, 2400, 3999, 4000 XP)", () => {
  // 1. Boundary: 0 XP -> Debiutant (0% to Młody Talent)
  const p0 = calculateStadiumProgression(0);
  assert.equal(p0.currentTier.id, "debiutant");
  assert.equal(p0.nextTier?.id, "mlody_talent");
  assert.equal(p0.remainingXp, 400);
  assert.equal(p0.progressPercent, 0);
  assert.deepEqual(p0.unlockedTierIds, ["debiutant"]);

  // 2. Boundary: 399 XP -> Debiutant (99% to Młody Talent, 1 XP remaining)
  const p399 = calculateStadiumProgression(399);
  assert.equal(p399.currentTier.id, "debiutant");
  assert.equal(p399.nextTier?.id, "mlody_talent");
  assert.equal(p399.remainingXp, 1);
  assert.equal(p399.progressPercent, 99);
  assert.deepEqual(p399.unlockedTierIds, ["debiutant"]);

  // 3. Boundary: 400 XP -> Młody Talent (0% to Wschodząca Gwiazda)
  const p400 = calculateStadiumProgression(400);
  assert.equal(p400.currentTier.id, "mlody_talent");
  assert.equal(p400.nextTier?.id, "wschodzaca_gwiazda");
  assert.equal(p400.remainingXp, 800);
  assert.equal(p400.progressPercent, 0);
  assert.deepEqual(p400.unlockedTierIds, ["debiutant", "mlody_talent"]);

  // 4. Boundary: 1199 XP -> Młody Talent (99% to Wschodząca Gwiazda, 1 XP remaining)
  const p1199 = calculateStadiumProgression(1199);
  assert.equal(p1199.currentTier.id, "mlody_talent");
  assert.equal(p1199.nextTier?.id, "wschodzaca_gwiazda");
  assert.equal(p1199.remainingXp, 1);
  assert.equal(p1199.progressPercent, 99);

  // 5. Boundary: 1200 XP -> Wschodząca Gwiazda (0% to Gwiazda Akademii)
  const p1200 = calculateStadiumProgression(1200);
  assert.equal(p1200.currentTier.id, "wschodzaca_gwiazda");
  assert.equal(p1200.nextTier?.id, "gwiazda_akademii");
  assert.equal(p1200.remainingXp, 1200);
  assert.equal(p1200.progressPercent, 0);
  assert.deepEqual(p1200.unlockedTierIds, ["debiutant", "mlody_talent", "wschodzaca_gwiazda"]);

  // 6. Boundary: 2399 XP -> Wschodząca Gwiazda (99% to Gwiazda Akademii, 1 XP remaining)
  const p2399 = calculateStadiumProgression(2399);
  assert.equal(p2399.currentTier.id, "wschodzaca_gwiazda");
  assert.equal(p2399.remainingXp, 1);
  assert.equal(p2399.progressPercent, 99);

  // 7. Boundary: 2400 XP -> Gwiazda Akademii (0% to Legenda DELTY)
  const p2400 = calculateStadiumProgression(2400);
  assert.equal(p2400.currentTier.id, "gwiazda_akademii");
  assert.equal(p2400.nextTier?.id, "legenda_delty");
  assert.equal(p2400.remainingXp, 1600);
  assert.equal(p2400.progressPercent, 0);

  // 8. Boundary: 3999 XP -> Gwiazda Akademii (99% to Legenda DELTY, 1 XP remaining)
  const p3999 = calculateStadiumProgression(3999);
  assert.equal(p3999.currentTier.id, "gwiazda_akademii");
  assert.equal(p3999.remainingXp, 1);
  assert.equal(p3999.progressPercent, 99);

  // 9. Boundary: 4000 XP -> Legenda DELTY (Max Tier)
  const p4000 = calculateStadiumProgression(4000);
  assert.equal(p4000.currentTier.id, "legenda_delty");
  assert.equal(p4000.nextTier, null);
  assert.equal(p4000.remainingXp, 0);
  assert.equal(p4000.progressPercent, 100);
  assert.equal(p4000.isMaxTier, true);
  assert.equal(p4000.unlockedTierIds.length, 5);

  // 10. Beyond max tier: 5000 XP
  const p5000 = calculateStadiumProgression(5000);
  assert.equal(p5000.currentTier.id, "legenda_delty");
  assert.equal(p5000.isMaxTier, true);
  assert.equal(p5000.progressPercent, 100);
});

test("V7F.1B Priority Rule — Sporne match_attendance.status='absent' + match_events wyklucza XP", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");
  const timelineCode = fs.readFileSync(path.join(rootDir, "components/player/CareerTimeline.tsx"), "utf8");

  // In PlayerExperience3D, att.status === "absent" must return before checking events
  assert.ok(
    expCode.includes('if (att && att.status === "absent")') && expCode.includes("return;"),
    "PlayerExperience3D must immediately return/suppress XP if attendance status is 'absent'"
  );

  // In CareerTimeline, att.status === "absent" must return before registering match
  assert.ok(
    timelineCode.includes('if (att && att.status === "absent")') && timelineCode.includes("return;"),
    "CareerTimeline must immediately return if attendance status is 'absent'"
  );

  // In CareerTimeline milestone-debut, att.status === "absent" must return false
  assert.ok(
    timelineCode.includes('if (att && att.status === "absent") return false;'),
    "CareerTimeline debut milestone must exclude absent matches even if stray events exist"
  );
});

test("V7F.1B Single Count & Uniqueness — Set<string> deduplication prevents duplicate XP", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  assert.ok(
    expCode.includes("verifiedTrainingIds.add(a.training_id)") && expCode.includes("verifiedTrainingIds.size"),
    "Trainings must be deduplicated by ID into verifiedTrainingIds Set"
  );
  assert.ok(
    expCode.includes("verifiedMatchIds.add(m.id)") && expCode.includes("verifiedMatchIds.size"),
    "Matches must be deduplicated by ID into verifiedMatchIds Set"
  );
});

test("V7F.1B DEMO Mode Isolation — Demo mode does not alter real progression or write to DB", () => {
  const dynCode = fs.readFileSync(path.join(rootDir, "components/player/DynamicStadiumExperience.tsx"), "utf8");
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // Demo tags present
  assert.ok(dynCode.includes("TRYB DEMO"), "DynamicStadiumExperience must label switcher as TRYB DEMO");
  assert.ok(expCode.includes("DEMO"), "PlayerExperience3D must label switcher as DEMO");

  // No database write operations in stadium components
  assert.ok(!dynCode.includes(".upsert("), "DynamicStadiumExperience must not call .upsert()");
  assert.ok(!dynCode.includes(".insert("), "DynamicStadiumExperience must not call .insert()");
  assert.ok(!dynCode.includes("adminClient"), "DynamicStadiumExperience must not touch adminClient");
});

test("V7F.1B UI Elements — Progression widget, Next milestone, and 5-stage pathway", () => {
  const dynCode = fs.readFileSync(path.join(rootDir, "components/player/DynamicStadiumExperience.tsx"), "utf8");
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // PlayerExperience3D hero progression widget
  assert.ok(
    expCode.includes('data-testid="stadium-progression-widget"') && expCode.includes("v7f-stadium-progression-widget"),
    "PlayerExperience3D must render stadium-progression-widget in Hero"
  );

  // DynamicStadiumExperience HUD progression box
  assert.ok(
    dynCode.includes('data-testid="hud-stadium-progression"') && dynCode.includes("v7e2-hud-stadium-progression-box"),
    "DynamicStadiumExperience must render hud-stadium-progression in right HUD"
  );

  // DynamicStadiumExperience 5-tier pathway
  assert.ok(
    dynCode.includes("v7f-stadium-pathway-card") && dynCode.includes("STADIUM_TIERS.map"),
    "DynamicStadiumExperience must render 5-tier pathway in left stage card"
  );

  // Promotion celebration banner exists and has close button
  assert.ok(
    dynCode.includes("v7f-promotion-banner") && dynCode.includes("v7f-promotion-close"),
    "DynamicStadiumExperience must render promotion banner"
  );
});

test("V7F.1B Accessibility & Prefers-Reduced-Motion", () => {
  const css = fs.readFileSync(path.join(rootDir, "components/player/player-career-hub.css"), "utf8");

  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)") &&
    css.includes(".v7f-stadium-fill") &&
    css.includes(".v7e2-hud-stadium-fill") &&
    css.includes(".v7f-promotion-banner"),
    "player-career-hub.css must disable animations under prefers-reduced-motion"
  );
});
