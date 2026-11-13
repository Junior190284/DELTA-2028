/**
 * DELTA INFERNO — OAUTH & PREVIEW REDIRECT TEST SUITE
 * Tests Google OAuth callback routing, Supabase Staging configuration,
 * open redirect protection, root code fallback, and dev-login security.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sanitizeSafeRedirectPath, deriveSafeProfileDisplayName } from "../lib/auth/profile-bootstrap.ts";

const rootDir = process.cwd();

test("1. Open Redirect Protection — sanitizeSafeRedirectPath", () => {
  // Safe relative paths should be preserved
  assert.equal(sanitizeSafeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("/dashboard?tab=matches"), "/dashboard?tab=matches");
  assert.equal(sanitizeSafeRedirectPath("/dashboard#collection"), "/dashboard#collection");
  assert.equal(sanitizeSafeRedirectPath("/settings"), "/settings");

  // Malicious / external / protocol-relative targets must be rejected and fallback to /dashboard
  assert.equal(sanitizeSafeRedirectPath("https://evil.com"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("http://evil.com"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("//evil.com"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("/\\evil.com"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("javascript:alert(1)"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath(null), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath(undefined), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath(""), "/dashboard");
});

test("2. Safe Display Name Extraction — deriveSafeProfileDisplayName", () => {
  assert.equal(
    deriveSafeProfileDisplayName({ id: "1", user_metadata: { full_name: "Jan Kowalski" } }),
    "Jan Kowalski"
  );
  assert.equal(
    deriveSafeProfileDisplayName({ id: "2", email: "rodzic@delta.local" }),
    "rodzic"
  );
  assert.equal(
    deriveSafeProfileDisplayName({ id: "3", email: "test@gmail.com", user_metadata: { name: "Anna Nowak" } }),
    "Anna Nowak"
  );
  assert.equal(
    deriveSafeProfileDisplayName({ id: "4" }),
    "Rodzic DELTA"
  );
});

test("3. Root Page & Middleware OAuth Fallback — proxy.ts", () => {
  const proxyCode = fs.readFileSync(path.join(rootDir, "proxy.ts"), "utf8");

  assert.ok(
    proxyCode.includes("request.nextUrl.pathname === \"/\" && request.nextUrl.searchParams.has(\"code\")"),
    "Middleware intercepts OAuth code mistakenly landed on root '/'"
  );
  assert.ok(
    proxyCode.includes("callbackUrl.search = request.nextUrl.search"),
    "Preserves search parameters during root fallback redirect"
  );
  assert.ok(
    proxyCode.includes("/auth/callback"),
    "Redirects to /auth/callback handler"
  );
});

test("4. Auth Callback Error Handling — app/auth/callback/route.ts", () => {
  const callbackCode = fs.readFileSync(path.join(rootDir, "app/auth/callback/route.ts"), "utf8");

  assert.ok(
    callbackCode.includes("requestUrl.searchParams.get(\"error\")"),
    "Handles error parameter returned from OAuth provider"
  );
  assert.ok(
    callbackCode.includes("sanitizeSafeRedirectPath"),
    "Sanitizes next redirect path to prevent open redirect"
  );
  assert.ok(
    callbackCode.includes("exchangeCodeForSession"),
    "Exchanges auth code for session"
  );
  assert.ok(
    callbackCode.includes("ensureUserProfileExists"),
    "Bootstraps profile for brand-new users"
  );
});

test("5. Dev Login Security Restriction — app/api/auth/dev-login & login/page.tsx", () => {
  const devRouteCode = fs.readFileSync(path.join(rootDir, "app/api/auth/dev-login/route.ts"), "utf8");
  const loginPageCode = fs.readFileSync(path.join(rootDir, "app/login/page.tsx"), "utf8");
  const currentProfileCode = fs.readFileSync(path.join(rootDir, "lib/current-profile.ts"), "utf8");

  // Route rejects non-loopback hosts
  assert.ok(
    devRouteCode.includes("isLoopback"),
    "Dev-login route checks loopback host"
  );
  assert.ok(
    devRouteCode.includes("status: 403"),
    "Dev-login returns 403 Forbidden for external hosts"
  );

  // Login UI hides dev box on non-localhost
  assert.ok(
    loginPageCode.includes("isLocalhost"),
    "Login page checks isLocalhost before rendering dev quick login"
  );

  // Profile provider only honors cookie on loopback
  assert.ok(
    currentProfileCode.includes("isLoopback"),
    "currentProfile checks isLoopback before honoring dev cookie"
  );
});

test("6. Supabase Staging URL Configuration — supabase/config.toml", () => {
  const configCode = fs.readFileSync(path.join(rootDir, "supabase/config.toml"), "utf8");

  assert.ok(
    configCode.includes("project_id = \"tdlsxamxtygojxhmjjvp\""),
    "Config targets Staging project tdlsxamxtygojxhmjjvp"
  );
  assert.ok(
    configCode.includes("https://delta-2028-*-tomaszrybacki-3187s-projects.vercel.app/**"),
    "Includes wildcard for Vercel preview deployments"
  );
  assert.ok(
    configCode.includes("https://*.vercel.app/**"),
    "Includes universal Vercel wildcard"
  );
  assert.ok(
    configCode.includes("http://localhost:3000/**"),
    "Includes localhost redirect URL"
  );
});
