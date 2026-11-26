import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { formatTeamName, getDeltaBranchLabel } from "../lib/teams.ts";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const component = read("components/PublicTeamSite.tsx");
const css = read("components/public/public-experience.module.css");
const preview = read("app/preview/public-experience/page.tsx");

test("DELTA-047: teams sharing the DELTA crest keep distinct branch identities", () => {
  assert.equal(formatTeamName("K.S. Delta Warszawa GM"), "Delta Górny Mokotów");
  assert.equal(formatTeamName("K.S. Delta Warszawa DM"), "Delta Dolny Mokotów");
  assert.equal(formatTeamName("K.S. Delta Warszawa WI"), "Delta Wilanów");
  assert.equal(formatTeamName("K.S. Delta Warszawa WA"), "Delta Wawer");
  assert.equal(formatTeamName("Wilanów"), "Delta Wilanów");
  assert.equal(formatTeamName("Dolny Mokotów"), "Delta Dolny Mokotów");
  assert.equal(getDeltaBranchLabel("K.S. Delta Warszawa GM"), "GÓRNY MOKOTÓW");
  assert.equal(getDeltaBranchLabel("K.S. Delta Warszawa DM"), "DOLNY MOKOTÓW");
  assert.equal(getDeltaBranchLabel("K.S. Delta Warszawa WI"), "WILANÓW");
  assert.equal(getDeltaBranchLabel("K.S. Delta Warszawa WA"), "WAWER");
  assert.equal(getDeltaBranchLabel("Wilanów"), "WILANÓW");
  assert.equal(getDeltaBranchLabel("FC Vizja Warszawa"), null);
});

test("DELTA-047: the match card explains the shared crest and renders district badges", () => {
  assert.match(component, /getDeltaBranchLabel/);
  assert.match(component, /styles\.teamDistrict/);
  assert.match(component, /WSPÓLNY HERB · RÓŻNE OŚRODKI/);
  assert.match(css, /\.teamDistrict\s*\{/);
  assert.match(preview, /K\.S\. Delta Warszawa WI/);
});

test("DELTA-047: DELTA Experience is a visual, explanatory module catalogue", () => {
  assert.equal((component.match(/art:\s*"\//g) || []).length, 9);
  assert.equal((component.match(/audience:\s*"/g) || []).length, 9);
  assert.equal((component.match(/detail:\s*"/g) || []).length, 9);
  assert.match(component, /DLA ZAWODNIKA/);
  assert.match(component, /DLA RODZICA/);
  assert.match(component, /DLA DRUŻYNY/);
  assert.doesNotMatch(component, /\/assets\/players\//);
  assert.match(css, /\.experienceGuide\s*\{/);
  assert.match(css, /\.featureArt\s*\{/);
  assert.match(css, /grid-template-columns:\s*repeat\(12/);
});

test("DELTA-047: generated tactical artwork is optimized for the public page", () => {
  const asset = path.join(root, "public/assets/public-experience-tactical-v1.webp");
  const stat = fs.statSync(asset);
  assert.ok(stat.size > 40_000, "asset should contain a real premium visual");
  assert.ok(stat.size < 180_000, "optimized WebP should stay below 180 KB");
});
