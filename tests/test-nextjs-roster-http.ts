import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

// Read .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
function parseEnv(key: string): string {
  const line = envContent.split(/\r?\n/).find((l) => l.trim().startsWith(key + "="));
  if (!line) return "";
  const idx = line.indexOf("=");
  return line.slice(idx + 1).trim();
}

const supabaseUrl = parseEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = parseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || parseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const BASE_URL = "http://localhost:3015";

if (!supabaseUrl.includes("tdlsxamxtygojxhmjjvp")) {
  throw new Error("ABORT: Not staging tdlsxamxtygojxhmjjvp");
}

async function getAuthCookieHeader(email: string, password = "TestPassword123!"): Promise<string> {
  const cookieMap = new Map<string, string>();
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => cookieMap.set(name, value));
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Auth failed for ${email}: ${error?.message}`);
  }

  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("; ");
}

async function runTests() {
  console.log("=== DELTA-045L: TESTING NEXT.JS HTTP ROSTER ENDPOINT ===");
  console.log(`Base URL: ${BASE_URL}`);

  const TEAM1_ID = "b57594d3-6f39-4f06-87dc-d8b571e8ffc0"; // DELTA 2018 GM
  const TEAM2_ID = "1e2632ee-0ddf-461f-8476-2d415a6f933d"; // DELTA TEST U-10

  // 1. Anon Access (No cookie)
  console.log("\n[TEST 1] Anon / Unauthenticated HTTP Request");
  const anonRes = await fetch(`${BASE_URL}/api/teams/${TEAM1_ID}/roster`);
  console.log(`  HTTP Status: ${anonRes.status}`);
  assert.equal(anonRes.status, 401, "Anon request must return HTTP 401");
  const anonBody = await anonRes.json();
  assert.equal(anonBody.success, false);
  assert.equal(anonBody.code, "UNAUTHORIZED");
  console.log("  ✔ Anon rejected with HTTP 401 UNAUTHORIZED");

  // 2. Parent A on DELTA 2018 GM (Authorized - Own Children: Jan & Kuba)
  console.log("\n[TEST 2] Parent A on DELTA 2018 GM (Authorized)");
  const parentACookie = await getAuthCookieHeader("parentA.test@delta.staging");
  const pARes = await fetch(`${BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: { Cookie: parentACookie },
  });
  console.log(`  HTTP Status: ${pARes.status}`);
  assert.equal(pARes.status, 200, "Parent A must receive HTTP 200");
  const pABody = await pARes.json();
  assert.equal(pABody.success, true);
  assert.equal(pABody.team.slug, "delta-2018-gm");
  assert.equal(pABody.players.length, 2, "Parent A must receive 2 players in DELTA 2018 GM");
  console.log(`  ✔ Received ${pABody.players.length} players for DELTA 2018 GM:`, pABody.players.map((p: any) => p.displayName));
  // Verify privacy and photo isolation
  for (const p of pABody.players) {
    assert.equal(typeof p.displayName, "string");
    assert.ok(p.shirtNumber !== undefined);
    assert.ok(p.position !== undefined);
    assert.equal(p.phone, undefined, "Phone must be excluded");
    assert.equal(p.email, undefined, "Email must be excluded");
  }
  console.log("  ✔ Zero PII or private contact information returned in payload");

  // 3. Parent A Cross-Team Access on DELTA TEST U-10 (Unauthorized - No children in U-10)
  console.log("\n[TEST 3] Parent A Cross-Team Access on DELTA TEST U-10 (Forbidden)");
  const pACrossRes = await fetch(`${BASE_URL}/api/teams/${TEAM2_ID}/roster`, {
    headers: { Cookie: parentACookie },
  });
  console.log(`  HTTP Status: ${pACrossRes.status}`);
  assert.equal(pACrossRes.status, 403, "Parent A cross-team access must return HTTP 403");
  const pACrossBody = await pACrossRes.json();
  assert.equal(pACrossBody.success, false);
  assert.equal(pACrossBody.code, "FORBIDDEN");
  console.log("  ✔ Cross-team access rejected with HTTP 403 FORBIDDEN");

  // 4. Parent B on DELTA 2018 GM (Forbidden - Child Piotr is in U-10, not 2018 GM)
  console.log("\n[TEST 4] Parent B on DELTA 2018 GM (Forbidden)");
  const parentBCookie = await getAuthCookieHeader("parentB.test@delta.staging");
  const pBRes = await fetch(`${BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: { Cookie: parentBCookie },
  });
  console.log(`  HTTP Status: ${pBRes.status}`);
  assert.equal(pBRes.status, 403, "Parent B on DELTA 2018 GM must return HTTP 403");
  const pBBody = await pBRes.json();
  assert.equal(pBBody.success, false);
  assert.equal(pBBody.code, "FORBIDDEN");
  console.log("  ✔ Unauthorized parent rejected with HTTP 403 FORBIDDEN");

  // 5. Coach on DELTA 2018 GM (Authorized staff)
  console.log("\n[TEST 5] Coach on DELTA 2018 GM (Authorized Staff)");
  const coachCookie = await getAuthCookieHeader("coach.test@delta.staging");
  const coachRes = await fetch(`${BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: { Cookie: coachCookie },
  });
  console.log(`  HTTP Status: ${coachRes.status}`);
  assert.equal(coachRes.status, 200, "Coach must receive HTTP 200");
  const coachBody = await coachRes.json();
  assert.equal(coachBody.success, true);
  assert.equal(coachBody.players.length, 2);
  console.log("  ✔ Coach authorized and received 2 players");

  // 6. Admin on DELTA 2018 GM (Authorized staff)
  console.log("\n[TEST 6] Admin on DELTA 2018 GM (Authorized Staff)");
  const adminCookie = await getAuthCookieHeader("admin.test@delta.staging");
  const adminRes = await fetch(`${BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: { Cookie: adminCookie },
  });
  console.log(`  HTTP Status: ${adminRes.status}`);
  assert.equal(adminRes.status, 200, "Admin must receive HTTP 200");
  const adminBody = await adminRes.json();
  assert.equal(adminBody.success, true);
  assert.equal(adminBody.players.length, 2);
  console.log("  ✔ Admin authorized and received 2 players");

  console.log("\n🎉 ALL HTTP ROSTER ENDPOINT SECURITY CHECKS PASSED 100%!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
