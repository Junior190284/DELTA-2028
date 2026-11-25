import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createDashboardUI4Model } from "../components/dashboard/ui4/adapter.ts";
import type { DashboardUI4AdapterInput } from "../components/dashboard/ui4/types.ts";

test("Dashboard UI 4.0 Hybrid Elite — Architecture & Styling Verification", async (t) => {
  const cssPath = path.resolve("components/dashboard/ui4/dashboard-ui4.css");
  const pagePath = path.resolve("app/preview/dashboard-ui4/page.tsx");
  const componentsPath = path.resolve("components/dashboard/ui4/components.tsx");

  await t.test("1. Dark Sport Premium CSS defines core palette and stadium lighting", () => {
    assert.ok(fs.existsSync(cssPath), "dashboard-ui4.css must exist");
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.match(css, /--d4-bg-deep:\s*#030712/, "Must define deep dark navy background");
    assert.match(css, /--d4-gold:\s*#f5c451/, "Must define championship gold accent");
    assert.match(css, /--d4-blue:\s*#38bdf8/, "Must define electric sky blue accent");
    assert.match(css, /\.d4-stadium-glow/, "Must define stadium ambient lighting effect");
    assert.match(css, /\.d4-progress-track/, "Must define styled athletic progress track");
    assert.match(css, /\[data-state="empty"\]/, "Must style empty states");
    assert.match(css, /\[data-state="unavailable"\]/, "Must style unavailable/restricted states");
  });

  await t.test("2. components.tsx defines all required data-ui4-component contracts", () => {
    assert.ok(fs.existsSync(componentsPath), "components.tsx must exist");
    const comp = fs.readFileSync(componentsPath, "utf-8");

    const requiredComponents = [
      "hybrid-player-header",
      "next-action-hero",
      "player-progress-strip",
      "recent-cards-panel",
      "album-progress-panel",
      "recent-achievements-panel",
      "team-showcase-gateway",
      "club-communications-panel"
    ];

    for (const name of requiredComponents) {
      assert.ok(
        comp.includes(`data-ui4-component="${name}"`),
        `Missing data-ui4-component="${name}" in components.tsx`
      );
    }
  });

  await t.test("3. app/preview/dashboard-ui4/page.tsx defines isolated demo preview with safe scenarios", () => {
    assert.ok(fs.existsSync(pagePath), "page.tsx must exist");
    const page = fs.readFileSync(pagePath, "utf-8");

    assert.match(page, /TRYB DEMO — DELTA UI 4\.0 HYBRID ELITE/, "Must display prominent DEMO banner");
    assert.match(page, /"use client"/, "Must be a client component for interactive preview");
    assert.match(page, /dashboard-ui4\.css/, "Must import dashboard-ui4.css");
    assert.match(page, /elitePlayerFixture/, "Must define elite player scenario");
    assert.match(page, /parentFixture/, "Must define parent profile scenario");
    assert.match(page, /emptyFixture/, "Must define empty new-user scenario");
    assert.match(page, /restrictedFixture/, "Must define restricted access scenario");
  });

  await t.test("4. Model adapter safely maps elite player fixtures without mutations", () => {
    const input: DashboardUI4AdapterInput = {
      profile: { id: "p1", role: "player", display_name: "Zawodnik Alfa" },
      access: { canViewCollection: true, canViewAchievements: true, canViewTeamShowcase: true, canViewClubCommunications: true },
      players: [{ id: "p1", display_name: "Zawodnik Alfa", shirt_number: null, position: null }],
      nextMatch: { id: "m1", title: "Drużyna Testowa vs Rywale", starts_at: "2026-12-05T12:00:00Z" },
      gameProfile: {
        currentXP: 2450,
        seasonXP: 1120,
        levelInfo: { level: 12, currentLevelXP: 350, nextLevelXP: 600, progressPercent: 58, title: "Zawodnik Elity" },
        activityStreak: 7,
        maxStreak: 14,
        unopenedPacks: 3
      },
      allCards: [{ id: "c1", name: "Karta Alfa Inferno", rarity: "inferno" }],
      userCards: [{ id: "uc1", card_definition_id: "c1", quantity: 1, card_definition: { id: "c1", name: "Karta Alfa Inferno", rarity: "inferno" } }],
      achievements: [{ achievement_id: "a1", isUnlocked: true, achievement: { id: "a1", name: "Aktywny Uczestnik" } }],
      news: [{ id: "n1", title: "Finał Turnieju", urgent: true }]
    };

    const model = createDashboardUI4Model(input);

    assert.equal(model.profile.actorKind, "player");
    assert.equal(model.profile.player.status, "available");
    assert.equal(model.profile.player.data?.displayName, "Zawodnik Alfa");
    assert.equal(model.profile.player.data?.shirtNumber, null);
    assert.equal(model.nextAction.status, "available");
    assert.equal(model.nextAction.data?.kind, "match");
    assert.equal(model.progress.data?.level, 12);
    assert.equal(model.progress.data?.title, "Zawodnik Elity");
    assert.equal(model.recentCards.data?.length, 1);
    assert.equal(model.recentCards.data?.[0]?.rarity, "inferno");
    assert.equal(model.albumProgress.data?.unopenedPacks, 3);
    assert.equal(model.recentAchievements.data?.length, 1);
    assert.equal(model.clubCommunications.data?.[0]?.urgent, true);
  });
});
