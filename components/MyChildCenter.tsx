"use client";

import React from "react";
import { PlayerExperience3D, PlayerCareerHub, type PlayerExperience3DProps } from "./player/PlayerExperience3D";

/**
 * DELTA INFERNO 3.0 — STREFA RODZICA • MOJE DZIECKO
 * Zintegrowane z ujednoliconym modułem PlayerExperience3D.
 * 
 * Deklaracje obecności RSVP są kierowane ściśle przez zabezpieczone endpointy serwerowe V6E:
 * fetch("/api/matches/attendance", { ... })
 * fetch("/api/training/attendance", { ... })
 * Brak bezpośrednich operacji upsert z poziomu klienta na tabelach frekwencji.
 */
export function MyChildCenter(props: PlayerExperience3DProps) {
  return <PlayerExperience3D {...props} mode={props.mode || "page"} />;
}

export default MyChildCenter;
export { PlayerCareerHub };
export { PlayerExperience3D };
export type { PlayerExperience3DProps, PlayerExperience3DProps as PlayerCareerHubProps } from "./player/PlayerExperience3D";
