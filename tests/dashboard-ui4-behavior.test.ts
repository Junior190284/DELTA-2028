import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createDashboardUI4Model
} from "../components/dashboard/ui4/adapter.ts";
import type {
  DashboardUI4AdapterInput
} from "../components/dashboard/ui4/types.ts";

/**
 * DELTA-014: Behavioral and Security Testing Suite
 * Verifies runtime data behavior, access boundaries, simulation notices, and event mapping.
 */
test("DELTA-014 — Behavioral and Access Security Verification", async (t) => {
  const rootDir = process.cwd();
  const componentsDir = path.join(rootDir, "components", "dashboard", "ui4");

  await t.test("1. Restricted scenario guarantees zero leakage of cards, packs and achievements", () => {
    const restrictedInput: DashboardUI4AdapterInput = {
      profile: { id: "user-restricted", role: "user", display_name: "Użytkownik Ograniczony" },
      access: {
        canViewCollection: false,
        canViewAchievements: false,
        canViewTeamShowcase: false,
        canViewClubCommunications: false
      },
      // Even if raw user cards were passed in input, access flags must block them completely
      userCards: [
        { id: "uc-1", card_definition: { id: "c-1", name: "Leaked Card", rarity: "inferno" } }
      ],
      achievements: [
        { id: "ach-1", isUnlocked: true, achievement: { id: "ach-1", name: "Leaked Ach" } }
      ]
    };

    const model = createDashboardUI4Model(restrictedInput);

    assert.equal(model.recentCards.status, "unavailable");
    assert.equal(model.recentCards.data, null);
    assert.equal(model.recentCards.reason, "not_authorized");

    assert.equal(model.albumProgress.status, "unavailable");
    assert.equal(model.albumProgress.data, null);
    assert.equal(model.albumProgress.reason, "not_authorized");

    assert.equal(model.recentAchievements.status, "unavailable");
    assert.equal(model.recentAchievements.data, null);
    assert.equal(model.recentAchievements.reason, "not_authorized");

    assert.equal(model.teamShowcase.status, "unavailable");
    assert.equal(model.teamShowcase.data, null);
    assert.equal(model.teamShowcase.reason, "not_authorized");

    assert.equal(model.clubCommunications.status, "unavailable");
    assert.equal(model.clubCommunications.data, null);
    assert.equal(model.clubCommunications.reason, "not_authorized");
  });

  await t.test("2. Empty scenario explicitly represents absence of match without fake countdowns", () => {
    const emptyInput: DashboardUI4AdapterInput = {
      profile: { id: "user-empty", role: "player", display_name: "Zawodnik Beta" },
      access: {
        canViewCollection: true,
        canViewAchievements: true,
        canViewTeamShowcase: true,
        canViewClubCommunications: true
      },
      nextMatch: null,
      nextTraining: null
    };

    const model = createDashboardUI4Model(emptyInput);

    assert.equal(model.nextAction.status, "empty");
    assert.equal(model.nextAction.data, null);
  });

  await t.test("3. Parent scenario links strictly to authorized child and never leaks unlinked child", () => {
    const linkedInput: DashboardUI4AdapterInput = {
      profile: { id: "parent-1", role: "parent", display_name: "Opiekun Demo" },
      access: { canViewCollection: true, canViewAchievements: true, canViewTeamShowcase: true, canViewClubCommunications: true },
      players: [
        { id: "child-alpha", display_name: "Zawodnik Alfa", active: true },
        { id: "child-stranger", display_name: "Nieznany Zawodnik", active: true }
      ],
      parentPlayerIds: ["child-alpha"]
    };

    const linkedModel = createDashboardUI4Model(linkedInput);
    assert.equal(linkedModel.profile.actorKind, "parent");
    assert.equal(linkedModel.profile.player.status, "available");
    assert.equal(linkedModel.profile.player.data?.displayName, "Zawodnik Alfa");

    // When parent has no linked players, it must NOT fallback to stranger
    const unlinkedInput: DashboardUI4AdapterInput = {
      ...linkedInput,
      parentPlayerIds: []
    };
    const unlinkedModel = createDashboardUI4Model(unlinkedInput);
    assert.equal(unlinkedModel.profile.player.status, "unavailable");
    assert.equal(unlinkedModel.profile.player.data, null);
    assert.equal(unlinkedModel.profile.player.reason, "no_linked_player");
  });

  await t.test("4. Attendance button in all UI4 components explicitly communicates simulation and no server save", () => {
    const deltaEliteSrc = fs.readFileSync(path.join(componentsDir, "delta-elite-41.tsx"), "utf-8");
    const variantSportSrc = fs.readFileSync(path.join(componentsDir, "variants", "variant-sport.tsx"), "utf-8");
    const variantHybridSrc = fs.readFileSync(path.join(componentsDir, "variants", "variant-hybrid.tsx"), "utf-8");

    // delta-elite-41 simulation indicators
    assert.match(deltaEliteSrc, /SYMULACJA: POTWIERDŹ OBECNOŚĆ/, "delta-elite-41 CTA must include SYMULACJA prefix");
    assert.match(deltaEliteSrc, /TRYB DEMO — SYMULACJA LOKALNA, BRAK ZAPISU W BAZIE DANYCH/, "delta-elite-41 must state no database write");
    assert.match(deltaEliteSrc, /Brak rzeczywistego zapisu w bazie danych/, "delta-elite-41 must inform user that state is client mock only");

    // variant-sport simulation indicators
    assert.match(variantSportSrc, /SYMULACJA: POTWIERDŹ OBECNOŚĆ \[TRYB DEMO\]/, "variant-sport CTA must include simulation notice");

    // variant-hybrid simulation indicators
    assert.match(variantHybridSrc, /SYMULACJA: POTWIERDŹ OBECNOŚĆ \[TRYB DEMO\]/, "variant-hybrid CTA must include simulation notice");
  });

  await t.test("5. Absence of event strictly eliminates attendance button in all variants", () => {
    const deltaEliteSrc = fs.readFileSync(path.join(componentsDir, "delta-elite-41.tsx"), "utf-8");
    const variantSportSrc = fs.readFileSync(path.join(componentsDir, "variants", "variant-sport.tsx"), "utf-8");

    // Both components must place the attendance CTA strictly inside nextAction.status === 'available'
    assert.ok(
      deltaEliteSrc.includes('nextAction.status === "available" && nextAction.data ?'),
      "delta-elite-41 event CTA must be strictly inside available state"
    );
    assert.ok(
      variantSportSrc.includes('nextAction.status === "available" && nextAction.data ?'),
      "variant-sport event CTA must be strictly inside available state"
    );
  });

  await t.test("6. Dynamic event mapping preserves data from input without hardcoded overrides", () => {
    const matchInput: DashboardUI4AdapterInput = {
      profile: { id: "p1", role: "player", display_name: "Zawodnik Alfa" },
      access: { canViewCollection: true, canViewAchievements: true, canViewTeamShowcase: true, canViewClubCommunications: true },
      nextMatch: {
        id: "custom-match-99",
        title: "DELTA vs Drużyna Testowa",
        starts_at: "2026-11-28T15:30:00.000Z",
        location: "Stadion Testowy DELTA",
        opponent: "Drużyna Testowa"
      }
    };

    const model = createDashboardUI4Model(matchInput);
    assert.equal(model.nextAction.status, "available");
    assert.equal(model.nextAction.data?.opponent, "Drużyna Testowa");
    assert.equal(model.nextAction.data?.location, "Stadion Testowy DELTA");
    assert.equal(model.nextAction.data?.startsAt, "2026-11-28T15:30:00.000Z");
  });
});
