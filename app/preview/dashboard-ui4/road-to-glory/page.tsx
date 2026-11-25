"use client";

import React, { useMemo } from "react";
import "@/components/dashboard/ui4/dashboard-ui4.css";
import "@/components/dashboard/ui4/road-to-glory/road-to-glory.css";
import "@/components/team-showcase-2/team-showcase-2.css";
import { createDashboardUI4Model, type DashboardUI4AdapterInput } from "@/components/dashboard/ui4";
import { RoadToGloryDashboard } from "@/components/dashboard/ui4/road-to-glory/road-to-glory-dashboard";

const demoRoadToGloryInput: DashboardUI4AdapterInput = {
  profile: {
    id: "demo-player-alpha",
    role: "player",
    display_name: "Zawodnik Alfa",
  },
  teamName: "Drużyna Testowa U-9",
  access: {
    canViewCollection: true,
    canViewAchievements: true,
    canViewTeamShowcase: true,
    canViewClubCommunications: true,
  },
  players: [
    { id: "demo-player-alpha", display_name: "Zawodnik Alfa", shirt_number: 11, position: "Napastnik", active: true },
  ],
  nextMatch: {
    id: "demo-match-1",
    title: "Drużyna Testowa vs Drużyna Rywala",
    starts_at: "2026-11-28T10:30:00.000Z",
    location: "Centrum Treningowe (Boisko Testowe)",
    opponent: "Drużyna Rywala",
  },
  nextMatchCountdown: "ZA 2 DNI",
  gameProfile: {
    currentXP: 2450,
    seasonXP: 2450,
    levelInfo: {
      level: 12,
      currentLevelXP: 350,
      nextLevelXP: 600,
      progressPercent: 58,
      title: "Zawodnik Elity",
    },
    activityStreak: 7,
    maxStreak: 14,
    unopenedPacks: 3,
  },
  isAuthoritativeCatalog: true,
  allCards: [
    { id: "c-1", name: "Karta Kolekcjonerska Alfa (Inferno)", rarity: "inferno" },
    { id: "c-2", name: "Karta Kolekcjonerska Beta (Gold)", rarity: "legendary" },
    { id: "c-3", name: "Karta Kolekcjonerska Gamma (Matchday)", rarity: "rare" },
    { id: "c-4", name: "Karta Bazowa Testowa", rarity: "common" },
  ],
  userCards: [
    {
      id: "uc-1",
      card_definition_id: "c-1",
      quantity: 1,
      acquired_at: "2026-11-24T12:00:00.000Z",
      card_definition: {
        id: "c-1",
        name: "Karta Kolekcjonerska Alfa",
        rarity: "inferno",
        card_type: "INFERNO",
        card_number: 11,
        player: { id: "demo-player-alpha", display_name: "Zawodnik Alfa", shirt_number: 11, position: "NAP" },
      },
    },
    {
      id: "uc-2",
      card_definition_id: "c-2",
      quantity: 1,
      acquired_at: "2026-11-23T12:00:00.000Z",
      card_definition: {
        id: "c-2",
        name: "Karta Kolekcjonerska Beta",
        rarity: "legendary",
        card_type: "GOLD_MASTER",
        card_number: 8,
        player: { id: "demo-player-beta", display_name: "Zawodnik Beta", shirt_number: 8, position: "POM" },
      },
    },
    {
      id: "uc-3",
      card_definition_id: "c-3",
      quantity: 1,
      acquired_at: "2026-11-22T12:00:00.000Z",
      card_definition: {
        id: "c-3",
        name: "Karta Kolekcjonerska Gamma",
        rarity: "rare",
        card_type: "MATCHDAY_HERO",
        card_number: 4,
        player: { id: "demo-player-gamma", display_name: "Zawodnik Gamma", shirt_number: 4, position: "OBR" },
      },
    },
  ],
  achievements: [
    { id: "a-1", name: "Debiutant", description: "Pierwszy trening", icon: "Trophy", isUnlocked: true },
    { id: "a-2", name: "Snajper", description: "Aktywność w meczach", icon: "Zap", isUnlocked: true },
  ],
  news: [
    {
      id: "comm-1",
      title: "Plan treningów na najbliższy tydzień",
      summary: "Harmonogram zajęć rocznika U-9",
      published_at: "2026-11-24T10:00:00.000Z",
      urgent: true,
    },
    {
      id: "comm-2",
      title: "Nowe stroje meczowe gotowe do odbioru",
      summary: "Odbiór w szatni przed treningiem",
      published_at: "2026-11-23T15:00:00.000Z",
      urgent: false,
    },
    {
      id: "comm-3",
      title: "Podsumowanie sobotniego turnieju demo",
      summary: "Dziękujemy wszystkim zawodnikom i rodzicom",
      published_at: "2026-11-22T18:00:00.000Z",
      urgent: false,
    },
  ],
};

export default function RoadToGloryDemoPage() {
  const model = useMemo(() => createDashboardUI4Model(demoRoadToGloryInput), []);
  return <RoadToGloryDashboard model={model} mode="demo" />;
}
