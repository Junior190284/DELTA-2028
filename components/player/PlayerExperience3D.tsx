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

  // WYLICZENIE INDYWIDUALNEGO XP SPORTOWEGO (Zasada nienaruszalna: +40 XP trening, +60 XP mecz)
  const presentTrainings = localTrAttendance.filter(
    a => a.player_id === activeChild.id && (a.status === "present" || a.status === "yes")
  ).length;

  const presentMatches = localAttendance.filter(
    a => a.player_id === activeChild.id && (a.status === "present" || a.status === "yes")
  ).length;

  const individualAttendanceXp = (presentTrainings * 40) + (presentMatches * 60);
  const playerLevel = Math.max(1, Math.floor(individualAttendanceXp / 250) + 1);
  const currentLvlXp = individualAttendanceXp % 250;
  const neededLvlXp = 250;
  const progressPercent = Math.min(100, Math.round((currentLvlXp / neededLvlXp) * 100));

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
      {/* SELEKTOR DZIECI (DLA RODZICA POSIADAJĄCEGO WIĘCEJ NIŻ JEDNO DZIECKO) */}
      {isParentOfActivePlayer && children.length > 1 && (
        <div className="v7b-child-selector-bar">
          <span className="v7b-selector-label">
            <Shirt size={14} /> Wybierz zawodnika:
          </span>
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
              <PlayerPhoto playerId={child.id} shirtNumber={child.shirt_number} className="w-5 h-5 rounded-full" />
              <span>{child.display_name}</span>
              {child.shirt_number ? <span className="shirt-badge">#{child.shirt_number}</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* PLAYER HERO V7C.2 — OFICJALNA KARTA PROFILOWA ZAWODNIKA */}
      <section className="v7b-hero-card devil-card">
        <div className="v7c-hero-content-grid">
          {/* LEWA KOLUMNA: WIZERUNEK ZAWODNIKA (ZDJĘCIE LUB NEUTRALNA SYLWETKA) */}
          <div className="v7b-hero-portrait-col">
            <div className="v7b-portrait-wrapper">
              <PlayerPhoto 
                playerId={activeChild.id} 
                shirtNumber={activeChild.shirt_number} 
                className="v7b-portrait-img" 
              />
              {activeChild.shirt_number && (
                <div className="v7b-portrait-number">
                  #{activeChild.shirt_number}
                </div>
              )}
            </div>
          </div>

          {/* ŚRODKOWA KOLUMNA: DANE SPORTOWE I POZIOM XP */}
          <div className="v7b-hero-main-col">
            <div className="v7b-hero-kicker-strip">
              <span className="v7b-hero-badge">
                <Flame size={13} />
                DELTA 2018 GM
              </span>
              <span className="v7b-hero-pos-badge">
                {activeChild.position || "Zawodnik"}
              </span>
              <span className="v7b-hero-level-badge">
                POZIOM {playerLevel}
              </span>
            </div>

            <h1 className="v7b-hero-name">
              {activeChild.display_name}
            </h1>

            <p className="v7b-hero-bio">
              Oficjalny profil zawodnika K.S. Delta Warszawa • Rocznik 2018 Górny Mokotów
            </p>

            {/* PASEK ROZWOJU XP (AUTORYTATYWNY Z FREKWENCJI) */}
            <div className="v7b-xp-progress-block">
              <div className="v7b-xp-progress-header">
                <span className="v7b-xp-level-label">
                  <Zap size={14} className="text-yellow-400" />
                  Poziom sportowy {playerLevel}
                </span>
                <span className="v7b-xp-numbers">
                  <b>{currentLvlXp}</b> / {neededLvlXp} XP do Poziomu {playerLevel + 1}
                </span>
              </div>
              <div className="v7b-xp-track">
                <div 
                  className="v7b-xp-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* PANEL 4 STATYSTYK BEZPOŚREDNIO POD HERO (Mecze, Treningi, Gole, Asysty) */}
            <div className="v7c-quick-stats-strip">
              <div className="v7c-quick-stat-box">
                <span className="v7c-quick-stat-icon">⚽</span>
                <div className="v7c-quick-stat-details">
                  <small>MECZE LIGOWE</small>
                  <b>{s.m}</b>
                </div>
              </div>
              <div className="v7c-quick-stat-box">
                <span className="v7c-quick-stat-icon">🏃</span>
                <div className="v7c-quick-stat-details">
                  <small>TRENINGI</small>
                  <b>{t.sessions}</b>
                </div>
              </div>
              <div className="v7c-quick-stat-box">
                <span className="v7c-quick-stat-icon">🔥</span>
                <div className="v7c-quick-stat-details">
                  <small>BRAMKI</small>
                  <b>{s.g}</b>
                </div>
              </div>
              <div className="v7c-quick-stat-box">
                <span className="v7c-quick-stat-icon">🎯</span>
                <div className="v7c-quick-stat-details">
                  <small>ASYSTY</small>
                  <b>{s.a}</b>
                </div>
              </div>
            </div>

            {/* WIDGET NASTĘPNEGO CELU */}
            {nextObjective && (
              <div className="v7c-next-goal-panel">
                <div className="v7c-next-goal-header">
                  <span className="v7c-next-goal-kicker">
                    <Target size={13} />
                    NASTĘPNY CEL ROZWOJOWY
                  </span>
                  <span className="v7c-next-goal-progress-badge">
                    {nextObjective.current} / {nextObjective.target}
                  </span>
                </div>
                <div className="v7c-next-goal-body">
                  <strong>{nextObjective.definition?.name || "Kolejny cel sportowy"}</strong>
                  <p>{nextObjective.definition?.description || "Graj i trenuj regularnie, aby odblokować nowe odznaki."}</p>
                </div>
                <div className="v7c-next-goal-track">
                  <div 
                    className="v7c-next-goal-fill" 
                    style={{ width: `${Math.min(100, Math.round((nextObjective.current / nextObjective.target) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* PRAWA KOLUMNA: MINIATURA KARTY INFERNO 3D I PRZYCISK INSPEKCJI */}
          <div className="v7b-hero-card-col">
            <div className="v7c-hero-3d-preview-box">
              <div className="v7c-hero-card-art-wrap">
                <div className="v7c-card-flame-glow" />
                <PlayerPhoto 
                  playerId={activeChild.id} 
                  shirtNumber={activeChild.shirt_number} 
                  className="v7c-card-preview-photo" 
                />
                <div className="v7c-card-preview-overlay">
                  <span className="v7c-card-tier-label">INFERNO 3D</span>
                  <strong>{activeChild.display_name}</strong>
                  <small>Kolekcja 2026/27</small>
                </div>
              </div>

              <button 
                type="button" 
                className="v7c-btn-inspect-3d"
                onClick={() => {
                  setHeroInspectedCard(featuredCard);
                  setHeroIsFlipped(false);
                  setHeroAutoRotate(false);
                }}
              >
                <Eye size={15} />
                <span>{isFeaturedCardOwned ? "INSPEKCJA 3D (360°)" : "PODGLĄD KARTY"}</span>
              </button>

              <button 
                type="button" 
                className="v7b-btn-download-hero" 
                onClick={handleDownloadPlayerCard} 
                disabled={downloadingCard}
              >
                <Download size={14} />
                <span>{downloadingCard ? "Generowanie..." : "Pobierz pamiątkową kartę A4"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GŁÓWNA BELKA 5 ZAKŁADEK (STICKY HEADER) */}
      <nav className="v7b-career-tabs-bar" aria-label="Nawigacja profilu zawodnika">
        <button 
          type="button" 
          className={`v7b-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={16} />
          <span>PRZEGLĄD</span>
        </button>

        <button 
          type="button" 
          className={`v7b-tab-btn ${activeTab === "career" ? "active" : ""}`}
          onClick={() => setActiveTab("career")}
        >
          <Clock size={16} />
          <span>MOJA KARIERA</span>
        </button>

        <button 
          type="button" 
          className={`v7b-tab-btn ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <Trophy size={16} />
          <span>STATYSTYKI</span>
        </button>

        <button 
          type="button" 
          className={`v7b-tab-btn ${activeTab === "achievements" ? "active" : ""}`}
          onClick={() => setActiveTab("achievements")}
        >
          <Award size={16} />
          <span>OSIĄGNIĘCIA</span>
        </button>

        <button 
          type="button" 
          className={`v7b-tab-btn ${activeTab === "cards" ? "active" : ""}`}
          onClick={() => setActiveTab("cards")}
        >
          <Layers size={16} />
          <span>KARTY INFERNO</span>
        </button>
      </nav>

      {/* ZAWARTOŚĆ 5 ZAKŁADEK */}
      <div className="v7b-tab-content-area">
        {/* 1. PRZEGLĄD */}
        {activeTab === "overview" && (
          <div className="v7b-overview-section">
            <div className="v7b-overview-duo-grid">
              {/* RADAR UMIEJĘTNOŚCI (Z CZYSTYM STANEM PUSTYM DLA ZAWODNIKA BEZ STATYSTYK) */}
              <div className="v7b-radar-column">
                {(s.m > 0 || t.sessions > 0) ? (
                  <PlayerSkillRadar 
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
                    playerName={activeChild.display_name}
                    position={activeChild.position}
                  />
                ) : (
                  <div className="v7b-stats-empty-box devil-card">
                    <Shield size={32} className="text-yellow-400" />
                    <h4>Brak oceny umiejętności</h4>
                    <p>Radar rozwoju zostanie aktywowany po zapisaniu pierwszych obecności na treningu lub w meczu ligowym.</p>
                  </div>
                )}
              </div>

              {/* PRAWA KOLUMNA: HARMONOGRAM I SZYBKIE RSVP (DLA POWIĄZANEGO RODZICA) */}
              <div className="v7b-fixtures-column">
                {isParentOfActivePlayer && (
                  <div className="v7b-rsvp-card devil-card">
                    <div className="v7b-rsvp-header">
                      <div className="v7b-rsvp-title-wrap">
                        <CalendarDays size={18} className="text-yellow-400" />
                        <h3>Deklaracja obecności • Najbliższe wydarzenia</h3>
                      </div>
                      <span className="v7b-rsvp-secure-tag">
                        <ShieldCheck size={12} /> Zabezpieczone RLS V6E
                      </span>
                    </div>

                    {/* NAJBLIŻSZY TRENING */}
                    {upcomingTrainings.length > 0 ? (
                      <div className="v7b-rsvp-event-item">
                        <div className="v7b-rsvp-event-top">
                          <span className="v7b-rsvp-type-badge training">TRENING</span>
                          <span className="v7b-rsvp-date">{upcomingTrainings[0].training_date}</span>
                        </div>
                        <strong>{upcomingTrainings[0].title || "Trening ligowy rocznika 2018"}</strong>
                        <p className="v7b-rsvp-loc">
                          <MapPin size={12} /> {upcomingTrainings[0].location || "Boisko Mokotów"}
                        </p>

                        {/* STATUS I PRZYCISKI RSVP */}
                        {(() => {
                          const currentAtt = localTrAttendance.find(
                            a => a.training_id === upcomingTrainings[0].id && a.player_id === activeChild.id
                          );
                          const isCoachPresent = currentAtt?.status === "present";
                          const st = currentAtt?.status || "none";

                          return (
                            <div className="v7b-rsvp-actions-wrap">
                              {isCoachPresent ? (
                                <div className="v7b-coach-confirmed-badge">
                                  <Check size={14} /> Trener zatwierdził faktyczną obecność
                                </div>
                              ) : (
                                <div className="v7b-rsvp-buttons">
                                  <button
                                    type="button"
                                    className={`v7b-rsvp-btn yes ${st === "yes" ? "active" : ""}`}
                                    onClick={() => handleTrainingRsvp(upcomingTrainings[0].id, "yes")}
                                    disabled={Boolean(rsvpLoading)}
                                  >
                                    <Check size={14} /> Będę
                                  </button>
                                  <button
                                    type="button"
                                    className={`v7b-rsvp-btn maybe ${st === "maybe" ? "active" : ""}`}
                                    onClick={() => handleTrainingRsvp(upcomingTrainings[0].id, "maybe")}
                                    disabled={Boolean(rsvpLoading)}
                                  >
                                    <HelpCircle size={14} /> Niepewne
                                  </button>
                                  <button
                                    type="button"
                                    className={`v7b-rsvp-btn no ${st === "no" ? "active" : ""}`}
                                    onClick={() => handleTrainingRsvp(upcomingTrainings[0].id, "no")}
                                    disabled={Boolean(rsvpLoading)}
                                  >
                                    <X size={14} /> Nieobecny
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

                    {/* NAJBLIŻSZY MECZ */}
                    {upcomingMatches.length > 0 ? (
                      <div className="v7b-rsvp-event-item">
                        <div className="v7b-rsvp-event-top">
                          <span className="v7b-rsvp-type-badge match">MECZ</span>
                          <span className="v7b-rsvp-date">{upcomingMatches[0].match_date}</span>
                        </div>
                        <strong>{upcomingMatches[0].home_team} vs {upcomingMatches[0].away_team}</strong>
                        <p className="v7b-rsvp-loc">
                          <MapPin size={12} /> {upcomingMatches[0].venue || "Stadion Gospodarzy"}
                        </p>

                        {/* STATUS I PRZYCISKI RSVP MECZU */}
                        {(() => {
                          const currentAtt = localAttendance.find(
                            a => a.match_id === upcomingMatches[0].id && a.player_id === activeChild.id
                          );
                          const isCoachPresent = currentAtt?.status === "present";
                          const st = currentAtt?.status || "none";

                          return (
                            <div className="v7b-rsvp-actions-wrap">
                              {isCoachPresent ? (
                                <div className="v7b-coach-confirmed-badge">
                                  <Check size={14} /> Trener zatwierdził faktyczną obecność
                                </div>
                              ) : (
                                <div className="v7b-rsvp-buttons">
                                  <button
                                    type="button"
                                    className={`v7b-rsvp-btn yes ${st === "yes" ? "active" : ""}`}
                                    onClick={() => handleMatchRsvp(upcomingMatches[0].id, "yes")}
                                    disabled={Boolean(rsvpLoading)}
                                  >
                                    <Check size={14} /> Będę
                                  </button>
                                  <button
                                    type="button"
                                    className={`v7b-rsvp-btn maybe ${st === "maybe" ? "active" : ""}`}
                                    onClick={() => handleMatchRsvp(upcomingMatches[0].id, "maybe")}
                                    disabled={Boolean(rsvpLoading)}
                                  >
                                    <HelpCircle size={14} /> Niepewne
                                  </button>
                                  <button
                                    type="button"
                                    className={`v7b-rsvp-btn no ${st === "no" ? "active" : ""}`}
                                    onClick={() => handleMatchRsvp(upcomingMatches[0].id, "no")}
                                    disabled={Boolean(rsvpLoading)}
                                  >
                                    <X size={14} /> Nieobecny
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* CHECKLISTA MECZOWA DLA RODZICA */}
                {isParentOfActivePlayer && (
                  <div className="v7b-checklist-card devil-card">
                    <div className="v7b-checklist-header">
                      <CheckSquare size={16} className="text-yellow-400" />
                      <h4>Niezbędnik Młodego Piłkarza</h4>
                    </div>
                    <div className="v7b-checklist-grid">
                      {CHECKLIST_ITEMS.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className={`v7b-check-item ${checklist[item.id] ? "checked" : ""}`}
                          onClick={() => handleToggleChecklist(item.id)}
                        >
                          <span className="check-icon">
                            {checklist[item.id] ? <CheckSquare size={16} /> : <Square size={16} />}
                          </span>
                          <span className="check-label">
                            {item.icon} {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* OSTATNIE ROZEGRANE MECZE */}
                <div className="v7b-recent-matches-card devil-card">
                  <div className="v7b-recent-header">
                    <Trophy size={16} className="text-yellow-400" />
                    <h4>Ostatnie oficjalne występy</h4>
                  </div>
                  {recentPlayedMatches.length > 0 ? (
                    <div className="v7b-recent-matches-list">
                      {recentPlayedMatches.map(m => {
                        const mEvents = events.filter(e => e.match_id === m.id);
                        const playerGoals = mEvents.filter(e => e.event_type === "goal" && e.player_id === activeChild.id).length;
                        const playerAssists = mEvents.filter(e => e.event_type === "goal" && e.assist_player_id === activeChild.id).length;

                        return (
                          <div 
                            key={m.id} 
                            className="v7b-recent-match-row"
                            onClick={() => onOpenMatch && onOpenMatch(m, "summary")}
                          >
                            <span className="v7b-match-date">{m.match_date}</span>
                            <strong className="v7b-match-teams">
                              {m.home_team} {m.home_score ?? "–"} : {m.away_score ?? "–"} {m.away_team}
                            </strong>
                            <div className="v7b-match-player-stats">
                              {playerGoals > 0 && <span className="stat-pill goals">⚽ {playerGoals}</span>}
                              {playerAssists > 0 && <span className="stat-pill assists">🎯 {playerAssists}</span>}
                            </div>
                            <ChevronRight size={14} className="text-gray-500" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="v7b-empty-text">Brak zarejestrowanych meczów z udziałem zawodnika.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MOJA KARIERA (CHRONOLOGICZNA OŚ ROZWOJU) */}
        {activeTab === "career" && (
          <div className="v7b-career-timeline-tab">
            <CareerTimeline 
              player={activeChild}
              matches={matches}
              trainingSessions={trainingSessions}
              matchAttendance={localAttendance}
              trainingAttendance={localTrAttendance}
              events={events}
              stats={stats}
              trainingStats={trainingStats}
              onOpenMatch={onOpenMatch}
            />
          </div>
        )}

        {/* 3. STATYSTYKI SPORTOWE */}
        {activeTab === "stats" && (
          <div className="v7b-stats-section">
            <div className="v7b-stats-grid">
              {/* KARTA 1: MECZE MZPN */}
              <div className="v7b-stats-col-card devil-card">
                <div className="v7b-card-heading">
                  <Trophy size={18} />
                  <h3>Oficjalne mecze MZPN</h3>
                </div>
                <div className="v7b-kpis-vertical">
                  <div className="v7b-kpi-item">
                    <span>Mecze (Występy)</span>
                    <b>{s.m}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Wyjściowa szóstka</span>
                    <b>{s.starts}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Strzelone bramki</span>
                    <b>{s.g}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Asysty ligowe</span>
                    <b>{s.a}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Kapitan drużyny</span>
                    <b>{s.captain}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Wyróżnienia MVP</span>
                    <b>{s.mvp}</b>
                  </div>
                </div>
              </div>

              {/* KARTA 2: TRENINGI I ROZWÓJ */}
              <div className="v7b-stats-col-card devil-card">
                <div className="v7b-card-heading">
                  <Dumbbell size={18} />
                  <h3>Treningi i rozwój</h3>
                </div>
                <div className="v7b-kpis-vertical">
                  <div className="v7b-kpi-item">
                    <span>Zaliczone treningi</span>
                    <b>{t.sessions}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Aktualna seria (Streak)</span>
                    <b>{t.attendanceStreak} z rzędu</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Gole na treningach</span>
                    <b>{t.goals}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Asysty treningowe</span>
                    <b>{t.assists}</b>
                  </div>
                  <div className="v7b-kpi-item">
                    <span>Udział w małych grach</span>
                    <b>{t.games}</b>
                  </div>
                </div>
              </div>

              {/* KARTA 3: DUETY I CHEMIA */}
              <div className="v7b-stats-col-card devil-card">
                <div className="v7b-card-heading">
                  <Sparkles size={18} />
                  <h3>Współpraca na boisku</h3>
                </div>
                {partner ? (
                  <div className="v7b-chemistry-box">
                    <div className="partner-avatar">
                      <PlayerPhoto playerId={partner.id} shirtNumber={partner.shirt_number} className="w-16 h-16 rounded-full" />
                    </div>
                    <h4>Najczęstszy partner w grach:</h4>
                    <strong>{partner.display_name}</strong>
                    <p>{pair?.games || 0} wspólnych gier treningowych</p>
                  </div>
                ) : (
                  <div className="v7b-chemistry-empty">
                    <p>Duety zostaną wyliczone po zapisaniu składów gier wewnętrznych.</p>
                  </div>
                )}
              </div>
            </div>

            {/* NOTA EDUKACYJNA GRASSROOTS */}
            <div className="v7b-grassroots-disclaimer devil-card">
              <Info size={18} className="text-yellow-400" />
              <div>
                <strong>ZASADY ROZWOJU MŁODEGO SPORTOWCA (GRASSROOTS)</strong>
                <p>
                  W piłce nożnej dziecięcej (rocznik 2018) statystyki służą wyłącznie monitorowaniu frekwencji
                  oraz radości z gry. Mają charakter wyłącznie motywacyjny — nie prowadzimy negatywnej selekcji ani rankingów presyjnych. Najważniejsza jest regularność, uśmiech i zrównoważony rozwój każdego dziecka.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. OSIĄGNIĘCIA */}
        {activeTab === "achievements" && (
          <div className="v7b-achievements-tab">
            <AchievementsHub 
              playerAchievements={playerAchievements}
              playerName={activeChild.display_name}
            />
          </div>
        )}

        {/* 5. KARTY INFERNO */}
        {activeTab === "cards" && (
          <div className="v7b-inferno-cards-tab">
            <PlayerInfernoCards 
              player={activeChild}
              cards={cards}
              userCards={userCards}
              stats={stats}
              trainingStats={trainingStats}
            />
          </div>
        )}
      </div>

      {/* MODAL 3D CARD INSPECTION (HERO PREVIEW) */}
      {heroInspectedCard && heroCard3DData && (
        <div className="v7b-modal-overlay" onClick={() => setHeroInspectedCard(null)}>
          <div className="v7b-modal-card-container devil-card" onClick={e => e.stopPropagation()}>
            <div className="v7b-modal-header">
              <div className="modal-title-wrap">
                <Flame size={16} className="flame-icon" />
                <span>INSPEKCJA KARTY 3D • DELTA INFERNO</span>
              </div>
              <div className="modal-actions-wrap">
                <button
                  type="button"
                  className="modal-tool-btn"
                  onClick={() => setHeroIsFlipped(prev => !prev)}
                >
                  <RotateCw size={14} />
                  <span>OBRÓĆ KARTĘ</span>
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setHeroInspectedCard(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="v7b-modal-stage-wrap">
              <Card3DEngine 
                data={heroCard3DData}
                isFlipped={heroIsFlipped}
                autoRotate={heroAutoRotate}
                interactive={true}
                enableHolo={true}
                enableParallax={true}
              />
            </div>
          </div>
        </div>
      )}
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
