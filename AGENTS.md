<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Oszczędne wykorzystanie kontekstu i tokenów (DELTA)

1. **Wyszukiwanie i minimalny kontekst:**
   - Preferuj wyszukiwanie symboli, funkcji i odwołań przez `rg` / `grep` z ograniczeniem do właściwych katalogów.
   - Ograniczaj liczbę wyników oraz ilość wyświetlanego tekstu; nie wykonuj pełnego odczytu repozytorium.
   - Czytaj tylko niezbędne linie plików; nie czytaj ponownie plików już znanych, jeśli się nie zmieniły.
   - Rozszerzaj zakres analizy wyłącznie przy udowodnionej konieczności.

2. **Ograniczony zakres zmian:**
   - Modyfikuj wyłącznie pliki bezpośrednio związane z celem zadania.
   - Zakaz refaktoryzacji niezwiązanych modułów i nieuzasadnionych zmian logiki biznesowej.
   - Nie dodawaj nowych zależności npm, jeśli problem da się rozwiązać istniejącym kodem.

3. **Katalogi i pliki pomijane:**
   - `.next/`, `backup_prod_*/`, buildy, logi, stare screenshoty/checkpointy.
   - `node_modules/`: nie skanuj podczas zwykłej analizy projektu. Wyjątek: przed modyfikacją kodu zależnego od API Next.js przeczytaj wyłącznie fragment przewodnika w `node_modules/next/dist/docs/` potrzebny do bieżącego zadania.
   - Całkowity zakaz odczytywania wartości z `.env.local` i sekretów (dozwolone tylko nazwy zmiennych).

4. **Usuwanie nieużywanego kodu:**
   - Sprawdzaj powiązania dynamiczne, eksporty i testy przed uznaniem elementu za nieużywany.
   - Przygotuj listę kandydatów do akceptacji przed większym czyszczeniem.

5. **Ekonomiczne i bezpieczne testowanie:**
   - Najpierw uruchamiaj testy związane z modyfikowanym obszarem.
   - Rozszerzaj testy, gdy zmiany wpływają na współdzielone komponenty, autoryzację, bazę danych lub inne moduły.
   - Przed wdrożeniem wykonaj wymagany zestaw testów oraz build (`npm run build`).
   - Nie powtarzaj identycznych testów bez zmian w kodzie.
   - Sprawdzaj procesy w tle — nie uruchamiaj `npm run dev`, jeśli serwer już działa.

6. **Zwięzły raport końcowy:**
   - Format: zmienione pliki, co poprawiono, wyniki testów, ewentualne problemy.
   - Zakaz tworzenia wielostronicowych dokumentów Markdown i nadmiarowych zrzutów ekranu bez prośby użytkownika.

7. **Bezpieczeństwo produkcyjne:**
   - Bezwzględny zakaz wdrożeń na produkcję (Vercel/git push) oraz destrukcyjnych zmian bazodanowych bez wyraźnej zgody.
