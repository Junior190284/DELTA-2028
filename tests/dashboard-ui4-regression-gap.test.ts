import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("DELTA-023: Regression Test — Empty Space & Layout Stabilization between Hero and Communications", async (t) => {
  const homeDashboardPath = path.resolve(process.cwd(), "components/dashboard/ui4/home-dashboard.tsx");
  const deltaElitePath = path.resolve(process.cwd(), "components/dashboard/ui4/delta-elite-41.tsx");
  const collectionDashboardPath = path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx");
  const cssPath = path.resolve(process.cwd(), "components/dashboard/ui4/delta-elite-41.css");

  const homeSrc = fs.readFileSync(homeDashboardPath, "utf-8");
  const eliteSrc = fs.readFileSync(deltaElitePath, "utf-8");
  const colSrc = fs.readFileSync(collectionDashboardPath, "utf-8");
  const cssSrc = fs.readFileSync(cssPath, "utf-8");

  await t.test("1. HOME Desktop structures Hero and Communications in the same left column container without an empty row", () => {
    // Both Hero and Communications must be inside the left column container (lg:col-span-8)
    assert.ok(homeSrc.includes('data-testid="e41-event-hero"'), "Must feature e41-event-hero");
    assert.ok(homeSrc.includes('data-testid="e41-club-communications"'), "Must feature e41-club-communications");

    // Communications must directly follow Hero inside the same column
    const heroIndex = homeSrc.indexOf('data-testid="e41-event-hero"');
    const commsIndex = homeSrc.indexOf('data-testid="e41-club-communications"');
    const rightColIndex = homeSrc.indexOf('lg:col-span-4');

    assert.ok(heroIndex < commsIndex, "Matchday hero must precede club communications");
    assert.ok(commsIndex < rightColIndex, "Club communications must reside in the left column (before right column starts)");

    // Must not use disconnected d4-dashboard-row-2 in home dashboard that creates an empty gap under the hero
    assert.ok(!homeSrc.includes('className="d4-dashboard-row-2"'), "Home dashboard must not use a separate row-2 that creates an empty void under hero");
  });

  await t.test("2. HOME Right Column structures Passport, Collection, and Team Showcase together", () => {
    assert.ok(homeSrc.includes('data-testid="e41-passport-section"'), "Must feature e41-passport-section");
    assert.ok(homeSrc.includes('data-testid="e41-collection-section"'), "Must feature e41-collection-section");
    assert.ok(homeSrc.includes('data-testid="e41-team-showcase"'), "Must feature e41-team-showcase");

    const passportIndex = homeSrc.indexOf('data-testid="e41-passport-section"');
    const collectionIndex = homeSrc.indexOf('data-testid="e41-collection-section"');
    const teamIndex = homeSrc.indexOf('data-testid="e41-team-showcase"');

    assert.ok(passportIndex < collectionIndex, "Passport must precede collection shortcut");
    assert.ok(collectionIndex < teamIndex, "Collection shortcut must precede team showcase in right column");
  });

  await t.test("3. Differentiates seasonal attendance rate from single-match attendance confirmations", () => {
    // Single-match confirmation wording in hero
    assert.ok(homeSrc.includes("potwierdzonych obecności na mecz"), "Hero must explicitly describe match confirmations");
    // Seasonal attendance in passport progress
    assert.ok(homeSrc.includes("Frekwencja sez."), "Passport must explicitly describe seasonal attendance");
  });

  await t.test("4. COLLECTION retains approved 2-row layout without unwanted modifications", () => {
    assert.ok(colSrc.includes('data-testid="e41-collection-section"'), "Collection must feature main card section");
    assert.ok(colSrc.includes('d4-dashboard-row-1'), "Collection must use d4-dashboard-row-1 for top row");
    assert.ok(colSrc.includes('d4-dashboard-row-2'), "Collection must use d4-dashboard-row-2 for bottom row");
  });

  await t.test("5. delta-elite-41.tsx remains synchronized with home-dashboard.tsx layout architecture", () => {
    assert.ok(eliteSrc.includes('data-testid="e41-club-communications"'), "Elite 4.1 must feature club communications in left column");
    assert.ok(eliteSrc.includes('data-testid="e41-passport-section"'), "Elite 4.1 must feature passport in right column");
    assert.ok(eliteSrc.includes('data-testid="e41-team-showcase"'), "Elite 4.1 must feature team showcase in right column");
    assert.ok(!eliteSrc.includes('className="d4-dashboard-row-2"'), "Elite 4.1 must not use separated row-2");
  });
});
