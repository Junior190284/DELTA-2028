/**
 * DELTA DEV LAB — FAIL-CLOSED SECURITY GUARD
 * Chroni przed jakimkolwiek przypadkowym wykonaniem testów lub mutacji
 * na zdalnych projektach Supabase (Production lub Staging).
 */

export const FORBIDDEN_REMOTE_PROJECT_IDS = [
  "fctgruvciakhohfxkdzp", // Production
  "tdlsxamxtygojxhmjjvp", // Staging / Preview
] as const;

export class DevLabSecurityViolationError extends Error {
  constructor(message: string) {
    super(`[DEV LAB FAIL-CLOSED GATE] ${message}`);
    this.name = "DevLabSecurityViolationError";
  }
}

/**
 * Waliduje konfigurację środowiska DEV LAB pod kątem całkowitej izolacji.
 * Wyrzuca wyjątek w przypadku wykrycia zdalnego adresu lub zakazanego identyfikatora projektu.
 */
export function assertDevLabIsolation(supabaseUrl: string | undefined): void {
  if (!supabaseUrl) {
    throw new DevLabSecurityViolationError("Brak adresu URL bazy danych dla środowiska DEV LAB.");
  }

  const normalized = supabaseUrl.toLowerCase().trim();

  // 1. Sprawdzenie obecności zabronionych projektów
  for (const forbiddenId of FORBIDDEN_REMOTE_PROJECT_IDS) {
    if (normalized.includes(forbiddenId.toLowerCase())) {
      throw new DevLabSecurityViolationError(
        `Wykryto zabroniony zdalny projekt bazy danych (${forbiddenId}). Natychmiastowe przerwanie operacji labu!`
      );
    }
  }

  // 2. Wymóg lokalnego adresu (127.0.0.1 lub localhost)
  const isLocalhost =
    normalized.startsWith("http://127.0.0.1") ||
    normalized.startsWith("http://localhost") ||
    normalized.startsWith("https://127.0.0.1") ||
    normalized.startsWith("https://localhost");

  if (!isLocalhost) {
    throw new DevLabSecurityViolationError(
      `Lokalne środowisko DEV LAB może komunikować się wyłącznie z adresem lokalnym (127.0.0.1 / localhost). Otrzymano: ${supabaseUrl}`
    );
  }
}
