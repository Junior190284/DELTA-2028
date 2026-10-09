# DELTA 2018 GM — RELEASE CANDIDATE MANIFEST (ETAP 9)

**Dokument:** Manifest Wydania Kandydackiego (Pre-Production Freeze)  
**Data wygenerowania:** 2026-10-09  
**Status:** **STAGING INFRASTRUCTURE INCOMPLETE** *(Brak wydzielonej instancji staging w chmurze Supabase; blokada deployu produkcyjnego)*

---

## 1. Metadane Wdrożenia

- **Source Branch:** `gemini/delta-roboczy`
- **Release Candidate Commit SHA:** `515259717bee5489e33589f7186db1d1bf530dd0`
- **Production Target Database:** `fctgruvciakhohfxkdzp` (`https://fctgruvciakhohfxkdzp.supabase.co`)
- **Staging Database Target:** `delta-2018-gm-staging` *(oczekuje na fizyczne założenie osobnego projektu w chmurze Supabase)*
- **Production URL:** `https://delta-2028.vercel.app`
- **Staging URL:** `http://localhost:3000` / `https://delta-2018-gm-staging.vercel.app`

---

## 2. Kanoniczne Standardy i Nazewnictwo (Rozstrzygnięcia Etapu 9)

| Kwestia | Kanoniczna Wartość | Wyjaśnienie / Stan w Kodzie |
| :--- | :--- | :--- |
| **Tabela statusu przeczytania** | `public.user_event_reads` | Tabela `user_read_events` nie istnieje w kodzie ani w SQL. Wszelkie endpointy (`/api/events/read`) oraz widoki używają wyłącznie `user_event_reads`. |
| **Endpoint synchronizacji** | `/api/delta-sync` | Endpoint `/api/sync` nie istnieje. Cała automatyzacja, panel admina i cron odwołują się do `/api/delta-sync`. |
| **Klucz Service Role** | `SUPABASE_SERVICE_ROLE_KEY` | Używany wyłącznie po stronie serwera w `lib/supabase/admin.ts`. Brak ekspozycji `NEXT_PUBLIC_`. |

---

## 3. Migration Manifest (Kolejność Bezpiecznych Migracji Produkcyjnych)

Wszystkie migracje są **addytywne** (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).  
**Zakaz używania `00_STAGING_BOOTSTRAP_ALL.sql` bezpośrednio na produkcji!**

1. **`v17_etap2_cards_collection.sql`**
   - *Typ:* Additive
   - *Cel:* Utworzenie tabel `card_definitions`, `user_cards`, `user_unopened_packs`, `pack_definitions`.
   - *Ryzyko:* Bardzo niskie (nowe tabele).
   - *Rollback:* `DROP TABLE IF EXISTS user_unopened_packs, user_cards, card_definitions, pack_definitions;`
2. **`v18_etap3_pack_opening_locks.sql`**
   - *Typ:* Additive
   - *Cel:* Dodanie kolumn `is_opened`, `opened_at` do `user_unopened_packs` oraz unikalnych indeksów zapobiegających race condition.
   - *Ryzyko:* Niskie.
   - *Rollback:* Usunięcie indeksów.
3. **`v19_etap4_achievements_unlock.sql`**
   - *Typ:* Additive
   - *Cel:* Utworzenie `player_achievements` z unikalnym kluczem `(player_id, achievement_id)`.
   - *Ryzyko:* Niskie.
   - *Rollback:* `DROP TABLE IF EXISTS player_achievements;`
4. **`v20_etap6_delta_sync_events_push.sql`**
   - *Typ:* Additive
   - *Cel:* Utworzenie `delta_system_events`, `user_event_reads`, `push_subscriptions`, `delta_sync_history`.
   - *Ryzyko:* Niskie.
   - *Rollback:* Usunięcie nowych tabel powiadomień.
5. **`v21_rls_security_hardening.sql`**
   - *Typ:* Additive
   - *Cel:* Aktywacja RLS i funkcji pomocniczych `is_staff()`, `is_parent_of()`.
   - *Ryzyko:* Średnie (wymaga weryfikacji dostępu użytkowników).

---

## 4. Wymagane Zmienne Środowiskowe (Environment Variables)

```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:kontakt@delta2018.pl

# Sync & App Config
DELTA_SYNC_SECRET=...
NEXT_PUBLIC_APP_URL=https://delta-2028.vercel.app
NEXT_PUBLIC_SITE_URL=https://delta-2028.vercel.app
```

---

## 5. Feature Flags & Kill Switches

Zarządzane w tabeli `app_settings` (klucz: `feature_flags`) oraz przez API `/api/admin/feature-flags`:

- `delta_sync_enabled` (Domyślnie: `true` / Awaryjnie: `false` — wyłącza automatyczny parser)
- `push_enabled` (Domyślnie: `true` / Awaryjnie: `false` — blokuje wysyłkę push)
- `pack_opening_enabled` (Domyślnie: `true` / Awaryjnie: `false`)
- `achievements_sync_enabled` (Domyślnie: `true` / Awaryjnie: `false`)
- `maintenance_mode` (`enabled: false, message: ""`)

---

## 6. Procedura Rollbacku (Plan Awaryjny)

- **Awaria Frontendu:** Natychmiastowy klik *Instant Rollback* w panelu Vercel do poprzedniego wdrożenia produkcyjnego.
- **Awaria API:** Rollback deploymentu Vercel (baza zachowuje kompatybilność wsteczną dzięki migracjom addytywnym).
- **Push Flood:** Usunięcie lub zmiana `VAPID_PRIVATE_KEY` na Vercel lub ustawienie flagi `push_enabled: false` w `app_settings`.
- **Delta Sync Flood/Loop:** Wyłączenie tokena `DELTA_SYNC_SECRET` w konfiguracji Cron / Vercel.

---

## 7. Smoke-Test Checklist (Mobile Viewports: 360px, 390px, 430px)

- [x] **Bottom Navigation:** Dokładnie 5 pozycji (HOME, MECZE, TRENING, WIADOMOŚCI, WIĘCEJ), `pb-safe`, brak nachodzenia na treść.
- [x] **Live Bar:** Renderowany pod headerem, nie przysłania scrollowalnej treści, responsywny na 360px.
- [x] **Delta Collection:** Karty i paczki wyświetlają się poprawnie, grid dopasowany do ekranu mobilnego.
- [x] **Pack Opening:** Cinematic reveal płynny na mobile, animacje nie powodują lagów, obsługa F5/refresh.
- [x] **News Center:** Badge liczbowy nieprzeczytanych wiadomości, oznaczenie przeczytania zapisuje się w `user_event_reads`.
- [x] **Trening / Obecności:** RSVP `yes` nie jest wliczane do finalnej obecności, liczone wyłącznie zatwierdzone statusy `present`.
