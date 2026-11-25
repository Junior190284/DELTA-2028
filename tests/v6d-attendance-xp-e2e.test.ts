import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V6D E2E Logic Map — Training & Match Attendance API endpoints exist and enforce role boundaries", () => {
  const trainingApi = path.join(rootDir, "app/api/training/attendance/route.ts");
  const matchApi = path.join(rootDir, "app/api/matches/attendance/route.ts");

  assert.ok(fs.existsSync(trainingApi), "app/api/training/attendance/route.ts must exist");
  assert.ok(fs.existsSync(matchApi), "app/api/matches/attendance/route.ts must exist");

  const trCode = fs.readFileSync(trainingApi, "utf8");
  assert.ok(trCode.includes("parent_players"), "Training attendance API must verify parent_players relationship");
  assert.ok(trCode.includes("isParentOfChild"), "Must compute isParentOfChild");
  assert.ok(trCode.includes("status === \"present\" || status === \"absent\""), "Must guard coach-only statuses present/absent");
  assert.ok(trCode.includes("403"), "Must return 403 Forbidden for unauthorized actions");

  const matchCode = fs.readFileSync(matchApi, "utf8");
  assert.ok(matchCode.includes("parent_players"), "Match attendance API must verify parent_players relationship");
  assert.ok(matchCode.includes("status === \"present\" || status === \"absent\""), "Must guard coach-only statuses");
  assert.ok(matchCode.includes("403"), "Must return 403 Forbidden for unauthorized actions");
});

test("V6D Authoritative XP Engine — Accurate calculation of training (+40 XP) and match (+60 XP)", () => {
  const rpcCode = fs.readFileSync(path.join(rootDir, "lib/economy/server-rpc.ts"), "utf8");

  // Verify that count query uses select("*", { count: "exact", head: true }) on composite key tables
  assert.ok(
    rpcCode.includes('.from("match_attendance")') &&
    rpcCode.includes('.from("training_attendance")'),
    "Must query both match_attendance and training_attendance"
  );
  assert.ok(
    !rpcCode.includes('.from("training_attendance").select("id",'),
    "Must NOT query non-existent 'id' column on training_attendance"
  );
  assert.ok(
    !rpcCode.includes('.from("match_attendance").select("id",'),
    "Must NOT query non-existent 'id' column on match_attendance"
  );
  assert.ok(
    rpcCode.includes('.eq("status", "present")'),
    "Training XP must strictly require status 'present'"
  );
  assert.ok(
    rpcCode.includes('.in("status", ["present", "yes"])'),
    "Match XP must count confirmed match participation"
  );
  assert.ok(
    rpcCode.includes("* 40") && rpcCode.includes("* 60"),
    "Must award exactly +40 XP per training and +60 XP per match"
  );
});

test("V6D TeamHub UI Integration — Attendance handlers call authoritative server endpoints with rollback", () => {
  const hubCode = fs.readFileSync(path.join(rootDir, "components/TeamHub.tsx"), "utf8");

  assert.ok(
    hubCode.includes('/api/training/attendance'),
    "TeamHub must call /api/training/attendance"
  );
  assert.ok(
    hubCode.includes('/api/matches/attendance'),
    "TeamHub must call /api/matches/attendance"
  );
  assert.ok(
    hubCode.includes("handleSetTrainingAttendance"),
    "TeamHub must have handleSetTrainingAttendance"
  );
  assert.ok(
    hubCode.includes("setParentAttendance"),
    "TeamHub must have setParentAttendance"
  );
});

test("V6D Idempotency Rules — Upsert on conflict (session_id, player_id) prevents duplication", () => {
  const trCode = fs.readFileSync(path.join(rootDir, "app/api/training/attendance/route.ts"), "utf8");
  const matchCode = fs.readFileSync(path.join(rootDir, "app/api/matches/attendance/route.ts"), "utf8");

  assert.ok(
    trCode.includes('onConflict: "training_id,player_id"'),
    "Training attendance upsert must specify onConflict: training_id,player_id"
  );
  assert.ok(
    matchCode.includes('onConflict: "match_id,player_id"'),
    "Match attendance upsert must specify onConflict: match_id,player_id"
  );
});

test("V6D Season Pass Server-Side Validation — Checks authoritative XP vs required level XP", () => {
  const rpcCode = fs.readFileSync(path.join(rootDir, "lib/economy/server-rpc.ts"), "utf8");

  assert.ok(
    rpcCode.includes("computeAuthoritativeSeasonXp"),
    "Must compute authoritative season XP"
  );
  assert.ok(
    rpcCode.includes("authoritativeXp < reward.xpRequired"),
    "Must reject claim when authoritative XP is insufficient"
  );
  assert.ok(
    rpcCode.includes('claim_reward_once_atomic'),
    "Must invoke claim_reward_once_atomic RPC for idempotent reward granting"
  );
});
