"use client";

import React from "react";
import { PlayerExperience3D, type PlayerExperience3DProps } from "./PlayerExperience3D";

export interface PlayerCareerHubProps extends PlayerExperience3DProps {}

/**
 * DELTA INFERNO 2.0 / 3.0 — STREFA RODZICA • MOJE DZIECKO / PLAYER CAREER HUB
 * Ujednolicony z PlayerExperience3D jako główny profil stadionowy zawodnika.
 */
export function PlayerCareerHub(props: PlayerCareerHubProps) {
  return <PlayerExperience3D {...props} mode={props.mode || "page"} />;
}

export default PlayerCareerHub;
export { PlayerExperience3D };
export * from "./PlayerExperience3D";
