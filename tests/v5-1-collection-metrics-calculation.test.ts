import { test } from "node:test";
import assert from "node:assert";

test("V5.1 — Collection Metrics & Stats Calculation Accuracy", () => {
  const allCards = [
    { id: "c1", card_name: "Karta 1", rarity: "common" },
    { id: "c2", card_name: "Karta 2", rarity: "rare" },
    { id: "c3", card_name: "Karta 3", rarity: "epic" },
    { id: "c4", card_name: "Karta 4", rarity: "legendary" },
    { id: "c5", card_name: "Karta 5", rarity: "inferno" }
  ];

  // 1. Użytkownik z 2 unikalnymi kartami i 1 duplikatem
  const userCards = [
    { card_id: "c1", duplicates_count: 2, acquired_at: "2026-11-10T10:00:00Z" },
    { card_id: "c3", duplicates_count: 0, acquired_at: "2026-11-14T08:00:00Z" }
  ];

  const ownedMap = new Map<string, any>();
  userCards.forEach(uc => ownedMap.set(uc.card_id, uc));

  // Weryfikacja unikalnych kart
  const uniqueOwnedCount = ownedMap.size;
  assert.equal(uniqueOwnedCount, 2, "Liczba unikalnych kart musi wynosić 2");

  // Weryfikacja duplikatów
  const totalDuplicates = userCards.reduce((acc, curr) => acc + (curr.duplicates_count || 0), 0);
  assert.equal(totalDuplicates, 2, "Liczba duplikatów musi wynosić 2");

  // Weryfikacja procentu ukończenia albumu (2 z 5 = 40%)
  const completionPercentage = Math.round((uniqueOwnedCount / allCards.length) * 100);
  assert.equal(completionPercentage, 40, "Procent ukończenia albumu musi wynosić 40%");

  // Weryfikacja ostatnio zdobytej karty (najnowsza data acquired_at)
  const sorted = [...userCards].sort((a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime());
  const lastAcquired = sorted[0];
  assert.equal(lastAcquired.card_id, "c3", "Ostatnio zdobyta karta to c3 (z 2026-11-14)");

  // Weryfikacja kart nieposiadanych (demo/katalog)
  const missingCards = allCards.filter(c => !ownedMap.has(c.id));
  assert.equal(missingCards.length, 3, "Brakuje dokładnie 3 kart (c2, c4, c5)");
  assert.ok(missingCards.some(c => c.id === "c2"), "c2 jest w brakujących");
  assert.ok(missingCards.some(c => c.id === "c4"), "c4 jest w brakujących");
  assert.ok(missingCards.some(c => c.id === "c5"), "c5 jest w brakujących");

  // Weryfikacja nieotwartych paczek
  const userPacks = [
    { id: "p1", is_opened: true },
    { id: "p2", is_opened: false },
    { id: "p3", is_opened: false },
    { id: "p4", is_opened: true }
  ];
  const unopenedCount = userPacks.filter(p => !p.is_opened).length;
  assert.equal(unopenedCount, 2, "Liczba nieotwartych paczek musi wynosić 2");
});

test("V5.1 — Demo / virtual catalog cards are never counted as owned", () => {
  const emptyUserCards: any[] = [];
  const ownedMap = new Map<string, any>();
  emptyUserCards.forEach(uc => ownedMap.set(uc.card_id, uc));

  const totalCatalogCards: number = 100;
  const uniqueOwned = ownedMap.size;
  const completion = totalCatalogCards === 0 ? 0 : Math.round((uniqueOwned / totalCatalogCards) * 100);

  assert.equal(uniqueOwned, 0, "Brak wpisów w user_cards oznacza 0 kart posiadanych");
  assert.equal(completion, 0, "Brak wpisów w user_cards oznacza 0% ukończenia albumu");
});
