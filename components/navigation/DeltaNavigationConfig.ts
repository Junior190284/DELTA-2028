/**
 * DELTA INFERNO 2.0 — NAVIGATION CONFIGURATION (ETAP V3)
 * Single Source of Truth for the 4-pillar navigation system:
 * 1. PULPIT (Home / Dashboard)
 * 2. DRUŻYNA (Team / Sport)
 * 3. KOLEKCJA (Cards / Collection / 3D)
 * 4. WIĘCEJ (More / Club / Community / Admin)
 *
 * Preserves all 16 existing tabs and action modals with strict role-based authorization.
 */

import {
  Home,
  Users,
  CalendarDays,
  Sparkles,
  LayoutGrid,
  Zap,
  Trophy,
  Shield,
  UserRound,
  UserCheck,
  Medal,
  History,
  Newspaper,
  Flame,
  Award,
  Crown,
  Target,
  Layers,
  MessageSquare,
  Camera,
  Cake,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type DeltaPrimarySectionId = "home" | "team" | "collection" | "more";

export type DeltaTabId =
  | "home"
  | "mychild"
  | "matchday"
  | "collection"
  | "matches"
  | "calendar"
  | "training"
  | "players"
  | "stats"
  | "hall"
  | "achievements"
  | "chronicle"
  | "news"
  | "club"
  | "league"
  | "teamcenter";

export interface DeltaNavItemConfig {
  id: DeltaTabId | string;
  label: string;
  shortLabel: string;
  desc?: string;
  icon: LucideIcon;
  badge?: string;
  isGoldBadge?: boolean;
  isLiveBadge?: boolean;
  isActionModal?: string;
  requiresParent?: boolean;
  requiresStaff?: boolean;
  requiresAdmin?: boolean;
}

export interface DeltaNavSectionConfig {
  id: DeltaPrimarySectionId;
  label: string;
  shortLabel: string;
  desc: string;
  icon: LucideIcon;
  defaultTab: DeltaTabId;
  items: DeltaNavItemConfig[];
}

export interface DeltaNavContext {
  role?: string;
  isParent?: boolean;
  staff?: boolean;
  isAdmin?: boolean;
  isMatchToday?: boolean;
  isTrainingToday?: boolean;
  unreadNewsCount?: number;
}

/**
 * All 16 tabs organized into the 4 primary pillars.
 */
export function getNavigationSections(ctx: DeltaNavContext): DeltaNavSectionConfig[] {
  const isParent = Boolean(ctx.isParent);
  const staff = Boolean(ctx.staff || ctx.isAdmin);
  const isAdmin = Boolean(ctx.isAdmin);

  return [
    // -------------------------------------------------------------
    // 1. PULPIT (PULPIT GŁÓWNY, CENTRUM DRUŻYNY, MOJE DZIECKO)
    // -------------------------------------------------------------
    {
      id: "home",
      label: "PULPIT",
      shortLabel: "Pulpit",
      desc: "Panel główny i najważniejsze wydarzenia",
      icon: Home,
      defaultTab: "home",
      items: [
        {
          id: "home",
          label: "Pulpit Główny",
          shortLabel: "Główny",
          desc: "Najbliższy mecz, frekwencja i skróty",
          icon: Home,
        },
        {
          id: "teamcenter",
          label: "Centrum Drużyny",
          shortLabel: "Centrum",
          desc: "Frekwencja i status całego zespołu",
          icon: UserCheck,
        },
        ...(isParent
          ? [
              {
                id: "mychild",
                label: "Moje Dziecko",
                shortLabel: "Dziecko",
                desc: "Obecności i rozwój Twojego zawodnika",
                icon: UserRound,
                badge: "RODZIC",
                isGoldBadge: true,
                requiresParent: true,
              },
            ]
          : []),
      ],
    },

    // -------------------------------------------------------------
    // 2. DRUŻYNA (MECZE, TRENING, KALENDARZ, TABELA, SKŁAD, DANE)
    // -------------------------------------------------------------
    {
      id: "team",
      label: "DRUŻYNA",
      shortLabel: "Drużyna",
      desc: "Terminarze, zbiórki, treningi i skład",
      icon: Users,
      defaultTab: "matches",
      items: [
        ...(staff
          ? [
              {
                id: "matchday",
                label: "Match Day LIVE",
                shortLabel: "Mecz Live",
                desc: "Panel meczowy na żywo (składy, minuty, bramki)",
                icon: Flame,
                badge: "LIVE",
                isLiveBadge: true,
                requiresStaff: true,
              },
            ]
          : []),
        {
          id: "matches",
          label: "Mecze & Wyniki",
          shortLabel: "Mecze",
          desc: "Terminarz ligowy, składy i wyniki meczów",
          icon: CalendarDays,
          badge: ctx.isMatchToday ? "DZIŚ" : undefined,
          isLiveBadge: ctx.isMatchToday,
        },
        {
          id: "training",
          label: "Treningi",
          shortLabel: "Trening",
          desc: "Frekwencja, historia gierek i ranking",
          icon: Zap,
          badge: ctx.isTrainingToday ? "DZIŚ" : undefined,
          isLiveBadge: ctx.isTrainingToday,
        },
        {
          id: "players",
          label: "Skład Drużyny",
          shortLabel: "Skład",
          desc: "Profile zawodników i karty zawodnicze",
          icon: Users,
        },
        {
          id: "league",
          label: "Rozgrywki / Tabela",
          shortLabel: "Tabela",
          desc: "Tabela grupy MZPN i mecze rywali",
          icon: Trophy,
        },
        {
          id: "calendar",
          label: "Kalendarz",
          shortLabel: "Kalendarz",
          desc: "Zbiórki, wydarzenia klubowe i terminy",
          icon: CalendarDays,
        },
        {
          id: "stats",
          label: "Statystyki Drużyny",
          shortLabel: "Statystyki",
          desc: "Bramki, asysty, minuty i wykresy",
          icon: TrendingUp,
        },
      ],
    },

    // -------------------------------------------------------------
    // 3. KOLEKCJA (KARTY 3D, PACZKI, TROFEA, HALL OF FAME)
    // -------------------------------------------------------------
    {
      id: "collection",
      label: "KOLEKCJA",
      shortLabel: "Kolekcja",
      desc: "Strefa Kart 3D, album i trofea",
      icon: Sparkles,
      defaultTab: "collection",
      items: [
        {
          id: "collection",
          label: "Kolekcja Kart 3D",
          shortLabel: "Karty 3D",
          desc: "Klaser kart, sklep z paczkami i album",
          icon: Sparkles,
          badge: "3D INFERNO",
          isGoldBadge: true,
        },
        {
          id: "achievements",
          label: "Sala Trofeów",
          shortLabel: "Trofea",
          desc: "Puchary, odznaki i 30 misji klubowych",
          icon: Trophy,
          badge: "NAGRODY",
          isGoldBadge: true,
        },
        {
          id: "hall",
          label: "Hall of Fame",
          shortLabel: "Legendy",
          desc: "Klubowe legendy i rekordy sezonu",
          icon: Medal,
        },
        {
          id: "chronicle",
          label: "Kronika Meczowa",
          shortLabel: "Kronika",
          desc: "Historia rozegranych spotkań i podsumowania",
          icon: History,
        },
      ],
    },

    // -------------------------------------------------------------
    // 4. WIĘCEJ (AKTUALNOŚCI, KLUB, SPOŁECZNOŚĆ, MODALE, ADMIN)
    // -------------------------------------------------------------
    {
      id: "more",
      label: "WIĘCEJ",
      shortLabel: "Więcej",
      desc: "Aktualności, społeczność, gry i narzędzia",
      icon: LayoutGrid,
      defaultTab: "news",
      items: [
        {
          id: "news",
          label: "Aktualności Drużyny",
          shortLabel: "Newsy",
          desc: "Wiadomości z życia drużyny i ogłoszenia",
          icon: Newspaper,
          badge:
            (ctx.unreadNewsCount ?? 0) > 0
              ? String(ctx.unreadNewsCount)
              : undefined,
          isLiveBadge: (ctx.unreadNewsCount ?? 0) > 0,
        },
        {
          id: "club",
          label: "Z Klubu DELTA",
          shortLabel: "Klub",
          desc: "Oficjalny feed ze strony głównej DELTA",
          icon: Shield,
        },
        // Quick Action Modals
        {
          id: "modal:coach-corner",
          label: "Kącik Trenera",
          shortLabel: "Trener",
          desc: "Wyzwania Skill Master, zadania domowe",
          icon: Award,
          badge: "SKILL",
          isGoldBadge: true,
          isActionModal: "coachcorner",
        },
        {
          id: "modal:social-feed",
          label: "Feed Społeczności",
          shortLabel: "Tablica",
          desc: "Oficjalne ogłoszenia, wyróżnienia i doping",
          icon: MessageSquare,
          isActionModal: "socialfeed",
        },
        {
          id: "modal:photobooth",
          label: "Foto-Budka DELTA",
          shortLabel: "Foto",
          desc: "Kreator relacji Instagram i grafik drużyny",
          icon: Camera,
          badge: "HD",
          isActionModal: "photobooth",
        },
        {
          id: "modal:birthday",
          label: "Strefa Urodzin",
          shortLabel: "Urodziny",
          desc: "Świętujemy urodziny zawodników",
          icon: Cake,
          isActionModal: "birthday",
        },
        {
          id: "modal:typer",
          label: "Klubowy Typer",
          shortLabel: "Typer",
          desc: "Typuj wyniki spotkań i zbieraj DP",
          icon: Crown,
          badge: "DP",
          isGoldBadge: true,
          isActionModal: "typer",
        },
        {
          id: "modal:trading",
          label: "Giełda Wymian Kart",
          shortLabel: "Giełda",
          desc: "Bezpieczna wymiana duplikatów 1-za-1",
          icon: Layers,
          badge: "TRADE",
          isGoldBadge: true,
          isActionModal: "trading",
        },
        {
          id: "modal:missions",
          label: "Centrum Misji",
          shortLabel: "Misje",
          desc: "Zadania dzienne i nagrody XP",
          icon: Target,
          badge: "XP",
          isGoldBadge: true,
          isActionModal: "missions",
        },
      ],
    },
  ];
}

/**
 * Maps any of the 16 active tabs to its parent top-level section.
 */
export function mapTabToSection(tab: DeltaTabId): DeltaPrimarySectionId {
  switch (tab) {
    case "home":
    case "teamcenter":
    case "mychild":
      return "home";

    case "matches":
    case "matchday":
    case "training":
    case "players":
    case "league":
    case "calendar":
    case "stats":
      return "team";

    case "collection":
    case "achievements":
    case "hall":
    case "chronicle":
      return "collection";

    case "news":
    case "club":
      return "more";

    default:
      return "home";
  }
}

/**
 * Returns the list of subtabs for a section, taking role permissions into account.
 */
export function getSectionSubtabs(
  sectionId: DeltaPrimarySectionId,
  ctx: DeltaNavContext
): DeltaNavItemConfig[] {
  const sections = getNavigationSections(ctx);
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return [];
  // For subnav pill bars, only return direct tabs (not action modals)
  return section.items.filter((item) => !item.id.startsWith("modal:"));
}
