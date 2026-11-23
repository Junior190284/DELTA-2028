import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("DELTA-009: Dashboard UI 4.0 & DELTA ELITE 4.1 Verification", () => {
  it("1. Exports all variants including DeltaElite41 cleanly from index.ts", () => {
    const indexPath = path.resolve("components/dashboard/ui4/index.ts");
    assert.ok(fs.existsSync(indexPath), "index.ts must exist");
    const indexSrc = fs.readFileSync(indexPath, "utf-8");

    assert.ok(indexSrc.includes('VariantSport'), "VariantSport must be exported");
    assert.ok(indexSrc.includes('VariantCollector'), "VariantCollector must be exported");
    assert.ok(indexSrc.includes('VariantHybrid'), "VariantHybrid must be exported");
    assert.ok(indexSrc.includes('DeltaElite41'), "DeltaElite41 must be exported");
  });

  it("2. Verifies distinct DOM contracts, dominant heroes, and ethical youth safety", () => {
    const elite41Src = fs.readFileSync(
      path.resolve("components/dashboard/ui4/delta-elite-41.tsx"),
      "utf-8"
    );
    const sportSrc = fs.readFileSync(
      path.resolve("components/dashboard/ui4/variants/variant-sport.tsx"),
      "utf-8"
    );
    const collectorSrc = fs.readFileSync(
      path.resolve("components/dashboard/ui4/variants/variant-collector.tsx"),
      "utf-8"
    );
    const hybridSrc = fs.readFileSync(
      path.resolve("components/dashboard/ui4/variants/variant-hybrid.tsx"),
      "utf-8"
    );

    // Dominant heroes
    assert.ok(elite41Src.includes('data-testid="e41-event-hero"'), "Elite 4.1 must feature event hero");
    assert.ok(elite41Src.includes('data-testid="e41-collection-section"'), "Elite 4.1 must feature collection section");
    assert.ok(elite41Src.includes('DeltaCard'), "Elite 4.1 must reuse authentic DeltaCard component");

    // Correct age category (2018 -> U-9)
    assert.ok(elite41Src.includes("U-9"), "Elite 4.1 must specify correct U-9 age category");

    // Must NOT contain artificial FIFA-style skill ratings for children
    for (const src of [elite41Src, sportSrc, collectorSrc, hybridSrc]) {
      assert.ok(!/\bOVR\b/.test(src), "No artificial overall skill ratings for youth");
      assert.ok(!/\bPAC\b/.test(src), "No artificial pace skill ratings");
      assert.ok(!/\bSHO\b/.test(src), "No artificial shooting skill ratings");
      assert.ok(!/\bDEF\b/.test(src), "No artificial defense skill ratings");
    }
  });

  it("3. Verifies styling defines athletic tokens, tabular numbers, and touch targets", () => {
    const css = fs.readFileSync(
      path.resolve("components/dashboard/ui4/delta-elite-41.css"),
      "utf-8"
    );

    assert.ok(css.includes(".e41-num"), "Must define tabular number class");
    assert.ok(css.includes("min-height: 48px"), "Must guarantee touch targets >= 44px");
    assert.ok(css.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
    assert.ok(css.includes("--e41-navy-bg"), "Must define dark navy palette");
  });

  it("4. Verifies page.tsx supports DELTA ELITE 4.1 default, QA mode toggle, and baseline", () => {
    const pageSrc = fs.readFileSync(
      path.resolve("app/preview/dashboard-ui4/page.tsx"),
      "utf-8"
    );

    assert.ok(pageSrc.includes('activeVariant === "elite41"'), "Must render DeltaElite41");
    assert.ok(pageSrc.includes('e41-qa-toggle'), "Must provide QA mode toggle");
    assert.ok(pageSrc.includes("TRYB DEMO — DELTA UI 4.0 HYBRID ELITE"), "Must retain test-compatible banner in QA mode");
  });

  it("5. DELTA-010: Verifies strict conditional guards for empty, unavailable and parent states in DeltaElite41", () => {
    const elite41Src = fs.readFileSync(
      path.resolve("components/dashboard/ui4/delta-elite-41.tsx"),
      "utf-8"
    );

    // Conditional guard for event CTA: only rendered when nextAction is available
    assert.ok(
      elite41Src.includes('nextAction.status === "available" && nextAction.data ?'),
      "Event details, countdown and attendance CTA must only render when nextAction is available"
    );

    // Guard for empty state: no fake countdown, no attendance CTA
    assert.ok(
      elite41Src.includes('nextAction.status === "empty"'),
      "Must have explicit empty state without fake countdown"
    );

    // Guard for restricted / unavailable state
    assert.ok(
      elite41Src.includes('nextAction.status === "unavailable"') || elite41Src.includes('Harmonogram meczowy jest zastrzeżony'),
      "Must have explicit unavailable state for match schedule"
    );

    // Guard for card collection: only rendered when available, no cards leaked when unavailable
    assert.ok(
      elite41Src.includes('albumProgress.status === "available" && recentCards.status === "available" ?'),
      "Card collection must be guarded against unauthorized data leaks"
    );
    assert.ok(
      elite41Src.includes('Kolekcja kart jest zastrzeżona'),
      "Must protect cards and stats from leaking in unauthorized state"
    );

    // Guard for Parent scenario: shows linked player explicitly
    assert.ok(
      elite41Src.includes('isParent ?'),
      "Must contain parent conditional rendering"
    );
    assert.ok(
      elite41Src.includes('Podopieczny:'),
      "Parent view must specifically display linked child information"
    );
    assert.ok(
      elite41Src.includes('POTWIERDŹ OBECNOŚĆ PODOPIECZNEGO'),
      "Parent CTA must specifically refer to the child"
    );
  });
});

