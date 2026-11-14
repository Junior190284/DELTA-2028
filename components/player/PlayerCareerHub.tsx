"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Info
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculatePlayerAchievements } from "@/lib/achievements/engine";
import PlayerPhoto from "@/components/PlayerPhoto";
import PlayerSkillRadar from "@/components/PlayerSkillRadar";
import AchievementsHub from "@/components/AchievementsHub";
import CareerTimeline from "./CareerTimeline";
import PlayerInfernoCards from "./PlayerInfernoCards";
import "./player-career-hub.css";

interface Player {
  id: string;
  display_name: string;
  shirt_number?: number | string | null;
  position?: string | null;
  photo_path?: string | null;
  active?: boolean;
}

interface Stat {
  m: number;
  starts: number;
  captain: number;
  g: number;
  a: number;
  mvp: number;
}

interface TrainingStat {
  sessions: number;
  goals: number;
  assists: number;
  ga: number;
  attendanceStreak: number;
  games: number;
  wins: number;
}

interface Match {
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

interface Attendance {
  match_id: string;
  player_id: string;
  status: string;
}

interface Event {
  id: string;
  match_id: string;
  event_type: string;
  player_id?: string | null;
  assist_player_id?: string | null;
}

interface TrainingSession {
  id: string;
  training_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  title?: string | null;
}

interface TrainingAttendance {
  training_id: string;
  player_id: string;
  status: string;
}

interface Pair {
  a: Player;
  b: Player;
  games: number;
  score: number;
}

export interface PlayerCareerHubProps {
  players: any[];
  parentPlayerIds: string[];
  stats: Record<string, any>;
  trainingStats: Record<string, any>;
  matches: any[];
  attendance: any[];
  events: any[];
  trainingSessions: any[];
  trainingAttendance: any[];
  chemistry: any[];
  onOpenMatch: (m: any, tab?: any) => void;
  onOpenPlayer: (p: any) => void;
  initialPlayerId?: string;
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

export function PlayerCareerHub({
  players,
  parentPlayerIds,
  stats,
  trainingStats,
  matches,
  attendance,
  events,
  trainingSessions,
  trainingAttendance,
  chemistry,
  onOpenMatch,
  onOpenPlayer,
  initialPlayerId,
  initialTab = "overview"
}: PlayerCareerHubProps) {
  const supabase = createClient();

  // Filtruj dzieci przypisane do konta rodzica
  const children = useMemo(() => {
    return players.filter(p => parentPlayerIds.includes(p.id));
  }, [players, parentPlayerIds]);

  // Stan wybranego dziecka
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialPlayerId && parentPlayerIds.includes(initialPlayerId)
      ? initialPlayerId
      : children[0]?.id || ""
  );

  // Aktywna zakładka: 5 zakładek zgodnie z projektem V7A / V7B
  const [activeTab, setActiveTab] = useState<"overview" | "career" | "stats" | "achievements" | "cards">(initialTab);

  // Lokalne kopie obecności (do natychmiastowego optymistycznego UI)
  const [localAttendance, setLocalAttendance] = useState<Attendance[]>(attendance);
  const [localTrAttendance, setLocalTrAttendance] = useState<TrainingAttendance[]>(trainingAttendance);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  // Karty kolekcjonerskie i user_cards
  const [cards, setCards] = useState<any[]>([]);
  const [userCards, setUserCards] = useState<any[]>([]);

  // Synchronizacja przy zmianie propsów
  useEffect(() => {
    setLocalAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    setLocalTrAttendance(trainingAttendance);
  }, [trainingAttendance]);

  useEffect(() => {
    if (children.length > 0 && !children.some(c => c.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  // Wczytanie checklisty z localStorage
  useEffect(() => {
    if (!selectedChildId) return;
    try {
      const saved = localStorage.getItem(`delta_prematch_checklist_${selectedChildId}`);
      if (saved) {
        setChecklist(JSON.parse(saved));
      } else {
        setChecklist({});
      }
    } catch {}
  }, [selectedChildId]);

  // Pobieranie kart i user_cards
  useEffect(() => {
    let isMounted = true;
    async function loadCardsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Definicje kart
        const { data: defs } = await supabase
          .from("card_definitions")
          .select("*")
          .eq("is_active", true);

        if (isMounted && defs) {
          setCards(defs);
        }

        // 2. Karty użytkownika
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
        console.warn("Błąd ładowania kart w PlayerCareerHub:", err);
      }
    }

    loadCardsData();
    return () => { isMounted = false; };
  }, [supabase]);

  // Aktywne dziecko
  const activeChild = children.find(c => c.id === selectedChildId) || children[0];

  // Jeśli brak przypisanego dziecka — FAZA 10: Pusty stan dla rodzica
  if (!children.length || !activeChild) {
    return (
      <section className="section v7b-career-hub-container">
        <div className="v7b-empty-state-card devil-card">
          <UserCheck size={48} className="empty-icon text-yellow-400" />
          <h2>Strefa Rodzica • Moje Dziecko</h2>
          <p>
            Administrator lub trener nie przypisał jeszcze zawodnika do Twojego konta rodzica.
            Skontaktuj się ze sztabem szkoleniowym K.S. Delta Warszawa, aby aktywować pełny profil piłkarski.
          </p>
        </div>
      </section>
    );
  }

  // Statystyki sportowe aktywnego dziecka
  const s = stats[activeChild.id] || { m: 0, starts: 0, captain: 0, g: 0, a: 0, mvp: 0 };
  const t = trainingStats[activeChild.id] || { sessions: 0, goals: 0, assists: 0, ga: 0, attendanceStreak: 0, games: 0, wins: 0 };

  // WYLICZENIE INDYWIDUALNEGO XP SPORTOWEGO (Zgodnie z Fazą 1: transparentne rozdzielenie)
  const presentTrainings = localTrAttendance.filter(
    a => a.player_id === activeChild.id && (a.status === "present" || a.status === "yes")
  ).length;

  const presentMatches = localAttendance.filter(
    a => a.player_id === activeChild.id && (a.status === "present" || a.status === "yes")
  ).length;

  const individualAttendanceXp = (presentTrainings * 40) + (presentMatches * 60);

  // Duet chemii z zespołem
  const pair = chemistry.find(x => x.a.id === activeChild.id || x.b.id === activeChild.id);
  const partner = pair ? (pair.a.id === activeChild.id ? pair.b : pair.a) : null;

  // Harmonogram nadchodzących meczów (najbliższe 2)
  const upcomingMatches = matches
    .filter(m => m.status === "scheduled" || m.status === "upcoming")
    .sort((a, b) => a.match_date.localeCompare(b.match_date))
    .slice(0, 2);

  // Harmonogram nadchodzących treningów (najbliższe 2)
  const upcomingTrainings = trainingSessions
    .filter(tr => new Date(tr.training_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.training_date.localeCompare(b.training_date))
    .slice(0, 2);

  // Forma z ostatnich 5 rozegranych meczów
  const recentPlayedMatches = matches
    .filter(m => m.status === "played")
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, 5);

  // Maksimum goli w jednym meczu do osiągnięć
  const maxGoalsSingleMatch = useMemo(() => {
    let max = 0;
    matches.forEach(m => {
      const g = events.filter(e => e.match_id === m.id && e.player_id === activeChild.id && e.event_type === "goal").length;
      if (g > max) max = g;
    });
    return max;
  }, [matches, events, activeChild.id]);

  // 1-Click RSVP na mecz
  const handleMatchRsvp = async (matchId: string, newStatus: "yes" | "no" | "maybe") => {
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

  // Obsługa checklisty
  const handleToggleChecklist = (itemId: string) => {
    const updated = {
      ...checklist,
      [itemId]: !checklist[itemId]
    };
    setChecklist(updated);
    try {
      localStorage.setItem(`delta_prematch_checklist_${activeChild.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Generowanie oficjalnej pamiątkowej karty A4 w formacie canvas
  const handleDownloadPlayerCard = async () => {
    setDownloadingCard(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1680;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Tło: Carbon Obsidian + Deep Inferno Crimson Glow
      const bgGrad = ctx.createRadialGradient(600, 700, 50, 600, 840, 950);
      bgGrad.addColorStop(0, "#1f0a10");
      bgGrad.addColorStop(0.4, "#0f0508");
      bgGrad.addColorStop(1, "#030407");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1680);

      // Siatka
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1680);
        ctx.stroke();
      }
      for (let y = 0; y < 1680; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // 2. Złote i Karmazynowe Ramki Kolekcjonerskie
      ctx.strokeStyle = "#e2b94f";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, 1120, 1600);

      ctx.strokeStyle = "rgba(226, 46, 48, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(52, 52, 1096, 1576);

      // Narożniki ozdobne
      const drawCorner = (cx: number, cy: number) => {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(cx - 10, cy - 10, 20, 20);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 10, cy - 10, 20, 20);
      };
      drawCorner(40, 40);
      drawCorner(1160, 40);
      drawCorner(40, 1640);
      drawCorner(1160, 1640);

      // 3. Nagłówek Klubu
      ctx.fillStyle = "rgba(246, 201, 82, 0.9)";
      ctx.font = "900 24px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("K.S. DELTA WARSZAWA  •  ROCZNIK 2018 GÓRNY MOKOTÓW", 600, 105);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "700 16px 'Montserrat', sans-serif";
      ctx.fillText("OFICJALNA KARTA PAMIĄTKOWA  •  SEZON 2026/2027", 600, 135);

      // 4. OVR Badge (motywacyjny)
      const ovr = Math.min(99, Math.max(78, 82 + Math.min(12, s.g + s.a + Math.floor(t.sessions / 2))));
      ctx.beginPath();
      ctx.roundRect(90, 180, 120, 150, 16);
      ctx.fillStyle = "#0c0e14";
      ctx.fill();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.font = "900 58px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(ovr), 150, 255);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 20px 'Montserrat', sans-serif";
      const posAbbr = (activeChild.position || "POM").slice(0, 3).toUpperCase();
      ctx.fillText(posAbbr, 150, 290);

      // 5. Imię Zawodnika
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 54px 'Montserrat', sans-serif";
      ctx.fillText(activeChild.display_name.toUpperCase(), 600, 630);

      ctx.fillStyle = "#e22e30";
      ctx.font = "800 22px 'Montserrat', sans-serif";
      ctx.fillText(`#${activeChild.shirt_number || "DELTA"}  •  ${(activeChild.position || "Zawodnik").toUpperCase()}`, 600, 670);

      // 6. Matryca Statystyk
      const statsMatrix = [
        { label: "MECZE LIGOWE", val: s.m, unit: "występów", icon: "⚽" },
        { label: "BRAMKI", val: s.g, unit: "goli", icon: "🔥" },
        { label: "ASYSTY", val: s.a, unit: "asyst", icon: "🎯" },
        { label: "TRENINGI", val: t.sessions, unit: "zbiórek", icon: "🏃" },
        { label: "PUNKTY XP", val: individualAttendanceXp, unit: "XP obecności", icon: "⭐" },
        { label: "SERIA OBECNOŚCI", val: t.attendanceStreak, unit: "treningów", icon: "⚡" }
      ];

      const startGridX = 100;
      const startGridY = 740;
      const tileW = 310;
      const tileH = 130;
      const gapX = 35;
      const gapY = 25;

      statsMatrix.forEach((item, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = startGridX + col * (tileW + gapX);
        const y = startGridY + row * (tileH + gapY);

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(246, 201, 82, 0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "800 15px 'Montserrat', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${item.icon} ${item.label}`, x + 20, y + 38);

        ctx.fillStyle = "#facc15";
        ctx.font = "900 44px 'Montserrat', sans-serif";
        ctx.fillText(String(item.val), x + 20, y + 90);

        ctx.fillStyle = "#64748b";
        ctx.font = "700 13px 'Montserrat', sans-serif";
        ctx.fillText(item.unit, x + 20, y + 114);
      });

      // 7. Box Wartości i Zespołu
      const boxY = 1080;
      ctx.fillStyle = "rgba(8, 12, 20, 0.9)";
      ctx.beginPath();
      ctx.roundRect(100, boxY, 1000, 360, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(226, 46, 48, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.font = "900 24px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⭐ CHARAKTER, PASJA I PRACA ZESPOŁOWA", 600, boxY + 55);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 20px 'Montserrat', sans-serif";
      ctx.fillText(`Najlepsze zgranie treningowe: ${partner ? partner.display_name : "Zgrany z całą drużyną DELTY"}`, 600, boxY + 110);
      ctx.fillText(`Punkty G+A w grach wewnętrznych: ${t.ga} akcji bramkowych`, 600, boxY + 150);
      ctx.fillText(`Seria obecności na treningach: ${t.attendanceStreak} z rzędu`, 600, boxY + 190);

      ctx.fillStyle = "#f87171";
      ctx.font = "italic 700 22px 'Montserrat', sans-serif";
      ctx.fillText('"JEDEN ZA WSZYSTKICH, WSZYSCY ZA JEDNEGO!"', 600, boxY + 260);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 16px 'Montserrat', sans-serif";
      ctx.fillText("Klub Sportowy Delta Warszawa • Górny Mokotów • Rocznik 2018", 600, boxY + 310);

      // 8. Pieczęć Złota
      ctx.fillStyle = "rgba(246, 201, 82, 0.85)";
      ctx.font = "900 18px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("★ OFICJALNY CERTYFIKAT KOLEKCJONERSKI DELTA WARSZAWA ★", 600, 1540);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 14px 'Montserrat', sans-serif";
      ctx.fillText(`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")} • ID: DELTA-2018-GM-${activeChild.id.slice(0, 8).toUpperCase()}`, 600, 1580);

      // Pobranie pliku PNG
      const link = document.createElement("a");
      link.download = `karta-kolekcjonerska-${activeChild.display_name.toLowerCase().replace(/\s+/g, "-")}-delta.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) {
      console.error("Błąd generowania karty:", err);
    } finally {
      setDownloadingCard(false);
    }
  };

  return (
    <section className="section v7b-career-hub-container">
      {/* 1. PRZEŁĄCZNIK RODZEŃSTWA (dla rodziców z >1 dzieckiem) */}
      {children.length > 1 && (
        <div className="v7b-child-selector-bar">
          {children.map(c => (
            <button
              key={c.id}
              type="button"
              className={`v7b-child-tab-btn ${c.id === selectedChildId ? "active" : ""}`}
              onClick={() => setSelectedChildId(c.id)}
            >
              <UserCheck size={16} />
              <span>{c.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 2. PLAYER HERO 2.0 */}
      <div className="v7b-hero-card devil-card">
        <div className="v7b-hero-glow-bg" />

        <div className="v7b-hero-main-row">
          {/* TOŻSAMOŚĆ ZAWODNIKA */}
          <div className="v7b-hero-identity">
            <div 
              className="v7b-hero-avatar-wrap" 
              onClick={() => onOpenPlayer(activeChild)}
              title="Kliknij, aby otworzyć szczegóły"
            >
              <PlayerPhoto playerId={activeChild.id} />
              <span className="v7b-hero-shirt-num">#{activeChild.shirt_number || "-"}</span>
            </div>

            <div className="v7b-hero-meta">
              <div className="v7b-hero-badge-tag">
                <Sparkles size={12} />
                <span>DELTA PLAYER 2.0 • 2018 GM</span>
              </div>
              <h1>{activeChild.display_name}</h1>
              <p>
                <img src="/teamlogos/gm.png" alt="Herb" className="v7b-hero-crest-mini" />
                <span>{activeChild.position || "Zawodnik"} • K.S. Delta Warszawa Górny Mokotów</span>
              </p>
            </div>
          </div>

          {/* PASEK INDYWIDUALNEGO XP SPORTOWEGO */}
          <div className="v7b-hero-xp-widget" title="Indywidualne punkty doświadczenia za faktyczne obecności na treningach i meczach">
            <div className="v7b-xp-header">
              <span>XP ZAWODNIKA:</span>
              <b>
                <Sparkles size={13} />
                <span>{individualAttendanceXp} XP</span>
              </b>
            </div>
            <div className="v7b-xp-track">
              <div 
                className="v7b-xp-fill" 
                style={{ width: `${Math.min(100, Math.max(10, (individualAttendanceXp % 500) / 5))}%` }}
              />
            </div>
            <p className="v7b-xp-subtext">
              <Info size={12} />
              <span>+40 XP/trening • +60 XP/mecz ligowy</span>
            </p>
          </div>

          {/* AKCJE HERO */}
          <div className="v7b-hero-actions">
            <button
              type="button"
              className="v7b-btn-download-print"
              disabled={downloadingCard}
              onClick={handleDownloadPlayerCard}
              title="Pobierz oficjalną kartę kolekcjonerską w formacie A4"
            >
              <Download size={14} />
              <span>{downloadingCard ? "GENEROWANIE..." : "POBIERZ KARTĘ A4"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. NAWIGACJA (5 ZAKŁADEK) */}
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
          <span>MOJE KARTY</span>
        </button>
      </div>

      {/* 4. ZAWARTOŚĆ ZAKŁADEK */}

      {/* TAB 1: PRZEGLĄD */}
      {activeTab === "overview" && (
        <div className="v7b-tab-content overview-content space-y-6">
          {/* GŁÓWNE KPI DZIECKA */}
          <div className="v7b-kpi-grid">
            <div className="v7b-kpi-box">
              <b>{s.m}</b>
              <span>MECZE OFICJALNE</span>
            </div>
            <div className="v7b-kpi-box gold">
              <b>{s.g + s.a}</b>
              <span>GOLE + ASYSTY</span>
            </div>
            <div className="v7b-kpi-box crimson">
              <b>{s.mvp}</b>
              <span>TYTUŁY MVP</span>
            </div>
            <div className="v7b-kpi-box">
              <b>{t.sessions}</b>
              <span>TRENINGI</span>
            </div>
            <div className="v7b-kpi-box">
              <b>{t.ga}</b>
              <span>G+A TRENING</span>
            </div>
            <div className="v7b-kpi-box green">
              <b>{t.attendanceStreak} 🔥</b>
              <span>SERIA OBECNOŚCI</span>
            </div>
          </div>

          {/* DUO GRID: RADAR UMIEJĘTNOŚCI + 1-CLICK RSVP */}
          <div className="v7b-overview-duo-grid">
            {/* LEWA: EA FC RADAR UMIEJĘTNOŚCI */}
            <div className="v7b-card-panel devil-card">
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
            </div>

            {/* PRAWA: 1-CLICK RSVP */}
            <div className="v7b-card-panel devil-card">
              <div className="v7b-panel-heading">
                <CalendarDays size={18} />
                <span>SZYBKI STATUS OBECNOŚCI (1-CLICK RSVP)</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
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

                        <div className="v7b-rsvp-buttons-row">
                          <button
                            type="button"
                            disabled={isLoading}
                            className={`v7b-btn-rsvp yes ${rsvp === "yes" || rsvp === "present" ? "active" : ""}`}
                            onClick={() => handleMatchRsvp(m.id, "yes")}
                          >
                            <Check size={13} />
                            <span>BĘDĘ</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            className={`v7b-btn-rsvp no ${rsvp === "no" ? "active" : ""}`}
                            onClick={() => handleMatchRsvp(m.id, "no")}
                          >
                            <X size={13} />
                            <span>NIEOBECNY</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            className={`v7b-btn-rsvp maybe ${rsvp === "maybe" ? "active" : ""}`}
                            onClick={() => handleMatchRsvp(m.id, "maybe")}
                          >
                            <HelpCircle size={13} />
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

                        <div className="v7b-rsvp-buttons-row">
                          <button
                            type="button"
                            disabled={isLoading}
                            className={`v7b-btn-rsvp yes ${trRsvp === "present" || trRsvp === "yes" ? "active" : ""}`}
                            onClick={() => handleTrainingRsvp(tr.id, "yes")}
                          >
                            <Check size={13} />
                            <span>BĘDĘ</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            className={`v7b-btn-rsvp no ${trRsvp === "no" ? "active" : ""}`}
                            onClick={() => handleTrainingRsvp(tr.id, "no")}
                          >
                            <X size={13} />
                            <span>NIEOBECNY</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            className={`v7b-btn-rsvp maybe ${trRsvp === "maybe" ? "active" : ""}`}
                            onClick={() => handleTrainingRsvp(tr.id, "maybe")}
                          >
                            <HelpCircle size={13} />
                            <span>DO POTWIERDZENIA</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
                  <Zap size={22} />
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
            <div className="v7b-card-panel devil-card">
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
            onOpenMatch={(m) => onOpenMatch(m, "summary")}
          />
        </div>
      )}

      {/* TAB 3: STATYSTYKI */}
      {activeTab === "stats" && (
        <div className="v7b-tab-content stats-content space-y-6">
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
    </section>
  );
}

export default PlayerCareerHub;
