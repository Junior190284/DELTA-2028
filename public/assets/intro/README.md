# DELTA 2018 GM — FOLDER WIDEO INTRO (INFERNO)

Ten katalog jest przygotowany pod filmowe intro stadionowe na publicznej stronie głównej DELTA 2018 GM.

## Domyślny plik wideo

Umieść tutaj docelowy plik wideo o nazwie:

`inferno.mp4`

Ścieżka w aplikacji:
`/assets/intro/inferno.mp4`

## Rekomendowana specyfikacja pliku

- **Format / Kontener:** MP4 (H.264 / AVC)
- **Proporcje:** 16:9 (horyzontalny)
- **Rozdzielczość:** 1920×1080 px lub 1280×720 px
- **Dźwięk:** Zaleca się usunięcie ścieżki dźwiękowej z pliku (intro odtwarza się domyślnie wyciszone, co zmniejsza wagę pliku o 20–30%)
- **Docelowy rozmiar:** Poniżej 3 MB dla płynnego ładowania na urządzeniach mobilnych

## Jak działa mechanizm w aplikacji

1. **Automatyczne wykrywanie:** Gdy plik `inferno.mp4` znajdzie się w tym folderze, aplikacja natychmiast rozpocznie jego odtwarzanie po wejściu na stronę główną.
2. **Graceful Fallback:** Jeżeli plik nie istnieje lub nie został jeszcze wgrany, aplikacja **nie zawiesza się** — automatycznie wyświetla klasyczną stadionową animację z herbem DELTY i płomieniami.
3. **Późniejsza podmiana:** W dowolnym momencie możesz podmienić plik `inferno.mp4` (np. na wersję z Rysiem, oficjalną koszulką DELTY i płonącym logo) **bez konieczności modyfikacji kodu aplikacji**.
