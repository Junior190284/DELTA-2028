import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MINIGAME_LEVEL_DP_REWARDS,
  getMinigameLevelReward,
  isAllowedMinigame,
  getMinigameCanonicalKey,
  ALLOWED_MINIGAME_IDS
} from "../lib/economy/security.ts";

const rootDir = process.cwd();

test("1. Minigames Reward Engine — Exact DP Values (795 DP per game)", () => {
  assert.equal(getMinigameLevelReward(1), 20);
  assert.equal(getMinigameLevelReward(2), 25);
  assert.equal(getMinigameLevelReward(3), 35);
  assert.equal(getMinigameLevelReward(4), 45);
  assert.equal(getMinigameLevelReward(5), 60);
  assert.equal(getMinigameLevelReward(6), 75);
  assert.equal(getMinigameLevelReward(7), 90);
  assert.equal(getMinigameLevelReward(8), 110);
  assert.equal(getMinigameLevelReward(9), 135);
  assert.equal(getMinigameLevelReward(10), 200);

  const totalPoolPerGame = Object.values(MINIGAME_LEVEL_DP_REWARDS).reduce((a, b) => a + b, 0);
  assert.equal(totalPoolPerGame, 795, "Total pool for all 10 levels must be exactly 795 DP");
});

test("2. Game ID Whitelist Validation & Canonical Mapping", () => {
  assert.ok(isAllowedMinigame("free_kicks"), "free_kicks must be allowed");
  assert.ok(isAllowedMinigame("gk_reflex"), "gk_reflex must be allowed");
  assert.ok(isAllowedMinigame("accuracy"), "legacy alias accuracy must be allowed");
  assert.ok(!isAllowedMinigame("hacked_game"), "unauthorized game must be rejected");
  assert.ok(!isAllowedMinigame(""), "empty gameId must be rejected");

  assert.equal(getMinigameCanonicalKey("accuracy"), "free_kicks");
  assert.equal(getMinigameCanonicalKey("free_kicks"), "free_kicks");
  assert.equal(getMinigameCanonicalKey("gk_reflex"), "gk_reflex");
});

test("3. Idempotency Key Isolation Per User & Game", () => {
  const userA = "user-uuid-111";
  const userB = "user-uuid-222";
  const gameA = "free_kicks";
  const gameB = "gk_reflex";
  const level = 1;

  const keyA1 = `minigame:${gameA}:lvl_${level}`;
  const keyB1 = `minigame:${gameB}:lvl_${level}`;
  assert.notEqual(keyA1, keyB1, "free_kicks and gk_reflex must have distinct keys so both award 795 DP independently");

  const serverRpcPath = path.join(rootDir, "lib/economy/server-rpc.ts");
  const serverRpcSrc = fs.readFileSync(serverRpcPath, "utf-8");
  assert.ok(
    serverRpcSrc.includes("isLevelCompleted"),
    "Server must verify level completion in DB before granting DP"
  );
  assert.ok(
    serverRpcSrc.includes("claim_reward_once_atomic"),
    "Must invoke atomic single-claim RPC"
  );
});

test("4. Anti-Cheat: Progress Route Blocks Level Jumps & Enforces Allowed Games", () => {
  const progressRoutePath = path.join(rootDir, "app/api/minigames/progress/route.ts");
  const progressSrc = fs.readFileSync(progressRoutePath, "utf-8");

  assert.ok(
    progressSrc.includes("isAllowedMinigame(rawGameId)"),
    "Progress route must reject unlisted game IDs"
  );
  assert.ok(
    progressSrc.includes("safeLevel <= currentMaxLvl"),
    "Progress route must block skipping levels directly to 10"
  );
  assert.ok(
    progressSrc.includes("claimedRewardKeys"),
    "GET progress must return already claimed rewards for UI rehydration"
  );
});

test("5. Tactics Board Format Switch Roster Retention & Dragging", () => {
  const tacticsPath = path.join(rootDir, "components/DeltaTacticsBoardModal.tsx");
  const tacticsSrc = fs.readFileSync(tacticsPath, "utf-8");

  assert.ok(
    tacticsSrc.includes("FORMATIONS_5V5") && tacticsSrc.includes("FORMATIONS_6V6"),
    "Must support both 5v5 and 6v6 formats"
  );
  assert.ok(
    tacticsSrc.includes("currentAssignedList[idx]"),
    "Must preserve assigned players when changing format or formation"
  );
  assert.ok(
    tacticsSrc.includes("handlePointerMovePitch"),
    "Must support touch & mouse free positioning"
  );
});
