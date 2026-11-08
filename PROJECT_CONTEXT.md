# DELTA Warszawa 2018 GM — Kontekst Projektu

> **Data ostatniej weryfikacji:** 2026-11-08 | **Gałąź robocza:** `gemini/collection-3d-engine`  
> **Status:** Rozwój lokalny; ostatnie zmiany nie zostały jeszcze wypchnięte do GitHub ani wdrożone na Vercel. Rzeczywisty kod źródłowy stanowi nadrzędne źródło prawdy.

---

## 1. Stos technologiczny
- **Frontend / Framework:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS / Vanilla CSS.
- **Backend / Baza danych:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`), PostgreSQL z Row-Level Security (RLS).
- **Silnik graficzny & Audio:** Własny silnik CSS 3D (`preserve-3d`, macierze obrotu), Canvas 2D (cząsteczki), Web Audio API (synteza dźwięku), Web Push API. Projekt nie wykorzystuje biblioteki Three.js.
- **Narzędzia testowe i QA:** Wbudowany test runner Node.js (`node --test`), Playwright (`devDependencies`), TypeScript (`tsc --noEmit`).

---

## 2. Główne moduły aplikacji
- **Kolekcja 2.0 & Karty 3D:** Cyfrowy album (`DeltaCollectionAlbum.tsx`), obracanie kart w CSS 3D (`Card3DEngine.tsx`), rzadkości kart, fizyka i shadery CSS.
- **Otwieranie paczek & DELTA INFERNO:** Doświadczenie otwierania (`PackOpeningExperience.tsx`, `PackOpeningModal.tsx`), sekwencja walkoutów 3D (`UniversalWalkoutModal.tsx`, `InfernoWalkoutReveal.tsx`).
- **Ekonomia DP & Grywalizacja:** Punkty DP, Daily Spin, Quiz, Osiągnięcia, Streaki 7-dniowe, transakcje ledgerowe z ochroną idempotencji.
- **Centrum zespołu & Dzień Meczowy:** `TeamHub.tsx`, panele w `MegaPanels.tsx` (`MatchDayMode`, `MyChildCenter`, `HallOfFame`).
- **Środowisko laboratoryjne / QA:** Trasy w `app/dev/` (np. `/dev/pack-opening`) oraz `app/lab/` do izolowanych testów modułów.

---

## 3. Kluczowe katalogi i pliki
- `components/` — Aktywne komponenty React (`PackOpeningExperience.tsx`, `PlayerCard.tsx`, `DeltaCollectionAlbum.tsx`).
- `components/collection-3d/` — Silnik CSS 3D kart, sekwencje walkoutów, telemetria FPS, arkusz `collection-3d.css`.
- `lib/cards/` — Logika biznesowa kart (`engine.ts`), definicje typów (`types.ts`), serwerowy dostęp pilotażowy (`pilot-access.ts`).
- `lib/supabase/` — Klienci Supabase (`client.ts`, `server.ts`, `admin.ts` wyłącznie z service_role).
- `supabase/migrations/` — Schematy PostgreSQL, funkcje RPC, audyt i polityki RLS.
- `tests/` — Testy jednostkowe, integracyjne, weryfikacje bezpieczeństwa ekonomii i kontraktów API.
- `.artifacts/screenshots/` — Dedykowany katalog na zrzuty diagnostyczne Playwright (wykluczony w `.gitignore`).

---

## 4. Stan DELTA INFERNO
- **Zaimplementowane lokalnie:** Ograniczenie herbu DELTY w nagłówku do ~90 px, hermetyczny portal (`z-index: 9999999`, `isolation: isolate`), blokada scrollowania `body` z przywracaniem, gotowość na `videoOpeningUrl`.
- **Potwierdzone testami automatycznymi:** 18 testów bezpieczeństwa UI paczek (brak kolizji, z-index, responsywne przyciski Pomiń/Zamknij), 37 testów pilotażu 3D (Default Deny, Kill Switch, brak wycieku tożsamości).
- **Wymagające weryfikacji wizualnej w przeglądarce:** Ostateczna płynność animacji rozbicia paczki INFERNO na rzeczywistych urządzeniach mobilnych o niskiej częstotliwości odświeżania.
- **Oczekujące na wdrożenie:** Podpięcie docelowego pliku wideo `inferno-pack-opening.mp4` pod produkcyjny storage oraz wykonanie migracji SQL na bazie produkcyjnej.

---

## 5. Podstawowe polecenia deweloperskie i testowe
```bash
npm run dev            # Start lokalnego serwera (http://localhost:3000)
npm run lint           # Zgodność typów TypeScript (tsc --noEmit)
npm run test:cards     # Testy kart, kolekcji i walkoutów (20 testów)
npm run test:economy   # Testy ekonomii DP, Daily Spin, Quizu i idempotencji (45 testów)
npm run test:gamification # Testy grywalizacji i streaków (16 testów)
node --test --experimental-strip-types tests/pack-opening-display-safety.test.ts # Bezpieczeństwo UI paczek (18 testów)
```

---

## 6. Zasada aktualizacji dokumentu
Aktualizuj ten dokument tylko po istotnej zmianie architektury, zakończeniu większego etapu lub zmianie statusu wdrożenia. Nie aktualizuj go przy każdej drobnej poprawce.
