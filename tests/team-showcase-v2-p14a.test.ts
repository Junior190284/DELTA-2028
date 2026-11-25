import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normalizePosition,
  normalizeShirtNumber,
  splitName,
  resolveShowcasePhoto,
  toShowcasePlayer,
  buildRoster,
  wrapIndex,
  circularOffset,
  cardLayout,
  sideSlots,
  swipeStep,
  carouselSlots,
  showNavigation,
  isWrapJump,
  resolveRosterState,
  classifyAuthResult,
  type RosterPlayerRow
} from "../lib/team/teamShowcase.ts";
import { DEMO_ROSTER, DEMO_STATIC_PHOTOS } from "../lib/team/teamShowcaseDemo.ts";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const row = (o: Partial<RosterPlayerRow>): RosterPlayerRow => ({ id: "x", display_name: "Jan Kowalski", shirt_number: "5", position: null, photo_path: null, active: true, ...o });

// ---------- Photos: no substitutes ----------

test("P14A photos: a player without a photo NEVER gets someone else's photo (Ryszard's portrait is rejected)", () => {
  assert.deepEqual(resolveShowcasePhoto(row({ display_name: "Jan Kowalski" }), "/assets/players/ryszard-rybacki.png"), { kind: "none" });
  assert.deepEqual(resolveShowcasePhoto(row({ display_name: "Jan Kowalski" }), "/assets/cards/inferno-3d/player-default.png"), { kind: "none" });
  assert.deepEqual(resolveShowcasePhoto(row({ display_name: "Jan Kowalski" }), "/demo/player-cutout.png"), { kind: "none" });
  assert.deepEqual(resolveShowcasePhoto(row({ display_name: "Ryszard Rybacki" }), "/assets/players/ryszard-rybacki.png"), { kind: "static", url: "/assets/players/ryszard-rybacki.png" });
});

test("P14A photos: photo_path from storage = a signed URL for THAT player only; nothing = silhouette", () => {
  assert.deepEqual(resolveShowcasePhoto(row({ id: "p-1", photo_path: "p-1/face.jpg" })), { kind: "signed", playerId: "p-1" });
  assert.deepEqual(resolveShowcasePhoto(row({ id: "p-2", photo_path: "   " })), { kind: "none" });
  assert.deepEqual(resolveShowcasePhoto(row({ id: "p-3", photo_path: null })), { kind: "none" });
});

test("P14A demo: only Ryszard has a photo; the remaining 6 players get the silhouette", () => {
  const roster = buildRoster(DEMO_ROSTER, DEMO_STATIC_PHOTOS);
  assert.equal(roster.length, 7);
  const withPhoto = roster.filter((p) => p.photo.kind !== "none");
  assert.equal(withPhoto.length, 1);
  assert.equal(withPhoto[0].fullName, "Ryszard Rybacki");
  for (const p of roster) {
    if (p.photo.kind === "static") assert.match(p.fullName, /Rybacki/);
  }
  // the demo image list contains only the player's own file
  for (const [id, url] of Object.entries(DEMO_STATIC_PHOTOS)) {
    const player = DEMO_ROSTER.find((r) => r.id === id);
    assert.ok(player, `${id} is in the roster`);
    assert.match(url, /ryszard/);
    assert.match(String(player!.display_name), /Ryszard/);
  }
});

// ---------- Player data ----------

test("P14A positions: words and codes recognised; no data = no position (nothing invented)", () => {
  assert.deepEqual(normalizePosition("Bramkarz"), { code: "BR", label: "BRAMKARZ" });
  assert.deepEqual(normalizePosition("OBR"), { code: "OBR", label: "OBROŃCA" });
  assert.deepEqual(normalizePosition("obrońca"), { code: "OBR", label: "OBROŃCA" });
  assert.deepEqual(normalizePosition("Pomocnik"), { code: "POM", label: "POMOCNIK" });
  assert.deepEqual(normalizePosition("NAP"), { code: "NAP", label: "NAPASTNIK" });
  assert.equal(normalizePosition(null), null);
  assert.equal(normalizePosition("  "), null);
  assert.deepEqual(normalizePosition("Skrzydłowy"), { code: "SKR", label: "SKRZYDŁOWY" });
  const p = toShowcasePlayer(row({ position: null }));
  assert.equal(p.positionLabel, null);
});

test("P14A numbers and names", () => {
  assert.equal(normalizeShirtNumber(7), "7");
  assert.equal(normalizeShirtNumber("#10"), "10");
  assert.equal(normalizeShirtNumber(""), null);
  assert.equal(normalizeShirtNumber(null), null);
  assert.deepEqual(splitName("Aleksander Zieliński"), { firstName: "Aleksander", lastName: "Zieliński" });
  assert.deepEqual(splitName("Jan Maria Rokita"), { firstName: "Jan Maria", lastName: "Rokita" });
  assert.deepEqual(splitName("Pele"), { firstName: "", lastName: "Pele" });
  assert.equal(toShowcasePlayer(row({ display_name: "  " })).fullName, "ZAWODNIK DELTA");
});

test("P14A roster: inactive players filtered out; sorted by number, no number goes last", () => {
  const r = buildRoster([
    row({ id: "a", display_name: "Adam Zet", shirt_number: "10" }),
    row({ id: "b", display_name: "Bartek Ygrek", shirt_number: "2" }),
    row({ id: "c", display_name: "Czarek Iks", shirt_number: null }),
    row({ id: "d", display_name: "Darek Wu", shirt_number: "7", active: false }),
  ]);
  assert.deepEqual(r.map((p) => p.id), ["b", "a", "c"]);
});

// ---------- Carousel ----------

test("P14A carousel: circular offset (the left neighbour of the first = the last)", () => {
  assert.equal(wrapIndex(-1, 7), 6);
  assert.equal(wrapIndex(7, 7), 0);
  assert.equal(circularOffset(0, 0, 7), 0);
  assert.equal(circularOffset(1, 0, 7), 1);
  assert.equal(circularOffset(6, 0, 7), -1);
  assert.equal(circularOffset(3, 0, 7), 3);
  assert.equal(circularOffset(4, 0, 7), -3);
  // even count: the opposite card always on the right (stable)
  assert.equal(circularOffset(3, 0, 6), 3);
  assert.equal(circularOffset(0, 3, 6), 3);
  assert.equal(circularOffset(0, 0, 0), 0);
});

test("P14A carousel: active largest and undimmed; sides symmetric, smaller, darker, without covering the active one", () => {
  const c = cardLayout(0, 2), l1 = cardLayout(-1, 2), r1 = cardLayout(1, 2), r2 = cardLayout(2, 2), r3 = cardLayout(3, 2);
  assert.deepEqual([c.scale, c.dim, c.x], [1, 0, 0]);
  assert.equal(l1.x, -r1.x);
  assert.equal(l1.scale, r1.scale);
  assert.ok(r1.scale < 1 && r2.scale < r1.scale);
  assert.ok(r1.dim > 0 && r2.dim > r1.dim);
  assert.ok(c.z > r1.z && r1.z > r2.z);
  // the right neighbour's left edge is beyond the active card's right edge (0.5 of its width)
  assert.ok(r1.x - r1.scale / 2 > 0.5);
  assert.equal(r3.visible, false, "beyond the side-card limit");
});

test("P14A carousel: number of side cards depends on width; swipe has a threshold", () => {
  assert.equal(sideSlots(390), 1);
  assert.equal(sideSlots(768), 2);
  assert.equal(sideSlots(1440), 3);
  assert.equal(swipeStep(-80), 1, "swipe left = next");
  assert.equal(swipeStep(80), -1, "swipe right = previous");
  assert.equal(swipeStep(20), 0, "below the threshold = no change (a tap)");
  assert.equal(swipeStep(Number.NaN), 0);
});

// ---------- Integration / safety ----------

test("P14A route: /preview/team-showcase-v2 under the /preview guard (404 in production); data read-only with the user's session", () => {
  const page = read("app/preview/team-showcase-v2/page.tsx");
  assert.match(page, /\.from\("players"\)\s*\.select\("id,display_name,shirt_number,position,photo_path,active"\)/);
  assert.doesNotMatch(strip(page), /\.(insert|update|upsert|delete|rpc)\(/, "no writes");
  assert.match(page, /createClient\(\)/, "server client with the user's session (RLS)");
  assert.doesNotMatch(page, /SERVICE_ROLE|service_role|createAdminClient|supabase\/admin/, "no service key / RLS bypass");
  assert.match(page, /resolveRosterState\(/);
  const layout = read("app/preview/layout.tsx");
  assert.match(layout, /VERCEL_ENV === "production"/);
  assert.match(layout, /notFound\(\)/);
});

// ---------- P14A.1: roster states ----------

test("P14A.2 auth: identity only from getUser(); classification by error type (no cookies or tokens)", () => {
  assert.equal(classifyAuthResult(true, null), "user");
  assert.equal(classifyAuthResult(false, null), "anonymous", "no user, no error = not logged in");
  assert.equal(classifyAuthResult(false, { name: "AuthSessionMissingError", status: 400 }), "anonymous");
  // expired / revoked / tampered session
  assert.equal(classifyAuthResult(false, { name: "AuthApiError", status: 401, code: "bad_jwt" }), "session-invalid");
  assert.equal(classifyAuthResult(false, { name: "AuthApiError", status: 403, code: "session_not_found" }), "session-invalid");
  assert.equal(classifyAuthResult(false, { name: "AuthApiError", status: 400, code: "refresh_token_not_found" }), "session-invalid");
  assert.equal(classifyAuthResult(false, { name: "AuthApiError", status: 404, code: "user_not_found" }), "session-invalid");
  assert.equal(classifyAuthResult(false, { name: "AuthInvalidJwtError", status: 400, code: "invalid_jwt" }), "session-invalid");
  assert.equal(classifyAuthResult(false, { name: "AuthInvalidTokenResponseError", status: 500 }), "session-invalid");
  assert.equal(classifyAuthResult(false, { name: "AuthUnknownError" }), "session-invalid");
  // the session cannot be checked
  assert.equal(classifyAuthResult(false, { name: "AuthRetryableFetchError", status: 0 }), "auth-unavailable");
  assert.equal(classifyAuthResult(false, { name: "AuthRetryableFetchError", status: 503 }), "auth-unavailable");
  assert.equal(classifyAuthResult(false, { name: "AuthApiError", status: 500 }), "auth-unavailable");
  // a confirmed user beats an accompanying error
  assert.equal(classifyAuthResult(true, { name: "AuthApiError", status: 401 }), "user");
});

test("P14A.2 states: DEMO only without an auth error; invalid/unavailable session = message without data", () => {
  const rows = [row({ id: "a" }), row({ id: "b" })];
  assert.deepEqual(resolveRosterState({ auth: "anonymous", queryFailed: false, rows: null }), { kind: "demo" });
  assert.deepEqual(resolveRosterState({ auth: "session-invalid", queryFailed: false, rows }), { kind: "error", reason: "session-invalid" }, "even if rows were passed in, they are not shown");
  assert.deepEqual(resolveRosterState({ auth: "auth-unavailable", queryFailed: false, rows }), { kind: "error", reason: "auth-unavailable" });
  assert.deepEqual(resolveRosterState({ auth: "user", queryFailed: false, rows }), { kind: "live", rows });
  assert.deepEqual(resolveRosterState({ auth: "user", queryFailed: false, rows: [] }), { kind: "empty" });
  assert.deepEqual(resolveRosterState({ auth: "user", queryFailed: false, rows: [row({ id: "x", active: false })] }), { kind: "empty" });
  assert.deepEqual(resolveRosterState({ auth: "user", queryFailed: true, rows: null }), { kind: "error", reason: "query" });
  assert.deepEqual(resolveRosterState({ auth: "user", queryFailed: false, rows: null }), { kind: "error", reason: "query" });
});

test("P14A.2 page: no reading of cookies/tokens, getUser() from the existing SSR client, query only for a user", () => {
  const page = strip(read("app/preview/team-showcase-v2/page.tsx"));
  assert.doesNotMatch(page, /cookies\(\)|auth-token|isSupabaseAuthCookieName/, "no cookie inspection");
  assert.doesNotMatch(page, /getSession\(\)/, "getSession() does not verify the token on the server");
  assert.match(page, /import \{ createClient \} from "@\/lib\/supabase\/server";/);
  assert.match(page, /await supabase\.auth\.getUser\(\)/);
  assert.match(page, /if \(auth === "user"\) \{\s*const res = await supabase\s*\.from\("players"\)/, "the roster query only after verification");
  assert.doesNotMatch(page, /console\.(log|error|warn|info)/, "no logs (no tokens or error contents)");
  assert.match(page, /\{ name: error\.name, status: error\.status, code: error\.code \}/, "only the error type/status goes to the classification");
  const lib = read("lib/team/teamShowcase.ts");
  assert.doesNotMatch(lib, /isSupabaseAuthCookieName|hasAuthCookie/);
});

test("P14A.3: shared request handling (proxy.ts) NOT modified by the prototype; Google OAuth / redirects as before", () => {
  const proxy = read("proxy.ts");
  assert.doesNotMatch(proxy, /team-showcase|teamShowcase|x-delta-session-ended|SESSION_ENDED|getSession\(/, "no prototype logic in proxy.ts");
  assert.match(proxy, /new URL\("\/auth\/callback", request\.url\)/, "OAuth fallback to /auth/callback kept");
  assert.match(proxy, /await supabase\.auth\.getUser\(\);\s*return response;/, "standard getUser() for every route");
});

test("P14A.3 page: identity only from getUser(); no headers/cookies; the limitation documented", () => {
  const raw = read("app/preview/team-showcase-v2/page.tsx");
  const page = strip(raw);
  assert.doesNotMatch(page, /next\/headers|headers\(\)|cookies\(\)/, "no reading of headers or cookies");
  assert.match(page, /await supabase\.auth\.getUser\(\)/);
  assert.match(raw, /Known limitation/i);
  const lib = read("lib/team/teamShowcase.ts");
  assert.match(lib, /KNOWN LIMITATION \(P14A\.3, deliberate\)/);
  assert.doesNotMatch(lib, /detectSessionEnded|SESSION_ENDED_HEADER|isSessionSignalRoute/);
});

test("P14A.3 limitation: a revoked session / failed refresh = AuthSessionMissingError = DEMO (never real data)", () => {
  // this is how supabase-js reports it (403 session_not_found -> AuthSessionMissingError; failed refresh -> session removed)
  const outcome = classifyAuthResult(false, { name: "AuthSessionMissingError", status: 400 });
  assert.equal(outcome, "anonymous");
  assert.deepEqual(resolveRosterState({ auth: outcome, queryFailed: false, rows: [row({ id: "secret" })] }), { kind: "demo" }, "rows are not shown without a verified user");
});

test("P14A.2 photos: consistent with the existing /api/player-photo rules (getUser + RLS + signed URL); photo_path not passed to the browser", () => {
  const api = read("app/api/player-photo/[playerId]/route.ts");
  assert.match(api, /supabase\.auth\.getUser\(\)/);
  assert.match(api, /status:401/);
  assert.match(api, /createSignedUrl\(player\.photo_path, 60\*30\)/);
  // the browser gets only kind "signed" + the player's id, not the storage path
  const p = toShowcasePlayer(row({ id: "p-9", photo_path: "secret/child-9.jpg" }));
  assert.deepEqual(p.photo, { kind: "signed", playerId: "p-9" });
  assert.doesNotMatch(JSON.stringify(p), /secret\/child-9\.jpg/);
});

test("P14A.2 error view: expired session -> 'Zaloguj się ponownie' (/login) + retry; other errors -> retry", () => {
  const src = read("components/team-showcase/TeamShowcaseV2.tsx");
  assert.match(src, /reason: "session-invalid" \| "auth-unavailable" \| "query"/);
  assert.match(src, /href="\/login"/);
  assert.match(src, /Sesja wygasła/);
  assert.match(src, /Nie udało się sprawdzić sesji/);
  assert.match(src, /Nie udało się wczytać składu/);
  assert.ok(fs.existsSync(path.join(root, "app/login/page.tsx")), "/login exists");
});

// ---------- P14A.1: small rosters, no duplicates ----------

test("P14A.1 carousel: for 0-30 players, every active one and every width: each person visible AT MOST once", () => {
  for (let count = 0; count <= 30; count += 1) {
    for (const slots of [1, 2, 3]) {
      for (let active = 0; active < Math.max(1, count); active += 1) {
        const vis = carouselSlots(count, active, slots);
        const idx = vis.map((v) => v.index), off = vis.map((v) => v.offset);
        assert.equal(new Set(idx).size, idx.length, `duplicate person count=${count} slots=${slots} active=${active}`);
        assert.equal(new Set(off).size, off.length, `two cards in one position count=${count} slots=${slots} active=${active}`);
        assert.equal(vis.length, Math.min(count, 2 * slots + 1), `number of visible cards count=${count} slots=${slots}`);
        if (count > 0) assert.equal(vis.find((v) => v.offset === 0)?.index, active, "the active one in the middle");
      }
    }
  }
});

test("P14A.1 carousel: 1 player = one central card without navigation; 2 = the other one on the right; 3 = left/middle/right", () => {
  assert.equal(showNavigation(0), false);
  assert.equal(showNavigation(1), false);
  assert.equal(showNavigation(2), true);
  assert.deepEqual(carouselSlots(1, 0, 3).map((v) => [v.index, v.offset]), [[0, 0]]);
  assert.deepEqual(carouselSlots(2, 0, 3).map((v) => [v.index, v.offset]), [[0, 0], [1, 1]]);
  assert.deepEqual(carouselSlots(2, 1, 3).map((v) => [v.index, v.offset]), [[1, 0], [0, 1]]);
  assert.deepEqual(carouselSlots(3, 0, 1).map((v) => [v.index, v.offset]), [[2, -1], [0, 0], [1, 1]]);
  assert.deepEqual(carouselSlots(0, 0, 2), []);
});

test("P14A.1 carousel: switching with 2 players moves cards by at most 1 position (no fly-through)", () => {
  for (const [from, to] of [[0, 1], [1, 0]]) {
    for (let i = 0; i < 2; i += 1) assert.equal(isWrapJump(circularOffset(i, from, 2), circularOffset(i, to, 2)), false);
  }
});

test("P14A.1 carousel: a card wrapping across the edge is detected (no animation across the centre)", () => {
  assert.equal(isWrapJump(undefined, 3), false, "first render");
  assert.equal(isWrapJump(0, 1), false);
  assert.equal(isWrapJump(-1, 0), false);
  assert.equal(isWrapJump(-1, 1), true, "3 players: from the left to the right");
  assert.equal(isWrapJump(-3, 3), true, "7 players: from the far left to the far right");
  // 7 players, 'next': exactly one card wraps
  const wraps = Array.from({ length: 7 }, (_, i) => isWrapJump(circularOffset(i, 0, 7), circularOffset(i, 1, 7))).filter(Boolean);
  assert.equal(wraps.length, 1);
});

test("P14A component: 2D only (no rotateY/preserve-3d/backface), photos only via /api/player-photo, silhouette + 'ZDJĘCIE WKRÓTCE'", () => {
  const src = strip(read("components/team-showcase/TeamShowcaseV2.tsx"));
  const css = strip(read("components/team-showcase/team-showcase.css"));
  for (const s of [src, css]) assert.doesNotMatch(s, /rotateY|preserve-3d|backface-visibility|backfaceVisibility|perspective/);
  assert.match(src, /fetch\(`\/api\/player-photo\/\$\{encodeURIComponent\(photo\.playerId\)\}`\)/);
  assert.match(src, /ZDJĘCIE WKRÓTCE/);
  assert.match(src, /<NeutralPlayerSilhouette shirtNumber=\{null\}/, "P14A.1: the number shown once (card corner), not on the silhouette");
  assert.match(src, /Skład jest przygotowywany/);
  assert.match(src, /Spróbuj ponownie/);
  assert.match(src, /router\.refresh\(\)/, "retry = reload the data on the server");
  assert.match(src, /\{nav \? \(/, "no arrows with 1 player");
  assert.match(css, /\.dts-card\.is-wrap \{ transition: none; \}/);
  assert.match(src, /touch|onPointerDown/);
  assert.match(css, /touch-action: pan-y/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  // keyframes animate only transform/opacity
  for (const k of css.match(/@keyframes \w+ \{[\s\S]*?\n\}/g) || []) {
    for (const m of k.matchAll(/([a-z-]+)\s*:/g)) assert.ok(["transform", "opacity"].includes(m[1]), `keyframes: ${m[1]}`);
  }
});

test("P14A: no new dependencies and no changes to the packs", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const heavy of ["framer-motion", "gsap", "swiper", "embla-carousel", "keen-slider", "lottie-web"]) {
    assert.equal(Boolean({ ...pkg.dependencies, ...pkg.devDependencies }[heavy]), false, heavy);
  }
});
