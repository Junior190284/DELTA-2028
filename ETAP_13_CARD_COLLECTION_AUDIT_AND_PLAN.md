# ETAP 13 — CARD COLLECTION & PACK EXPERIENCE OVERHAUL
## Kompleksowy Audyt Wizualno-Techniczny oraz Plan Implementacji

**Status gałęzi:** `gemini/card-collection-overhaul`  
**Środowisko produkcyjne:** `https://delta-2028.vercel.app` (Baza: `fctgruvciakhohfxkdzp` — stan nienaruszony)  
**Cel:** Przekształcenie modułu kart DELTA w dojrzały, luksusowy system kolekcjonerski klasy EA FC / Topps / Panini / Ultimate Team z unikalną tożsamością **DELTA INFERNO**, eliminacją kolizji na boisku „Moja 11”, nową szatnią VIP oraz natychmiastową synchronizacją stanu paczek.

---

## 1. SZCZEGÓŁOWY AUDYT SYSTEMU KART (STAN OBECNY)

### 1.1 Architektura Renderera Kart i Spójność Wizualna (Severity: P0)
* **Rozproszenie komponentów:** Występuje kilka niezależnych implementacji renderujących karty: [`PlayerCard.tsx`](file:///d:/DELTA/DELTA_2018_GM_GEMINI/components/PlayerCard.tsx), [`PlayerCard3D.tsx`](file:///d:/DELTA/DELTA_2018_GM_GEMINI/components/PlayerCard3D.tsx), [`CollectibleCard3D.tsx`](file:///d:/DELTA/DELTA_2018_GM_GEMINI/components/CollectibleCard3D.tsx) oraz style osadzone w `app/globals.css`.
* **Niespójne proporcje i sztywne wymiary pikselowe:** 
  * Wymiary kart definiowane są na sztywno w pikselach (`w: 72px, h: 108px` dla slotów boiskowych; `w: 240px, h: 360px` w galerii), co uniemożliwia płynne skalowanie na ekranach mobilnych i powoduje rozciąganie/ucinanie elementów.
  * Brak jednolitego standardu **2:3 aspect ratio** powiązanego z `cqw` (container query width) lub responsywnym systemem CSS grid.
* **Hierarchia Rzadkości (Rarity Tiering):**
  * Efekty wizualne (foil, holografia, poświata lawowa) są zbyt subtelne lub nakładane jako płaskie gradienty CSS zamiast dynamicznych warstw światła/maski specularnej z kątem obrotu myszy/żyroskopu.
  * Rzadkości `Inferno` oraz `Delta Icon` nie różnią się drastycznie sylwetką ramki od kart `Base Bronze/Silver/Gold`.

### 1.2 Boisko „Moja 11” / Squad Builder (Severity: P1)
* **Nakładanie się kart (Card Overlapping):**
  * Kontener boiska ma sztywną wysokość `height: 480px` z pozycjonowaniem procentowym (np. pomoc `top: 42%`, obrona `top: 66%`).
  * Odległość pionowa między liniami wynosi 24% z 480px = ~115px, podczas gdy karta ma 108px plus nazwisko zawodnika i badge pozycji (~130px całkowitej wysokości elementu).
  * Skutek: karty formacji 4-3-3 lub 4-4-2 fizycznie nakładają się na siebie w osi pionowej i poziomej, szczególnie na urządzeniach mobilnych (<400px).
* **Brak ławki rezerwowych i przejrzystych slotów pustych:** Sloty puste (placeholder) nie komunikują jasno wymaganej pozycji i nie posiadają intuicyjnego stanu 'drag & drop / click-to-swap'.

### 1.3 Szatnia VIP / VIP Locker Room (Severity: P2)
* **Przestarzały design drewniany:** Komponent [`LockerRoom3D.tsx`](file:///d:/DELTA/DELTA_2018_GM_GEMINI/components/LockerRoom3D.tsx) wykorzystuje uproszczoną grafikę drewnianych szafek i wektorowych koszulek.
* **Brak atmosfery Premium Stadium Showroom:** Brak ciemnego, klubowego oświetlenia punktowego (volumetric spotlight), teksturowanych ścian ze szczotkowanego metalu/karbonu, podestu 3D dla karty kapitańskiej/ulubionej oraz horyzontalnego carusela VIP z dynamicznym zoomem.

### 1.4 Doświadczenie Otwarcia Paczek (Pack Opening Experience) (Severity: P1)
* **Brak stopniowania napięcia (Pacing & Walkout):**
  * Brak podziału na fazy: 1) Wybór paczki -> 2) Fizyczne rozcięcie/rozdarcie folii -> 3) Płomienny błysk rzadkości (Tease) -> 4) Walkout dla kart OVR 85+ / Inferno / Icon -> 5) Odkrywanie kart (Reveal) -> 6) Zestawienie i podsumowanie.
  * Brak dedykowanego przycisku „Pomiń animację / Reveal All” w czytelnym miejscu dla power-userów otwierających wiele paczek.

### 1.5 Synchronizacja Stanu i Licznik Nieotwartych Paczek (Severity: P1)
* **Opóźnienie licznika:** Po otwarciu paczki w [`PackOpeningExperience.tsx`](file:///d:/DELTA/DELTA_2018_GM_GEMINI/components/PackOpeningExperience.tsx), stan licznika `user_unopened_packs` w nagłówku i albumie [`DeltaCollectionAlbum.tsx`](file:///d:/DELTA/DELTA_2018_GM_GEMINI/components/DeltaCollectionAlbum.tsx) wymagał ręcznego odświeżenia strony lub czekał na wolny refetch SWR/React Query.
* **Wymóg:** Optymistyczna aktualizacja licznika paczek oraz globalne zdarzenie broadcast (`packs:updated`) unieważniające cache kolekcji natychmiast po udanej transakcji otwarcia.

---

## 2. NOWY KANON WIZUALNY DELTA INFERNO & EA FC VIBE

```
┌────────────────────────────────────────────────────────┐
│                      TOP HEADER                        │
│   [OVR: 92]                [POSITION: CAM]             │
│   [DELTA CREST]                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  PLAYER ACTION CUTOUT                  │
│             (Dynamic Silhouette + 3D Popout)           │
│                                                        │
├────────────────────────────────────────────────────────┤
│                   SURNAME / NICKNAME                   │
├────────────────────────────────────────────────────────┤
│   PAC: 89 | DRI: 94 | SHO: 88 | DEF: 54 | PAS: 91     │
│   CHEMISTRY / RARITY EMBLEM: [INFERNO RUBY]            │
└────────────────────────────────────────────────────────┘
```

* **Standard Proporcji:** Stały aspect-ratio **2:3** dla wszystkich wariantów (`xs`: 64x96px, `sm`: 120x180px, `md`: 180x270px, `lg`: 260x390px, `hero`: 340x510px).
* **Rarity Tier Matrix:**
  1. **Base (Bronze / Silver / Gold):** Minimalistyczna szczotkowana stal / metaliczna rama, delikatny refleks kątowy.
  2. **Matchday Special:** Neonowe akcenty klubowe, podświetlane krawędzie LED.
  3. **Inferno (Ruby / Lava / Flame):** Ciemny obsydian, animowane zarzewie lawy w tle, karmazynowa poświata i cząsteczki ognia.
  4. **Delta Icon / Legend:** Złota folia holograficzna, pryzmatyczny połysk refractora 3D, złoty laur DELTA.

---

## 3. SZCZEGÓŁOWY PLAN IMPLEMENTACJI (ETAPY 13A - 13H)

### [13A] Unifikacja Renderera Kart (Core Card Engine)
1. Stworzenie ujednoliconego komponentu `components/cards/DeltaCard.tsx` opartego o CSS subgrid / container queries.
2. Wydzielenie warstw składowych:
   - `CardFrame` (geometria ramy zależna od rzadkości),
   - `CardCutout` (optymalizowane zdjęcie zawodnika z cieniem przestrzennym),
   - `CardBadgeHeader` (OVR, Pozycja, Herb),
   - `CardStatsMatrix` (sześciokąt atrybutów lub siatka 6 kluczowych statystyk),
   - `CardFXLayer` (3D parallax tilt, efekt foil / holographic sheen reagujący na kursor/touch).

### [13B] Kolekcja, Filtry i Modal Inspekcji
1. Modernizacja `components/DeltaCollectionAlbum.tsx`:
   - Płynna wirtualizacja siatki dla płynnego przewijania 100+ kart,
   - Zaawansowane filtry: Pozycja (GK, DEF, MID, FWD), Rzadkość, Tylko ulubione, Tylko duplikaty,
   - Oznaczenie duplikatów: Elegancki badge `x2`, `x3` z opcją szybkiego podglądu.
2. Modal szczegółów karty (`CardDetailModal.tsx`):
   - Pełnowymiarowy widok 3D (obrót przód/tył z historią meczów i osiągnięciami),
   - Akcje: Ustaw jako ulubioną, Przypisz do Mojej 11, Zobacz w szatni VIP.

### [13C] Boisko „Moja 11” / Squad Builder Overhaul
1. Przebudowa `components/SquadBuilder3D.tsx`:
   - Responsywna siatka murawy oparta o procentowy `aspect-ratio: 4/3` z automatycznym dopasowaniem skali kart (`scale-down` na wąskich ekranach),
   - Zero kolizji między formacjami (4-3-3, 4-4-2, 3-5-2, 4-2-3-1),
   - Dedykowana ławka rezerwowych (Bench tray) na dole murawy z poziomym przewijaniem.
2. Wskaźnik zgrania drużyny (Chemistry links):
   - Subtelne linie energetyczne łączące zawodników o tej samej pozycji / synergii rocznika.

### [13D] Szatnia VIP (VIP Locker Room Showroom)
1. Całkowity redesign `components/LockerRoom3D.tsx`:
   - Estetyka ciemnego stadionu (Dark Carbon & Gold Trim, neonowe listwy LED DELTA INFERNO),
   - Centralny podest 3D (Pedestal) eksponujący wybraną kartę kapitańską,
   - Interaktywna karuzela szafek z dynamicznym oświetleniem spotlight przy przewijaniu.

### [13E] Kinematyczny System Otwarcia Paczek (Pack Opening Flow)
1. Refaktoryzacja `components/PackOpeningExperience.tsx`:
   - 6-fazowy pipeline animacji (Wybór paczki -> Rozcięcie folii -> Rarity Tease -> Walkout OVR 85+ -> Reveal -> Podsumowanie),
   - Dedykowany przycisk `Pomiń / Reveal All` dostępny w każdej sekundzie,
   - Dźwięki syntetyczne Web Audio API / CSS particle bursts dla kart rzadkich.

### [13F] Synchronizacja Stanu i Reconciliacja Paczek
1. Wdrożenie globalnego store/event bus dla stanu paczek:
   - Natychmiastowe lokalne zmniejszenie licznika paczek po kliknięciu `Otwórz`,
   - Inwalidacja tagów cache SWR/React Query (`/api/packs/unopened`),
   - Brak konieczności przeładowywania strony (F5).

### [13G] Wydajność 60 FPS i Responsywność Mobilna
1. Optymalizacja renderowania:
   - Użycie `transform: translate3d()` i `will-change: transform` dla efektów 3D tilt,
   - `next/image` z odpowiednimi rozmiarami `sizes` i priorytetem ładowania dla kart w widoku viewport,
   - Eliminacja Layout Shifts (CLS = 0) na boisku i w albumie.

### [13H] Testy Jakościowe i Weryfikacja
1. Sprawdzenie zgodności typów (`npm run lint`, `npm run build`),
2. Testy na profilach o różnej rozdzielczości (iPhone SE, iPhone 15 Pro Max, iPad, Desktop 1080p, 4K),
3. Weryfikacja bezpieczeństwa (zero zmian w regułach ekonomii, brak zmian schematu bazy).

---

> [!IMPORTANT]
> **Zasady Bezpieczeństwa:** Wszystkie prace realizowane są wyłącznie w gałęzi `gemini/card-collection-overhaul`. Baza produkcyjna `fctgruvciakhohfxkdzp` oraz cron synchronizacji pozostają w pełni nienaruszone.
