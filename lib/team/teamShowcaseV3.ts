/**
 * DELTA INFERNO — P15B: TEAM SHOWCASE 3.0 — DELTA CHAMPIONS (pure logic, no DOM).
 *
 * - visual variants (A/B/C + the recommended "champions" blend),
 * - DEMO roster for the prototype (NO connection to the production children's database),
 * - "dynamic lights": colour and tilt of the beams depending on the selected player,
 * - intro timeline.
 * The carousel geometry is reused from Team Showcase 2.0 (lib/team/teamShowcase).
 */
import { buildRoster, type RosterPlayerRow, type ShowcasePlayer } from "./teamShowcase.ts";

export type ShowcaseVariant = "champions" | "stadium" | "ultimate" | "barca";

export interface VariantInfo {
  id: ShowcaseVariant;
  letter: string;
  name: string;
  tagline: string;
}

/** "champions" = recommended blend (default). A/B/C = the three proposals to compare. */
export const SHOWCASE_VARIANTS: VariantInfo[] = [
  { id: "champions", letter: "★", name: "DELTA Champions", tagline: "Rekomendowany: typografia C + stadion A + karty B" },
  { id: "stadium", letter: "A", name: "Cinematic Stadium", tagline: "Stadion, wolumetryczne reflektory, karty-portrety" },
  { id: "ultimate", letter: "B", name: "Ultimate Team", tagline: "Karty-tarcze w stylu EA FC, duży numer, linie boiska" },
  { id: "barca", letter: "C", name: "Barcelona Showcase", tagline: "Gigantyczne nazwisko i numer za zawodnikiem" },
];

export const DEFAULT_VARIANT: ShowcaseVariant = "champions";

export function parseVariant(raw: string | string[] | null | undefined): ShowcaseVariant {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return SHOWCASE_VARIANTS.some((x) => x.id === v) ? (v as ShowcaseVariant) : DEFAULT_VARIANT;
}

// ---------------- DEMO roster ----------------

/**
 * The first 7 = the same names/numbers as the existing /preview/pack-demo and Showcase 2.0
 * (no new personal data). Everyone beyond that = OBVIOUS placeholders ("Demo Alfa", "Demo Beta", ...),
 * so they cannot be mistaken for real children of the team. A photo ONLY for Ryszard (his own file).
 */
const BASE_DEMO: RosterPlayerRow[] = [
  { id: "demo-p7", display_name: "Ryszard Rybacki", shirt_number: "7", position: "NAP", active: true },
  { id: "demo-p4", display_name: "Aleksander Zieliński", shirt_number: "4", position: "POM", active: true },
  { id: "demo-p9", display_name: "Jakub Kamiński", shirt_number: "9", position: "POM", active: true },
  { id: "demo-p10", display_name: "Mateusz Kowalczyk", shirt_number: "10", position: "POM", active: true },
  { id: "demo-p14", display_name: "Tomasz Lewandowski", shirt_number: "14", position: null, active: true },
  { id: "demo-p19", display_name: "Bartosz Wiśniewski", shirt_number: "19", position: "POM", active: true },
  { id: "demo-p22", display_name: "Filip Szymański", shirt_number: "22", position: null, active: true },
];
const PLACEHOLDER_NAMES = ["Alfa", "Beta", "Gamma", "Epsilon", "Zeta", "Theta", "Jota", "Kappa", "Lambda", "Sigma", "Omega", "Orion", "Vega", "Atlas"];
const PLACEHOLDER_POS = ["BR", "OBR", "OBR", "POM", "NAP", null];

export const DEMO_STATIC_PHOTOS_V3: Record<string, string> = {
  "demo-p7": "/assets/players/ryszard-rybacki.png",
};

export const DEMO_COUNT_OPTIONS = [1, 2, 3, 7, 18] as const;
export const MAX_DEMO_PLAYERS = BASE_DEMO.length + PLACEHOLDER_NAMES.length; // 21

/** Size of the test roster (Preview only): ?count=1|2|7|18; default 7. */
export function parseDemoCount(raw: string | string[] | null | undefined): number {
  const v = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(v) || v < 0) return BASE_DEMO.length;
  return Math.min(MAX_DEMO_PLAYERS, Math.floor(v));
}

export function demoRosterRows(count: number): RosterPlayerRow[] {
  const n = Math.max(0, Math.min(MAX_DEMO_PLAYERS, Math.floor(count)));
  const rows = BASE_DEMO.slice(0, n);
  for (let i = 0; rows.length < n; i += 1) {
    rows.push({
      id: `demo-x${i + 1}`,
      display_name: `Demo ${PLACEHOLDER_NAMES[i]}`,
      shirt_number: String(23 + i),
      position: PLACEHOLDER_POS[i % PLACEHOLDER_POS.length],
      active: true,
    });
  }
  return rows;
}

export function demoRoster(count: number): ShowcasePlayer[] {
  return buildRoster(demoRosterRows(count), DEMO_STATIC_PHOTOS_V3);
}

// ---------------- Dynamic lights ----------------

export interface LightRig {
  /** main beam colour (CSS rgba) */
  beam: string;
  /** accent (glow / typography) */
  accent: string;
  /** side-beam tilt in degrees (left = -tilt, right = +tilt) */
  tilt: number;
  /** "temperature" key: for tests and data-attributes */
  key: "gold" | "red" | "white" | "ember";
}

const RIGS: LightRig[] = [
  { key: "gold", beam: "rgba(255, 214, 120, 0.34)", accent: "#f5c451", tilt: 14 },
  { key: "red", beam: "rgba(255, 92, 72, 0.32)", accent: "#ff5a3c", tilt: 19 },
  { key: "white", beam: "rgba(235, 242, 255, 0.30)", accent: "#e8eefc", tilt: 10 },
  { key: "ember", beam: "rgba(255, 150, 70, 0.32)", accent: "#ff9b45", tilt: 16 },
];

/** By position (when present), otherwise deterministically by id — the same player always lights up the same way. */
export function lightRigFor(player: Pick<ShowcasePlayer, "id" | "positionCode">): LightRig {
  switch (player.positionCode) {
    case "BR": return RIGS[2];   // goalkeeper: white
    case "OBR": return RIGS[0];  // defence: gold
    case "POM": return RIGS[3];  // midfield: ember
    case "NAP": return RIGS[1];  // attack: red
    default: {
      let h = 0;
      for (const ch of player.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return RIGS[h % RIGS.length];
    }
  }
}

// ---------------- Intro ----------------

/** Intro timeline (ms) — the same values drive the CSS animation delays. */
export const INTRO_TIMELINE = {
  crestIn: 200,
  lightsOn: 1100,
  heroIn: 1500,
  typeIn: 1900,
  sidesIn: 2300,
  done: 3100,
} as const;
