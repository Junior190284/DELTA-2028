import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("styles/dashboard-football-theme.css");
const teamHub = read("components/TeamHub.tsx");

test("DELTA-049: roster hero has a dedicated, descriptive command-centre layout", () => {
  assert.match(teamHub, /v205-team-active/);
  assert.match(teamHub, /v205-team-hero/);
  assert.match(teamHub, /v205-team-hero-kicker/);
  assert.match(teamHub, /CENTRUM SKŁADU/);
  assert.match(teamHub, /Skład, role i forma zespołu w jednym miejscu/);
  assert.match(teamHub, /Herb DELTA 2018 GM/);
});

test("DELTA-049: roster skin resolves overlap and keeps the football composition responsive", () => {
  assert.match(css, /\.v104-hub \.v205-team-active \.delta-sticky-live-bar/);
  assert.match(css, /position:\s*relative/);
  assert.match(css, /\.v104-hub \.v205-team-hero/);
  assert.match(css, /grid-template-columns:\s*minmax\(340px/);
  assert.match(css, /dashboard-football-command-v1\.webp/);
  assert.match(css, /\.v205-team-hero \.v871-team-crest img/);
  assert.match(css, /\.v205-team-hero \.v108-team-players/);
  assert.match(css, /\.v871-team-page > \.v119-showcase/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
});

