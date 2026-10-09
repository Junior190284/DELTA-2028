import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { parseDeltaUpdates, generateSourceKey, generateLegacySourceKey, normalizeTextForHash } from "../lib/delta-sync/parser.ts";

function generateEventDedupeKey(type: string, entityId: string, discriminator?: string): string {
  const raw = `${type}:${entityId}:${discriminator || ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

const SOURCE = "https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108";

function page(firstBody = "Pierwsza treść") {
  return `
    <html><body>
      <div>Kolejka I 12-09-2026</div>
      <div>K.S. Delta Warszawa WI - K.S. Delta Warszawa GM</div>
      <div>[1] [2] &gt;&gt;&gt;</div>
      <div>Nowa wiadomość drużyny 02-10-2026</div>
      <p>${firstBody}</p>
      <div>Trening techniczny 01-10-2026</div>
      <p>Zajęcia dla zawodników.</p>
      <div>Informacja organizacyjna 30-09-2026</div>
      <p>Zbiórka przy boisku.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;
}

// --------------------------------------------------------------------------
// Existing baseline tests
// --------------------------------------------------------------------------
test("parses news without a historical call-up anchor and ignores schedule rows", () => {
  const items = parseDeltaUpdates(page(), SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Nowa wiadomość drużyny");
  assert.equal(items[0].body, "Pierwsza treść");
  assert.ok(items.every(item => !item.title.startsWith("Kolejka")));
});

test("keeps identity stable across syncs with identical content and detects changed content hash", () => {
  const item1 = parseDeltaUpdates(page("Pierwsza treść"), SOURCE)[0];
  const item2 = parseDeltaUpdates(page("Pierwsza treść"), SOURCE)[0];
  assert.equal(item1.source_key, item2.source_key);
  assert.equal(item1.content_hash, item2.content_hash);
});

test("decodes Polish HTML entities", () => {
  const items = parseDeltaUpdates(page("G&oacute;rny Mokot&oacute;w &amp; drużyna"), SOURCE);
  assert.equal(items[0].body, "Górny Mokotów & drużyna");
});

test("rejects a suspiciously incomplete response", () => {
  const html = "<div>&gt;&gt;&gt;</div><div>Jedna wiadomość 02-10-2026</div><p>Treść</p>";
  assert.throws(() => parseDeltaUpdates(html, SOURCE), /podejrzany wynik/);
});

// --------------------------------------------------------------------------
// HOTFIX REGRESSION TESTS: Article Boundary & Callups Separation
// --------------------------------------------------------------------------

test("HOTFIX: Separates 'Powołania 2018 Górny Mokotów' and 'Powołania 2018' without merging", () => {
  const html = `
    <html><body>
      <div>[1] [2] &gt;&gt;&gt;</div>
      <div>Powołania 2018 Górny Mokotów 09-10-2026</div>
      <p>2018 Górny Mokotów Mecz wewnętrzny z Wawer. 10-10-2026 (sobota) 10:00. Zbiórka 9:45. Zawodnicy: Rybacki, Gowin. Zabieramy: legitymację.</p>
      <div>Powołania 2018 08-10-2026</div>
      <p>2018 Mecz ligowy z SEMP Ursynów. 10-10-2026 (sobota) 13:30. Zbiórka 13:15. Zawodnicy: Kocjan, Lubas. Zabieramy: legitymację.</p>
      <div>Komunikat klubowy 05-10-2026</div>
      <p>Informacja o strojach.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const items = parseDeltaUpdates(html, SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Powołania 2018 Górny Mokotów");
  assert.equal(items[0].published_at.slice(0, 10), "2026-10-09");
  assert.equal(items[1].title, "Powołania 2018");
  assert.equal(items[1].published_at.slice(0, 10), "2026-10-08");

  // Crucial check: Post 0 body must NOT contain Post 1's title or date
  assert.ok(!items[0].body.includes("Powołania 2018"));
  assert.ok(!items[0].body.includes("08-10-2026"));
  assert.ok(!items[0].body.includes("SEMP Ursynów"));

  // Post 1 body must contain its own match info
  assert.ok(items[1].body.includes("SEMP Ursynów"));
  assert.ok(!items[1].body.includes("Komunikat klubowy"));
});

test("HOTFIX: Same publication date across different posts produces distinct items", () => {
  const html = `
    <html><body>
      <div>[1] &gt;&gt;&gt;</div>
      <div>Powołania 2018 Górny Mokotów 02-10-2026</div>
      <p>Mecz z FC Vizja Warszawa 04-10-2026. Zawodnicy: Rybacki.</p>
      <div>Powołania 2018 02-10-2026</div>
      <p>Mecz z Talent Warszawa 04-10-2026. Zawodnicy: Gowin.</p>
      <div>Grafik treningowy 02-10-2026</div>
      <p>Treningi w październiku.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const items = parseDeltaUpdates(html, SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Powołania 2018 Górny Mokotów");
  assert.equal(items[1].title, "Powołania 2018");
  assert.equal(items[2].title, "Grafik treningowy");

  assert.notEqual(items[0].source_key, items[1].source_key);
  assert.ok(!items[0].body.includes("Talent Warszawa"));
  assert.ok(items[1].body.includes("Talent Warszawa"));
});

test("HOTFIX: 3 consecutive callup posts produce exactly 3 items with clean boundaries", () => {
  const html = `
    <html><body>
      <div>&gt;&gt;&gt;</div>
      <div>Powołania 2018 Górny Mokotów 02-10-2026</div>
      <p>Post 1 treść.</p>
      <div>Powołania 2018 02-10-2026</div>
      <p>Post 2 treść.</p>
      <div>Powołania 2018 01-10-2026</div>
      <p>Post 3 treść.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const items = parseDeltaUpdates(html, SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Powołania 2018 Górny Mokotów");
  assert.equal(items[0].body, "Post 1 treść.");
  assert.equal(items[1].title, "Powołania 2018");
  assert.equal(items[1].body, "Post 2 treść.");
  assert.equal(items[2].title, "Powołania 2018");
  assert.equal(items[2].body, "Post 3 treść.");
});

test("HOTFIX: Post body containing multiple internal dates does not split the article prematurely", () => {
  const html = `
    <html><body>
      <div>&gt;&gt;&gt;</div>
      <div>Piłkarski Obóz Przygotowawczy 06-10-2026</div>
      <p>
        Zadatek do 30-11-2026, zapłata końcowa do 11-01-2027.
        Wyjazd 30-01-2027 (sobota) - przyjazd 05-02-2027 (piątek).
        Zbiórka 30-01-2027 o godzinie 08:00.
      </p>
      <div>Powołania 2018 05-10-2026</div>
      <p>Mecz ligowy 10-10-2026. Zbiórka 10-10-2026.</p>
      <div>Informacja 01-10-2026</div>
      <p>Zakończenie zapisów.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const items = parseDeltaUpdates(html, SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Piłkarski Obóz Przygotowawczy");
  assert.ok(items[0].body.includes("30-11-2026"));
  assert.ok(items[0].body.includes("11-01-2027"));
  assert.ok(items[0].body.includes("30-01-2027"));
  assert.ok(items[0].body.includes("05-02-2027"));
  assert.ok(!items[0].body.includes("Powołania 2018"));
});

test("HOTFIX: Callup followed by normal article and normal article followed by callup", () => {
  const html = `
    <html><body>
      <div>&gt;&gt;&gt;</div>
      <div>Indywidualne Zajęcia Techniczne 07-10-2026</div>
      <p>Zapraszamy na treningi motoryczne.</p>
      <div>Powołania 2018 Górny Mokotów 06-10-2026</div>
      <p>Mecz ligowy. Zawodnicy: Kowalski. Zabieramy: strój.</p>
      <div>Grunt to dobrze się ubrać! 05-10-2026</div>
      <p>Jesienna odzież sportowa.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const items = parseDeltaUpdates(html, SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Indywidualne Zajęcia Techniczne");
  assert.equal(items[1].title, "Powołania 2018 Górny Mokotów");
  assert.equal(items[2].title, "Grunt to dobrze się ubrać!");

  assert.ok(!items[0].body.includes("Powołania"));
  assert.ok(items[1].body.includes("Zabieramy: strój."));
  assert.ok(!items[1].body.includes("Grunt to dobrze"));
});

// --------------------------------------------------------------------------
// ETAP 11D.3: SOURCE KEY & EVENT DEDUPE VERIFICATION TESTS
// --------------------------------------------------------------------------

test("ETAP 11D.3: same title + different date => distinct source_key", () => {
  const key1 = generateSourceKey("Powołania 2018", "08-10-2026", "Mecz A");
  const key2 = generateSourceKey("Powołania 2018", "02-10-2026", "Mecz A");
  assert.notEqual(key1, key2);
});

test("ETAP 11D.3: same title + same date + different content => distinct source_key (COLLISION PREVENTION)", () => {
  const html = `
    <html><body>
      <div>[1] &gt;&gt;&gt;</div>
      <div>Powołania 2018 08-10-2026</div>
      <p>Mecz ligowy A z SEMP Ursynów. Zbiórka 10:00.</p>
      <div>Powołania 2018 08-10-2026</div>
      <p>Mecz towarzyski B z Talent Warszawa. Zbiórka 13:00.</p>
      <div>Informacja klubowa 01-10-2026</div>
      <p>Ważny komunikat.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const items = parseDeltaUpdates(html, SOURCE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Powołania 2018");
  assert.equal(items[1].title, "Powołania 2018");
  assert.notEqual(items[0].source_key, items[1].source_key);
  assert.ok(items[0].body.includes("SEMP Ursynów"));
  assert.ok(items[1].body.includes("Talent Warszawa"));
});

test("ETAP 11D.3: same article parsed twice => same source_key (STABILITY)", () => {
  const html = `
    <html><body>
      <div>&gt;&gt;&gt;</div>
      <div>Powołania 2018 Górny Mokotów 09-10-2026</div>
      <p>Mecz wewnętrzny. Zbiórka 9:45.</p>
      <div>Trening 08-10-2026</div>
      <p>Zajęcia motoryczne.</p>
      <div>Informacja 05-10-2026</div>
      <p>Komunikat.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const run1 = parseDeltaUpdates(html, SOURCE);
  const run2 = parseDeltaUpdates(html, SOURCE);

  assert.equal(run1.length, 3);
  assert.equal(run2.length, 3);
  assert.equal(run1[0].source_key, run2[0].source_key);
  assert.equal(run1[1].source_key, run2[1].source_key);
  assert.equal(run1[2].source_key, run2[2].source_key);
});

test("ETAP 11D.3: whitespace-only content variation => same source_key (NORMALIZATION)", () => {
  const keyStandard = generateSourceKey("Powołania 2018", "08-10-2026", "Mecz ligowy z SEMP Ursynów. Zbiórka 10:00.");
  const keyWhitespace = generateSourceKey("Powołania 2018", "08-10-2026", "  Mecz  ligowy   z\n\nSEMP\tUrsynów.\u00A0Zbiórka 10:00.  ");
  assert.equal(keyStandard, keyWhitespace);
});

test("ETAP 11D.3: existing production items match via legacy_source_key and do NOT reimport", () => {
  // Existing production database has row with legacy source_key
  const legacyProdKey = generateLegacySourceKey("Powołania 2018 Górny Mokotów", "09-10-2026");
  assert.equal(legacyProdKey, "5a29b006c93a330d25daa6fd4bd3c2013b58e0023792deadd3ac1b173778b309");

  // Simulated existing database Map
  const dbExistingByKey = new Map([
    [legacyProdKey, { source_key: legacyProdKey, title: "Powołania 2018 Górny Mokotów", body: "...", published_at: "2026-10-09T10:00:00+00" }]
  ]);

  // Newly parsed item using enhanced parser
  const html = `
    <html><body>
      <div>&gt;&gt;&gt;</div>
      <div>Powołania 2018 Górny Mokotów 09-10-2026</div>
      <p>Mecz wewnętrzny z Wawer. Zbiórka 9:45.</p>
      <div>Trening 08-10-2026</div>
      <p>Trening.</p>
      <div>Grafik 01-10-2026</div>
      <p>Grafik.</p>
      <div>&gt;&gt;&gt;</div>
    </body></html>`;

  const parsedItems = parseDeltaUpdates(html, SOURCE);
  const item = parsedItems[0];

  // Matching logic from engine.ts
  let existing = dbExistingByKey.get(item.source_key);
  if (!existing && item.legacy_source_key) {
    existing = dbExistingByKey.get(item.legacy_source_key);
    if (existing) {
      item.source_key = existing.source_key;
    }
  }

  // Verification: Recognized as existing, adopted legacy key, ZERO re-import
  assert.ok(existing);
  assert.equal(item.source_key, "5a29b006c93a330d25daa6fd4bd3c2013b58e0023792deadd3ac1b173778b309");
});

test("ETAP 11D.3: different source_key => different event dedupe key", () => {
  const keyA = generateSourceKey("Powołania 2018", "08-10-2026", "Mecz A");
  const keyB = generateSourceKey("Powołania 2018", "08-10-2026", "Mecz B");

  const eventDedupeKeyA = generateEventDedupeKey("CLUB_NEWS", keyA, "Powołania 2018");
  const eventDedupeKeyB = generateEventDedupeKey("CLUB_NEWS", keyB, "Powołania 2018");

  assert.notEqual(eventDedupeKeyA, eventDedupeKeyB);
});

