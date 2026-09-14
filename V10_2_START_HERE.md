# V10.2 — VISUAL REFINEMENT PACK

Ta paczka jest kolejnym krokiem po V10.1.9.

## Co poprawia

1. **Nowy publiczny hero**
   - spokojniejsza kompozycja na PC
   - osobny układ na mobile
   - mocniejszy stadionowy klimat bez „rozjechania” layoutu
   - lepsze wykorzystanie grafik stadionowych

2. **Lepszy blok najbliższego meczu**
   - mniej pustej przestrzeni
   - czytelniejsza sekcja countdown / attendance / CTA
   - więcej klimatu stadionu w tle

3. **Mocniejsze kafelki i karty**
   - delikatne czerwono-złote overlaye
   - subtelny glow i głębia
   - spójniejszy wygląd z resztą aplikacji

4. **Zachowana nawigacja**
   - kliknięcie w logo nadal prowadzi do strony głównej

## Pliki kluczowe

- `components/PublicTeamSite.tsx`
- `app/globals.css`
- `public/assets/v102-hero-public-desktop.png`
- `public/assets/v102-hero-public-mobile.png`

## Jak wdrożyć

1. Wypakuj paczkę do katalogu projektu.
2. Jeśli pojawią się pytania o nadpisanie plików — wybierz **tak**.
3. W terminalu uruchom:

```bash
npm install
npm run dev
```

lub jeśli już masz zależności:

```bash
npm run dev
```

4. Sprawdź:
   - stronę publiczną na PC
   - stronę publiczną na telefonie
   - hero
   - blok najbliższego meczu
   - zachowanie przycisków i nawigacji

## Cel tej paczki

To nie jest jeszcze „ostateczny koniec prac”, tylko **mocna poprawka wizualna**, żeby:
- hero wyglądał lepiej na desktopie i mobile,
- aplikacja miała więcej stadionowego klimatu,
- kafelki były ciekawsze,
- publiczny home był bardziej premium i bardziej spójny.
