import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MINIGAME_LEVEL_DP_REWARDS,
  getMinigameLevelReward
} from "../lib/economy/security.ts";

const rootDir = process.cwd();

test("1. Minigames Reward Engine — Authoritative Server DP Constants (DELTA-049A)", () => {
  // Check that all 10 levels have formal DP rewards
  assert.equal(getMinigameLevelReward(1), 20, "Level 1 reward must be 20 DP");
  assert.equal(getMinigameLevelReward(2), 25, "Level 2 reward must be 25 DP");
  assert.equal(getMinigameLevelReward(3), 35, "Level 3 reward must be 35 DP");
  assert.equal(getMinigameLevelReward(4), 45, "Level 4 reward must be 45 DP");
  assert.equal(getMinigameLevelReward(5), 60, "Level 5 reward must be 60 DP");
  assert.equal(getMinigameLevelReward(6), 75, "Level 6 reward must be 75 DP");
  assert.equal(getMinigameLevelReward(7), 90, "Level 7 reward must be 90 DP");
  assert.equal(getMinigameLevelReward(8), 110, "Level 8 reward must be 110 DP");
  assert.equal(getMinigameLevelReward(9), 135, "Level 9 reward must be 135 DP");
  assert.equal(getMinigameLevelReward(10), 200, "Level 10 reward must be 200 DP");
  assert.equal(getMinigameLevelReward(99), 0, "Invalid level must yield 0 DP");
});

test("2. Minigames Claim API Route & Atomic Server Transaction (DELTA-049A)", () => {
  const claimRoutePath = path.join(rootDir, "app/api/minigames/claim-reward/route.ts");
  assert.ok(fs.existsSync(claimRoutePath), "app/api/minigames/claim-reward/route.ts must exist");
  const claimSrc = fs.readFileSync(claimRoutePath, "utf-8");

  assert.ok(
    claimSrc.includes("claimMinigameLevelRewardServerSide"),
    "Route must invoke server-side authoritative claim function"
  );
  assert.ok(
    claimSrc.includes("createAdminClient"),
    "Route must use adminClient for atomic RPC invocation"
  );
  assert.ok(
    claimSrc.includes("getUser()"),
    "Route must verify authenticated session"
  );

  const serverRpcPath = path.join(rootDir, "lib/economy/server-rpc.ts");
  const serverRpcSrc = fs.readFileSync(serverRpcPath, "utf-8");
  assert.ok(
    serverRpcSrc.includes("claim_reward_once_atomic"),
    "claimMinigameLevelRewardServerSide must use claim_reward_once_atomic"
  );
  assert.ok(
    serverRpcSrc.includes("minigame:${cleanGameId}:lvl_${safeLevel}"),
    "Must use scoped idempotent reward key"
  );
});

test("3. Minigames Modal UI & Wallet Synchronisation (DELTA-049A)", () => {
  const modalPath = path.join(rootDir, "components/DeltaSkillMiniGamesModal.tsx");
  const modalSrc = fs.readFileSync(modalPath, "utf-8");

  assert.ok(
    modalSrc.includes('fetch("/api/minigames/claim-reward"'),
    "Modal must call server claim-reward endpoint"
  );
  assert.ok(
    modalSrc.includes("dispatchCollectionUpdated"),
    "Modal must dispatch collection-updated event to refresh Skarbiec and Collection balance"
  );
  assert.ok(
    modalSrc.includes("claimingReward"),
    "Modal must prevent multiple clicks with claimingReward loading state"
  );
  assert.ok(
    modalSrc.includes("ALREADY_CLAIMED"),
    "Modal must gracefully recover if reward was already claimed"
  );
});

test("4. Dynamic Tactics Board — 5 vs 5 & 6 vs 6 Formations Architecture (DELTA-049B)", () => {
  const tacticsModalPath = path.join(rootDir, "components/DeltaTacticsBoardModal.tsx");
  assert.ok(fs.existsSync(tacticsModalPath), "DeltaTacticsBoardModal.tsx must exist");
  const tacticsSrc = fs.readFileSync(tacticsModalPath, "utf-8");

  // Validate 5v5 definitions
  assert.ok(tacticsSrc.includes("FORMATIONS_5V5"), "Must define FORMATIONS_5V5");
  assert.ok(tacticsSrc.includes('"2-2"'), "5v5 must include 2-2");
  assert.ok(tacticsSrc.includes('"1-2-1"'), "5v5 must include 1-2-1");
  assert.ok(tacticsSrc.includes('"2-1-1"'), "5v5 must include 2-1-1");
  assert.ok(tacticsSrc.includes('"1-3"'), "5v5 must include 1-3");

  // Validate 6v6 definitions
  assert.ok(tacticsSrc.includes("FORMATIONS_6V6"), "Must define FORMATIONS_6V6");
  assert.ok(tacticsSrc.includes('"2-3"'), "6v6 must include 2-3");
  assert.ok(tacticsSrc.includes('"3-2"'), "6v6 must include 3-2");
  assert.ok(tacticsSrc.includes('"1-3-1"'), "6v6 must include 1-3-1");
  assert.ok(tacticsSrc.includes('"2-2-1"'), "6v6 must include 2-2-1");

  // Validate interactive controls
  assert.ok(
    tacticsSrc.includes("handleFormatChange"),
    "Must have format change handler (5v5 vs 6v6)"
  );
  assert.ok(
    tacticsSrc.includes("handlePointerMovePitch") && tacticsSrc.includes("handlePointerDownNode"),
    "Must have touch and pointer drag-and-drop movement"
  );
  assert.ok(
    tacticsSrc.includes("localStorage.setItem"),
    "Must persist tactics board configurations across sessions"
  );
  assert.ok(
    tacticsSrc.includes("assignedPlayerId: null"),
    "Must avoid duplicate player assignment on the pitch"
  );
});
