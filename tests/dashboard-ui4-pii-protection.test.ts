import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * DELTA-014: PII and Persona Anonymization Test Suite
 * Ensures zero identifying data of real children and families in UI4 components and fixtures.
 */
test("DELTA-014 — Zero PII & Neutral Persona Verification in UI4", async (t) => {
  const rootDir = process.cwd();
  const ui4Dir = path.join(rootDir, "components", "dashboard", "ui4");
  const previewDir = path.join(rootDir, "app", "preview", "dashboard-ui4");
  const testsDir = path.join(rootDir, "tests");

  function getFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getFiles(fullPath));
      } else if (/\.(tsx?|css|json)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allUI4Files = [
    ...getFiles(ui4Dir),
    ...getFiles(previewDir),
    ...fs.readdirSync(testsDir)
      .filter(f => f.startsWith("dashboard-ui4-") && /\.(ts|js)$/.test(f))
      .map(f => path.join(testsDir, f))
  ];

  await t.test("1. No identifying surnames of real children or parents exist in UI4 files", () => {
    const prohibitedSurnames = [
      /\bRybacki\b/i,
      /\bRyszard\b/i,
      /\bKowalczyk\b/i,
      /\bZieliński\b/i,
      /\bZielinski\b/i,
      /\bWiśniewski\b/i,
      /\bWisniewski\b/i,
      /\bKamiński\b/i,
      /\bKaminski\b/i,
      /\bKowalski\b/i
    ];

    for (const filePath of allUI4Files) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const pattern of prohibitedSurnames) {
        assert.doesNotMatch(
          content,
          pattern,
          `File ${path.relative(rootDir, filePath)} must not contain prohibited persona or surname matching ${pattern}`
        );
      }
    }
  });

  await t.test("2. Fixtures in page.tsx strictly use approved neutral demo personas", () => {
    const pageContent = fs.readFileSync(
      path.join(previewDir, "page.tsx"),
      "utf-8"
    );

    // Required neutral personas
    assert.match(pageContent, /Zawodnik Alfa/, "Must define persona Zawodnik Alfa");
    assert.match(pageContent, /Zawodnik Beta/, "Must define persona Zawodnik Beta");
    assert.match(pageContent, /Opiekun Demo/, "Must define persona Opiekun Demo");
    assert.match(pageContent, /Drużyna Testowa/, "Must define team Drużyna Testowa");

    // Parent scenario must explicitly link to Zawodnik Alfa
    assert.match(
      pageContent,
      /parentPlayerIds:\s*\["demo-player-alpha"\]/,
      "Parent persona must link strictly to demo-player-alpha"
    );
  });

  await t.test("3. No contact info (emails, phone numbers) in UI4 module", () => {
    const contactPatterns = [
      /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/,
      /\+48[0-9]{9}/
    ];

    for (const filePath of allUI4Files) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const pattern of contactPatterns) {
        assert.doesNotMatch(
          content,
          pattern,
          `File ${path.relative(rootDir, filePath)} must not contain contact information`
        );
      }
    }
  });
});
