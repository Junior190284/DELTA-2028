# DELTA 2018 GM — ETAP 14A: ECONOMY & GAMIFICATION AUDIT

> **Status:** AUDIT COMPLETE (Zero DB changes, Zero economy changes, Production untouched)  
> **Target Branch:** `gemini/economy-gamification-audit`  
> **Production DB:** `fctgruvciakhohfxkdzp` (Read-only / Untouched)  
> **Production App:** `https://delta-2028.vercel.app`

---

## 1. ARCHITECTURE & DATA MODEL MAP

### A. Tabela Salda i Punktów Użytkownika
* **Tabela główna:** `user_delta_points`
  * **Klucz użytkownika:** `user_id` (UUID, FK -> `auth.users`)
  * **Pola:**
    * `points_balance` (INTEGER, domyślnie 0) — bieżące saldo punktów Delta Points (DP)
    * `total_earned` (INTEGER, domyślnie 0) — łączne punkty zdobyte w historii
    * `updated_at` (TIMESTAMPTZ)
  * **Niespójności w legacy endpointach:**
    * Niektóre stare endpointy (`complete-quiz`, `quests/claim-reward`, `season-pass/claim`) próbują pisać do kolumny `points` zamiast `points_balance`.

### B. Tabela Transakcji i Historii (Ledger)
* **Stan:** **BRAK OGÓLNEGO LEDGERA TRANSAKCJI DP (`delta_points_transactions`).**
* Istnieją jedynie częściowe logi dziedzinowe:
  * `pack_opening_logs` (rejestruje `cards_drawn` oraz `delta_points_awarded` z duplikatów)
  * `reward_logs` (używane wybiórczo w `minigames/submit` dla XP)
* **Rekomendacja:** Wprowadzenie centralnego append-only ledgera transakcji (`user_dp_ledger`) dla pełnej audytowalności i uniemożliwienia wyścigów salda.

---

## 2. DP INCOME SOURCES MAP

| Źródło (Source) | Plik Backend | Endpoint API | Kwota / Nagroda | Sterowanie | Idempotentne? | Ryzyko Abuse |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Duplikaty Kart** | `lib/cards/engine.ts` | `POST /api/cards/open-pack` | Common: 10, Rare: 20, Epic: 50, Legendary: 100, Inferno: 250 DP | Hardcoded (`RARITY_CONFIG`) | **TAK** (serwer losuje i weryfikuje własność w bazie) | **NISKIE** |
| **Daily Spin (Koło)** | `app/api/cards/daily-spin/route.ts` | `POST /api/cards/daily-spin` | 10 / 25 / 50 / 100 / 250 DP | **Client payload** (`req.json().reward`) | **NIE** (payload z klienta) | **KRYTYCZNE (P0)** |
| **Osiągnięcia** | `app/api/achievements/claim-reward/route.ts` | `POST /api/achievements/claim-reward` | DB `reward_dp` (np. 50–500 DP) | DB-driven (`achievement_definitions`) | **CZĘŚCIOWE** (race condition w `claimed_reward`) | **ŚREDNIE (P1)** |
| **Quiz Wiedzy** | `app/api/knowledge/complete-quiz/route.ts` | `POST /api/knowledge/complete-quiz` | Client payload `pointsAwarded` (domyślnie 50 DP) | **Client payload** | **NIE** (brak sprawdzania czy quiz zdany wcześniej) | **KRYTYCZNE (P0)** |
| **Minigry (Progress)** | `app/api/minigames/progress/route.ts` | `POST /api/minigames/progress` | Client payload `points_earned` | **Client payload** | **NIE** (dowolna wartość z klienta bez limitu) | **KRYTYCZNE (P0)** |
| **Misje / Questy** | `app/api/quests/claim-reward/route.ts` | `POST /api/quests/claim-reward` | Client payload `rewardPoints` | **Client payload** | **NIE** (dowolna wartość z klienta bez limitu) | **KRYTYCZNE (P0)** |
| **Season Pass** | `app/api/season-pass/claim/route.ts` | `POST /api/season-pass/claim` | 50–500 DP z definicji frontendowej | Client payload (`level`) | **NIE** (brak weryfikacji czy poziom osiągnięty) | **KRYTYCZNE (P0)** |
| **SBC (Wyzwania)** | `app/api/cards/sbc/route.ts` | `POST /api/cards/sbc` | Client payload `reward_points` | **Client payload** | **NIE** (dowolna wartość z body) | **KRYTYCZNE (P0)** |

---

## 3. DP SPEND AUDIT (WYDATKI)

| Moduł / Wydatek | Plik Backend | Endpoint API | Koszt DP | Stan / Status | Ryzyko Double Spend |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Zakup paczki** | `app/api/cards/buy-pack/route.ts` | `POST /api/cards/buy-pack` | Standard: 50, Matchday: 80, Gold: 120, Inferno: 250, Legend: 350 DP | **AKTYWNE** | **P0** (brak atomowego odejmowania w bazie, read-then-write w JS) |
| **SBC (Przepalanie kart)** | `app/api/cards/sbc/route.ts` | `POST /api/cards/sbc` | Usuwa wybrane karty z `user_cards` | **PLACEHOLDER / NIEKOMPLETNE** | P0 (brak walidacji kryteriów wyzwania) |
| **Trading (Wymiany)** | `app/api/social/trades/route.ts` | `POST /api/social/trades` | Brak kosztu DP | **PLACEHOLDER** (nie transferuje kart w `user_cards`) | P1 |
| **Marketplace** | — | — | — | **NIE ISTNIEJE / BRAK** | Brak |

---

## 4. DUPLICATE REWARDS AUDIT

* **Implementacja:** `lib/cards/engine.ts` w funkcji `openPackServerSide()`
* **Logika:**
  1. Sprawdzenie istniejących kart użytkownika: `SELECT card_id, duplicates_count FROM user_cards WHERE user_id = userId`.
  2. Każda wylosowana karta sprawdzana jest w secie `ownedCardIds`.
  3. Jeśli karta już istnieje w kolekcji:
     * `is_duplicate = true`
     * `duplicate_points = RARITY_CONFIG[rarity].duplicatePoints`
       * `common`: 10 DP
       * `rare`: 20 DP
       * `epic`: 50 DP
       * `legendary`: 100 DP
       * `inferno`: 250 DP
     * Zwiększenie `user_cards.duplicates_count += 1`
     * Dopisanie punktów do `user_delta_points.points_balance` oraz `total_earned`.
  4. Wpis w `pack_opening_logs`.
* **Wnioski:**
  * Logika duplikatów po stronie serwera jest **poprawna i bezpieczna**.
  * Wymaga w przyszłości opakowania zapisu `user_cards` + `user_delta_points` + `user_unopened_packs` w jedną atomową transakcję DB (RPC).

---

## 5. DAILY SPIN AUDIT

* **Endpointy:** `GET /api/cards/daily-spin`, `POST /api/cards/daily-spin`
* **Tabela stanu:** `user_daily_spins` (`user_id`, `last_spin_at`, `last_streak_date`, `streak_count`, `total_spins`)
* **Założenie biznesowe:** Maksymalnie **1 obrót dziennie**.
* **Weryfikacja:**
  * Porównanie `lastSpinDate.toISOString().slice(0, 10) === todayStr` (UTC).
  * Jeśli użytkownik już zakręcił kołem dzisiaj: serwer zwraca `429 Too Many Requests`.
* **Zidentyfikowana podatność (P0):**
  * W `POST /api/cards/daily-spin`, serwer przyjmuje obiekt `reward` przekazany w JSON body przez klienta (`const { reward } = await req.json()`).
  * Klient decyduje, jaką nagrodę otrzymał (np. 250 DP lub darmową paczkę Inferno)!
  * **Wymagana poprawka (dla etapu 14B):** Losowanie nagrody koła musi odbywać się **wyłącznie na serwerze** (Server-Side Spin Roll), a klient powinien otrzymywać jedynie wynik losowania.

---

## 6. STREAK AUDIT (SERIA DAILY SPIN)

* **Cykl:** 7 dni (Dzień 1 do Dzień 7, po czym reset do Dnia 1).
* **Obliczenia:**
  * `dayDiff = (todayDate - lastSpinDate) / 86400000`
  * `dayDiff === 1` -> kontynuacja serii (`streak = prev >= 7 ? 1 : prev + 1`)
  * `dayDiff > 1` -> pominięty dzień -> reset serii (`streak = 1`)
  * `dayDiff === 0` -> zablokowany obrót (`canSpin = false`)
* **Strefa czasowa:**
  * Wyliczanie oparte o UTC (`toISOString().slice(0, 10)` i `tomorrow.setUTCHours(24, 0, 0, 0)`).
  * Reset następuje o północy UTC (02:00 / 01:00 czasu polskiego).

---

## 7. ACHIEVEMENT REWARDS AUDIT

* **Endpoint:** `POST /api/achievements/claim-reward`
* **Tabele:** `achievement_definitions`, `user_achievements`, `user_delta_points`, `user_unopened_packs`
* **Nagrody:**
  * Punkty DP: z pola `achievement_definitions.reward_dp`
  * Paczka kart: z pola `achievement_definitions.reward_pack_type`
* **Idempotencja i podatności:**
  * Oznaczenie `claimed_reward: true` następuje w osobnym kroku po dodaniu punktów i paczek.
  * Brak atomowego locka umożliwia równoległe zapytania `Promise.all` (P1 Race Condition).

---

## 8. PACK ECONOMY AUDIT

* **Katalog paczek i koszty w Skarbcu:**
  * `standard_pack` (3 karty, min. common) = **50 DP**
  * `matchday_booster` (4 karty, min. rare) = **80 DP**
  * `gold_booster` (5 kart, min. rare) = **120 DP**
  * `inferno_booster` (5 kart, min. epic) = **250 DP**
  * `legend_pack` / `legend_booster` (6 kart, min. legendary) = **350 DP**
* **Darmowe źródła paczek:**
  * Pakiet powitalny na start (1x `matchday_booster`)
  * Kamienie milowe obecności na meczach i treningach (`sync-rewards`)
  * Nagrody z osiągnięć (`claim-reward`)
  * Koło fortuny (`daily-spin`)

---

## 9. QUIZ & MINIGAMES AUDIT

### A. Quiz Kącika Wiedzy (`/api/knowledge/complete-quiz`)
* **Nagroda:** Domyślnie 50 DP (lub wartość podana przez klienta).
* **Zabezpieczenie:** Brak weryfikacji pytań po stronie serwera; brak zapisu ukończonych lekcji (użytkownik może pobierać 50 DP w nieskończoność).

### B. Minigry (`/api/minigames/progress`)
* **Nagroda:** Punkty `points_earned` przesyłane bezpośrednio z canvasu gry w przeglądarce.
* **Zabezpieczenie:** Brak weryfikacji czasu rozgrywki, brak dziennego limitu DP z minigier.

### C. Game Profiles (`/api/game/minigames/submit`)
* **Nagroda:** Punkty XP (poziomy konta) z anty-farmingiem (`calculateMinigameXPAward`).
* **Podatność:** Przyjmuje `userId` z body zamiast pobierać z `supabase.auth.getUser()`.

---

## 10. ABUSE & EXPLOIT MATRIX (VULNERABILITY AUDIT)

| ID | Podatność / Luka | Severity | Opis | Wymagane działanie (Etap 14B) |
| :--- | :--- | :---: | :--- | :--- |
| **VULN-01** | Client-Side Reward w Daily Spin | **P0** | Klient przesyła nagrodę i jej wartość w ciele żądania POST. | Przeniesienie losowania koła w 100% na backend (Server-Side Roll). |
| **VULN-02** | Nielimitowany Quiz Wiedzy | **P0** | Brak sprawdzania jednokrotności zaliczenia lekcji; `pointsAwarded` z body. | Dodanie tabeli `user_lesson_completions`, stała nagroda w backendzie. |
| **VULN-03** | Dowolne DP w Minigames Progress | **P0** | `points_earned` z body dodawane bez weryfikacji do salda. | Usunięcie bezpośredniego przyznawania DP z body, dodanie dziennego capu. |
| **VULN-04** | Race Condition w Zakupie Paczek | **P0** | Read-then-write salda DP w JS bez atomowej blokady DB. | Wdrożenie procedury SQL z atomowym `UPDATE ... WHERE points_balance >= price`. |
| **VULN-05** | Fałszowanie userId w Game Minigames | **P1** | Endpoint `minigames/submit` ufa `body.userId`. | Wymuszenie `const { data: { user } } = await supabase.auth.getUser()`. |
| **VULN-06** | Race Condition w Osiągnięciach | **P1** | Sprawdzenie `claimed_reward` i aktualizacja w oddzielnych zapytaniach. | Atomowe oznaczenie `claimed_reward = true` w jednym zapytaniu. |
| **VULN-07** | Niezabezpieczone Endpointy Quests & Pass | **P1** | `quests/claim-reward` i `season-pass/claim` ufają parametrom wejściowym. | Oznaczenie jako PLACEHOLDER / zabezpieczenie weryfikacją postępu. |

---

## 11. ECONOMY BALANCE INVENTORY (SZACUNKOWY BILANS)

| Mechanizm | Min DP | Max DP | Częstotliwość | Średni Przychód Dzienny | Średni Przychód Tygodniowy |
| :--- | :---: | :---: | :--- | :---: | :---: |
| **Daily Spin (Koło)** | 10 | 250 | 1 / dzień | ~40 DP | ~280 DP |
| **Duplikaty (1 paczka dziennie)** | 10 | 250 | Zmienna | ~30 DP | ~210 DP |
| **Osiągnięcia (Jednorazowe)** | 50 | 500 | Jednorazowo | Zmienna | ~150 DP (wczesna faza) |
| **Quiz Wiedzy (Po zabezpieczeniu)** | 50 | 50 | 1 na lekcję | Jednorazowo | ~100 DP (początek) |
| **Aktywność Meczowa (Paczki)** | 0 | 0 | Wg terminarza | 1-2 darmowe paczki | 2-4 darmowe paczki |
| **KOSZTY: Paczka Standardowa** | -50 | -50 | Na żądanie | - | - |
| **KOSZTY: Paczka Złota / Inferno** | -120 | -250 | Na żądanie | - | - |

---

## 12. PLACEHOLDER & UNUSED FEATURES STATUS

| Moduł / Funkcja | Status | Ścieżka / Plik | Opis |
| :--- | :---: | :--- | :--- |
| **SBC (Wyzwania Składu)** | `PLACEHOLDER` | `app/api/cards/sbc/route.ts` | Nieaktywne w UI; usuwa karty, ale nie waliduje zasad wyzwania. |
| **Safe Card Trades (Wymiany)** | `PLACEHOLDER` | `app/api/social/trades/route.ts` | Zapisuje status w tabeli `safe_card_trades`, ale nie transferuje kart w `user_cards`. |
| **Draft Mode** | `PLACEHOLDER` | `app/api/social/draft/route.ts` | Zapisuje drafty w sesji lokalnej. |
| **Marketplace / Rynek** | `DEAD CODE / BRAK` | — | Brak dedykowanych tabel i endpointów. |
| **Autografy / Fuzje Kart** | `DEAD CODE / BRAK` | — | Brak w kodzie. |

---

## 13. REKOMENDACJE DLA ETAPU 14B (HARDENING & REPAIR PLAN)

1. **Wdrożenie Server-Side Daily Spin**:
   - Usunięcie przyjmowania `reward` z ciała żądania klienta.
   - Serwer losuje nagrodę z wag probabilistycznych, zapisuje stan w bazie i zwraca wylosowany obiekt.
2. **Atomowe Transakcje Finansowe**:
   - Wdrożenie transakcyjnego odejmowania punktów w `/api/cards/buy-pack` (brak ujemnych sald i double-spendów).
3. **Zabezpieczenie Quizu i Minigier**:
   - Zablokowanie wielokrotnego odbierania punktów za ten sam quiz.
   - Usunięcie możliwości wpisywania arbitralnych punktów DP z requestu minigier.
4. **Weryfikacja Tożsamości**:
   - Wymuszenie `auth.getUser()` na wszystkich endpointach zamiast ufać `body.userId`.
5. **Zachowanie Zasad Produktu**:
   - Pozostawienie modułów SBC, Trading i Marketplace jako **nieaktywne placeholdery**.
   - Zachowanie istniejącej ekonomii i cen paczek bez zmian gameplay.

---
