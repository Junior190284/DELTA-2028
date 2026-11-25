---
trigger: model_decision
description: Zasady uruchamiania testów automatycznych, weryfikacji typów oraz diagnostyki Playwright.
---

# Testowanie i Weryfikacja

Lokalizacja kodu:
- Testy automatyczne: `tests/`
- Skrypty diagnostyczne i przeglądarkowe: `scripts/`

Zasady implementacji:
1. **Selektywny dobór testów:**
   - Uruchamiaj najpierw testy bezpośrednio powiązane ze zmienionym modułem:
     - Karty i synchronizacja stanu: `npm run test:cards`
     - Logika ekonomii i bilanse DP: `npm run test:economy`
     - Bezpieczeństwo interfejsu paczek: `node --test --experimental-strip-types tests/pack-opening-display-safety.test.ts`
   - Sprawdzanie typów (`npm run lint` / `tsc --noEmit`) uruchamiaj po zmianach dotykających sygnatur, interfejsów lub logiki TypeScript.
2. **Diagnostyka wizualna (Playwright):**
   - Testy w rzeczywistej przeglądarce uruchamiaj wyłącznie przy modyfikacjach layoutu, animacji i warstw UI (weryfikuj brak overflowu i zachowanie na desktopie i mobile).
   - Nie uruchamiaj przeglądarki ani nie generuj zrzutów ekranu przy prostych zmianach czysto logicznych lub backendowych.
   - Zapisuj wyłącznie minimalną liczbę niezbędnych screenshotów potwierdzających stan kluczowy.
