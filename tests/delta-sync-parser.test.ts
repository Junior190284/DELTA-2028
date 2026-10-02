import assert from "node:assert/strict";
import test from "node:test";
import { parseDeltaUpdates } from "../lib/delta-sync/parser.ts";

const SOURCE="https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108";

function page(firstBody="Pierwsza treść"){
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

test("parses news without a historical call-up anchor and ignores schedule rows",()=>{
  const items=parseDeltaUpdates(page(),SOURCE);
  assert.equal(items.length,3);
  assert.equal(items[0].title,"Nowa wiadomość drużyny");
  assert.equal(items[0].body,"Pierwsza treść");
  assert.ok(items.every(item=>!item.title.startsWith("Kolejka")));
});

test("keeps identity stable but detects changed article content",()=>{
  const before=parseDeltaUpdates(page("Pierwsza treść"),SOURCE)[0];
  const after=parseDeltaUpdates(page("Treść została poprawiona"),SOURCE)[0];
  assert.equal(before.source_key,after.source_key);
  assert.notEqual(before.content_hash,after.content_hash);
});

test("decodes Polish HTML entities",()=>{
  const items=parseDeltaUpdates(page("G&oacute;rny Mokot&oacute;w &amp; drużyna"),SOURCE);
  assert.equal(items[0].body,"Górny Mokotów & drużyna");
});

test("rejects a suspiciously incomplete response",()=>{
  const html="<div>&gt;&gt;&gt;</div><div>Jedna wiadomość 02-10-2026</div><p>Treść</p>";
  assert.throws(()=>parseDeltaUpdates(html,SOURCE),/podejrzany wynik/);
});
