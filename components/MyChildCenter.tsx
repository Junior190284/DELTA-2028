"use client";

import React from "react";
import { PlayerCareerHub, type PlayerCareerHubProps } from "./player/PlayerCareerHub";

/**
 * DELTA INFERNO 2.0 — STREFA RODZICA • MOJE DZIECKO
 * Zintegrowane z nowoczesnym Player Career Hub 2.0
 * 
 * Deklaracje obecności RSVP są kierowane ściśle przez zabezpieczone endpointy serwerowe V6E:
 * fetch("/api/matches/attendance", { ... })
 * fetch("/api/training/attendance", { ... })
 * Brak bezpośrednich operacji upsert z poziomu klienta na tabelach frekwencji.
 */
export function MyChildCenter(props: PlayerCareerHubProps) {
  return <PlayerCareerHub {...props} />;
}

export default MyChildCenter;
export { PlayerCareerHub };
export type { PlayerCareerHubProps };
