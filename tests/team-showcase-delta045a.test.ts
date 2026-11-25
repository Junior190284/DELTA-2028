import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildRoster,
  circularOffset,
  cardLayout,
  isWrapJump,
  normalizePosition,
  normalizeShirtNumber,
  resolveShowcasePhoto,
  showNavigation,
  type RosterPlayerRow,
} from "../lib/team/teamShowcase.ts";
import { DEMO_ROSTER, DEMO_STATIC_PHOTOS, NEUTRAL_SHOWCASE_ROSTER } from "../lib/team/teamShowcaseDemo.ts";
import TeamShowcase2 from "../components/team-showcase-2/TeamShowcase2.tsx";

const root = process.cwd();
const showcaseCssSource = fs.readFileSync(
  path.join(root, "components/team-showcase-2/team-showcase-2.css"),
  "utf8"
);
const showcaseComponentSource = fs.readFileSync(
  path.join(root, "components/team-showcase-2/TeamShowcase2.tsx"),
  "utf8"
);

test("DELTA-045A: Zero fake player photos & authentic photo resolution", () => {
  const rowA: RosterPlayerRow = { id: "p-1", display_name: "Adam Nowak", shirt_number: "7", position: "NAP", photo_path: null, active: true };
  const photoA = resolveShowcasePhoto(rowA, "/assets/players/ryszard-rybacki.png");
  // Someone else's portrait is rejected
  assert.deepEqual(photoA, { kind: "none" });

  const rowRyszard: RosterPlayerRow = { id: "demo-p7", display_name: "Ryszard Rybacki", shirt_number: "7", position: "NAP", photo_path: null, active: true };
  const photoRyszard = resolveShowcasePhoto(rowRyszard, "/assets/players/ryszard-rybacki.png");
  assert.deepEqual(photoRyszard, { kind: "static", url: "/assets/players/ryszard-rybacki.png" });

  const rowSigned: RosterPlayerRow = { id: "p-signed", display_name: "Kacper Testowy", shirt_number: "11", position: "POM", photo_path: "storage/p-signed.jpg", active: true };
  const photoSigned = resolveShowcasePhoto(rowSigned);
  assert.deepEqual(photoSigned, { kind: "signed", playerId: "p-signed" });
});

test("DELTA-045A: Carousel geometry, active focal scaling and wrap jump prevention", () => {
  const roster = buildRoster(DEMO_ROSTER, DEMO_STATIC_PHOTOS);
  assert.equal(roster.length, 7);
  assert.equal(showNavigation(roster.length), true);

  // Active card offset is 0, layout is fully visible and scaled
  const activeLayout = cardLayout(0, 2);
  assert.equal(activeLayout.scale, 1);
  assert.equal(activeLayout.dim, 0);
  assert.equal(activeLayout.visible, true);

  // Side card offset +1 is smaller and dimmed
  const sideLayout = cardLayout(1, 2);
  assert.ok(sideLayout.scale < activeLayout.scale);
  assert.ok(sideLayout.dim > 0);

  // Circular offset: element before 0 wraps to 6
  assert.equal(circularOffset(6, 0, 7), -1);
  assert.equal(circularOffset(0, 0, 7), 0);
  assert.equal(circularOffset(1, 0, 7), 1);

  // Wrap jump is detected when transitioning across ends
  assert.equal(isWrapJump(-2, 2), true);
  assert.equal(isWrapJump(0, 1), false);
});

test("DELTA-045A: Static rendering of TeamShowcase2 in DEMO mode", () => {
  const demoRoster = buildRoster(DEMO_ROSTER, DEMO_STATIC_PHOTOS);
  const html = renderToStaticMarkup(
    React.createElement(TeamShowcase2, {
      players: demoRoster,
      source: "demo",
      userRole: "parent",
      parentPlayerIds: [],
    })
  );

  assert.match(html, /THE ROAD TO GLORY · TEAM SHOWCASE 2\.0/);
  assert.match(html, /TRYB DEMO · PODGLĄD/);
  assert.match(html, /Ryszard Rybacki/);
  assert.match(html, /data-testid="team-showcase-stage"/);
  assert.match(html, /data-testid="team-showcase-prev"/);
  assert.match(html, /data-testid="team-showcase-next"/);
});

test("DELTA-045A: Sibling isolation & PII protection between own child and teammate", () => {
  const testRoster: RosterPlayerRow[] = [
    { id: "child-parent-1", display_name: "Antoni Nowak", shirt_number: "2", position: "NAP", photo_path: null, active: true },
    { id: "teammate-other-2", display_name: "Bartek Kowalski", shirt_number: "4", position: "OBR", photo_path: null, active: true },
  ];
  const roster = buildRoster(testRoster);

  // Parent has access to "child-parent-1" (shirt 2, sorted first)
  const htmlChild1 = renderToStaticMarkup(
    React.createElement(TeamShowcase2, {
      players: roster,
      source: "live",
      userRole: "parent",
      parentPlayerIds: ["child-parent-1"],
    })
  );

  assert.match(htmlChild1, /TWÓJ PODOPIECZNY/);
  assert.match(htmlChild1, /DANE RZECZYWISTE · SKŁAD DRUŻYNY/);
  // Zero fake statistics fabricated
  assert.doesNotMatch(htmlChild1, /Gole: 25|Asysty: 14|Ocena: 9\.8/);
});

test("DELTA-045A: Accessibility, 44px touch targets and prefers-reduced-motion support", () => {
  assert.match(showcaseCssSource, /prefers-reduced-motion: reduce/);
  assert.match(showcaseCssSource, /min-width: 44px/);
  assert.match(showcaseCssSource, /min-height: 44px/);
  assert.match(showcaseCssSource, /overflow-x: hidden/);
  assert.match(showcaseComponentSource, /role="listbox"/);
  assert.match(showcaseComponentSource, /aria-activedescendant=/);
  assert.match(showcaseComponentSource, /onKeyDown=/);
});

test("DELTA-045B: Live blocked state rendered honestly without leaking entire public.players table", () => {
  const demoRoster = buildRoster(DEMO_ROSTER, DEMO_STATIC_PHOTOS);
  const htmlBlocked = renderToStaticMarkup(
    React.createElement(TeamShowcase2, {
      players: demoRoster,
      source: "demo",
      userRole: "parent",
      parentPlayerIds: ["p-1"],
      liveBlockedReason: "Brak tabeli teams i relacji drużyna–zawodnik w bazie (LIVE zablokowany — wymagane uzgodnienie schematu)",
    })
  );

  assert.match(htmlBlocked, /TRYB DEMO · LIVE BLOCKED/);
  assert.match(htmlBlocked, /Brak tabeli teams i relacji drużyna–zawodnik w bazie/);
});

test("DELTA-045B: Empty roster and missing data gracefully render NeutralPlayerSilhouette", () => {
  const emptyHtml = renderToStaticMarkup(
    React.createElement(TeamShowcase2, {
      players: [],
      source: "demo",
      userRole: "parent",
      parentPlayerIds: [],
    })
  );

  assert.match(emptyHtml, /data-testid="team-showcase-empty"/);
  assert.match(emptyHtml, /Skład jest obecnie przygotowywany/);

  // Missing number and position
  const incompleteRoster = buildRoster([
    { id: "inc-1", display_name: "Zawodnik Bez Numeru", shirt_number: null, position: null, photo_path: null, active: true },
  ]);
  const incHtml = renderToStaticMarkup(
    React.createElement(TeamShowcase2, {
      players: incompleteRoster,
      source: "demo",
      userRole: "parent",
      parentPlayerIds: [],
    })
  );

  assert.match(incHtml, /#-<\/span>/);
  assert.match(incHtml, /ZAWODNIK AKADEMII/);
  assert.match(incHtml, /ZDJĘCIE WKRÓTCE/);
});

test("DELTA-045B: Photo privacy gate prevents fetching unauthorized signed photos of teammates", () => {
  assert.match(showcaseComponentSource, /canAccessPhoto/);
  assert.match(showcaseComponentSource, /parentPlayerIds\.includes\(p\.id\)/);
  assert.match(showcaseComponentSource, /setPhotos\(\(s\) => \(\{ \.\.\.s, \[p\.id\]: \{ status: "none" \} \}\)\)/);
});

test("DELTA-045C: NEUTRAL_SHOWCASE_ROSTER defines zero identifying children names", () => {
  const neutralRoster = buildRoster(NEUTRAL_SHOWCASE_ROSTER);
  assert.equal(neutralRoster.length, 7);
  for (const p of neutralRoster) {
    assert.match(p.fullName, /^Zawodnik\s+(Alfa|Beta|Gamma|Delta|Epsilon|Dzeta|Eta)$/);
  }
});
