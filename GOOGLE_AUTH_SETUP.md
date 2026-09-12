# Logowanie przez Google — konfiguracja

Kod aplikacji jest już gotowy.

## 1. Supabase

W projekcie Supabase:

Authentication -> Sign In / Providers -> Google

Włącz Google i wklej:
- Google Client ID
- Google Client Secret

## 2. Google Auth Platform

W Google Cloud / Google Auth Platform utwórz OAuth Client:

Application type:
`Web application`

Dodaj Authorized JavaScript origins:

Development:
`http://localhost:3000`

Production:
`https://twoja-domena.pl`

Jako Authorized redirect URI dla Google ustaw callback Supabase podany w panelu
Supabase przy konfiguracji providera Google, np.:

`https://<project-ref>.supabase.co/auth/v1/callback`

Nie wpisuj tu `/auth/callback` naszej aplikacji. Google wraca najpierw do Supabase,
a Supabase przekierowuje użytkownika do aplikacji.

## 3. Supabase URL Configuration

Authentication -> URL Configuration

Site URL:
`https://twoja-domena.pl`

Redirect URLs dodaj m.in.:

`http://localhost:3000/auth/callback`
`https://twoja-domena.pl/auth/callback`

Kod aplikacji używa:
`/auth/callback?next=/dashboard`

## 4. Jak to działa

1. Użytkownik klika "Kontynuuj z Google".
2. Supabase uruchamia Google OAuth.
3. Google wraca do callbacku Supabase.
4. Supabase przekierowuje na `/auth/callback` w naszej aplikacji.
5. Aplikacja wykonuje `exchangeCodeForSession`.
6. Użytkownik trafia do `/dashboard`.

Nowi użytkownicy automatycznie dostają w bazie profil z rolą `parent`
przez trigger `handle_new_user()` z `schema.sql`.
