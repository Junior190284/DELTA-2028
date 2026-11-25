import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const routeSource = fs.readFileSync(
  path.join(root, "app/api/player-photo/[playerId]/route.ts"),
  "utf8"
);

test("SECURITY: /api/player-photo/[playerId] requires authentication (401)", () => {
  assert.match(routeSource, /await supabase\.auth\.getUser\(\)/);
  assert.match(routeSource, /if\s*\(!user\)\s*\{\s*return NextResponse\.json\(\{\s*error:\s*"Unauthorized"\s*\},/);
  assert.match(routeSource, /status:401/);
});

test("SECURITY: /api/player-photo/[playerId] verifies role from public.profiles, never auth.jwt()", () => {
  assert.match(routeSource, /\.from\("profiles"\)/);
  assert.match(routeSource, /\.select\("role"\)/);
  assert.match(routeSource, /profile\??\.role === "admin"/);
  assert.doesNotMatch(routeSource, /auth\.jwt\(\)/);
});

test("SECURITY: /api/player-photo/[playerId] restricts access to parent_players and admin (403)", () => {
  assert.match(routeSource, /\.from\("parent_players"\)/);
  assert.match(routeSource, /\.eq\("parent_id",\s*user\.id\)/);
  assert.match(routeSource, /\.eq\("player_id",\s*playerId\)/);
  assert.match(routeSource, /status:\s*403/);
  assert.match(routeSource, /Forbidden: You are not authorized to access this player's photo/);
});

test("SECURITY: Coach alone does not bypass photo privacy without parent link or admin role", () => {
  // Coach is NOT included in isAdmin check
  assert.doesNotMatch(routeSource, /profile\??\.role === "coach"/);
  assert.match(routeSource, /const isAdmin = profile\??\.role === "admin";/);
});

test("SECURITY: Authorization logic simulation matrix (401, 403, 200)", () => {
  interface User {
    id: string;
    role: "admin" | "coach" | "parent" | "guest";
  }

  function simulatePhotoAccess(
    user: User | null,
    targetPlayerId: string,
    parentLinks: Array<{ parent_id: string; player_id: string }>
  ): { status: number; allowed: boolean; code: string } {
    if (!user) {
      return { status: 401, allowed: false, code: "UNAUTHORIZED" };
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      const isLinkedParent = parentLinks.some(
        (link) => link.parent_id === user.id && link.player_id === targetPlayerId
      );
      if (!isLinkedParent) {
        return { status: 403, allowed: false, code: "FORBIDDEN" };
      }
    }

    return { status: 200, allowed: true, code: "OK" };
  }

  const links = [
    { parent_id: "parent-1", player_id: "child-1" },
    { parent_id: "coach-parent", player_id: "child-coach-kid" },
  ];

  // 1. Unauthenticated -> 401
  assert.deepEqual(
    simulatePhotoAccess(null, "child-1", links),
    { status: 401, allowed: false, code: "UNAUTHORIZED" }
  );

  // 2. Parent-1 accessing own Child-1 -> 200
  assert.deepEqual(
    simulatePhotoAccess({ id: "parent-1", role: "parent" }, "child-1", links),
    { status: 200, allowed: true, code: "OK" }
  );

  // 3. Parent-1 attempting to access Child-2 (foreign child) -> 403 FORBIDDEN
  assert.deepEqual(
    simulatePhotoAccess({ id: "parent-1", role: "parent" }, "child-2", links),
    { status: 403, allowed: false, code: "FORBIDDEN" }
  );

  // 4. Coach without parent link attempting to access Child-1 -> 403 FORBIDDEN
  assert.deepEqual(
    simulatePhotoAccess({ id: "coach-stranger", role: "coach" }, "child-1", links),
    { status: 403, allowed: false, code: "FORBIDDEN" }
  );

  // 5. Coach who IS parent of Child-coach-kid -> 200 OK
  assert.deepEqual(
    simulatePhotoAccess({ id: "coach-parent", role: "coach" }, "child-coach-kid", links),
    { status: 200, allowed: true, code: "OK" }
  );

  // 6. Admin accessing any child -> 200 OK
  assert.deepEqual(
    simulatePhotoAccess({ id: "admin-1", role: "admin" }, "child-1", links),
    { status: 200, allowed: true, code: "OK" }
  );
  assert.deepEqual(
    simulatePhotoAccess({ id: "admin-1", role: "admin" }, "child-2", links),
    { status: 200, allowed: true, code: "OK" }
  );
});
