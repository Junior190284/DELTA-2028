import assert from "node:assert/strict";
import test from "node:test";
import { parseDeltaUpdates } from "../lib/delta-sync/parser.ts";

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

test("keeps identity stable but detects changed article content", () => {
  const before = parseDeltaUpdates(page("Pierwsza treść"), SOURCE)[0];
  const after = parseDeltaUpdates(page("Treść została poprawiona"), SOURCE)[0];
  assert.equal(before.source_key, after.source_key);
  assert.notEqual(before.content_hash, after.content_hash);
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
