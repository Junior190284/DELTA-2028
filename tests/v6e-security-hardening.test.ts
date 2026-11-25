import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V6E Security Hardening — Training Attendance API route exists and enforces strict security guards", () => {
  const trainingApi = path.join(rootDir, "app/api/training/attendance/route.ts");
  assert.ok(fs.existsSync(trainingApi), "app/api/training/attendance/route.ts must exist");

  const code = fs.readFileSync(trainingApi, "utf8");

  // 1. UUID Validation
  assert.ok(code.includes("UUID_REGEX") || code.includes("isValidUuid"), "Must validate UUID format");
  assert.ok(code.includes("400"), "Must return 400 Bad Request on invalid input/UUID");

  // 2. Existence Checks (Event & Player)
  assert.ok(code.includes('.from("training_sessions")'), "Must check existence in training_sessions");
  assert.ok(code.includes('.from("players")'), "Must check existence in players");
  assert.ok(code.includes("404"), "Must return 404 Not Found if session or player is missing");

  // 3. User Permissions & Staff Check
  assert.ok(code.includes('.from("user_permissions")'), "Must inspect user_permissions table");
  assert.ok(code.includes("can_manage_training_attendance"), "Must check can_manage_training_attendance");
  assert.ok(code.includes("isStaff"), "Must compute isStaff");

  // 4. Parent Authorization & Cross-Parent Defense
  assert.ok(code.includes('.from("parent_players")'), "Must check parent_players relationship");
  assert.ok(code.includes("isParentOfChild"), "Must compute isParentOfChild");
  assert.ok(code.includes("!isStaff && !isParentOfChild"), "Must deny non-staff non-parent users with 403");

  // 5. Role Elevation Defense (Coach-only presence)
  assert.ok(
    code.includes('status === "present"') && code.includes('status === "absent"'),
    "Must guard present and absent statuses"
  );

  // 6. Present Status Overwrite Protection (HTTP 409 Conflict)
  assert.ok(
    code.includes("409") && code.includes('existing.status === "present"'),
    "Must return 409 Conflict if parent tries to overwrite coach confirmed presence"
  );

  // 7. Spoofed updated_by Defense
  assert.ok(
    code.includes("updated_by: user.id"),
    "Must strictly use authenticated session user.id as updated_by"
  );
});

test("V6E Security Hardening — Match Attendance API route exists and enforces strict security guards", () => {
  const matchApi = path.join(rootDir, "app/api/matches/attendance/route.ts");
  assert.ok(fs.existsSync(matchApi), "app/api/matches/attendance/route.ts must exist");

  const code = fs.readFileSync(matchApi, "utf8");

  // 1. UUID Validation
  assert.ok(code.includes("UUID_REGEX") || code.includes("isValidUuid"), "Must validate UUID format");
  assert.ok(code.includes("400"), "Must return 400 Bad Request on invalid input/UUID");

  // 2. Existence Checks (Match & Player)
  assert.ok(code.includes('.from("matches")'), "Must check existence in matches");
  assert.ok(code.includes('.from("players")'), "Must check existence in players");
  assert.ok(code.includes("404"), "Must return 404 Not Found if match or player is missing");

  // 3. User Permissions & Staff Check
  assert.ok(code.includes('.from("user_permissions")'), "Must inspect user_permissions table");
  assert.ok(code.includes("can_manage_matches"), "Must check can_manage_matches");
  assert.ok(code.includes("isStaff"), "Must compute isStaff");

  // 4. Parent Authorization & Cross-Parent Defense
  assert.ok(code.includes('.from("parent_players")'), "Must check parent_players relationship");
  assert.ok(code.includes("isParentOfChild"), "Must compute isParentOfChild");
  assert.ok(code.includes("!isStaff && !isParentOfChild"), "Must deny non-staff non-parent users with 403");

  // 5. Role Elevation Defense
  assert.ok(
    code.includes('status === "present"') && code.includes('status === "absent"'),
    "Must guard present and absent statuses"
  );

  // 6. Present Status Overwrite Protection (HTTP 409 Conflict)
  assert.ok(
    code.includes("409") && code.includes('existing.status === "present"'),
    "Must return 409 Conflict if parent tries to overwrite coach confirmed presence"
  );

  // 7. Spoofed updated_by Defense
  assert.ok(
    code.includes("updated_by: user.id"),
    "Must strictly use authenticated session user.id as updated_by"
  );
});

test("V6E Client Components Routing — MyChildCenter routes RSVP through server-side attendance APIs", () => {
  const myChildCode = fs.readFileSync(path.join(rootDir, "components/MyChildCenter.tsx"), "utf8");

  assert.ok(
    myChildCode.includes('fetch("/api/matches/attendance"'),
    "MyChildCenter must call /api/matches/attendance"
  );
  assert.ok(
    myChildCode.includes('fetch("/api/training/attendance"'),
    "MyChildCenter must call /api/training/attendance"
  );
  assert.ok(
    !myChildCode.includes('.from("training_attendance").upsert'),
    "MyChildCenter must NOT perform un-routed client-side training_attendance upserts"
  );
  assert.ok(
    !myChildCode.includes('.from("match_attendance").upsert'),
    "MyChildCenter must NOT perform un-routed client-side match_attendance upserts"
  );
});

test("V6E Authentication Adapter — getCurrentProfile supports Authorization Bearer header for API security testing", () => {
  const profileCode = fs.readFileSync(path.join(rootDir, "lib/current-profile.ts"), "utf8");

  assert.ok(
    profileCode.includes("authHeader?.startsWith(\"Bearer \")"),
    "Must support Bearer tokens in Authorization header"
  );
  assert.ok(
    profileCode.includes("admin.auth.getUser(token)"),
    "Must cryptographically verify token via admin auth client"
  );
});

test("V6E Economy & XP Guardrails — RSVP never grants XP, only verified coach presence", () => {
  const rpcCode = fs.readFileSync(path.join(rootDir, "lib/economy/server-rpc.ts"), "utf8");

  assert.ok(
    rpcCode.includes('.eq("status", "present")'),
    "Training attendance XP must be gated strictly on status 'present'"
  );
  assert.ok(
    !rpcCode.includes('.in("status", ["yes", "maybe"])'),
    "RSVP statuses 'yes'/'maybe' must never grant training XP"
  );
});
