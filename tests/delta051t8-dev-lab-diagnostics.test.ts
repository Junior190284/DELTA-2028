import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assertDevLabIsolation,
  DevLabSecurityViolationError,
  FORBIDDEN_REMOTE_PROJECT_IDS
} from "../lib/qa/devLabGuard.ts";

describe("DELTA-051T8 — LOCAL DEV LAB & DIAGNOSTICS SUITE", () => {
  test("1. Fail-closed Guard: blocks remote Production and Staging project IDs", () => {
    // Production project
    assert.throws(
      () => assertDevLabIsolation("https://fctgruvciakhohfxkdzp.supabase.co"),
      DevLabSecurityViolationError
    );

    // Staging project
    assert.throws(
      () => assertDevLabIsolation("https://tdlsxamxtygojxhmjjvp.supabase.co"),
      DevLabSecurityViolationError
    );

    // Arbitrary remote URL
    assert.throws(
      () => assertDevLabIsolation("https://remote-db.example.com"),
      DevLabSecurityViolationError
    );

    // Empty URL
    assert.throws(
      () => assertDevLabIsolation(""),
      DevLabSecurityViolationError
    );
  });

  test("2. Fail-closed Guard: permits strictly local endpoints (127.0.0.1 and localhost)", () => {
    assert.doesNotThrow(() => assertDevLabIsolation("http://127.0.0.1:54321"));
    assert.doesNotThrow(() => assertDevLabIsolation("http://localhost:54321"));
  });

  test("3. DEV LAB Profile (.env.dev-lab) is fully isolated and does not mutate .env.local", () => {
    assert.ok(fs.existsSync(".env.dev-lab"), ".env.dev-lab profile must exist");
    assert.ok(fs.existsSync(".env.local"), ".env.local must remain untouched");

    const labContent = fs.readFileSync(".env.dev-lab", "utf8");
    assert.ok(labContent.includes("NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"));
    assert.ok(labContent.includes("DELTA_ENVIRONMENT=dev_lab"));
    assert.ok(labContent.includes("FORBIDDEN_REMOTE_PROJECT_IDS"));
  });

  test("4. Local Supabase config (supabase/config.dev-lab.toml) is strictly local", () => {
    assert.ok(fs.existsSync("supabase/config.dev-lab.toml"));
    const config = fs.readFileSync("supabase/config.dev-lab.toml", "utf8");
    assert.ok(config.includes('project_id = "delta-local-dev-lab"'));
    assert.ok(config.includes("port = 54321"));
    assert.ok(config.includes("port = 54322"));
  });

  test("5. Synthetic QA Dataset (supabase/seed_dev_lab_qa.sql) contains required 16 players, 2 teams, and 5 roles", () => {
    assert.ok(fs.existsSync("supabase/seed_dev_lab_qa.sql"));
    const seed = fs.readFileSync("supabase/seed_dev_lab_qa.sql", "utf8");

    // 2 teams
    assert.ok(seed.includes("DELTA 2018 Czerwoni (A)"));
    assert.ok(seed.includes("DELTA 2018 Biali (B)"));

    // 16 players
    for (let i = 1; i <= 8; i++) {
      assert.ok(seed.includes(`a000000${i}-0000-4000-a000`));
    }
    for (let i = 9; i <= 16; i++) {
      const idx = String(i).padStart(2, "0");
      assert.ok(seed.includes(`000000${idx}`));
    }

    // Roles: parent A, parent B, player, coach A, coach B, admin
    assert.ok(seed.includes("Jan Testowy (Rodzic A)"));
    assert.ok(seed.includes("Anna Testowa (Rodzic B)"));
    assert.ok(seed.includes("Młody Zawodnik (Konto Gracza)"));
    assert.ok(seed.includes("Trener Tomasz (Drużyna A)"));
    assert.ok(seed.includes("Trener Michał (Drużyna B)"));
    assert.ok(seed.includes("Administrator QA"));
  });

  test("6. Safe isolated backup (supabase/dev_lab_safe_backup.sql) does not pollute public schema", () => {
    assert.ok(fs.existsSync("supabase/dev_lab_safe_backup.sql"));
    const backupSql = fs.readFileSync("supabase/dev_lab_safe_backup.sql", "utf8");

    assert.ok(backupSql.includes("create schema if not exists _backup_isolated"));
    assert.ok(backupSql.includes("revoke all on schema _backup_isolated from public, anon, authenticated"));
    assert.equal(backupSql.includes("create table public._backup"), false, "Must NOT create backup tables in public schema");
  });
});
