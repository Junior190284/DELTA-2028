import type { CardDefinition } from "./types.ts";

export interface RarityTier {
  id: "common" | "rare" | "gold" | "matchday" | "inferno" | "legend";
  label: string;
  color: string;
  textColor: string;
  badgeBg: string;
  borderColor: string;
  glow: string;
}

export function getRarityTier(card?: CardDefinition): RarityTier {
  if (!card) {
    return {
      id: "common",
      label: "COMMON",
      color: "#94a3b8",
      textColor: "#e2e8f0",
      badgeBg: "rgba(148, 163, 184, 0.15)",
      borderColor: "rgba(148, 163, 184, 0.4)",
      glow: "rgba(148, 163, 184, 0.2)"
    };
  }

  const r = (card.rarity || "").toLowerCase();
  const t = (card.card_type || "").toLowerCase();

  if (r === "inferno" || t.includes("inferno")) {
    return {
      id: "inferno",
      label: "INFERNO",
      color: "#ef4444",
      textColor: "#fca5a5",
      badgeBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(249, 115, 22, 0.25))",
      borderColor: "rgba(239, 68, 68, 0.7)",
      glow: "rgba(239, 68, 68, 0.5)"
    };
  }
  if (r === "legendary" || r === "legend" || t.includes("legend") || t.includes("ikona")) {
    return {
      id: "legend",
      label: "LEGEND",
      color: "#c084fc",
      textColor: "#f3e8ff",
      badgeBg: "linear-gradient(135deg, rgba(192, 132, 252, 0.25), rgba(126, 34, 206, 0.3))",
      borderColor: "rgba(192, 132, 252, 0.7)",
      glow: "rgba(192, 132, 252, 0.5)"
    };
  }
  if (r === "gold" || r === "epic" || t.includes("gold") || t.includes("mvp")) {
    return {
      id: "gold",
      label: "GOLD",
      color: "#f1c95c",
      textColor: "#fef08a",
      badgeBg: "linear-gradient(135deg, rgba(241, 201, 92, 0.25), rgba(202, 138, 4, 0.3))",
      borderColor: "rgba(241, 201, 92, 0.7)",
      glow: "rgba(241, 201, 92, 0.5)"
    };
  }
  if (r === "matchday" || t.includes("matchday")) {
    return {
      id: "matchday",
      label: "MATCHDAY",
      color: "#38bdf8",
      textColor: "#bae6fd",
      badgeBg: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.25))",
      borderColor: "rgba(56, 189, 248, 0.7)",
      glow: "rgba(56, 189, 248, 0.4)"
    };
  }
  if (r === "rare" || t.includes("training") || t.includes("warrior")) {
    return {
      id: "rare",
      label: "RARE",
      color: "#60a5fa",
      textColor: "#bfdbfe",
      badgeBg: "linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(37, 99, 235, 0.25))",
      borderColor: "rgba(96, 165, 250, 0.6)",
      glow: "rgba(96, 165, 250, 0.3)"
    };
  }
  return {
    id: "common",
    label: "COMMON",
    color: "#94a3b8",
    textColor: "#e2e8f0",
    badgeBg: "rgba(148, 163, 184, 0.15)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    glow: "rgba(148, 163, 184, 0.2)"
  };
}
