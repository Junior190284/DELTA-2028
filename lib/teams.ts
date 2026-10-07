const teamLogos: Record<string, string> = {
  "K.S. Delta Warszawa GM": "/teamlogos/gm.png",
  "Delta Górny Mokotów": "/teamlogos/gm.png",
  "Delta Wilanów": "/teamlogos/gm.png",
  "Delta Wawer": "/teamlogos/gm.png",
  "K.S. Delta Warszawa WI": "/teamlogos/gm.png",
  "K.S. Delta Warszawa WA": "/teamlogos/gm.png",
  "Alfa Przymierze Rodzin": "/teamlogos/alfa.png",
  "FC Vizja Warszawa": "/teamlogos/vizja.png",
  "RKS Ursus Warszawa": "/teamlogos/ursus.png",
  "MUKS Julianów": "/teamlogos/julianow.png",
};

/**
 * Normalizes team names for clean and unified presentation across the entire application:
 * - Delta Górny Mokotów (zamiast Delta GM, K.S. Delta Warszawa GM)
 * - Delta Wilanów (zamiast Delta W, Delta WI, K.S. Delta Warszawa WI)
 * - Delta Wawer (zamiast Delta W, Delta WA, K.S. Delta Warszawa WA)
 * - FC Vizja Warszawa
 * - RKS Ursus Warszawa
 * - Alfa Przymierze Rodzin
 * - MUKS Julianów
 */
export function formatTeamName(team: string | null | undefined): string {
  if (!team) return "";
  const t = team.trim();
  const lower = t.toLowerCase();

  // Check specific Delta branches safely
  if (lower.includes("delta")) {
    // Check Wilanów
    if (/\b(wi|wilan|wilanow|wilanów)\b/i.test(lower) || lower.endsWith(" wi") || lower.endsWith(" wilanów") || lower.endsWith(" wilanow")) {
      return "Delta Wilanów";
    }
    // Check Wawer
    if (/\b(wa|wawer)\b/i.test(lower) || lower.endsWith(" wa") || lower.endsWith(" wawer")) {
      return "Delta Wawer";
    }
    // Check Górny Mokotów
    if (
      /\b(gm|mokotow|mokotów|gorny|górny)\b/i.test(lower) ||
      lower.endsWith(" gm") ||
      lower === "k.s. delta warszawa" ||
      lower === "delta warszawa" ||
      lower === "delta" ||
      lower.includes("2018")
    ) {
      return "Delta Górny Mokotów";
    }
    return "Delta Górny Mokotów";
  }

  // Non-Delta Teams normalization
  if (lower.includes("alfa") || lower.includes("przymierz")) {
    return "Alfa Przymierze Rodzin";
  }
  if (lower.includes("vizja") || lower.includes("wizja")) {
    return "FC Vizja Warszawa";
  }
  if (lower.includes("ursus")) {
    return "RKS Ursus Warszawa";
  }
  if (lower.includes("julian")) {
    return "MUKS Julianów";
  }

  return t;
}

/**
 * Resolves the logo path for any team.
 * All Delta teams (Górny Mokotów, Wilanów, Wawer) automatically receive the Delta crest.
 */
export function getTeamLogo(team: string | null | undefined): string {
  if (!team) return "/teamlogos/gm.png";
  const t = team.trim();
  if (teamLogos[t]) return teamLogos[t];

  const lower = t.toLowerCase();
  if (lower.includes("delta")) return "/teamlogos/gm.png";
  if (lower.includes("alfa") || lower.includes("przymierz")) return "/teamlogos/alfa.png";
  if (lower.includes("vizja") || lower.includes("wizja")) return "/teamlogos/vizja.png";
  if (lower.includes("ursus")) return "/teamlogos/ursus.png";
  if (lower.includes("julian")) return "/teamlogos/julianow.png";

  return "/teamlogos/gm.png";
}
