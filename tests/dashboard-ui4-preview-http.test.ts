import test from "node:test";
import assert from "node:assert/strict";

/**
 * DELTA-016: Real HTTP Integration Tests for /preview/dashboard-ui4
 * Tests real HTTP request execution against the local Next.js server.
 */
test("DELTA-016 — Real HTTP Route Security Integration Tests", async (t) => {
  const BASE_URL = "http://localhost:3005/preview/dashboard-ui4";

  // Check if local dev server is responding
  let serverAvailable = false;
  try {
    const probe = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = probe.status < 500;
  } catch {
    serverAvailable = false;
  }

  assert.ok(
    serverAvailable,
    "Local Next.js dev server on port 3005 must be running and responding to execute real HTTP tests. Never skip silently."
  );

  await t.test("1. Local development HTTP access: allowed with HTTP 200", async () => {
    const res = await fetch(BASE_URL);
    assert.equal(res.status, 200);

    const body = await res.text();
    assert.match(body, /Zawodnik Alfa/, "Renders neutral persona Zawodnik Alfa");
    assert.match(body, /Drużyna Testowa/, "Renders team Drużyna Testowa");
    assert.doesNotMatch(body, /\bRybacki\b/, "Zero real child surnames in HTML");
  });

  await t.test("2. Production host gm2018.pl: strictly returns HTTP 404 (notFound)", async () => {
    const res = await fetch(BASE_URL, {
      headers: {
        "x-forwarded-host": "gm2018.pl"
      }
    });
    // In Next.js, calling notFound() produces a 404 response
    assert.equal(res.status, 404, "Production domain gm2018.pl must strictly return HTTP 404");
  });

  await t.test("3. Production host delta-2028.vercel.app: strictly returns HTTP 404", async () => {
    const res = await fetch(BASE_URL, {
      headers: {
        "x-forwarded-host": "delta-2028.vercel.app"
      }
    });
    assert.equal(res.status, 404, "Production domain delta-2028.vercel.app must strictly return HTTP 404");
  });

  await t.test("4. Preview branch host without custom headers: renders normally with HTTP 200", async () => {
    const res = await fetch(BASE_URL, {
      headers: {
        "x-forwarded-host": "delta-2028-git-feature-preview.vercel.app"
      }
    });
    // Reviewers can access normally; Vercel edge handles authentication
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /Zawodnik Alfa/, "Renders preview content for authenticated reviewers");
  });
});
