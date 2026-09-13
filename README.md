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


## V8.4.1 — build fix
- dodano brakujące funkcje `formatCountdown`, `parseLocalMatchDate` i `getNextTraining`,
- naprawiono błąd TypeScript z Vercel,
- funkcjonalność V8.4 pozostaje bez zmian.


## V8.5 — Match Center Rework
- pełna lista obecności przeniesiona ze strony głównej do Centrum Meczu,
- na stronie głównej zostaje tylko kompaktowy status potwierdzeń,
- Centrum Meczu ma zakładki: Podsumowanie / Obecność / Skład / Zdarzenia / MVP,
- rodzic w zakładce Obecność potwierdza udział swojego zawodnika,
- admin widzi odpowiedzi całej drużyny i może oznaczyć faktyczną obecność,
- Wyjściowa 6 i kapitan są w osobnej zakładce,
- gole i asysty są w zakładce Zdarzenia,
- MVP ma osobny, bardziej efektowny ekran.


## V8.6 — Ostatnie mecze
- blok „Wyjściowa 6” na dashboardzie zastąpiony pasmem ostatnich pięciu meczów,
- wynik, rywal, data i oznaczenie W/R/P dla każdego spotkania,
- dodany pasek bieżącej formy drużyny,
- w „Składzie meczowym” usunięto Wyjściową 6,
- w jej miejsce pokazujemy potwierdzenia rodziców,
- Wyjściowa 6 pozostaje dostępna wyłącznie w Centrum Meczu.


## V8.7 — Atmosphere + Leaders + Premium Players
- mocniejszy, wyraźnie widoczny animowany czerwono-czarny dym na całej aplikacji,
- dodany blok „Najlepsi w sezonie”: gole / asysty / MVP,
- dodany cel drużyny: 50 bramek z animowanym paskiem postępu,
- dodana aktualna seria zwycięstw / meczów bez porażki,
- całkowicie przebudowane premium karty zawodników,
- karty pokazują G+A, gole, asysty, mecze, kapitana, MVP i liczbę odblokowanych osiągnięć,
- mocniejsze czerwono-złote efekty, dym na kartach i hover 3D.


## V8.7.1 — Layout + Team Page Fix
- naprawiono rozjechaną górną część aplikacji na desktopie,
- sidebar i topbar ponownie są poprawnie pozycjonowane jako fixed,
- usunięto możliwość wychodzenia animowanego paska celu poza własny kafel,
- rozbudowano zakładkę Drużyna o cinematic hero,
- dodano skrót statystyk całej kadry,
- dodano kafle lidera kapitańskiego, najlepszego strzelca, lidera asyst i formy,
- zachowano premium karty zawodników poniżej.


## V8.7.2 — Typography + Mobile Navigation
- zwiększono czytelność nazwisk i statystyk na kartach zawodników,
- zwiększono typografię w kaflach liderów, formy i statystyk,
- poprawiono drobne teksty pomocnicze,
- przebudowano mobilne menu dolne na floating premium dock,
- aktywna zakładka ma czerwony glow, złoty akcent i większą ikonę,
- zwiększono dolny margines treści, aby pasek mobilny niczego nie zasłaniał.


## V8.7.3 — Premium Player Photo Fire
- pola zdjęć zawodników zostały przerobione na wersję premium,
- dodano czerwone płomienie i poświatę jak od rac,
- dodano ozdobne narożniki i branded plate,
- miniatury kapitana i liderów też dostały ten sam klimat,
- profil zawodnika w modalu ma teraz bardziej kinową prezentację,
- rozwiązanie nadal pozwala później normalnie wstawiać prawdziwe zdjęcia zawodników.


## V8.7.4 — Ryszard Featured Player
- pionowa karta Ryszarda w zakładce Drużyna,
- szeroki hero „Mały Wojownik” w jego profilu,
- pozostali zawodnicy zostają na standardowych kartach do czasu nowych zdjęć,
- usunięto numery koszulek z kart/profilu, w miejscu numeru widoczny jest herb DELTA.

## V8.7.5 — Ryszard image fit fix
- pionowa karta Ryszarda jest wyświetlana w całości bez kadrowania,
- szeroki hero profilu Ryszarda jest wyświetlany w całości,
- `object-fit: cover` zostało nadpisane przez `contain`,
- zachowano premium tło, ramki i label profilu.


## V8.7.6 — DELTA Sync + „Z klubu”
### Co zostało dodane
- nowa zakładka „Z klubu” z oficjalnymi informacjami K.S. Delta Warszawa,
- automatyczne odświeżanie feedu w aplikacji co 60 sekund,
- endpoint `/api/delta-sync` pobierający i analizujący stronę drużyny,
- osobne tabele `club_updates` i `delta_sync_log`,
- panel administratora → „DELTA Sync” → „Synchronizuj teraz”,
- szablon Supabase Cron do synchronizacji co minutę,
- kliknięcie całego kafla Najlepszy strzelec / Lider asyst otwiera profil zawodnika.

### Jednorazowa konfiguracja
1. W Supabase SQL Editor uruchom `supabase/v3_delta_sync.sql`.
2. W Vercel → Settings → Environment Variables dodaj:
   `DELTA_SYNC_SECRET` = dowolny długi losowy sekret.
3. Zrób nowy deploy.
4. W panelu administratora otwórz `DELTA Sync` i kliknij `Synchronizuj teraz`.
5. Sprawdź zakładkę `Z klubu`.
6. Gdy wszystko działa, otwórz `supabase/delta_sync_cron.sql`, wpisz:
   - swój `DELTA_SYNC_SECRET`,
   - aktualny adres Vercel (jeśli różni się od `https://delta-2028.vercel.app`),
   i uruchom SQL w Supabase.
7. Od tej chwili Supabase Cron wywołuje synchronizację co minutę.

### Ważne
Parser jest celowo ograniczony do informacji istotnych dla rocznika 2018 / Górnego Mokotowa oraz klubowych komunikatów organizacyjnych. Prywatne dane Team Hub nie są nadpisywane przez synchronizację.


## V8.7.7 — Club feed fix
- „Z klubu” dodane do głównej nawigacji.
- Kafelek „Z klubu” dodany na ekranie Start z trzema najnowszymi wpisami.
- Parser DELTA przebudowany tak, by importować także już opublikowane wiadomości z bieżącej strony drużyny.
- Pierwsza ręczna synchronizacja po wdrożeniu V8.7.7 powinna uzupełnić istniejące wpisy w `club_updates`.


## V8.7.8 — Clean Club Feed
- parser zaczyna analizę dopiero od sekcji wiadomości drużyny 2018 Górny Mokotów,
- wymuszone rozpoznawanie kodowania Windows-1250 / UTF-8 / ISO-8859-2,
- polskie znaki są wybierane automatycznie na podstawie jakości dekodowania,
- odrzucane są fałszywe wpisy typu 2017 / 2019 / 2020 i elementy terminarza,
- „Powołania 2018” reprezentacji są pomijane; pozostają „Powołania 2018 Górny Mokotów”,
- po poprawnym parsowaniu synchronizacja usuwa stary błędny feed i zapisuje czysty zestaw,
- zabezpieczenie: jeśli parser nie znajdzie co najmniej 3 prawidłowych wpisów oraz „Powołania 2018 Górny Mokotów”, baza nie jest czyszczona,
- przy grafiku sezonowym pokazywany jest skrócony fragment istotny dla rocznika 2018.


## V8.7.9 — Auto Push „Z klubu”
- DELTA Sync porównuje `source_key` z wpisami już zapisanymi w bazie.
- Push jest wysyłany tylko przy naprawdę nowym wpisie.
- W zakładce „Z klubu” jest przycisk „Włącz powiadomienia na tym urządzeniu”.
- Kliknięcie push otwiera `/dashboard?view=club` i aplikacja przełącza się od razu na „Z klubu”.
- Wygasłe subskrypcje Web Push (HTTP 404/410) są automatycznie usuwane.
- Wymagane Vercel Environment Variables: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.


## V8.8.0 — Push Diagnostics & Fix

Najważniejsza poprawka:
- V8.7.9 zakładał istnienie `push_subscriptions`, ale użytkownik wcześniej uruchamiał tylko migrację DELTA Sync. W tej wersji jest osobny, idempotentny plik `supabase/v4_push_setup.sql`.
- zapis telefonu w `/api/push/subscribe` odbywa się po uwierzytelnieniu, a sam zapis wykonuje bezpiecznie klient serwisowy Supabase,
- aplikacja pokazuje dokładny etap błędu: zgoda, VAPID, Service Worker, subskrypcja przeglądarki lub zapis w Supabase,
- Service Worker używa `skipWaiting()` i `clients.claim()`, aby nowa wersja przejmowała stronę od razu,
- `/api/push/status` pozwala sprawdzić konfigurację serwera.

### Jednorazowo po deployu V8.8.0
W Supabase → SQL Editor → New query:
1. otwórz `supabase/v4_push_setup.sql`,
2. wklej całość,
3. Run,
4. prawidłowy wynik: `PUSH READY`.

Potem na telefonie:
`Z klubu` → `Włącz powiadomienia na tym urządzeniu`.

Jeśli nadal wystąpi błąd, aplikacja pokaże jego prawdziwą przyczynę zamiast ogólnego komunikatu.


## V8.8.1 — Push deep links + PWA icons
- automatyczny push „Z klubu” zawiera identyfikator konkretnej wiadomości,
- kliknięcie powiadomienia otwiera konkretną kartę w „Z klubu” i ją podświetla,
- service worker nawiguję już otwarte okno aplikacji do celu,
- dodano pełne ikony PWA 192/512, maskable, Apple Touch Icon, favicony i badge Android,
- manifest startuje na `/dashboard`.

Po deployu ikona istniejącego skrótu Android może pozostać w pamięci systemu. Jeśli nie odświeży się sama, usuń stary skrót i dodaj aplikację ponownie z Chrome.


## V8.8.2 — Push Repair
- Admin → Push pokazuje dokładny kod HTTP i treść błędu z dostawcy push.
- HTTP 404/410 automatycznie usuwa martwą subskrypcję z Supabase.
- Testowy push prowadzi do `/dashboard?view=club`.
- W „Z klubu” jest opcja „NAPRAW / ZAPISZ TELEFON PONOWNIE”.
- Naprawa usuwa starą subskrypcję zarówno w przeglądarce, jak i bazie, a następnie tworzy nową z aktualnym kluczem VAPID.

Po deployu:
1. Na telefonie: Z klubu → NAPRAW / ZAPISZ TELEFON PONOWNIE.
2. W Admin → Push → Wyślij test push do wszystkich.
3. Kliknij powiadomienie — powinno otworzyć „Z klubu”.


## V8.8.3 — Home Player Card Fix
- Ryszard Rybacki ma specjalną kartę także na stronie Start, nie tylko w zakładce Drużyna.
- Karta używa tej samej grafiki premium.
- Obraz jest wyświetlany przez `contain`, więc nie jest przycinany.
- Pozostali zawodnicy zachowują standardowe karty do czasu dodania ich zdjęć.


## V8.8.4 — Leader Cards Photo Fix
- Ryszard Rybacki uses his premium player artwork in all leader/captain tiles.
- Covers home captain tile, team leader tile, scorer/assist/MVP leader tiles where applicable.
- Players without their own photo continue using the standard placeholder.


## V8.8.5 — Rankings & Leader Card Visibility
- Karta Ryszarda w „Kapitan drużyny” jest większa, jaśniejsza i czytelniejsza.
- „Strzelcy bramek” pokazują pełny ranking wszystkich zawodników z golami.
- „Asysty” pokazują pełny ranking wszystkich zawodników z asystami.
- Kliknięcie zawodnika w rankingu otwiera jego profil.
- „Najlepsi w sezonie” pokazuje tylko liderów z 1. miejsca; przy remisie wszystkich współliderów.


## V8.8.6 — Captain Card Layout Fix
- Premium card no longer overlaps the player name or CTA.
- Captain card uses a clean two-column layout.
- Image is reduced to a balanced size.
- CTA sits below the player data.
- Mobile layout remains compact and readable.


## V8.9.0 — Statistics Center

Nowa zakładka `Statystyki`:
- hero sezonu z bilansem zespołu,
- KPI: gole/mecz, asysty/mecz, zawodnicy z golem/asystą,
- podium G+A,
- rekordy sezonu,
- rankingi przełączane: G+A, gole, asysty, MVP, mecze, kapitan,
- pełne rankingi wszystkich zawodników,
- porównanie dwóch zawodników,
- forma drużyny i serie,
- kliknięcie zawodnika otwiera jego profil,
- kliknięcie meczu w historii formy otwiera Centrum Meczu.

Wszystkie wartości liczą się automatycznie z danych aplikacji.


## V8.9.1 — Team Calendar & Smart Match Hub
- usunięty duży osobny baner obecności,
- mały kafel „Obecność” jest przy najbliższym meczu i pokazuje np. 5/11,
- kliknięcie kafla otwiera Centrum Meczu od razu w zakładce Obecność,
- countdown meczu zostaje przy meczu,
- nowy „Zegar drużyny” liczy czas do najbliższego: meczu, treningu lub wydarzenia z kalendarza,
- ważne wydarzenia mogą być wyróżnione na stronie Start,
- nowa zakładka „Kalendarz”,
- Admin → Kalendarz pozwala dodawać treningi, turnieje, urodziny, zbiórki i inne wydarzenia.

### Jednorazowa konfiguracja
Supabase → SQL Editor → uruchom cały plik:
`supabase/v5_team_calendar.sql`

Prawidłowy wynik:
`TEAM CALENDAR READY`


## V8.9.2 — Home Cleanup & Compact Match Clock
- usunięto z Home redundantny kafel „Skład meczowy”,
- obecność zostaje tylko przy najbliższym meczu,
- countdown „Do meczu” jest znacznie mniejszy i bardziej dyskretny,
- kompaktowy kafel obecności pozostaje obok countdownu,
- siatka pozostałych kart na Home została uporządkowana.


## V8.9.3 — Advanced Stats
Nowe statystyki liczone automatycznie bez dodatkowego wpisywania:
- G+A na mecz,
- gole na mecz,
- asysty na mecz,
- liczba meczów z golem,
- liczba meczów z asystą,
- liczba meczów z G+A,
- dublety,
- hat-tricki,
- najlepszy mecz według G+A,
- aktualna seria meczów z golem,
- aktualna seria meczów z G+A,
- seria obecności,
- seria w wyjściowej 6,
- liczba zwycięstw rozegranych przez zawodnika.

Automatyczne wyróżnienia:
- Dublet,
- Hat-trick,
- Seria goli,
- Seria G+A,
- Żelazna obecność,
- Stały starter,
- 10 G+A,
- 3 MVP.

Nie wymaga nowej tabeli ani SQL — korzysta wyłącznie z danych już zapisanych w aplikacji.
