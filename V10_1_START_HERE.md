# DELTA 2018 GM — V10.1 PREMIUM STADIUM EXPERIENCE

Ta paczka bazuje na V10 MEGA PACK i zawiera duży lifting publicznego HOME, warstwę stadionowych animacji oraz poprawki Centrum Treningowego.

## Najważniejsze zmiany

- nowy publiczny HOME z mocniejszym hero, tickerem, Match Hub, Smart Team Clock, publicznymi statystykami, kalendarzem, mini Hall of Fame, „Z klubu”, „Dziś w drużynie”, bezpiecznym teaserem profili zawodników i Strefy Rodzica;
- Fire Reveal przy pierwszym wejściu w sesji;
- animowane światła stadionowe, dym, żar/embers, glow, live countdown i premium hover;
- więcej stadionowego klimatu również po zalogowaniu;
- kafelek „Kapitan drużyny” usunięty z HOME — statystyka kapitana pozostaje w profilach i Centrum Statystyk;
- naprawione UX obecności treningowej: natychmiastowa zmiana stanu, feedback zapisu, licznik obecnych;
- naprawione przypisywanie do składu gry kontrolnej: stan zmienia się od razu, zapis ma feedback, wybrana gra jest zawsze powiązana z aktualnym treningiem;
- elastyczne gry kontrolne: 3v3, 4v4, 5v5, 6v6 lub nierówne składy — brak sztywnego limitu;
- licznik składu A vs B aktualizuje się na żywo.

## SQL

Jeśli V10 MEGA PACK działa już na Twojej bazie i uruchomiłeś `supabase/V10_MEGA_PACK_RUN_ONCE.sql`, V10.1 nie wymaga dodatkowej migracji SQL.

Jeśli wdrażasz od starszej wersji, uruchom najpierw `supabase/V10_MEGA_PACK_RUN_ONCE.sql`.

## Vercel

Pozostają wymagane zmienne V10, w tym serwerowy `SUPABASE_SECRET_KEY` albo `SUPABASE_SERVICE_ROLE_KEY`. Nie ustawiaj klucza serwerowego jako `NEXT_PUBLIC_...`.

## Wdrożenie

Skopiuj całą zawartość paczki do katalogu roboczego projektu bez nadpisywania własnego `.env.local`, a następnie:

```bat
git add .
git commit -m "V10.1 premium stadium experience"
git push origin main
```

## Uwaga o prywatności

Publiczny HOME pokazuje statystyki i informacje drużynowe. Nazwiska, zdjęcia, profile oraz indywidualne statystyki dzieci pozostają w części po zalogowaniu.


## V10.1.1 — Stadium Visual Patch
- Usunięto widoczny pasek przejścia między ekranami.
- Nowe przejście: cinematic crossfade + rozproszony czerwono-złoty light sweep + dym.
- Mocniejszy klimat stadionu: race/flare glow, dym trybun, reflektory, żar i głębsze tła.
- Match Hub, Centrum Statystyk, Centrum Treningowe, Match Day i Hall of Fame mają bardziej graficzne tła.
- Karty dostały sportowe ścięte narożniki, mocniejszy glow i broadcast-style detale.
- Mobile zachowuje klimat, ale efekty są lżejsze.
