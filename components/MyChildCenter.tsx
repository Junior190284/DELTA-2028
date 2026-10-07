"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";
import PlayerSkillRadar from "./PlayerSkillRadar";
import { 
  UserCheck, 
  CalendarDays, 
  Trophy, 
  Award, 
  Flame, 
  Zap, 
  Heart, 
  Check, 
  X, 
  HelpCircle, 
  Download, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Target, 
  Shirt, 
  CheckSquare, 
  Square,
  Clock,
  Star,
  MapPin
} from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path: string | null;
  active: boolean;
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
  round_no: number | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
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
  player_id: string | null;
  assist_player_id: string | null;
  minute: number | null;
}

interface TrainingSession {
  id: string;
  training_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  title: string;
  notes: string | null;
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

interface MyChildCenterProps {
  players: Player[];
  parentPlayerIds: string[];
  stats: Record<string, Stat>;
  trainingStats: Record<string, TrainingStat>;
  matches: Match[];
  attendance: Attendance[];
  events: Event[];
  trainingSessions: TrainingSession[];
  trainingAttendance: TrainingAttendance[];
  chemistry: Pair[];
  onOpenMatch: (m: Match, tab: "summary" | "attendance") => void;
  onOpenPlayer: (p: Player) => void;
}

const CHECKLIST_ITEMS = [
  { id: "guards", label: "Ochraniacze na piszczele", icon: "🛡️" },
  { id: "kit", label: "Meczowy strój DELTA + czarne getry", icon: "👕" },
  { id: "bottle", label: "Podpisany bidon z czystą wodą", icon: "💧" },
  { id: "boots", label: "Wyczyszczone korki / turfy", icon: "👟" },
  { id: "dryclothes", label: "Sucha odzież i bluza na zmianę po meczu", icon: "🧥" },
  { id: "snack", label: "Lekka przekąska (banan / batonik owocowy)", icon: "🍌" }
];

export function MyChildCenter({
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
  onOpenPlayer
}: MyChildCenterProps) {
  const supabase = createClient();
  const children = players.filter(p => parentPlayerIds.includes(p.id));
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id || "");
  const [localAttendance, setLocalAttendance] = useState<Attendance[]>(attendance);
  const [localTrAttendance, setLocalTrAttendance] = useState<TrainingAttendance[]>(trainingAttendance);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    if (children.length > 0 && !parentPlayerIds.includes(selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, parentPlayerIds, selectedChildId]);

  useEffect(() => {
    setLocalAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    setLocalTrAttendance(trainingAttendance);
  }, [trainingAttendance]);

  // Wczytaj checklista z localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`delta_prematch_checklist_${selectedChildId}`);
      if (saved) {
        setChecklist(JSON.parse(saved));
      }
    } catch {}
  }, [selectedChildId]);

  const activeChild = children.find(c => c.id === selectedChildId) || children[0];

  if (!children.length || !activeChild) {
    return (
      <section className="section v10-my-child">
        <div className="v10-empty devil-card">
          <UserCheck size={40} />
          <h2>Strefa Rodzica • Moje Dziecko</h2>
          <p>Administrator nie przypisał jeszcze zawodnika do Twojego konta. Skontaktuj się z trenerem lub administratorem klubu.</p>
        </div>
      </section>
    );
  }

  const s = stats[activeChild.id] || { m: 0, starts: 0, captain: 0, g: 0, a: 0, mvp: 0 };
  const t = trainingStats[activeChild.id] || { sessions: 0, goals: 0, assists: 0, ga: 0, attendanceStreak: 0, games: 0, wins: 0 };

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

  // Forma z ostatnich 5 meczów
  const recentPlayedMatches = matches
    .filter(m => m.status === "played")
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, 5);

  // Obsługa 1-Click RSVP na mecz
  const handleMatchRsvp = async (matchId: string, newStatus: "yes" | "no" | "maybe") => {
    setRsvpLoading(`match-${matchId}`);
    try {
      const { error } = await supabase
        .from("match_attendance")
        .upsert(
          { match_id: matchId, player_id: activeChild.id, status: newStatus },
          { onConflict: "match_id,player_id" }
        );

      if (!error) {
        setLocalAttendance(prev => {
          const filtered = prev.filter(a => !(a.match_id === matchId && a.player_id === activeChild.id));
          return [...filtered, { match_id: matchId, player_id: activeChild.id, status: newStatus }];
        });
      }
    } catch (err) {
      console.error("Błąd RSVP meczu:", err);
    } finally {
      setRsvpLoading(null);
    }
  };

  // Obsługa 1-Click RSVP na trening
  const handleTrainingRsvp = async (trainingId: string, newStatus: "yes" | "no" | "maybe") => {
    setRsvpLoading(`training-${trainingId}`);
    try {
      const { error } = await supabase
        .from("training_attendance")
        .upsert(
          { training_id: trainingId, player_id: activeChild.id, status: newStatus },
          { onConflict: "training_id,player_id" }
        );

      if (!error) {
        setLocalTrAttendance(prev => {
          const filtered = prev.filter(a => !(a.training_id === trainingId && a.player_id === activeChild.id));
          return [...filtered, { training_id: trainingId, player_id: activeChild.id, status: newStatus }];
        });
      }
    } catch (err) {
      console.error("Błąd RSVP treningu:", err);
    } finally {
      setRsvpLoading(null);
    }
  };

  // Toggle checklisty
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

  // Generowanie ultra-premium oficjalnej karty kolekcjonerskiej DELTA (format A4 / print 1200x1680)
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

      // Subtelny wzór siatki
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
      // Ramka zewnętrzna złota
      ctx.strokeStyle = "#e2b94f";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, 1120, 1600);

      // Ramka wewnętrzna czerwona
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
      ctx.letterSpacing = "4px";
      ctx.fillText("K.S. DELTA WARSZAWA  •  ROCZNIK 2018 GÓRNY MOKOTÓW", 600, 105);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "700 16px 'Montserrat', sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("OFICJALNA KARTA PAMIĄTKOWA  •  SEZON 2026/2027", 600, 135);

      // 4. OVR Badge (Lewa Góra)
      const ovr = Math.min(99, Math.max(78, 82 + Math.min(12, s.g + s.a + Math.floor(t.sessions / 2))));
      ctx.fillStyle = "linear-gradient(135deg, #facc15, #b45309)";
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

      ctx.fillStyle = "#e22e30";
      ctx.font = "800 14px 'Montserrat', sans-serif";
      ctx.fillText(`#${activeChild.shirt_number || "GM"}`, 150, 315);

      // 5. Zdjęcie / Awatar Zawodnika w Złotym Kole
      const photoCenterX = 600;
      const photoCenterY = 390;
      const photoRadius = 170;

      ctx.save();
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10, 14, 22, 0.95)";
      ctx.fill();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.clip();

      // Próba załadowania zdjęcia zawodnika
      try {
        const isRyszard = activeChild.display_name.toLowerCase().includes("ryszard");
        const photoSrc = isRyszard 
          ? "/assets/ryszard-player-card.png" 
          : activeChild.photo_path 
            ? activeChild.photo_path 
            : `/api/player-photo/${activeChild.id}`;

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, photoCenterX - photoRadius, photoCenterY - photoRadius, photoRadius * 2, photoRadius * 2);
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = photoSrc;
        });
      } catch {
        // fallback - sylwetka
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.arc(photoCenterX, photoCenterY + 40, 100, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 6. Imię i Nazwisko Zawodnika
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 54px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 15;
      ctx.fillText(activeChild.display_name.toUpperCase(), 600, 630);
      ctx.shadowBlur = 0;

      // Pasek Pozycji i Numeru
      ctx.fillStyle = "rgba(226, 46, 48, 0.95)";
      ctx.beginPath();
      ctx.roundRect(400, 660, 400, 42, 21);
      ctx.fill();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 18px 'Montserrat', sans-serif";
      ctx.fillText(`${activeChild.position || "ZAWODNIK DELTA"}  •  NUMER #${activeChild.shirt_number || "GM"}`, 600, 688);

      // 7. Statystyki Meczowe i Treningowe (6 Kafelków Karty)
      const attendancePercent = trainingSessions.length > 0 ? Math.round((t.sessions / trainingSessions.length) * 100) : 100;
      const statsMatrix = [
        { label: "MECZE", val: s.m, unit: "ROZEGRANE", icon: "🏟️" },
        { label: "GOLE", val: s.g, unit: "BRAMKI", icon: "⚽" },
        { label: "ASYSTY", val: s.a, unit: "PODANIA", icon: "⭐" },
        { label: "MVP", val: s.mvp, unit: "TYTUŁY", icon: "👑" },
        { label: "TRENINGI", val: t.sessions, unit: "OBECNOŚCI", icon: "🏃" },
        { label: "FREKWENCJA", val: `${attendancePercent}%`, unit: "ZAANGAŻOWANIE", icon: "🔥" }
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

        // Etykieta & Ikona
        ctx.fillStyle = "#94a3b8";
        ctx.font = "800 15px 'Montserrat', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${item.icon} ${item.label}`, x + 20, y + 38);

        // Wartość
        ctx.fillStyle = "#facc15";
        ctx.font = "900 44px 'Montserrat', sans-serif";
        ctx.fillText(String(item.val), x + 20, y + 90);

        ctx.fillStyle = "#64748b";
        ctx.font = "700 13px 'Montserrat', sans-serif";
        ctx.fillText(item.unit, x + 20, y + 114);
      });

      // 8. Box Formy i Zgrania z Zespołem
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

      // Motto
      ctx.fillStyle = "#f87171";
      ctx.font = "italic 700 22px 'Montserrat', sans-serif";
      ctx.fillText('"JEDEN ZA WSZYSTKICH, WSZYSCY ZA JEDNEGO!"', 600, boxY + 260);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 16px 'Montserrat', sans-serif";
      ctx.fillText("Klub Sportowy Delta Warszawa • Górny Mokotów • Rocznik 2018", 600, boxY + 310);

      // 9. Oficjalna Pieczęć Złota na dole
      ctx.fillStyle = "rgba(246, 201, 82, 0.85)";
      ctx.font = "900 18px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("★ OFICJALNY CERTYFIKAT KOLEKCJONERSKI DELTA WARSZAWA ★", 600, 1540);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 14px 'Montserrat', sans-serif";
      ctx.fillText(`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")} • Identyfikator karty: DELTA-2018-GM-${activeChild.id.slice(0, 8).toUpperCase()}`, 600, 1580);

      // 10. Pobranie pliku PNG wysokiej jakości
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
    <section className="section v10-my-child v200-mychild-container">
      {/* PRZEŁĄCZNIK DZIECI (jeśli rodzic ma >1) */}
      {children.length > 1 && (
        <div className="v200-child-selector-bar">
          {children.map(c => (
            <button
              key={c.id}
              type="button"
              className={`v200-child-tab-btn ${c.id === selectedChildId ? "active" : ""}`}
              onClick={() => setSelectedChildId(c.id)}
            >
              <UserCheck size={16} />
              <span>{c.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* GŁÓWNY HERO PANEL DZIECKA */}
      <div className="v200-child-hero-card devil-card">
        <div className="v200-child-hero-main">
          <div className="v200-child-avatar-wrap" onClick={() => onOpenPlayer(activeChild)}>
            <PlayerPhoto playerId={activeChild.id} />
            <span className="v200-avatar-num">#{activeChild.shirt_number || "-"}</span>
          </div>

          <div className="v200-child-meta">
            <div className="v200-child-badge">
              <Sparkles size={13} />
              <span>PROFIL ZAWODNIKA • DELTA 2018 GM</span>
            </div>
            <h2>{activeChild.display_name}</h2>
            <p>{activeChild.position || "Zawodnik"} • K.S. Delta Warszawa Górny Mokotów</p>
          </div>

          <div className="v200-child-hero-actions">
            <button
              type="button"
              className="v200-btn-download-card"
              disabled={downloadingCard}
              onClick={handleDownloadPlayerCard}
              title="Generuj kartę pamiątkową do druku lub zapisania"
            >
              <Download size={15} />
              <span>{downloadingCard ? "GENEROWANIE..." : "POBIERZ KARTĘ DO DRUKU"}</span>
            </button>

            <button
              type="button"
              className="v200-btn-open-full-profile"
              onClick={() => onOpenPlayer(activeChild)}
            >
              <span>PEŁNE STATYSTYKI</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* GŁÓWNE KPI DZIECKA */}
        <div className="v200-child-kpi-grid">
          <div className="v200-kpi-box">
            <b>{s.m}</b>
            <span>MECZE OFICJALNE</span>
          </div>
          <div className="v200-kpi-box gold">
            <b>{s.g + s.a}</b>
            <span>GOLE + ASYSTY</span>
          </div>
          <div className="v200-kpi-box">
            <b>{s.mvp}</b>
            <span>TYTUŁY MVP</span>
          </div>
          <div className="v200-kpi-box">
            <b>{t.sessions}</b>
            <span>TRENINGI</span>
          </div>
          <div className="v200-kpi-box">
            <b>{t.ga}</b>
            <span>G+A TRENING</span>
          </div>
          <div className="v200-kpi-box green">
            <b>{t.attendanceStreak}</b>
            <span>SERIA OBECNOŚCI 🔥</span>
          </div>
        </div>
      </div>

      {/* GŁÓWNA SIATKA DWOISTA: RADAR UMIEJĘTNOŚCI + SZYBKI RSVP */}
      <div className="v200-child-duo-grid">
        {/* LEWA STRONA: SZEŚCIOKĄTNY RADAR UMIEJĘTNOŚCI (EA FC RADAR) */}
        <div className="v200-child-radar-card devil-card">
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

        {/* PRAWA STRONA: SZYBKI MENADŻER OBECNOŚCI (1-CLICK RSVP) */}
        <div className="v200-child-rsvp-card devil-card">
          <div className="v8-panel-title">
            <CalendarDays size={18} /> SZYBKI STATUS OBECNOŚCI (1-CLICK RSVP)
          </div>
          <p className="v200-rsvp-note">
            Zgłoś dyspozycyjność swojego dziecka na najbliższe mecze i treningi jednym kliknięciem:
          </p>

          <div className="v200-rsvp-items-list">
            {/* 1. NADCHODZĄCY MECZ */}
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map(m => {
                const rsvp = localAttendance.find(a => a.match_id === m.id && a.player_id === activeChild.id)?.status || "";
                const isLoading = rsvpLoading === `match-${m.id}`;

                return (
                  <div key={m.id} className="v200-rsvp-item match-event">
                    <div className="v200-rsvp-item-header">
                      <span className="event-tag match">⚽ MECZ LIGOWY</span>
                      <small>{new Date(m.match_date).toLocaleDateString("pl-PL")} • {m.match_time?.slice(0, 5) || "Godz. do ustalenia"}</small>
                    </div>

                    <h4>{m.home_team} vs {m.away_team}</h4>
                    <p><MapPin size={12} /> {m.venue || "Boisko ligowe"}</p>

                    <div className="v200-rsvp-action-btns">
                      <button
                        type="button"
                        disabled={isLoading}
                        className={`v200-rsvp-btn yes ${rsvp === "yes" || rsvp === "present" ? "active" : ""}`}
                        onClick={() => handleMatchRsvp(m.id, "yes")}
                      >
                        <Check size={14} />
                        <span>BĘDĘ</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        className={`v200-rsvp-btn no ${rsvp === "no" ? "active" : ""}`}
                        onClick={() => handleMatchRsvp(m.id, "no")}
                      >
                        <X size={14} />
                        <span>NIEOBECNY</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        className={`v200-rsvp-btn maybe ${rsvp === "maybe" ? "active" : ""}`}
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
              <div className="v200-no-event-hint">Brak zaplanowanych meczów ligowych w najbliższych dniach.</div>
            )}

            {/* 2. NADCHODZĄCE TRENINGI */}
            {upcomingTrainings.length > 0 && (
              upcomingTrainings.map(tr => {
                const trRsvp = localTrAttendance.find(a => a.training_id === tr.id && a.player_id === activeChild.id)?.status || "";
                const isLoading = rsvpLoading === `training-${tr.id}`;

                return (
                  <div key={tr.id} className="v200-rsvp-item training-event">
                    <div className="v200-rsvp-item-header">
                      <span className="event-tag training">🏃 TRENING ZESPOŁU</span>
                      <small>{new Date(tr.training_date).toLocaleDateString("pl-PL")} • {tr.start_time?.slice(0, 5) || "17:00"}</small>
                    </div>

                    <h4>{tr.title || "Trening rocznika 2018 GM"}</h4>
                    <p><MapPin size={12} /> {tr.location || "Boisko klubowe"}</p>

                    <div className="v200-rsvp-action-btns">
                      <button
                        type="button"
                        disabled={isLoading}
                        className={`v200-rsvp-btn yes ${trRsvp === "present" || trRsvp === "yes" ? "active" : ""}`}
                        onClick={() => handleTrainingRsvp(tr.id, "yes")}
                      >
                        <Check size={14} />
                        <span>BĘDĘ</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        className={`v200-rsvp-btn no ${trRsvp === "no" ? "active" : ""}`}
                        onClick={() => handleTrainingRsvp(tr.id, "no")}
                      >
                        <X size={14} />
                        <span>NIEOBECNY</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        className={`v200-rsvp-btn maybe ${trRsvp === "maybe" ? "active" : ""}`}
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
      </div>

      {/* DOLNY PASEK: FORMA + CHEMIA + PRZEDMECZOWA CHECKLISTA */}
      <div className="v200-child-bottom-grid">
        {/* 1. FORMA I ZGRANIE Z ZESPOŁEM */}
        <div className="v200-child-form-card devil-card">
          <div className="v8-panel-title">
            <Zap size={18} /> FORMA MECZOWA I ZGRANIE
          </div>

          <div className="v200-form-matches-strip">
            <span className="strip-title">OSTATNIE SPOTKANIA:</span>
            <div className="strip-icons">
              {recentPlayedMatches.map(m => {
                const goalsInMatch = events.filter(e => e.match_id === m.id && e.player_id === activeChild.id && e.event_type === "goal").length;
                const isHome = m.home_team.toLowerCase().includes("delta");
                const deltaScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
                const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
                const res = deltaScore > oppScore ? "W" : deltaScore === oppScore ? "R" : "P";

                return (
                  <div key={m.id} className={`v200-match-bubble res-${res.toLowerCase()}`} title={`${m.home_team} vs ${m.away_team} (${deltaScore}:${oppScore})`}>
                    <b>{goalsInMatch > 0 ? `⚽${goalsInMatch}` : res}</b>
                    <small>{new Date(m.match_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}</small>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHEMIA Z PARTNEREM */}
          <div className="v200-chemistry-box">
            <div className="chem-icon-box">
              <Zap size={22} />
            </div>
            <div className="chem-text">
              <small>NAJLEPSZY PARTNER BOISKOWY</small>
              <b>{partner ? partner.display_name : "Zgrany z całym zespołem"}</b>
              <span>{pair ? `${pair.score}% zgrania • ${pair.games} wspólnych gier treningowych` : "Współpraca na treningach buduje formę meczową!"}</span>
            </div>
          </div>
        </div>

        {/* 2. PRZEDMECZOWA CHECKLISTA MISTRZA */}
        <div className="v200-child-checklist-card devil-card">
          <div className="v8-panel-title">
            <Shirt size={18} /> PRZEDMECZOWA CHECKLISTA TORBY
          </div>
          <p className="v200-checklist-hint">
            Sprawdź z dzieckiem przed wyjściem na mecz czy wszystko jest spakowane:
          </p>

          <div className="v200-checklist-items">
            {CHECKLIST_ITEMS.map(item => {
              const checked = !!checklist[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`v200-checklist-row ${checked ? "is-checked" : ""}`}
                  onClick={() => handleToggleChecklist(item.id)}
                >
                  <span className="item-emoji">{item.icon}</span>
                  <span className="item-text">{item.label}</span>
                  {checked ? (
                    <CheckSquare size={18} className="check-icon-active" />
                  ) : (
                    <Square size={18} className="check-icon-empty" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MyChildCenter;
