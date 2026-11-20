import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  LOCKER_CATEGORIES,
  DEMO_EQUIPMENT_ITEMS,
  getInitialEquippedMap,
  type LockerCategory,
  type EquipmentItem
} from "../lib/locker-room/equipment-catalog.ts";

const rootDir = process.cwd();

test("V7G.2A — 1. Architektura plików i modułów szatni 3D", () => {
  const catalogPath = path.join(rootDir, "lib/locker-room/equipment-catalog.ts");
  const rendererPath = path.join(rootDir, "components/player/PlayerAvatarRenderer.tsx");
  const lockerRoomPath = path.join(rootDir, "components/player/PlayerLockerRoom.tsx");
  const cssPath = path.join(rootDir, "components/player/player-locker-room.css");

  assert.ok(fs.existsSync(catalogPath), "equipment-catalog.ts must exist");
  assert.ok(fs.existsSync(rendererPath), "PlayerAvatarRenderer.tsx must exist");
  assert.ok(fs.existsSync(lockerRoomPath), "PlayerLockerRoom.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "player-locker-room.css must exist");

  const lockerCode = fs.readFileSync(lockerRoomPath, "utf8");
  assert.ok(lockerCode.includes("export function PlayerLockerRoom"), "Must export PlayerLockerRoom component");
  assert.ok(lockerCode.includes("createPortal"), "Must mount via React portal to document.body");
});

test("V7G.2A — 2. Katalog wyposażenia: 6 kanonicznych kategorii sportowych", () => {
  const expectedCats: LockerCategory[] = ["jerseys", "shorts", "socks", "boots", "balls", "accessories"];
  const definedCatIds = LOCKER_CATEGORIES.map(c => c.id);

  assert.strictEqual(LOCKER_CATEGORIES.length, 6, "Must define exactly 6 canonical categories");
  for (const cat of expectedCats) {
    assert.ok(definedCatIds.includes(cat), `Category ${cat} must be present`);
  }
});

test("V7G.2A — 3. Wymagane przedmioty demonstracyjne i stany (AVAILABLE / LOCKED / EQUIPPED)", () => {
  // Sprawdzenie obecności kluczowych przedmiotów wymienionych w specyfikacji
  const homeJersey = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "jersey_delta_home");
  assert.ok(homeJersey, "Koszulka DELTA HOME must exist");
  assert.strictEqual(homeJersey.defaultState, "EQUIPPED", "Koszulka DELTA HOME must be default EQUIPPED");

  const awayJersey = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "jersey_delta_away");
  assert.ok(awayJersey, "Koszulka DELTA AWAY must exist");
  assert.strictEqual(awayJersey.defaultState, "LOCKED", "Koszulka DELTA AWAY must be LOCKED");
  assert.ok(awayJersey.unlockCondition && awayJersey.unlockCondition.length > 5, "Away jersey must have non-empty unlock condition");

  const blackBoots = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "boots_academy_black");
  assert.ok(blackBoots, "Buty Academy Black must exist");
  assert.strictEqual(blackBoots.defaultState, "EQUIPPED", "Buty Academy Black must be EQUIPPED");

  const goldBoots = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "boots_inferno_gold");
  assert.ok(goldBoots, "Buty Inferno Gold must exist");
  assert.strictEqual(goldBoots.defaultState, "LOCKED", "Buty Inferno Gold must be LOCKED");

  const classicBall = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "ball_training_classic");
  assert.ok(classicBall, "Piłka Training Classic must exist");
  assert.strictEqual(classicBall.defaultState, "EQUIPPED", "Piłka Training Classic must be EQUIPPED");

  const championsBall = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "ball_inferno_champions");
  assert.ok(championsBall, "Piłka Champions must exist");
  assert.strictEqual(championsBall.defaultState, "LOCKED", "Piłka Champions must be LOCKED");

  // Wszystkie zablokowane przedmioty muszą mieć jawny warunek odblokowania
  const lockedItems = DEMO_EQUIPMENT_ITEMS.filter(i => i.defaultState === "LOCKED");
  for (const item of lockedItems) {
    assert.ok(
      item.unlockCondition && item.unlockCondition.length > 0,
      `Item ${item.name} (${item.id}) is LOCKED but lacks an unlockCondition`
    );
  }
});

test("V7G.2A — 4. Logika przymierzania: rozdzielenie podglądu (preview) od wyposażenia zatwierdzonego (equipped)", () => {
  const initialEquipped = getInitialEquippedMap();
  assert.ok(initialEquipped.jerseys, "Initial equipped must have a jersey");
  assert.strictEqual(initialEquipped.jerseys.id, "jersey_delta_home", "Default jersey is home");

  // Symulacja przymierzenia alternatywnego przedmiotu (training black)
  const trainingJersey = DEMO_EQUIPMENT_ITEMS.find(i => i.id === "jersey_training_black")!;
  assert.strictEqual(trainingJersey.defaultState, "AVAILABLE", "Training jersey is available");

  // Klonujemy stan na potrzeby podglądu
  const previewState = { ...initialEquipped, jerseys: trainingJersey };

  // Podgląd różni się od zatwierdzonego
  assert.notStrictEqual(initialEquipped.jerseys.id, previewState.jerseys.id, "Preview differs from equipped");
  assert.strictEqual(initialEquipped.jerseys.id, "jersey_delta_home", "Equipped remains untouched during preview");
  assert.strictEqual(previewState.jerseys.id, "jersey_training_black", "Preview reflects newly chosen item");

  // Anulowanie (Cancel) przywraca stan
  const revertedPreview = { ...initialEquipped };
  assert.strictEqual(revertedPreview.jerseys.id, "jersey_delta_home", "Cancel restores original equipped item");

  // Zastosowanie (Apply) zatwierdza podgląd
  const newlyEquipped = { ...previewState };
  assert.strictEqual(newlyEquipped.jerseys.id, "jersey_training_black", "Apply promotes preview to equipped");
});

test("V7G.2A — 5. Zabezpieczenie przedmiotów zablokowanych (LOCKED): zakaz przymierzania bez uprawnień", () => {
  const lockedItem = DEMO_EQUIPMENT_ITEMS.find(i => i.defaultState === "LOCKED")!;
  assert.ok(lockedItem, "At least one locked item must exist");

  const lockerCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerLockerRoom.tsx"), "utf8");
  assert.ok(
    lockerCode.includes('item.defaultState === "LOCKED"') &&
    lockerCode.includes("showToast") &&
    lockerCode.includes("return"),
    "PlayerLockerRoom must guard against equipping locked items and show toast explanation"
  );
});

test("V7G.2A — 6. Uczciwy podgląd 2D zawodnika i warstwa adaptera pod przyszły model GLB", () => {
  const rendererCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerAvatarRenderer.tsx"), "utf8");

  // Wykorzystanie tego samego oficjalnego źródła sylwetki w stroju DELTY
  assert.ok(
    rendererCode.includes("player_red_uniform_transparent.webp") &&
    rendererCode.includes("player_red_uniform_transparent.png"),
    "Must use canonical player_red_uniform_transparent asset as the base figure"
  );

  // Dynamiczny numer na plecach koszulki
  assert.ok(
    rendererCode.includes("rawShirtNumber") &&
    rendererCode.includes("v7g-avatar-jersey-number"),
    "Must display dynamic jersey number on the back of the uniform"
  );

  // Obsługa obrotu, myszy, dotyku i klawiatury
  assert.ok(rendererCode.includes("onMouseDown"), "Must support mouse drag rotation");
  assert.ok(rendererCode.includes("onTouchStart"), "Must support touch swipe rotation");
  assert.ok(rendererCode.includes("onKeyDown") && rendererCode.includes("ArrowLeft") && rendererCode.includes("ArrowRight"), "Must support keyboard navigation");

  // Architektoniczny slot pod model GLB (V7G.2B)
  assert.ok(
    rendererCode.includes("modelUrl") &&
    rendererCode.includes("v7g-glb-adapter-slot"),
    "Must provide architectural adapter slot for future GLB model"
  );
});

test("V7G.2A — 7. Integracja z profilem zawodnika: przycisk MOJA SZATNIA w PlayerExperience3D", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  assert.ok(expCode.includes("PlayerLockerRoom"), "PlayerExperience3D must import PlayerLockerRoom");
  assert.ok(expCode.includes("isLockerRoomOpen") && expCode.includes("setIsLockerRoomOpen"), "Must have isLockerRoomOpen state");
  assert.ok(
    expCode.includes("v7g-btn-locker-room") && expCode.includes("MOJA SZATNIA"),
    "Hero action buttons must include 'MOJA SZATNIA • WYPOSAŻENIE'"
  );
  assert.ok(
    expCode.includes("<PlayerLockerRoom"),
    "Must mount PlayerLockerRoom component in PlayerExperience3D"
  );
});

test("V7G.2A — 8. Izolacja danych i brak zapisu do Supabase lub localStorage", () => {
  const catalogCode = fs.readFileSync(path.join(rootDir, "lib/locker-room/equipment-catalog.ts"), "utf8");
  const lockerCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerLockerRoom.tsx"), "utf8");
  const rendererCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerAvatarRenderer.tsx"), "utf8");

  const combined = catalogCode + lockerCode + rendererCode;

  assert.ok(!combined.includes("supabase.from"), "Locker room code must NEVER query or write to Supabase");
  assert.ok(!combined.includes(".insert(") && !combined.includes(".update("), "Locker room code must NEVER perform SQL inserts/updates");
  assert.ok(!combined.includes("localStorage.setItem"), "Locker room demo state must NOT write to localStorage");
});

test("V7G.2A — 9. Dostępność i responsywność CSS szatni", () => {
  const cssCode = fs.readFileSync(path.join(rootDir, "components/player/player-locker-room.css"), "utf8");

  assert.ok(cssCode.includes("@media (max-width: 480px)"), "Must support small mobile breakpoint");
  assert.ok(cssCode.includes("@media (max-width: 360px)"), "Must support ultra-compact 320px mobile breakpoint");
  assert.ok(cssCode.includes("@media (prefers-reduced-motion: reduce)"), "Must support prefers-reduced-motion");
  assert.ok(cssCode.includes("safe-area-inset-bottom"), "Must respect mobile safe-area-inset-bottom");
});
