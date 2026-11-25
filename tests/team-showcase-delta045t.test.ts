import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildRoster,
  carouselSlots,
  showNavigation,
  swipeStep,
} from "../lib/team/teamShowcase.ts";

const root = process.cwd();
const component = fs.readFileSync(
  path.join(root, "components/team-showcase-2/TeamShowcase2.tsx"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(root, "components/team-showcase-2/team-showcase-2.css"),
  "utf8"
);

test("DELTA-045T: player artwork and identity are separate sibling regions", () => {
  const mediaIndex = component.indexOf('className="ts2-card-media"');
  const identityIndex = component.indexOf('className="ts2-card-identity"');

  assert.ok(mediaIndex > 0, "card must render an isolated media region");
  assert.ok(identityIndex > mediaIndex, "identity region must be outside and after media");
  assert.match(css, /\.ts2-card-inner\s*\{[\s\S]*?display:\s*grid;/);
  assert.match(css, /\.ts2-card-media\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?isolation:\s*isolate;[\s\S]*?contain:\s*paint;/);
  assert.match(css, /\.ts2-card-identity\s*\{[\s\S]*?z-index:\s*12;[\s\S]*?overflow:\s*hidden;[\s\S]*?background:/);
  const identityEnd = component.indexOf("</div>", component.indexOf("</div>", identityIndex) + 6) + 6;
  assert.doesNotMatch(
    component.slice(identityIndex, identityEnd),
    /NeutralPlayerSilhouette/,
    "placeholder artwork must never be mounted in the identity region"
  );
});

test("DELTA-045T: long names wrap to two lines in an opaque identity zone", () => {
  assert.match(css, /\.ts2-name-last\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/);
  assert.match(css, /\.ts2-name-last\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(css, /\.ts2-card-identity\s*\{[\s\S]*?min-height:\s*84px;/);
});

test("DELTA-045T: private photo failures return to the neutral placeholder", () => {
  assert.match(component, /onError=\{\(\)\s*=>\s*setPhotos\([\s\S]*?status:\s*"none"/);
  assert.match(component, /shirtNumber=\{null\}/, "placeholder must not duplicate the number badge");
  assert.match(component, /ZDJĘCIE WKRÓTCE/);
});

test("DELTA-045T: one player has no carousel navigation and empty rosters remain valid", () => {
  assert.equal(showNavigation(0), false);
  assert.equal(showNavigation(1), false);
  assert.equal(showNavigation(2), true);
  assert.deepEqual(carouselSlots(0, 0, 3), []);
  assert.equal(carouselSlots(1, 0, 3).length, 1);
  assert.match(component, /if \(count === 0\)/);
});

test("DELTA-045T: roster preserves long names, real-photo ownership, and mobile swipe", () => {
  const roster = buildRoster([
    {
      id: "demo-long",
      display_name: "Jan Aleksander Kowalski-Nowak",
      shirt_number: 11,
      position: "napastnik",
      photo_path: "private/demo-long.webp",
      active: true,
    },
  ]);

  assert.equal(roster[0]?.fullName, "Jan Aleksander Kowalski-Nowak");
  assert.deepEqual(roster[0]?.photo, { kind: "signed", playerId: "demo-long" });
  assert.equal(swipeStep(-64), 1);
  assert.equal(swipeStep(64), -1);
  assert.equal(swipeStep(12), 0);
});
