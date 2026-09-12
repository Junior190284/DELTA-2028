# DELTA 2018 GM — Online / Production Foundation

Ten pakiet przenosi projekt z lokalnego HTML do prawdziwej aplikacji online.

## Co jest gotowe

- Next.js App Router
- Supabase Auth z cookie-based SSR
- role: admin / coach / parent
- RLS dla danych dzieci
- prywatny bucket `player-photos`
- zawodnicy, mecze, obecność, wyjściowa 6, kapitan, gole, asysty, MVP
- aktualności
- push subscriptions
- API do wysyłania Web Push przez VAPID
- PWA manifest + service worker
- aktualny prototyp wizualny w `/public/prototype.html`
- seed aktualnej kadry

## Co trzeba zrobić po Twojej stronie

1. Załóż projekt Supabase.
2. Otwórz SQL Editor i uruchom `supabase/schema.sql`.
3. Skopiuj `.env.local.example` do `.env.local`.
4. Wklej Supabase URL, Publishable Key i Service Role Key.
5. Wygeneruj VAPID keys:
   `npx web-push generate-vapid-keys`
6. Wklej VAPID public/private keys do `.env.local`.
7. `npm install`
8. `npm run dev`
9. Utwórz pierwszego użytkownika w Supabase Auth.
10. Ustaw mu rolę admin:
   `update public.profiles set role='admin' where id='<USER_UUID>';`

## Ważne

`SUPABASE_SERVICE_ROLE_KEY` i `VAPID_PRIVATE_KEY` są tylko po stronie serwera.
Nigdy nie umieszczaj ich w kodzie klienta ani w repozytorium publicznym.

## Zdjęcia dzieci

Bucket `player-photos` jest prywatny. RLS pozwala staffowi na pełny dostęp,
a rodzicowi tylko do zdjęcia przypisanego dziecka.

## Następny krok

Należy przepisać ekran `prototype.html` na komponenty React, które pobierają dane
z Supabase zamiast `localStorage`. Baza i model uprawnień są już przygotowane.


## V2 — interfejs podpięty do Supabase

`/dashboard` nie korzysta już z danych demonstracyjnych w localStorage.
Pobiera z Supabase:
- zawodników,
- mecze,
- obecności,
- wyjściową 6 i kapitana,
- gole, asysty i MVP,
- aktualności,
- przypisanie rodzica do dziecka.

Zawodnik ma premium profil liczony z realnych danych.
Kronika meczu powstaje z tabel `matches`, `match_events`, `match_lineup`.
Osiągnięcia są liczone dynamicznie z realnych statystyk.

Po uruchomieniu `schema.sql` uruchom też `v2_migration.sql`.


## V3 — Google login

Dodano:
- przycisk `Kontynuuj z Google`,
- Supabase OAuth provider `google`,
- PKCE callback `/auth/callback`,
- `exchangeCodeForSession`,
- redirect po logowaniu do `/dashboard`.

Szczegóły konfiguracji: `GOOGLE_AUTH_SETUP.md`.


## V4 — Admin
Dodano pełny panel `/admin`. Szczegóły w `ADMIN_PANEL.md`.


## V5 — OAuth session fix
- callback zapisuje cookie sesji bezpośrednio na odpowiedzi HTTP,
- dodano `proxy.ts` dla Next.js 16 i odświeżania sesji,
- `/api/auth/status` pozwala sprawdzić stan sesji,
- ekran logowania pokazuje błąd callbacku.


## V6 — role/profile fix
- usunięto fallback `parent` w dashboardzie,
- profil bieżącego użytkownika jest rozwiązywany po prawdziwym `auth.user.id`,
- server-only fallback używa secret key wyłącznie na backendzie,
- `/api/auth/profile` pokazuje rolę odczytaną przez aplikację,
- dashboard i `/admin` są `force-dynamic`.


## V7 — Premium UI restored
- przywrócone stadionowe tła i broadcast look,
- grafika premium zawodnika jako fallback, dopóki nie ma prawdziwego zdjęcia,
- osiągnięcia mają graficzną planszę,
- admin po kliknięciu meczu dostaje pełne Centrum Meczu:
  obecność, wyjściowa 6, kapitan, wynik, gole, asysty, MVP.


## V7.2 — widoczne Centrum Meczu
- duży przycisk Centrum Meczu na ekranie głównym,
- szybki panel admina z opisem: obecność / wyjściowa 6 / kapitan / gole / asysty / MVP / wynik,
- jawny przycisk Edytuj mecz na każdej karcie meczu.


## V7.3 — Wyjściowa 6
- starterzy: 6 zawodników,
- skład wyjściowy = bramkarz + 5 zawodników z pola,
- limit w Centrum Meczu zwiększony z 5 do 6,
- nazwy i statystyki zmienione na „Wyjściowa 6”.


## V7.4 — Persistence & session UX
- zalogowany użytkownik otwierający `/` trafia od razu do `/dashboard`,
- `/login` automatycznie omija logowanie, jeśli sesja nadal istnieje,
- po zapisie danych meczu pojawia się komunikat „Zapisano”,
- po każdej zmianie wykonywany jest refresh danych z Supabase,
- wpisanie obu wyników automatycznie zmienia status meczu na `played`,
- po zmianie wyniku statystyki, kronika i profile aktualizują się po odświeżeniu danych.

## V8 — Visual Overhaul „Diabełki z Mokotowa”
- desktopowy rail navigation + mobilny bottom nav,
- nowy hero broadcast z czerwonym glow,
- premium karta najbliższego meczu,
- 6 kafli statystyk: mecze / wygrane / remisy / porażki / bramki / asysty,
- kapitan drużyny, Wyjściowa 6 i skład meczowy na stronie głównej,
- czerwono-złote „devil cards” z poświatą i animacją,
- podgląd liderów goli i asyst,
- nowe sekcje osiągnięć / aktualności / kroniki,
- odświeżone karty zawodników,
- pełny responsywny layout telefonu.


## V8.1 — Premium polish
- konto użytkownika przeniesione z centralnej części górnego paska do dyskretnej ikony,
- email i rola widoczne dopiero po kliknięciu ikony konta,
- zmniejszony hero, żeby mecz i statystyki były widoczne szybciej,
- subtelne czerwone animacje światła i glow,
- animowany przycisk Centrum Meczu,
- dopracowane karty Wyjściowej 6 i kafle statystyk,
- dolne menu ukryte na desktopie; pozostaje na telefonie.


## V8.2 — Hero cleanup + RSVP rodziców
- usunięto tekst HTML nakładany na główny baner; zostaje kompozycja z grafiki,
- hero ma czystsze kadrowanie i pełniejszą widoczność herbu,
- obok najbliższego meczu dodano panel potwierdzenia obecności,
- rodzic może wybrać: Będzie / Nie będzie / Nie wiem dla przypisanego zawodnika,
- admin/coach widzi zbiorczą listę odpowiedzi całej drużyny,
- dodano licznik i pasek postępu odpowiedzi,
- odpowiedzi zapisują się w istniejącej tabeli `match_attendance` w Supabase.


## V8.3 — Hero & header fix
- nowy szeroki hero z mniejszym, w pełni widocznym herbem,
- brak przycięcia herbu u góry i dołu,
- poprawiona geometria górnego paska względem lewego menu,
- napis „DELTA 2018 GM” w topbarze nie chowa się już pod sidebar.


## V8.4 — Live countdowns
- dynamiczne odliczanie do najbliższego meczu,
- dynamiczne odliczanie do najbliższego treningu,
- treningi domyślnie: środa i piątek, 17:00–18:30,
- podczas treningu status zmienia się na „Trening trwa” i pokazuje godzinę zakończenia,
- licznik odświeża się automatycznie co 30 sekund,
- później można zastąpić stały harmonogram szczegółowym kalendarzem treningów.
