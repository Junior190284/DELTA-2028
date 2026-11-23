import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardUI4Model } from "../components/dashboard/ui4/adapter.ts";
import type { DashboardUI4AdapterInput } from "../components/dashboard/ui4/types.ts";

const access = { canViewCollection: true, canViewAchievements: true, canViewTeamShowcase: true, canViewClubCommunications: true };
const fixture = (): DashboardUI4AdapterInput => ({
  profile: { id: "parent-1", role: "parent", display_name: "Rodzic" }, access,
  parentPlayerIds: ["player-1"],
  players: [{ id: "player-1", display_name: "Alex", shirt_number: 10 }, { id: "player-2", display_name: "Sam" }],
  nextMatch: { id: "match-1", title: "DELTA — Rywale", starts_at: "2026-12-01T10:00:00Z" },
  gameProfile: { currentXP: 1250, seasonXP: 450, levelInfo: { level: 8, currentLevelXP: 200, nextLevelXP: 500, progressPercent: 40, title: "Playmaker" }, activityStreak: 4, maxStreak: 9, unopenedPacks: 2 },
  allCards: [{ id: "def-1", name: "Alex Gold" }, { id: "def-2", name: "Sam Base" }],
  userCards: [{ id: "owned-1", card_definition_id: "def-1", quantity: 2, acquired_at: "2026-11-20T10:00:00Z", card_definition: { id: "def-1", name: "Alex Gold", player: { id: "player-1", display_name: "Alex" } } }],
  achievements: [{ achievement_id: "achievement-1", isUnlocked: true, unlockedAt: "2026-11-21T10:00:00Z", achievement: { id: "achievement-1", name: "Seria treningów" } }],
  news: [{ id: "news-1", title: "Turniej", published_at: "2026-11-22T10:00:00Z" }], clubUpdates: [],
});

test("maps existing domain data without recalculating XP or achievements", () => {
  const model = createDashboardUI4Model(fixture());
  assert.equal(model.profile.player.data?.id, "player-1");
  assert.equal(model.progress.data?.currentXP, 1250);
  assert.equal(model.recentCards.data?.[0]?.definitionId, "def-1");
  assert.deepEqual(model.albumProgress.data, { owned: 1, total: 2, percent: 50, duplicates: 1, unopenedPacks: 2 });
  assert.equal(model.recentAchievements.data?.[0]?.id, "achievement-1");
  assert.equal(model.teamShowcase.data?.playerCount, 2);
});

test("represents loaded empty domains explicitly", () => {
  const input = fixture();
  Object.assign(input, { nextMatch: null, nextTraining: null, allCards: [], userCards: [], achievements: [], players: [], news: [] });
  const model = createDashboardUI4Model(input);
  assert.deepEqual([model.nextAction.status, model.recentCards.status, model.albumProgress.status, model.recentAchievements.status, model.teamShowcase.status, model.clubCommunications.status], ["empty", "empty", "empty", "empty", "empty", "empty"]);
});

test("denied permissions never expose protected data", () => {
  const input = fixture(); input.access = { canViewCollection: false, canViewAchievements: false, canViewTeamShowcase: false, canViewClubCommunications: false };
  const model = createDashboardUI4Model(input);
  for (const section of [model.recentCards, model.albumProgress, model.recentAchievements, model.teamShowcase, model.clubCommunications]) {
    assert.equal(section.status, "unavailable"); assert.equal(section.reason, "not_authorized"); assert.equal(section.data, null);
  }
});

test("parent never falls back to an unlinked player", () => {
  const input = fixture(); input.parentPlayerIds = ["missing"];
  const model = createDashboardUI4Model(input);
  assert.equal(model.profile.player.reason, "no_linked_player"); assert.equal(model.profile.player.data, null);
});

test("missing inputs remain unavailable without synthetic values", () => {
  const model = createDashboardUI4Model({ profile: { id: "user-1" }, access });
  assert.equal(model.progress.status, "unavailable"); assert.equal(model.progress.data, null);
  assert.equal(model.recentCards.status, "unavailable"); assert.equal(model.nextAction.status, "unavailable");
});
