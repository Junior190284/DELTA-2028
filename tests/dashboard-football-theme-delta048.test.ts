import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("styles/dashboard-football-theme.css");
const dashboard = read("components/dashboard/DeltaCinematicDashboard.tsx");
const layout = read("app/layout.tsx");

test("DELTA-048: football dashboard skin is scoped and loaded after global styles", () => {
  assert.match(layout, /globals\.css";\s*\nimport "\.\.\/styles\/dashboard-football-theme\.css"/);
  assert.match(css, /\.v104-hub \.delta-app-shell/);
  assert.match(css, /dashboard-football-command-v1\.webp/);
  assert.match(css, /\.v104-hub \.delta-app-shell \.v8-main/);
  assert.match(css, /margin:\s*0 !important/);
});

test("DELTA-048: cards have explicit football presentation roles", () => {
  for (const className of [
    "delta-profile-card",
    "delta-match-card",
    "delta-training-card",
    "delta-quick-tile",
    "delta-collection-card",
    "delta-missions-card",
    "delta-news-card",
    "delta-stat-card",
  ]) {
    assert.match(dashboard, new RegExp(className));
    assert.match(css, new RegExp(`\\.${className}`));
  }
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 768px\)/);
});

test("DELTA-048: generated stadium artwork is a compact production WebP", () => {
  const asset = path.join(root, "public/assets/dashboard-football-command-v1.webp");
  const stat = fs.statSync(asset);
  const signature = fs.readFileSync(asset).subarray(0, 12).toString("ascii");
  assert.match(signature, /^RIFF....WEBP$/s);
  assert.ok(stat.size > 30_000, "asset should contain a real stadium visual");
  assert.ok(stat.size < 160_000, "dashboard background should stay below 160 KB");
});
