"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  UserCheck, 
  Sparkles, 
  CalendarDays, 
  MapPin, 
  Check, 
  X, 
  HelpCircle, 
  Download, 
  Zap, 
  Shirt, 
  CheckSquare, 
  Square, 
  Trophy, 
  Dumbbell, 
  Award, 
  Flame, 
  Layers, 
  BarChart3, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  ChevronLeft,
  Info,
  Target,
  RotateCw,
  Eye,
  Shield
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculatePlayerAchievements } from "@/lib/achievements/engine";
import { fromProductionCard } from "@/components/collection-3d/adapter";
import { Card3DEngine } from "@/components/collection-3d/Card3DEngine";
import PlayerPhoto from "@/components/PlayerPhoto";
import PlayerSkillRadar from "@/components/PlayerSkillRadar";
import AchievementsHub from "@/components/AchievementsHub";
import CareerTimeline from "./CareerTimeline";
import PlayerInfernoCards from "./PlayerInfernoCards";
import DynamicStadiumExperience, { type StadiumVariant } from "./DynamicStadiumExperience";
import { 
  calculateStadiumProgression, 
  type StadiumProgressionResult, 
  STADIUM_TIERS, 
  type StadiumTierId 
} from "@/lib/stadium/progression";
import "./player-career-hub.css";

export interface Player {
  id: string;
  display_name: string;
  shirt_number?: number | string | null;
  position?: string | null;
  photo_path?: string | null;
  active?: boolean;
}

export interface Stat {
  m: number;
  starts: number;
  captain: number;
  g: number;
  a: number;
  mvp: number;
}

export interface TrainingStat {
  sessions: number;
  goals: number;
  assists: number;
  ga: number;
  attendanceStreak: number;
  games: number;
  wins: number;
}

export interface Match {
  id: string;
  match_date: string;
  match_time?: string | null;
  home_team: string;
  away_team: string;
  home_score?: number | null;
  away_score?: number | null;
  venue?: string | null;
  status: string;
}

export interface Attendance {
  match_id: string;
  player_id: string;
  status: string;
}

export interface Event {
  id: string;
  match_id: string;
  player_id: string;
  assist_player_id?: string | null;
  event_type: string;
  minute?: number | null;
}

export interface TrainingSession {
  id: string;
  training_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  title?: string | null;
}

export interface TrainingAttendance {
  training_id: string;
  player_id: string;
  status: string;
}

export interface Pair {
  a: Player;
  b: Player;
  games: number;
  score: number;
}

export interface PlayerExperience3DProps {
  // Tryb wyświetlania: "modal" (pełnoekranowy portal) lub "page" (wbudowany w widok)
  mode?: "modal" | "page";
  isOpen?: boolean;
  onClose?: () => void;

  // Wybrany zawodnik (opcjonalny - w trybie modal wskazuje klikniętego zawodnika)
  player?: Player | null;
  initialPlayerId?: string;

  // Pełna lista zawodników kadry
  players: Player[];

  // Identyfikatory zawodników powiązanych z zalogowanym rodzicem (z tabeli parent_players)
  parentPlayerIds?: string[];

  // Statystyki z oficjalnych meczów MZPN
  stats: Record<string, any>;

  // Statystyki z treningów i gier wewnętrznych
  trainingStats: Record<string, any>;

  // Mecze i frekwencja
  matches: any[];
  attendance: any[];
  events: any[];

  // Sesje treningowe i frekwencja
  trainingSessions: any[];
  trainingAttendance: any[];

  // Chemia i partnerstwa z treningów
  chemistry?: any[];

  // Zdarzenia nawigacyjne
  onOpenMatch?: (m: any, tab?: any) => void;
  onOpenPlayer?: (p: any) => void;

  // Początkowa zakładka
  initialTab?: "overview" | "career" | "stats" | "achievements" | "cards";
}

const CHECKLIST_ITEMS = [
  { id: "guards", label: "Ochraniacze na piszczele", icon: "🛡️" },
  { id: "kit", label: "Meczowy strój DELTA + czarne getry", icon: "👕" },
  { id: "bottle", label: "Podpisany bidon z czystą wodą", icon: "💧" },
  { id: "boots", label: "Wyczyszczone korki / turfy", icon: "👟" },
  { id: "dryclothes", label: "Sucha odzież i bluza na zmianę po meczu", icon: "🧥" },
  { id: "snack", label: "Lekka przekąska (banan / batonik owocowy)", icon: "🍌" }
];

export function PlayerExperience3D({
  mode = "page",
  isOpen = true,
  onClose,
  player: propPlayer,
  initialPlayerId,
  players,
  parentPlayerIds = [],
  stats,
  trainingStats,
  matches,
  attendance,
  events,
  trainingSessions,
  trainingAttendance,
  chemistry = [],
  onOpenMatch,
  onOpenPlayer,
  initialTab = "overview"
}: PlayerExperience3DProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [playerIntro, setPlayerIntro] = useState(mode === "modal");

  useEffect(() => {
    setMounted(true);
    if (mode === "modal") {
      const timer = window.setTimeout(() => setPlayerIntro(false), 1100);
      return () => window.clearTimeout(timer);
    }
  }, [mode]);

  // Lista dzieci przypisanych do zalogowanego konta rodzica
  const children = useMemo(() => {
    return players.filter(p => parentPlayerIds.includes(p.id));
  }, [players, parentPlayerIds]);

  // Stan wybranego dziecka (dla strefy rodzica)
  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    if (propPlayer) return propPlayer.id;
    if (initialPlayerId && players.some(p => p.id === initialPlayerId)) return initialPlayerId;
    return children[0]?.id || players[0]?.id || "";
  });

  // Synchronizacja przy zmianie propPlayer
  useEffect(() => {
    if (propPlayer) {
      setSelectedChildId(propPlayer.id);
      setPlayerIntro(mode === "modal");
      if (mode === "modal") {
        const timer = window.setTimeout(() => setPlayerIntro(false), 1100);
        return () => window.clearTimeout(timer);
      }
    }
  }, [propPlayer, mode]);

  // Ustalenie aktywnego zawodnika do wyświetlenia
  const activeChild = useMemo(() => {
    if (propPlayer) return propPlayer;
    if (children.length > 0) {
      return children.find(c => c.id === selectedChildId) || children[0];
    }
    return players.find(p => p.id === selectedChildId) || players[0] || null;
  }, [propPlayer, children, players, selectedChildId]);

  // Sprawdzenie, czy zalogowany użytkownik jest opiekunem aktualnie wyświetlanego zawodnika
  const isParentOfActivePlayer = useMemo(() => {
    return Boolean(activeChild && parentPlayerIds.includes(activeChild.id));
  }, [activeChild, parentPlayerIds]);

  // 5 zakładek zgodnie z projektem
  const [activeTab, setActiveTab] = useState<"overview" | "career" | "stats" | "achievements" | "cards">(initialTab);

  // Blokada scrolla w trybie modalnym + obsługa klawisza Escape
  useEffect(() => {
    if (mode !== "modal" || !isOpen) return;

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mode, isOpen, onClose]);

  // Lokalne kopie obecności (do natychmiastowego optymistycznego UI)
  const [localAttendance, setLocalAttendance] = useState<Attendance[]>(attendance);
  const [localTrAttendance, setLocalTrAttendance] = useState<TrainingAttendance[]>(trainingAttendance);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  // Karty kolekcjonerskie z bazy Supabase
  const [cards, setCards] = useState<any[]>([]);
  const [userCards, setUserCards] = useState<any[]>([]);

  useEffect(() => {
    setLocalAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    setLocalTrAttendance(trainingAttendance);
  }, [trainingAttendance]);

  // Wczytanie checklisty z localStorage (tylko dla rodzica)
  useEffect(() => {
    if (!activeChild || !isParentOfActivePlayer) return;
    try {
      const saved = localStorage.getItem(`delta_prematch_checklist_${activeChild.id}`);
      if (saved) {
        setChecklist(JSON.parse(saved));
      } else {
        setChecklist({});
      }
    } catch {}
  }, [activeChild, isParentOfActivePlayer]);

  // Pobieranie kart i posiadania z Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadCardsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: defs } = await supabase
          .from("card_definitions")
          .select("*")
          .eq("is_active", true);

        if (isMounted && defs) {
          setCards(defs);
        }

        if (user) {
          const { data: uCards } = await supabase
            .from("user_cards")
            .select("*")
            .eq("user_id", user.id);

          if (isMounted && uCards) {
            setUserCards(uCards);
          }
        }
      } catch (err) {
        console.warn("Błąd ładowania kart w PlayerExperience3D:", err);
      }
    }

    loadCardsData();
    return () => { isMounted = false; };
  }, [supabase]);

  // Jeśli brak aktywnego dziecka w strefie rodzica (brak przypisania w parent_players)
  if (!activeChild) {
    const emptyContent = (
      <section className="section v7b-career-hub-container">
        <div className="v7b-empty-state-card devil-card">
          <UserCheck size={48} className="text-yellow-400" />
          <h2>Strefa Rodzica • Moje Dziecko</h2>
          <p>
            Administrator lub trener nie przypisał jeszcze zawodnika do Twojego konta rodzica.
            Skontaktuj się ze sztabem szkoleniowym K.S. Delta Warszawa, aby aktywować pełny profil piłkarski.
          </p>
        </div>
      </section>
    );

    if (mode === "modal" && mounted) {
      return createPortal(
        <section className="v111-player-screen v112-player-screen" role="dialog" aria-modal="true">
          <div className="v111-player-scroll">
            <div className="v111-profile-container">
              <header className="v111-profile-toolbar v112-toolbar">
                <button type="button" className="v111-profile-back" onClick={onClose}>
                  <ChevronLeft size={19} /> Wróć
                </button>
              </header>
              {emptyContent}
            </div>
          </div>
        </section>,
        document.body
      );
    }
    return emptyContent;
  }

  // Statystyki sportowe aktywnego zawodnika
  const s: Stat = stats[activeChild.id] || { m: 0, starts: 0, captain: 0, g: 0, a: 0, mvp: 0 };
  const t: TrainingStat = trainingStats[activeChild.id] || { sessions: 0, goals: 0, assists: 0, ga: 0, attendanceStreak: 0, games: 0, wins: 0 };

  // WYLICZENIE INDYWIDUALNEGO XP SPORTOWEGO (V7F.1B Integrity & Priority Rule)
  // 1. Treningi (+40 XP): wyłącznie status "present" zatwierdzony przez trenera na odbytej sesji (data <= dziś).
  //    Użycie Set<string> gwarantuje naliczenie dokładnie jeden raz na unikalną sesję.
  const presentTrainings = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pastOrTodayTrainingIds = new Set(
      (trainingSessions || [])
        .filter(tr => tr?.training_date && String(tr.training_date).slice(0, 10) <= todayStr)
        .map(tr => tr.id)
    );

    const verifiedTrainingIds = new Set<string>();
    localTrAttendance.forEach(a => {
      if (a.player_id !== activeChild.id) return;
      if (a.status !== "present") return;
      if (trainingSessions && trainingSessions.length > 0) {
        if (pastOrTodayTrainingIds.has(a.training_id)) {
          verifiedTrainingIds.add(a.training_id);
        }
      } else {
        verifiedTrainingIds.add(a.training_id);
      }
    });

    return verifiedTrainingIds.size;
  }, [localTrAttendance, activeChild.id, trainingSessions]);

  // 2. Mecze (+60 XP): wyłącznie rozegrane mecze ligowe (status === "played") z potwierdzonym udziałem.
  //    REGUŁA PRIORYTETU: Wyraźna nieobecność od trenera (status === 'absent') ma bezwzględny priorytet
  //    i wyklucza zaliczenie meczu, nawet w razie sprzecznego lub omyłkowego wpisu w match_events!
  const presentMatches = useMemo(() => {
    const played = (matches || []).filter(m => m.status === "played");
    if (played.length === 0) return 0;

    const verifiedMatchIds = new Set<string>();
    played.forEach(m => {
      const att = localAttendance.find(
        a => a.match_id === m.id && a.player_id === activeChild.id
      );

      // KRYTYCZNA REGUŁA PRIORYTETU: 'absent' wyklucza przyznanie XP
      if (att && att.status === "absent") {
        return;
      }

      const hasPresentAtt = att && att.status === "present";
      const hasVerifiedEvent = (events || []).some(
        e => e.match_id === m.id &&
          ((e.player_id === activeChild.id && (e.event_type === "goal" || e.event_type === "mvp")) ||
           (e.assist_player_id === activeChild.id && e.event_type === "goal"))
      );

      if (hasPresentAtt || hasVerifiedEvent) {
        verifiedMatchIds.add(m.id);
      }
    });

    return verifiedMatchIds.size;
  }, [matches, localAttendance, events, activeChild.id]);

  const individualAttendanceXp = (presentTrainings * 40) + (presentMatches * 60);
  const playerLevel = Math.max(1, Math.floor(individualAttendanceXp / 250) + 1);
  const currentLvlXp = individualAttendanceXp % 250;
  const neededLvlXp = 250;
  const progressPercent = Math.min(100, Math.round((currentLvlXp / neededLvlXp) * 100));

  // SILNIK PROGRESJI STADIONOWEJ V7F.1B
  const stadiumProgression: StadiumProgressionResult = useMemo(
    () => calculateStadiumProgression(individualAttendanceXp),
    [individualAttendanceXp]
  );

  // Duet chemii z zespołem
  const pair = chemistry.find(x => x.a.id === activeChild.id || x.b.id === activeChild.id);
  const partner = pair ? (pair.a.id === activeChild.id ? pair.b : pair.a) : null;

  // Harmonogram nadchodzących meczów i treningów
  const upcomingMatches = matches
    .filter(m => m.status === "scheduled" || m.status === "upcoming")
    .sort((a, b) => a.match_date.localeCompare(b.match_date))
    .slice(0, 2);

  const upcomingTrainings = trainingSessions
    .filter(tr => new Date(tr.training_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.training_date.localeCompare(b.training_date))
    .slice(0, 2);

  const recentPlayedMatches = matches
    .filter(m => m.status === "played")
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, 5);

  const maxGoalsSingleMatch = useMemo(() => {
    let max = 0;
    matches.forEach(m => {
      const g = events.filter(e => e.match_id === m.id && e.player_id === activeChild.id && e.event_type === "goal").length;
      if (g > max) max = g;
    });
    return max;
  }, [matches, events, activeChild.id]);

  // 3D Card inspection modal dla Hero
  const [heroInspectedCard, setHeroInspectedCard] = useState<any | null>(null);
  const [heroIsFlipped, setHeroIsFlipped] = useState(false);
  const [heroAutoRotate, setHeroAutoRotate] = useState(false);

  // Wariant stadionu V7E.2 (Tryb demo) oraz pełnoekranowa prezentacja
  const [stadiumVariant, setStadiumVariant] = useState<StadiumVariant>("debiutant");
  const [isFullscreenStadiumOpen, setIsFullscreenStadiumOpen] = useState(false);

  // Wyróżniona karta INFERNO zawodnika
  const featuredCard = useMemo(() => {
    const childCards = cards.filter(c => c.player_id === activeChild.id);
    if (childCards.length > 0) {
      const owned = childCards.find(c => userCards.some(uc => uc.card_id === c.id));
      return owned || childCards[0];
    }
    return {
      id: `card-base-${activeChild.id}`,
      player_id: activeChild.id,
      card_name: `${activeChild.display_name} — DELTA INFERNO`,
      card_type: "base",
      rarity: "inferno",
      season: "2026/27",
      glow_color: "#f6c952",
      badge_color: "#ff202b"
    };
  }, [cards, userCards, activeChild]);

  const isFeaturedCardOwned = useMemo(() => {
    return userCards.some(uc => uc.card_id === featuredCard.id);
  }, [userCards, featuredCard]);

  const heroCard3DData = useMemo(() => {
    if (!heroInspectedCard) return null;
    const enrichedCard = {
      ...heroInspectedCard,
      name: heroInspectedCard.card_name || heroInspectedCard.title || `${activeChild.display_name} — ${heroInspectedCard.card_type}`,
      player: {
        id: activeChild.id,
        display_name: activeChild.display_name,
        shirt_number: activeChild.shirt_number,
        position: activeChild.position
      }
    };
    return fromProductionCard(enrichedCard, {
      ovr: Math.min(99, Math.max(78, 80 + Math.min(15, s.g + s.a + Math.floor(t.sessions / 3))))
    });
  }, [heroInspectedCard, activeChild, s.g, s.a, t.sessions]);

  // Osiągnięcia zawodnika i najbliższy cel
  const playerAchievements = useMemo(() => {
    return calculatePlayerAchievements(activeChild.id, stats, trainingStats, maxGoalsSingleMatch);
  }, [activeChild.id, stats, trainingStats, maxGoalsSingleMatch]);

  const nextObjective = useMemo(() => {
    const inProgress = playerAchievements.filter(a => !a.isUnlocked && a.current > 0).sort((a, b) => b.percent - a.percent);
    if (inProgress.length > 0) return inProgress[0];
    const locked = playerAchievements.filter(a => !a.isUnlocked);
    return locked[0] || null;
  }, [playerAchievements]);

  // 1-Click RSVP na mecz
  const handleMatchRsvp = async (matchId: string, newStatus: "yes" | "no" | "maybe") => {
    if (!isParentOfActivePlayer) return;
    setRsvpLoading(`match-${matchId}`);
    try {
      const res = await fetch("/api/matches/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, playerId: activeChild.id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setLocalAttendance(prev => {
          const filtered = prev.filter(a => !(a.match_id === matchId && a.player_id === activeChild.id));
          return [...filtered, { match_id: matchId, player_id: activeChild.id, status: newStatus }];
        });
      } else {
        console.error("Błąd RSVP meczu:", data.error);
      }
    } catch (err) {
      console.error("Błąd RSVP meczu:", err);
    } finally {
      setRsvpLoading(null);
    }
  };

  // 1-Click RSVP na trening
  const handleTrainingRsvp = async (trainingId: string, newStatus: "yes" | "no" | "maybe") => {
    if (!isParentOfActivePlayer) return;
    setRsvpLoading(`training-${trainingId}`);
    try {
      const res = await fetch("/api/training/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingId, playerId: activeChild.id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setLocalTrAttendance(prev => {
          const filtered = prev.filter(a => !(a.training_id === trainingId && a.player_id === activeChild.id));
          return [...filtered, { training_id: trainingId, player_id: activeChild.id, status: newStatus }];
        });
      } else {
        console.error("Błąd RSVP treningu:", data.error);
      }
    } catch (err) {
      console.error("Błąd RSVP treningu:", err);
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleToggleChecklist = (itemId: string) => {
    if (!isParentOfActivePlayer) return;
    const updated = {
      ...checklist,
      [itemId]: !checklist[itemId]
    };
    setChecklist(updated);
    try {
      localStorage.setItem(`delta_prematch_checklist_${activeChild.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Pobranie pamiątkowej oficjalnej karty (canvas)
  const handleDownloadPlayerCard = async () => {
    setDownloadingCard(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1680;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bgGrad = ctx.createRadialGradient(600, 700, 50, 600, 840, 950);
      bgGrad.addColorStop(0, "#1f0a10");
      bgGrad.addColorStop(0.4, "#0f0508");
      bgGrad.addColorStop(1, "#030407");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1680);

      ctx.strokeStyle = "#e2b94f";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, 1120, 1600);

      ctx.strokeStyle = "rgba(226, 46, 48, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(52, 52, 1096, 1576);

      ctx.fillStyle = "rgba(246, 201, 82, 0.9)";
      ctx.font = "900 24px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("K.S. DELTA WARSZAWA  •  ROCZNIK 2018 GÓRNY MOKOTÓW", 600, 105);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "700 16px 'Montserrat', sans-serif";
      ctx.fillText("OFICJALNA KARTA PROFILOWA ZAWODNIKA", 600, 135);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 54px 'Montserrat', sans-serif";
      ctx.fillText(activeChild.display_name.toUpperCase(), 600, 630);

      ctx.fillStyle = "#e22e30";
      ctx.font = "800 22px 'Montserrat', sans-serif";
      ctx.fillText(`#${activeChild.shirt_number || "DELTA"}  •  ${(activeChild.position || "Zawodnik").toUpperCase()}`, 600, 670);

      const link = document.createElement("a");
      link.download = `karta_${activeChild.display_name.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Błąd generowania karty:", err);
    } finally {
      setDownloadingCard(false);
    }
  };

  // Główna zawartość profilu Player Experience
  const mainContent = (
    <div className="v7b-career-hub-container">
      {/* 1. SELEKTOR DZIECI (DLA RODZICA POSIADAJĄCEGO WIĘCEJ NIŻ JEDNO DZIECKO) */}
      {isParentOfActivePlayer && children.length > 1 && (
        <div className="v7b-child-selector-bar">
          {children.map(child => (
            <button
              key={child.id}
              type="button"
              className={`v7b-child-tab-btn ${child.id === activeChild.id ? "active" : ""}`}
              onClick={() => {
                setSelectedChildId(child.id);
                if (onOpenPlayer) onOpenPlayer(child);
              }}
            >
              <UserCheck size={16} />
              <span>{child.display_name}</span>
              {child.shirt_number ? <span className="shirt-badge">#{child.shirt_number}</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* 2. STADIUM HERO 4.0 — PEŁNOEKRANOWY FILMOWY HERO ZAWODNIKA */}
      <div className="v7b-hero-card v7e-stadium-hero">
        {/* Dynamiczne tło stadionu V7E.2 */}
        <div className="v7e2-hero-stadium-bg" aria-hidden="true">
          <div className={`v7e2-hero-bg-layer ${stadiumVariant === "debiutant" ? "active" : ""}`}>
            <picture>
              <source srcSet="/assets/stadium-experience/stadium_debiutant.webp" type="image/webp" />
              <img src="/assets/stadium-experience/stadium_debiutant.png" alt="" className="v7e2-hero-bg-img" />
            </picture>
          </div>
          <div className={`v7e2-hero-bg-layer ${stadiumVariant === "mlody_talent" ? "active" : ""}`}>
            <picture>
              <source srcSet="/assets/stadium-experience/stadium_mlody_talent.webp" type="image/webp" />
              <img src="/assets/stadium-experience/stadium_mlody_talent.png" alt="" className="v7e2-hero-bg-img" />
            </picture>
          </div>
        </div>

        {/* Wielki znak wodny numeru w tle stadionu */}
        <div className="v7e-hero-watermark-num" aria-hidden="true">
          #{activeChild.shirt_number || "DELTA"}
        </div>

        {/* Reflektory stadionowe, oświetlenie murawy i mgła */}
        <div className="v7e-spotlight-beam left" aria-hidden="true" />
        <div className="v7e-spotlight-beam right" aria-hidden="true" />
        <div className="v7e-pitch-glow-ring" aria-hidden="true" />
        <div className="v7e-mist-layer" aria-hidden="true" />

        {/* Górny pasek statusu w Hero z przyciskiem powrotu do drużyny */}
        <div className="v7b-hero-top-strip">
          <div className="v7e-hero-top-left">
            <button
              type="button"
              className="v7e-hero-back-btn"
              onClick={onClose || (() => {
                window.dispatchEvent(new CustomEvent("delta_navigate_tab", { detail: { tab: "team" } }));
              })}
              title="Wróć do listy zawodników drużyny"
            >
              <ChevronLeft size={16} />
              <span>Wróć do drużyny</span>
            </button>

            <div className="v7b-hero-badge-tag v7e-hero-badge-tag">
              <img src="/teamlogos/gm.png" alt="DELTA" className="v7e-hero-top-crest" />
              <span>DELTA PLAYER 4.0 • 2018 GM</span>
            </div>
          </div>

          <div className="v7b-hero-season-tag v7e-hero-season-tag">
            {/* Przełącznik stadionów V7E.2 (Tryb demo) */}
            <div className="v7e2-hero-switcher" role="group" aria-label="Wybór wariantu stadionu (Tryb demo)">
              <span className="v7e2-hero-demo-tag">DEMO</span>
              <button
                type="button"
                className={`v7e2-hero-switch-btn ${stadiumVariant === "debiutant" ? "active" : ""}`}
                onClick={() => setStadiumVariant("debiutant")}
                title="Włącz stadion: Debiutant"
                aria-pressed={stadiumVariant === "debiutant"}
              >
                DEBIUTANT
              </button>
              <button
                type="button"
                className={`v7e2-hero-switch-btn ${stadiumVariant === "mlody_talent" ? "active" : ""}`}
                onClick={() => setStadiumVariant("mlody_talent")}
                title="Włącz stadion: Młody Talent"
                aria-pressed={stadiumVariant === "mlody_talent"}
              >
                MŁODY TALENT
              </button>
            </div>

            <span>SEZON 2026/27</span>
            {isParentOfActivePlayer ? (
              <span className="v7d-role-pill parent">STREFA RODZICA</span>
            ) : (
              <span className="v7d-role-pill squad">KADRA ZESPOŁU</span>
            )}
          </div>
        </div>

        <div className="v7b-hero-main-row">
          {/* KOLUMNA 1: DUŻA SYLWETKA STADIONOWA NA MURAWSKIM PODIUM */}
          <div className="v7e-stadium-figure-col">
            <div className="v7e-figure-pedestal">
              <div className="v7e-figure-aura" />
              <div className="v7e-figure-cutout-wrap">
                <PlayerPhoto 
                  playerId={activeChild.id} 
                  shirtNumber={activeChild.shirt_number}
                  className="v7e-player-cutout-img"
                />
              </div>
              <div className="v7e-figure-badge">
                <span className="v7e-num-badge">#{activeChild.shirt_number || "DELTA"}</span>
                <span className="v7e-pos-badge">{activeChild.position || "ZAWODNIK"}</span>
              </div>
            </div>

            {/* Zachowanie selektora v7b-hero-avatar-wrap dla zgodności wstecznej testów */}
            <div className="v7b-hero-avatar-wrap" style={{ display: "none" }}>
              <PlayerPhoto 
                playerId={activeChild.id} 
                shirtNumber={activeChild.shirt_number}
              />
              <span className="v7b-hero-shirt-num">#{activeChild.shirt_number || "DELTA"}</span>
            </div>
          </div>

          {/* KOLUMNA 2: DOMINUJĄCE NAZWISKO, NUMER I RZECZYWISTY PASEK XP */}
          <div className="v7b-hero-identity">
            <div className="v7e-hero-kicker-strip">
              <span className="v7e-kicker-pill">
                <Flame size={12} className="text-red-500" />
                <span>K.S. DELTA WARSZAWA</span>
              </span>
              <span className="v7e-kicker-cat">ROCZNIK 2018 GÓRNY MOKOTÓW</span>
            </div>

            <h1 className="v7b-hero-name v7e-hero-name">
              {activeChild.display_name}
            </h1>

            <div className="v7e-hero-meta-row">
              <img src="/teamlogos/gm.png" alt="Herb" className="v7b-hero-crest-mini v7e-hero-crest-mini" />
              <span>{activeChild.position || "Zawodnik"} • #{activeChild.shirt_number || "DELTA"} • Poziom {playerLevel}</span>
            </div>

            {/* PASEK INDYWIDUALNEGO XP SPORTOWEGO */}
            <div className="v7b-hero-xp-widget" title="Indywidualne punkty doświadczenia za faktyczne obecności na treningach i meczach">
              <div className="v7b-xp-header v7e-xp-header">
                <span className="v7e-xp-lvl-badge">
                  <Award size={13} />
                  <span>POZIOM {playerLevel}</span>
                </span>
                <b>
                  <Sparkles size={13} className="text-amber-400" />
                  <span>{individualAttendanceXp} XP</span>
                </b>
              </div>
              <div className="v7b-xp-track v7e-xp-track">
                <div 
                  className="v7b-xp-fill v7e-xp-fill" 
                  style={{ width: `${Math.min(100, Math.max(12, (individualAttendanceXp % 250) / 2.5))}%` }}
                />
              </div>
              <p className="v7b-xp-subtext v7e-xp-subtext">
                <Info size={12} />
                <span>+40 XP/trening • +60 XP/mecz ligowy</span>
              </p>

              {/* V7F.1B WSKAŹNIK PROGRESJI STADIONOWEJ: MOJA DROGA DO MISTRZOSTWA */}
              <div className="v7f-stadium-progression-widget" data-testid="stadium-progression-widget">
                <div className="v7f-stadium-header">
                  <div className="v7f-stadium-badge" style={{ borderColor: stadiumProgression.currentTier.accentColor }}>
                    <Trophy size={12} style={{ color: stadiumProgression.currentTier.accentColor }} />
                    <span>STADION: <b>{stadiumProgression.currentTier.name.toUpperCase()}</b></span>
                  </div>
                  <span className="v7f-stadium-xp-chip">
                    {individualAttendanceXp} / {stadiumProgression.nextTier ? `${stadiumProgression.nextTier.minXp} XP` : "MAX"}
                  </span>
                </div>

                <div className="v7f-stadium-track" title={`Postęp do stadionu ${stadiumProgression.nextTier?.name || "Mistrzowski"}: ${stadiumProgression.progressPercent}%`}>
                  <div 
                    className="v7f-stadium-fill"
                    style={{ 
                      width: `${stadiumProgression.progressPercent}%`,
                      backgroundColor: stadiumProgression.currentTier.accentColor 
                    }}
                  />
                </div>

                <div className="v7f-stadium-footer">
                  {stadiumProgression.nextTier ? (
                    <span>
                      Kolejny stadion: <b>{stadiumProgression.nextTier.name}</b> (brakuje <b>{stadiumProgression.remainingXp} XP</b>)
                    </span>
                  ) : (
                    <span className="v7f-stadium-max-label">
                      🏆 Osiągnięto najwyższy etap stadionowy: <b>Legenda DELTY</b>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* KOLUMNA 3: PREZENTACJA KARTY 3D INFERNO & POBIERANIE A4 */}
          <div className="v7c-hero-right-col v7e-hero-actions-col">
            <div className="v7c-hero-3d-preview-box">
              <div className="v7c-mini-card-icon" title="DELTA INFERNO 3D">
                <Flame size={16} className="text-amber-400" />
                <span>3D</span>
              </div>
              <div className="v7c-mini-card-info">
                <b>{isFeaturedCardOwned ? "KARTA W ALBUMIE" : "PODGLĄD KARTY"}</b>
                <small>{featuredCard.rarity?.toUpperCase() || "INFERNO"} • {isFeaturedCardOwned ? "ZDOBYTA" : "ZABLOKOWANA"}</small>
              </div>
              <button
                type="button"
                className="v7c-btn-inspect-3d v7e-btn-inspect-3d"
                onClick={() => {
                  setHeroInspectedCard(featuredCard);
                  setHeroIsFlipped(false);
                  setHeroAutoRotate(false);
                }}
                title={isFeaturedCardOwned ? "Zobacz zdobytą kartę 3D" : "Podgląd karty 3D"}
              >
                <Eye size={14} />
                <span>{isFeaturedCardOwned ? "ZOBACZ KARTĘ 3D" : "PODGLĄD KARTY"}</span>
              </button>
            </div>

            <button
              type="button"
              className="v7b-btn-download-print v7e-btn-download-print"
              disabled={downloadingCard}
              onClick={handleDownloadPlayerCard}
              title="Pobierz oficjalną kartę kolekcjonerską w formacie A4"
            >
              <Download size={14} />
              <span>{downloadingCard ? "GENEROWANIE..." : "POBIERZ KARTĘ A4"}</span>
            </button>

            {/* Przycisk Moja Droga do Mistrzostwa V7E.2 / V7F.1B */}
            <button
              type="button"
              className="v7e2-btn-road-to-mastery"
              onClick={() => setIsFullscreenStadiumOpen(true)}
              title={`Otwórz prezentację stadionową: ${stadiumProgression.currentTier.name}`}
            >
              <Trophy size={14} className="text-amber-400" />
              <span>DROGA DO MISTRZOSTWA • {stadiumProgression.currentTier.name.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PANEL 4 STATYSTYK (Mecze, Treningi, Gole, Asysty) */}
      <div className="v7c-quick-stats-strip">
        <div className="v7c-stat-card">
          <div className="v7c-stat-icon-wrap"><Trophy size={18} /></div>
          <div className="v7c-stat-body">
            <b>{s.m}</b>
            <span>MECZE LIGOWE</span>
          </div>
        </div>
        <div className="v7c-stat-card">
          <div className="v7c-stat-icon-wrap"><Dumbbell size={18} /></div>
          <div className="v7c-stat-body">
            <b>{t.sessions}</b>
            <span>TRENINGI</span>
          </div>
        </div>
        <div className="v7c-stat-card gold">
          <div className="v7c-stat-icon-wrap"><Flame size={18} /></div>
          <div className="v7c-stat-body">
            <b>{s.g}</b>
            <span>BRAMKI</span>
          </div>
        </div>
        <div className="v7c-stat-card crimson">
          <div className="v7c-stat-icon-wrap"><Target size={18} /></div>
          <div className="v7c-stat-body">
            <b>{s.a}</b>
            <span>ASYSTY</span>
          </div>
        </div>
      </div>

      {/* 4. NAWIGACJA (5 ZAKŁADEK — STICKY BAR) */}
      <div className="v7b-nav-tabs-bar">
        <button
          type="button"
          className={`v7b-nav-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Sparkles size={15} />
          <span>PRZEGLĄD</span>
        </button>

        <button
          type="button"
          className={`v7b-nav-tab-btn ${activeTab === "career" ? "active" : ""}`}
          onClick={() => setActiveTab("career")}
        >
          <Clock size={15} />
          <span>MOJA KARIERA</span>
        </button>

        <button
          type="button"
          className={`v7b-nav-tab-btn ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <BarChart3 size={15} />
          <span>STATYSTYKI</span>
        </button>

        <button
          type="button"
          className={`v7b-nav-tab-btn ${activeTab === "achievements" ? "active" : ""}`}
          onClick={() => setActiveTab("achievements")}
        >
          <Award size={15} />
          <span>OSIĄGNIĘCIA</span>
        </button>

        <button
          type="button"
          className={`v7b-nav-tab-btn cards-tab ${activeTab === "cards" ? "active" : ""}`}
          onClick={() => setActiveTab("cards")}
        >
          <Flame size={15} />
          <span>KARTY INFERNO</span>
        </button>
      </div>

      {/* 5. ZAWARTOŚĆ ZAKŁADEK */}

      {/* TAB 1: PRZEGLĄD */}
      {activeTab === "overview" && (
        <div className="v7b-tab-content overview-content space-y-4">
          {/* DUO GRID: RADAR UMIEJĘTNOŚCI + CEL I 1-CLICK RSVP */}
          <div className="v7b-overview-duo-grid">
            {/* LEWA: EA FC RADAR UMIEJĘTNOŚCI LUB STAN PUSTY */}
            <div className="v7b-card-panel">
              {s.m === 0 && t.sessions === 0 ? (
                <div className="v7c-skills-empty-body v7e-skills-compact-empty">
                  <div className="v7e-compact-empty-header">
                    <div className="v7c-empty-radar-icon v7e-empty-radar-icon-compact">
                      <Shield size={22} />
                    </div>
                    <div className="v7e-empty-header-text">
                      <div className="v7e-empty-badge">
                        <Sparkles size={11} />
                        <span>RADAR UMIEJĘTNOŚCI EA FC</span>
                      </div>
                      <h4>Brak oceny umiejętności</h4>
                    </div>
                  </div>
                  <p className="v7e-compact-empty-desc">
                    Radar aktywuje się automatycznie po zarejestrowaniu pierwszych obecności na zbiórkach treningowych (+40 XP) lub meczach ligowych (+60 XP).
                  </p>
                  <div className="v7e-empty-milestones-grid">
                    <div className="v7e-empty-milestone-item">
                      <Dumbbell size={14} className="text-amber-400" />
                      <div>
                        <b>TRENINGI (+40 XP)</b>
                        <span>Budują Tempo, Dynamikę i Technikę</span>
                      </div>
                    </div>
                    <div className="v7e-empty-milestone-item">
                      <Trophy size={14} className="text-red-400" />
                      <div>
                        <b>MECZE LIGOWE (+60 XP)</b>
                        <span>Rozwijają Skuteczność, Doświadczenie i OVR</span>
                      </div>
                    </div>
                    <div className="v7e-empty-milestone-item highlight">
                      <Award size={14} className="text-yellow-400" />
                      <div>
                        <b>NAJBLIŻSZY CEL SPORTOWY</b>
                        <span>Zarejestruj obecność na najbliższym wydarzeniu</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <PlayerSkillRadar
                  playerName={activeChild.display_name}
                  position={activeChild.position}
                  stats={{
                    matches: s.m,
                    starts: s.starts,
                    captain: s.captain,
                    goals: s.g,
                    assists: s.a,
                    mvp: s.mvp,
                    trainings: t.sessions,
                    trainingGoals: t.goals,
                    trainingAssists: t.assists,
                    streak: t.attendanceStreak
                  }}
                />
              )}
            </div>

            {/* PRAWA: NASTĘPNY CEL + 1-CLICK RSVP */}
            <div className="v7b-card-panel">
              {/* NASTĘPNY CEL ROZWOJOWY */}
              <div className="v7c-next-goal-panel">
                <div className="v7b-panel-heading">
                  <Target size={18} />
                  <span>NASTĘPNY CEL ROZWOJOWY</span>
                </div>
                {nextObjective ? (
                  <div className="v7c-next-goal-card">
                    <div className="v7c-next-goal-head">
                      <div className="v7c-goal-badge">
                        <Award size={14} />
                        <span>{(nextObjective.definition?.category || "OGÓLNY").toUpperCase()}</span>
                      </div>
                      <span className="v7c-goal-rarity">{(nextObjective.definition?.rarity || "COMMON").toUpperCase()}</span>
                    </div>
                    <h4>{nextObjective.definition?.name || "Kolejny cel"}</h4>
                    <p>{nextObjective.definition?.description || "Graj i trenuj regularnie."}</p>
                    <div className="v7c-goal-progress-wrap">
                      <div className="v7c-goal-progress-bar">
                        <div 
                          className="v7c-goal-progress-fill" 
                          style={{ width: `${Math.min(100, Math.max(8, nextObjective.percent))}%` }} 
                        />
                      </div>
                      <div className="v7c-goal-progress-labels">
                        <span>POSTĘP: <b>{nextObjective.current} / {nextObjective.target}</b></span>
                        <b>{nextObjective.percent}%</b>
                      </div>
                    </div>
                    {nextObjective.definition?.rewardCardType && (
                      <div className="v7c-goal-reward-note">
                        <Sparkles size={12} />
                        <span>Odblokowuje kartę: <b>{nextObjective.definition.rewardCardType.toUpperCase()}</b></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="v7c-all-goals-complete">
                    <Check size={18} />
                    <span>Wszystkie wyznaczone cele osiągnięte! Gratulacje!</span>
                  </div>
                )}
              </div>

              {/* SZYBKI STATUS OBECNOŚCI (1-CLICK RSVP) — DLA POWIĄZANEGO RODZICA */}
              {isParentOfActivePlayer && (
                <div className="v7b-parent-rsvp-zone">
                  <div className="v7b-panel-heading mt-4">
                    <CalendarDays size={18} />
                    <span>SZYBKI STATUS OBECNOŚCI (1-CLICK RSVP)</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Zgłoś dyspozycyjność zawodnika na najbliższe zbiórki jednym kliknięciem:
                  </p>

                  <div className="v7b-rsvp-items">
                    {/* NAJBLIŻSZY MECZ */}
                    {upcomingMatches.length > 0 ? (
                      upcomingMatches.map(m => {
                        const rsvp = localAttendance.find(a => a.match_id === m.id && a.player_id === activeChild.id)?.status || "";
                        const isLoading = rsvpLoading === `match-${m.id}`;

                        return (
                          <div key={m.id} className="v7b-rsvp-block match-type">
                            <div className="v7b-rsvp-block-top">
                              <span className="v7b-rsvp-badge match">⚽ MECZ LIGOWY</span>
                              <small>{new Date(m.match_date).toLocaleDateString("pl-PL")} • {m.match_time?.slice(0, 5) || "Godz. do ustalenia"}</small>
                            </div>
                            <h4>{m.home_team} vs {m.away_team}</h4>
                            <p><MapPin size={12} /> {m.venue || "Boisko ligowe"}</p>

                            <div className="v7b-rsvp-buttons-row v7b-rsvp-buttons">
                              <button
                                type="button"
                                disabled={isLoading}
                                className={`v7b-btn-rsvp yes ${rsvp === "yes" || rsvp === "present" ? "active" : ""}`}
                                onClick={() => handleMatchRsvp(m.id, "yes")}
                              >
                                <Check size={14} />
                                <span>BĘDĘ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                className={`v7b-btn-rsvp no ${rsvp === "no" ? "active" : ""}`}
                                onClick={() => handleMatchRsvp(m.id, "no")}
                              >
                                <X size={14} />
                                <span>NIEOBECNY</span>
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                className={`v7b-btn-rsvp maybe ${rsvp === "maybe" ? "active" : ""}`}
                                onClick={() => handleMatchRsvp(m.id, "maybe")}
                              >
                                <HelpCircle size={14} />
                                <span>DO POTWIERDZENIA</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-900/50 text-xs text-slate-400">
                        Brak zaplanowanych meczów ligowych w najbliższych dniach.
                      </div>
                    )}

                    {/* NAJBLIŻSZY TRENING */}
                    {upcomingTrainings.length > 0 && (
                      upcomingTrainings.map(tr => {
                        const trRsvp = localTrAttendance.find(a => a.training_id === tr.id && a.player_id === activeChild.id)?.status || "";
                        const isLoading = rsvpLoading === `training-${tr.id}`;

                        return (
                          <div key={tr.id} className="v7b-rsvp-block training-type">
                            <div className="v7b-rsvp-block-top">
                              <span className="v7b-rsvp-badge training">🏃 TRENING ZESPOŁU</span>
                              <small>{new Date(tr.training_date).toLocaleDateString("pl-PL")} • {tr.start_time?.slice(0, 5) || "17:00"}</small>
                            </div>
                            <h4>{tr.title || "Trening rocznika 2018 GM"}</h4>
                            <p><MapPin size={12} /> {tr.location || "Boisko klubowe"}</p>

                            <div className="v7b-rsvp-buttons-row v7b-rsvp-buttons">
                              <button
                                type="button"
                                disabled={isLoading}
                                className={`v7b-btn-rsvp yes ${trRsvp === "present" || trRsvp === "yes" ? "active" : ""}`}
                                onClick={() => handleTrainingRsvp(tr.id, "yes")}
                              >
                                <Check size={14} />
                                <span>BĘDĘ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                className={`v7b-btn-rsvp no ${trRsvp === "no" ? "active" : ""}`}
                                onClick={() => handleTrainingRsvp(tr.id, "no")}
                              >
                                <X size={14} />
                                <span>NIEOBECNY</span>
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                className={`v7b-btn-rsvp maybe ${trRsvp === "maybe" ? "active" : ""}`}
                                onClick={() => handleTrainingRsvp(tr.id, "maybe")}
                              >
                                <HelpCircle size={14} />
                                <span>DO POTWIERDZENIA</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {!isParentOfActivePlayer && (
                <div className="v7b-squad-fixtures-zone">
                  <div className="v7b-panel-heading mt-4">
                    <CalendarDays size={18} />
                    <span>HARMONOGRAM ZBIÓREK</span>
                  </div>
                  <div className="v7b-rsvp-items">
                    {upcomingMatches.length > 0 ? (
                      upcomingMatches.map(m => (
                        <div key={m.id} className="v7b-rsvp-block match-type">
                          <div className="v7b-rsvp-block-top">
                            <span className="v7b-rsvp-badge match">⚽ MECZ LIGOWY</span>
                            <small>{new Date(m.match_date).toLocaleDateString("pl-PL")}</small>
                          </div>
                          <h4>{m.home_team} vs {m.away_team}</h4>
                          <p><MapPin size={12} /> {m.venue || "Boisko ligowe"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-900/50 text-xs text-slate-400">
                        Brak zaplanowanych meczów ligowych.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FORMA, CHEMIA & PRZEDMECZOWA CHECKLISTA */}
          <div className="v7b-overview-bottom-grid">
            {/* FORMA MECZOWA I ZGRANIE */}
            <div className="v7b-card-panel devil-card">
              <div className="v7b-panel-heading">
                <Zap size={18} />
                <span>FORMA MECZOWA I ZGRANIE</span>
              </div>

              <div className="mb-4">
                <span className="text-xs text-slate-400 font-bold block mb-2">OSTATNIE SPOTKANIA:</span>
                <div className="v7b-form-bubble-row">
                  {recentPlayedMatches.map(m => {
                    const goalsInMatch = events.filter(e => e.match_id === m.id && e.player_id === activeChild.id && e.event_type === "goal").length;
                    const isHome = m.home_team.toLowerCase().includes("delta");
                    const deltaScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
                    const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
                    const res = deltaScore > oppScore ? "W" : deltaScore === oppScore ? "R" : "P";

                    return (
                      <div 
                        key={m.id} 
                        className={`v7b-bubble-item res-${res.toLowerCase()}`}
                        title={`${m.home_team} vs ${m.away_team} (${deltaScore}:${oppScore})`}
                      >
                        <span>{goalsInMatch > 0 ? `⚽${goalsInMatch}` : res}</span>
                        <small>{new Date(m.match_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}</small>
                      </div>
                    );
                  })}
                  {recentPlayedMatches.length === 0 && (
                    <span className="text-xs text-slate-500">Brak rozegranych meczów w historii.</span>
                  )}
                </div>
              </div>

              {/* CHEMIA Z PARTNEREM */}
              <div className="v7b-chem-duo-card">
                <div className="v7b-chem-icon-wrap">
                  <Zap size={20} />
                </div>
                <div>
                  <small className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">NAJLEPSZY DUET BOISKOWY</small>
                  <b className="text-white text-sm">{partner ? partner.display_name : "Zgrany z całym zespołem"}</b>
                  <p className="text-xs text-slate-400 mt-1">
                    {pair ? `${pair.score}% zgrania • ${pair.games} wspólnych gier treningowych` : "Wspólne gry na treningach budują formę meczową!"}
                  </p>
                </div>
              </div>
            </div>

            {/* PRZEDMECZOWA CHECKLISTA */}
            <div className="v7b-card-panel devil-card v7b-checklist-card">
              <div className="v7b-panel-heading">
                <Shirt size={18} />
                <span>PRZEDMECZOWA CHECKLISTA TORBY</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Sprawdź z dzieckiem przed wyjściem na mecz czy wszystko jest spakowane:
              </p>

              <div className="v7b-checklist-items">
                {CHECKLIST_ITEMS.map(item => {
                  const checked = !!checklist[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!isParentOfActivePlayer}
                      className={`v7b-checklist-btn ${checked ? "is-checked" : ""}`}
                      onClick={() => handleToggleChecklist(item.id)}
                    >
                      <span>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {checked ? (
                        <CheckSquare size={17} className="text-emerald-400" />
                      ) : (
                        <Square size={17} className="text-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOJA KARIERA (CareerTimeline) */}
      {activeTab === "career" && (
        <div className="v7b-tab-content career-content">
          <CareerTimeline
            player={activeChild}
            matches={matches}
            trainingSessions={trainingSessions}
            matchAttendance={localAttendance}
            trainingAttendance={localTrAttendance}
            events={events}
            stats={stats}
            trainingStats={trainingStats}
            onOpenMatch={(m) => onOpenMatch && onOpenMatch(m, "summary")}
          />
        </div>
      )}

      {/* TAB 3: STATYSTYKI */}
      {activeTab === "stats" && (
        <div className="v7b-tab-content stats-content space-y-4">
          <div className="v7b-stats-grid">
            {/* OFICJALNE MECZE */}
            <div className="v7b-stats-col-card devil-card">
              <div className="v7b-panel-heading">
                <Trophy size={18} />
                <span>MECZE OFICJALNE MZPN</span>
              </div>

              <div className="v7b-stats-table-row">
                <span>Rozegrane mecze</span>
                <b>{s.m}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Wyjściowy skład</span>
                <b>{s.starts}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Mecze jako kapitan</span>
                <b>{s.captain}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Bramki ligowe</span>
                <b>{s.g}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Asysty ligowe</span>
                <b>{s.a}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Wyróżnienia MVP</span>
                <b>{s.mvp}</b>
              </div>
            </div>

            {/* TRENING I ROZWÓJ */}
            <div className="v7b-stats-col-card devil-card">
              <div className="v7b-panel-heading">
                <Dumbbell size={18} />
                <span>TRENING I ROZWÓJ</span>
              </div>

              <div className="v7b-stats-table-row">
                <span>Obecności na zbiórkach</span>
                <b>{t.sessions}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Udział w grach wewnętrznych</span>
                <b>{t.games}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Gole w grach treningowych</span>
                <b>{t.goals}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Asysty treningowe</span>
                <b>{t.assists}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Punkty kanadyjskie (G+A)</span>
                <b>{t.ga}</b>
              </div>
              <div className="v7b-stats-table-row">
                <span>Seria obecności</span>
                <b>{t.attendanceStreak} z rzędu 🔥</b>
              </div>
            </div>
          </div>

          {/* PEDAGOGICZNA KLAUZULA GRASSROOTS */}
          <div className="v7b-pedagogical-disclaimer devil-card">
            <ShieldCheck size={28} className="text-sky-400 flex-shrink-0" />
            <p>
              <strong>ZASADY ROZWOJU MŁODEGO SPORTOWCA (GRASSROOTS): </strong>
              W kategorii wiekowej rocznika 2018 (skrzat / żak) piłka nożna to przede wszystkim pasja, radość z gry i odwaga na boisku.
              W KS Delta Warszawa nie prowadzimy negatywnej selekcji. Wszystkie prezentowane statystyki mają charakter motywacyjny
              i edukacyjny — służą do doceniania systematycznej pracy, regularnych obecności i wspólnego rozwoju z kolegami z drużyny!
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: OSIĄGNIĘCIA */}
      {activeTab === "achievements" && (
        <div className="v7b-tab-content achievements-content">
          <AchievementsHub
            playerAchievements={calculatePlayerAchievements(activeChild.id, stats, trainingStats, maxGoalsSingleMatch)}
            playerName={activeChild.display_name}
          />
        </div>
      )}

      {/* TAB 5: MOJE KARTY */}
      {activeTab === "cards" && (
        <div className="v7b-tab-content cards-content">
          <PlayerInfernoCards
            player={activeChild}
            cards={cards}
            userCards={userCards}
            stats={stats}
            trainingStats={trainingStats}
          />
        </div>
      )}

      {/* 6. MODAL 3D CARD INSPECTOR DLA HERO */}
      {heroInspectedCard && heroCard3DData && mounted && createPortal(
        <div className="v7b-modal-overlay" onClick={() => setHeroInspectedCard(null)}>
          <div className="v7b-modal-card-container devil-card" onClick={(e) => e.stopPropagation()}>
            <div className="v7b-modal-header">
              <div className="modal-title-wrap">
                <Flame size={16} className="flame-icon text-amber-400" />
                <span>PODGLĄD KARTY 3D • DELTA INFERNO</span>
              </div>
              <div className="modal-actions-wrap">
                <button
                  type="button"
                  className={`modal-btn-ctrl ${heroIsFlipped ? "active" : ""}`}
                  onClick={() => setHeroIsFlipped(!heroIsFlipped)}
                  title="Obróć kartę"
                >
                  <RotateCw size={14} />
                  <span>{heroIsFlipped ? "PRZÓD" : "TYŁ"}</span>
                </button>
                <button
                  type="button"
                  className={`modal-btn-ctrl ${heroAutoRotate ? "active" : ""}`}
                  onClick={() => setHeroAutoRotate(!heroAutoRotate)}
                  title="Obrót 360"
                >
                  <Sparkles size={14} />
                  <span>{heroAutoRotate ? "STOP" : "360°"}</span>
                </button>
                <button
                  type="button"
                  className="modal-btn-close"
                  onClick={() => setHeroInspectedCard(null)}
                  title="Zamknij"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="v7b-3d-scene-stage">
              <Card3DEngine
                data={heroCard3DData}
                isFlipped={heroIsFlipped}
                autoRotate={heroAutoRotate}
                interactive={true}
                enableHolo={true}
                enableParallax={true}
              />
            </div>
            <div className="v7b-modal-footer">
              <div className="footer-status-pill">
                {isFeaturedCardOwned ? (
                  <span className="status-owned">
                    <Check size={14} className="text-emerald-400" />
                    <span>Oficjalna karta w Twoim albumie klubowym</span>
                  </span>
                ) : (
                  <span className="status-unowned">
                    <Eye size={14} className="text-amber-400" />
                    <span>Podgląd karty — karta zablokowana (do zdobycia w paczkach DELTA INFERNO)</span>
                  </span>
                )}
              </div>
              <div className="footer-meta-chips">
                <span>Rzadkość: <b>{heroInspectedCard.rarity?.toUpperCase() || "INFERNO"}</b></span>
                <span>Typ: <b>{heroInspectedCard.card_type?.toUpperCase() || "BASE"}</b></span>
                <span>Sezon: <b>{heroInspectedCard.season || "2026/27"}</b></span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 8. PEŁNOEKRANOWA PREZENTACJA STADIONOWA V7E.2 / V7F.1B: MOJA DROGA DO MISTRZOSTWA */}
      <DynamicStadiumExperience
        player={activeChild}
        level={playerLevel}
        xp={individualAttendanceXp}
        progression={stadiumProgression}
        stats={{
          matches: s.m,
          trainings: t.sessions,
          goals: s.g,
          assists: s.a
        }}
        variant={stadiumVariant}
        onVariantChange={setStadiumVariant}
        isOpen={isFullscreenStadiumOpen}
        onClose={() => setIsFullscreenStadiumOpen(false)}
      />
    </div>
  );

    // W trybie "modal" renderujemy pełnoekranowy stadion do document.body via Portal
  if (mode === "modal" && mounted) {
    if (!isOpen) return null;

    return createPortal(
      <section 
        className="v111-player-screen v112-player-screen" 
        role="dialog" 
        aria-modal="true" 
        aria-label={`Profil zawodnika: ${activeChild.display_name}`}
      >
        {/* Filmowe intro z herbem i numerem zawodnika */}
        {playerIntro && (
          <div className="v112-intro" aria-hidden="true">
            <span className="v112-intro-glow" />
            <img src="/teamlogos/gm.png" alt="DELTA GM" />
            <strong>{activeChild.shirt_number ? `#${activeChild.shirt_number}` : "DELTA"}</strong>
            <span>{activeChild.display_name}</span>
            <small>DELTA PLAYER EXPERIENCE 3.0</small>
          </div>
        )}

        <div className="v111-player-scroll" key={activeChild.id}>
          <div className="v111-profile-container">
            {/* STADIONOWY TOOLBAR GÓRNY */}
            <header className="v111-profile-toolbar v112-toolbar">
              <button 
                type="button" 
                className="v111-profile-back" 
                onClick={onClose || (() => window.history.back())}
                aria-label="Wróć do drużyny"
              >
                <ChevronLeft size={19} /> Wróć do drużyny
              </button>

              <span>
                <img src="/teamlogos/gm.png" alt="DELTA" /> DELTA 2018 GM <span className="v111-toolbar-accent">/ PLAYER EXPERIENCE 3.0</span>
              </span>

              {isParentOfActivePlayer ? (
                <span className="v7d-role-pill parent">STREFA RODZICA</span>
              ) : (
                <span className="v7d-role-pill squad">KADRA ZESPOŁU</span>
              )}
            </header>

            {/* GŁÓWNA TREŚĆ PROFILU */}
            {mainContent}
          </div>
        </div>
      </section>,
      document.body
    );
  }

  // W trybie "page" (np. MyChildCenter w zakadce Moje Dziecko) renderujemy bezpośrednio
  return (
    <div className="v112-player-page-view">
      {mainContent}
    </div>
  );
}

export default PlayerExperience3D;
export { PlayerExperience3D as PlayerCareerHub };
