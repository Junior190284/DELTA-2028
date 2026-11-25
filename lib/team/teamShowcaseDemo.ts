/**
 * DELTA INFERNO — P14A: demo roster for /preview/team-showcase-v2 (when nobody is logged in).
 * The same names and numbers as the existing /preview/pack-demo (no new personal data).
 * A photo ONLY for Ryszard Rybacki (his own file); everyone else gets the silhouette
 * + "ZDJĘCIE WKRÓTCE". Positions only where the demo has them (null = not shown).
 */
import type { RosterPlayerRow } from "./teamShowcase";

export const DEMO_ROSTER: RosterPlayerRow[] = [
  { id: "demo-p7", display_name: "Ryszard Rybacki", shirt_number: "7", position: "NAP", photo_path: null, active: true },
  { id: "demo-p4", display_name: "Aleksander Zieliński", shirt_number: "4", position: "POM", photo_path: null, active: true },
  { id: "demo-p9", display_name: "Jakub Kamiński", shirt_number: "9", position: "POM", photo_path: null, active: true },
  { id: "demo-p10", display_name: "Mateusz Kowalczyk", shirt_number: "10", position: "POM", photo_path: null, active: true },
  { id: "demo-p14", display_name: "Tomasz Lewandowski", shirt_number: "14", position: null, photo_path: null, active: true },
  { id: "demo-p19", display_name: "Bartosz Wiśniewski", shirt_number: "19", position: "POM", photo_path: null, active: true },
  { id: "demo-p22", display_name: "Filip Szymański", shirt_number: "22", position: null, photo_path: null, active: true },
];

/** Static photos in the demo: only the player's own file. */
export const DEMO_STATIC_PHOTOS: Record<string, string> = {
  "demo-p7": "/assets/players/ryszard-rybacki.png",
};

/**
 * DELTA-045C: Strictly neutral demo roster for Team Showcase 2.0.
 * Zero real children's names, compliant with DELTA-014 PII protection rules.
 */
export const NEUTRAL_SHOWCASE_ROSTER: RosterPlayerRow[] = [
  { id: "demo-a", display_name: "Zawodnik Alfa", shirt_number: "7", position: "NAP", photo_path: null, active: true },
  { id: "demo-b", display_name: "Zawodnik Beta", shirt_number: "4", position: "POM", photo_path: null, active: true },
  { id: "demo-c", display_name: "Zawodnik Gamma", shirt_number: "9", position: "POM", photo_path: null, active: true },
  { id: "demo-d", display_name: "Zawodnik Delta", shirt_number: "10", position: "POM", photo_path: null, active: true },
  { id: "demo-e", display_name: "Zawodnik Epsilon", shirt_number: "14", position: "OBR", photo_path: null, active: true },
  { id: "demo-f", display_name: "Zawodnik Dzeta", shirt_number: "19", position: "POM", photo_path: null, active: true },
  { id: "demo-g", display_name: "Zawodnik Eta", shirt_number: "22", position: "BR", photo_path: null, active: true },
];

