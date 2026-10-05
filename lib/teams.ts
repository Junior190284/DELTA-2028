const teamLogos: Record<string, string> = {
  "K.S. Delta Warszawa GM": "/teamlogos/gm.png",
  "Delta Górny Mokotów": "/teamlogos/gm.png",
  "Delta Wilanów": "/teamlogos/gm.png",
  "Delta Wawer": "/teamlogos/gm.png",
  "Alfa Przymierze Rodzin": "/teamlogos/alfa.png",
  "FC Vizja Warszawa": "/teamlogos/vizja.png",
  "RKS Ursus Warszawa": "/teamlogos/ursus.png",
  "MUKS Julianów": "/teamlogos/julianow.png",
};

/**
 * Normalizes team names for clean and legible presentation:
 * - K.S. Delta Warszawa GM / Delta GM -> Delta Górny Mokotów
 * - K.S. Delta Warszawa WI / Delta WI -> Delta Wilanów
 * - K.S. Delta Warszawa WA / Delta WA -> Delta Wawer
 */
export function formatTeamName(team: string | null | undefined): string {
  if (!team) return "";
  const t = team.trim();
  const lower = t.toLowerCase();

  // Check specific Delta divisions
  if (lower.includes("delta")) {
    if (lower.includes("wi") || lower.includes("wilan")) {
      return "Delta Wilanów";
    }
    if (lower.includes("wa") || lower.includes("wawer")) {
      return "Delta Wawer";
    }
    if (
      lower.includes("gm") ||
      lower.includes("górny") ||
      lower.includes("gorny") ||
      lower.includes("mokotów") ||
      lower.includes("mokotow") ||
      lower === "k.s. delta warszawa" ||
      lower === "delta warszawa"
    ) {
      return "Delta Górny Mokotów";
    }
    return "Delta Górny Mokotów";
  }

  return t;
}

/**
 * Resolves the logo path for any team.
 * All Delta teams (Górny Mokotów, Wilanów, Wawer) automatically receive the Delta crest.
 */
export function getTeamLogo(team: string | null | undefined): string | undefined {
  if (!team) return undefined;
  const t = team.trim();
  if (teamLogos[t]) return teamLogos[t];

  const lower = t.toLowerCase();
  if (lower.includes("delta")) return "/teamlogos/gm.png";
  if (lower.includes("alfa")) return "/teamlogos/alfa.png";
  if (lower.includes("vizja")) return "/teamlogos/vizja.png";
  if (lower.includes("ursus")) return "/teamlogos/ursus.png";
  if (lower.includes("julian")) return "/teamlogos/julianow.png";

  return undefined;
}
