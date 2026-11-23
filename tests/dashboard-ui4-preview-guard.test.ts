import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePreviewAccess } from "../app/preview/dashboard-ui4/preview-guard.ts";

/**
 * DELTA-016: Simplified Preview Guard Policy Tests
 * Verifies production 404 blocking, local development allowance, and preview environment handling.
 */
test("DELTA-016 — Simplified Preview Guard Policy Tests", async (t) => {
  await t.test("1. Production environment: ALWAYS returns 404 (production_blocked)", () => {
    // VERCEL_ENV = production
    const res1 = evaluatePreviewAccess({
      host: "delta-2028-preview.vercel.app",
      vercelEnv: "production"
    });
    assert.equal(res1.allowed, false);
    assert.equal(res1.reason, "production_blocked");
    assert.equal(res1.statusCode, 404);

    // Production domain gm2018.pl
    const res2 = evaluatePreviewAccess({
      host: "gm2018.pl",
      vercelEnv: "preview"
    });
    assert.equal(res2.allowed, false);
    assert.equal(res2.reason, "production_blocked");
    assert.equal(res2.statusCode, 404);

    // Production domain delta-2028.vercel.app
    const res3 = evaluatePreviewAccess({
      host: "delta-2028.vercel.app"
    });
    assert.equal(res3.allowed, false);
    assert.equal(res3.reason, "production_blocked");
    assert.equal(res3.statusCode, 404);
  });

  await t.test("2. Local development: allowed for localhost and local IPs", () => {
    // localhost
    const res1 = evaluatePreviewAccess({
      host: "localhost:3005",
      nodeEnv: "development"
    });
    assert.equal(res1.allowed, true);
    assert.equal(res1.reason, "local_dev");
    assert.equal(res1.statusCode, 200);

    // 127.0.0.1
    const res2 = evaluatePreviewAccess({
      host: "127.0.0.1:3000"
    });
    assert.equal(res2.allowed, true);
    assert.equal(res2.reason, "local_dev");
    assert.equal(res2.statusCode, 200);

    // Local LAN IP
    const res3 = evaluatePreviewAccess({
      host: "192.168.1.50:3000"
    });
    assert.equal(res3.allowed, true);
    assert.equal(res3.reason, "local_dev");
  });

  await t.test("3. Remote Preview: allowed (edge-gated by Vercel Deployment Protection)", () => {
    const res = evaluatePreviewAccess({
      host: "delta-2028-git-feature-preview.vercel.app",
      vercelEnv: "preview"
    });
    assert.equal(res.allowed, true);
    assert.equal(res.reason, "preview_environment");
    assert.equal(res.statusCode, 200);
  });
});
