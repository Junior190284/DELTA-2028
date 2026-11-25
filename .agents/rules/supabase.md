---
trigger: model_decision
description: Zasady bezpieczeństwa bazy danych, zapytań SQL, migracji, RLS i integracji Supabase.
---

# Supabase — Baza Danych, RLS i Bezpieczeństwo

Lokalizacja kodu:
- Migracje i skrypty SQL: `supabase/`
- Klienci Supabase: `lib/supabase/` (client.ts, server.ts, admin.ts)
- Endpointy backendowe: `app/api/`
- Logika bezpieczeństwa: `lib/security/`

Zasady implementacji:
1. **Bezpieczeństwo ról i uprawnień:**
   - Rola `authenticated` nie może mieć prawa zmiany kolumn systemowych (`role`, `id`, `created_at`). Modyfikacje profilu ograniczaj do kolumn bezpiecznych (np. `display_name`).
   - Klient z uprawnieniami administracyjnymi (`service_role` z `lib/supabase/admin.ts`) może działać wyłącznie po stronie serwera; klucze serwisowe nigdy nie trafiają do klienta.
   - Przed modyfikacją uprawnień lub funkcji weryfikuj w repozytorium rzeczywistą definicję tabel, triggerów i polityk RLS — nie zakładaj ich istnienia a priori.
2. **Migracje i transakcyjność:**
   - Dobieraj transakcyjność do charakteru instrukcji PostgreSQL (używaj bloków transakcyjnych tam, gdzie to bezpieczne; pamiętaj, że operacje takie jak `CREATE INDEX CONCURRENTLY` nie mogą działać w transakcji).
   - Zakaz stosowania destrukcyjnych procedur wycofywania typu `DROP TABLE CASCADE`.
   - Bezwzględny zakaz samodzielnego uruchamiania migracji produkcyjnych.
