---
trigger: model_decision
description: Zasady modułu kart, otwierania paczek, animacji 3D i kolekcji DELTA INFERNO.
---

# DELTA INFERNO — Animacje, Karty 3D i Kolekcja

Lokalizacja kodu:
- Komponenty: `components/collection-3d/`, `components/pack-opening/`, `components/PackOpeningExperience.tsx`, `components/PackOpeningModal.tsx`, `components/InfernoWalkoutReveal.tsx`, `components/DeltaCollectionAlbum.tsx`
- Logika i konfiguracja: `lib/cards/`
- Środowiska testowe / lab: `app/dev/pack-opening/`, `app/lab/`

Zasady implementacji:
1. **Skalowanie i warstwy UI:**
   - Herb klubu oraz grafiki muszą mieć jawnie ograniczone wymiary dopasowane do kontenera; brak niekontrolowanego renderowania obrazów w pełnej rozdzielczości naturalnej.
   - Prawidłowo zarządzaj kontekstem układania (stacking context, izolacja modala, blokada przewijania tła), zapobiegając prześwitywaniu dashboardu.
   - Zapewnij brak kolizji napisów i wskaźników zarówno na desktopie, jak i na urządzeniach mobilnych.
   - Przyciski Pomiń (Skip) oraz Zamknij (X) muszą być zawsze widoczne, klikalne i natychmiast przywracać normalny stan widoku.
2. **Integralność ekonomii i kart:**
   - Wyniki losowania paczek, status duplikatów i naliczanie punktów DP są autorytatywne po stronie serwera (`/api/cards/open-pack`, `lib/cards/engine.ts`).
   - Zakaz wprowadzania fikcyjnych rzadkości oraz lokalnych modyfikacji bilansów punktowych w komponentach UI.
