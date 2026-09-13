# DELTA 2018 GM — V10 MEGA PACK

## 1. Supabase — jeden obowiązkowy SQL
Otwórz **Supabase → SQL Editor → New query**, wklej cały plik:

`supabase/V10_MEGA_PACK_RUN_ONCE.sql`

i kliknij **Run**.

Końcowy wynik powinien zawierać:

`V10 MEGA PACK PERMISSIONS READY`

Skrypt można bezpiecznie uruchomić również wtedy, gdy wcześniejsze tabele push / kalendarza / treningów już istnieją.

## 2. Wgraj paczkę
Skopiuj zawartość paczki do:

`D:\DELTA\DELTA_2018_GM_ROBOCZY`

Nie usuwaj swojego `.env.local`.

## 3. Git / Vercel
```bat
git add .
git commit -m "V10 mega pack"
git push origin main
```

Vercel wdroży `main` automatycznie.

## 4. Role rodziców
Po wdrożeniu:

**Admin → Rodzice i role**

Administrator może przypisać konto rodzica do zawodnika oraz nadać wybrane prawa:
- Mecze i składy,
- Gole / asysty / MVP,
- Pełne treningi,
- Obecność treningowa,
- Kalendarz,
- Aktualności,
- Zawodnicy.

Uprawnienia są egzekwowane przez Supabase RLS, a nie tylko przez ukrywanie przycisków.

## 5. Smart Reminders — opcjonalnie
Jeśli chcesz automatyczne push przypominające o niepotwierdzonej obecności, treningu jutro i urodzinach, uruchom także:

`supabase/v8_smart_reminders_cron.sql`

Najpierw zastąp w nim `YOUR_DELTA_SYNC_SECRET` aktualną wartością `DELTA_SYNC_SECRET` z Vercel.
