import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const page = read("app/page.tsx");
const experience = read("components/PublicTeamSite.tsx");
const nav = read("components/public/PublicNav.tsx");
const intro = read("components/public/CinematicIntro.tsx");
const css = read("components/public/public-experience.module.css");
const preview = read("app/preview/public-experience/page.tsx");

test("DELTA-046: the public experience stays server-first", () => {
  assert.doesNotMatch(experience, /^"use client"/);
  assert.match(page, /createClient.*@\/lib\/supabase\/server/);
  assert.match(page, /signedIn=\{Boolean\(user\)\}/);
  assert.doesNotMatch(nav, /supabase|createClient|getSession|onAuthStateChange/);
  assert.match(nav, /signedIn = false/);
});

test("DELTA-046: the public query excludes child and attendance records", () => {
  assert.doesNotMatch(page, /from\("players"\)|from\("match_attendance"\)/);
  assert.doesNotMatch(page, /photo_path|attendanceSummary|rosterCount/);
  assert.match(page, /\.is\("player_id",null\)/);
  assert.match(page, /\.neq\("event_type","birthday"\)/);
});

test("DELTA-046: all required premium sections and the OAuth entry are present", () => {
  for (const phrase of [
    "MATCH DAY CENTER",
    "DELTA EXPERIENCE",
    "ROAD TO GLORY",
    "DELTA INFERNO",
    "CENTRUM RODZICA",
  ]) {
    assert.ok(experience.includes(phrase), `missing section: ${phrase}`);
  }
  assert.match(nav, /const destination = signedIn \? "\/dashboard" : "\/login"/);
  assert.match(experience, /DANE SYNTETYCZNE/);
});

test("DELTA-046: cinematic video remains opt-in and bandwidth-conscious", () => {
  assert.match(intro, /controls/);
  assert.match(intro, /muted/);
  assert.match(intro, /playsInline/);
  assert.match(intro, /preload="metadata"/);
  assert.match(intro, /poster=/);
  assert.doesNotMatch(experience, /<video/);
});

test("DELTA-046: responsive and reduced-motion fallbacks are explicit", () => {
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /env\(safe-area-inset-/);
});

test("DELTA-046: visual QA route is clearly synthetic", () => {
  assert.match(preview, /demoMode/);
  assert.match(preview, /DEMO:/);
  assert.match(preview, /obiekt demonstracyjny/i);
  assert.doesNotMatch(preview, /photo_path|player_id|parent|guardian/);
});
