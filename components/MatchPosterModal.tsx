"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Download, 
  Share2, 
  Check, 
  X, 
  Trophy, 
  Star, 
  Crown, 
  Calendar, 
  MapPin, 
  Flame, 
  Sparkles,
  Copy
} from "lucide-react";

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

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
}

interface Event {
  id: string;
  match_id: string;
  event_type: string;
  player_id: string | null;
  assist_player_id: string | null;
  minute: number | null;
}

interface Lineup {
  match_id: string;
  player_id: string;
  is_starter: boolean;
  is_captain: boolean;
}

interface MatchPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  players: Player[];
  events: Event[];
  lineup: Lineup[];
}

import { formatTeamName, getTeamLogo } from "@/lib/teams";

export default function MatchPosterModal({
  isOpen,
  onClose,
  match,
  players,
  events,
  lineup
}: MatchPosterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const matchEvents = events.filter(e => e.match_id === match.id);
  const matchLineup = lineup.filter(l => l.match_id === match.id);

  const goalEvents = matchEvents.filter(e => e.event_type === "goal");
  const mvpEvent = matchEvents.find(e => e.event_type === "mvp");
  const captainItem = matchLineup.find(l => l.is_captain);

  const mvpName = players.find(p => p.id === mvpEvent?.player_id)?.display_name;
  const captainName = players.find(p => p.id === captainItem?.player_id)?.display_name;

  const homeTeamName = useMemo(() => formatTeamName(match.home_team), [match.home_team]);
  const awayTeamName = useMemo(() => formatTeamName(match.away_team), [match.away_team]);

  // Grupuj strzelców bramek
  const scorersSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; assists: string[] }> = {};
    goalEvents.forEach(e => {
      const p = players.find(x => x.id === e.player_id);
      const name = p ? p.display_name : "Zawodnik DELTY";
      const assistPlayer = e.assist_player_id ? players.find(x => x.id === e.assist_player_id) : null;
      
      if (!map[name]) {
        map[name] = { name, count: 0, assists: [] };
      }
      map[name].count += 1;
      if (assistPlayer) {
        map[name].assists.push(assistPlayer.display_name.split(" ")[0]);
      }
    });
    return Object.values(map);
  }, [goalEvents, players]);

  // Generuj grafikę na HTML5 Canvas 1080x1080
  const generatePosterCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Tło Gradient Dark Obsidian + Red Crimson
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0a0c12");
    bgGrad.addColorStop(0.4, "#140a10");
    bgGrad.addColorStop(0.7, "#1c060b");
    bgGrad.addColorStop(1, "#07080c");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Radial Glowing Spotlights
    const radialTop = ctx.createRadialGradient(width / 2, 340, 50, width / 2, 340, 480);
    radialTop.addColorStop(0, "rgba(246, 201, 82, 0.18)");
    radialTop.addColorStop(0.5, "rgba(226, 46, 48, 0.15)");
    radialTop.addColorStop(1, "transparent");
    ctx.fillStyle = radialTop;
    ctx.fillRect(0, 0, width, height);

    // 3. Ramka ozdobna z subtelną złotą linią
    ctx.strokeStyle = "rgba(246, 201, 82, 0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, width - 64, height - 64);

    ctx.strokeStyle = "rgba(226, 46, 48, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(42, 42, width - 84, height - 84);

    // Narożniki ozdobne
    const drawCorner = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = "#f6c952";
      ctx.fillRect(0, 0, 24, 4);
      ctx.fillRect(0, 0, 4, 24);
      ctx.restore();
    };
    drawCorner(32, 32, 0);
    drawCorner(width - 32, 32, 90);
    drawCorner(width - 32, height - 32, 180);
    drawCorner(32, height - 32, 270);

    // 4. Nagłówek Górny
    ctx.textAlign = "center";
    ctx.fillStyle = "#f6c952";
    ctx.font = "900 24px 'Montserrat', sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("K.S. DELTA WARSZAWA GM 2018", width / 2, 90);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 18px 'Montserrat', sans-serif";
    const matchDateStr = new Date(`${match.match_date}T12:00:00`).toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).toUpperCase();
    const roundStr = match.round_no ? `KOLEJKA ${match.round_no} • ` : "";
    ctx.fillText(`${roundStr}${matchDateStr}${match.venue ? ` • ${match.venue}` : ""}`, width / 2, 126);

    // Linia rozdzielająca
    const headLine = ctx.createLinearGradient(160, 150, width - 160, 150);
    headLine.addColorStop(0, "transparent");
    headLine.addColorStop(0.5, "rgba(246, 201, 82, 0.6)");
    headLine.addColorStop(1, "transparent");
    ctx.strokeStyle = headLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(160, 150);
    ctx.lineTo(width - 160, 150);
    ctx.stroke();

    // 5. Sekcja Drużyn i Wyniku
    // Helper do wczytania obrazu
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
      });
    };

    const homeLogoSrc = getTeamLogo(match.home_team) || "/teamlogos/gm.png";
    const awayLogoSrc = getTeamLogo(match.away_team) || "/teamlogos/gm.png";

    try {
      const [homeLogo, awayLogo] = await Promise.all([
        loadImage(homeLogoSrc).catch(() => null),
        loadImage(awayLogoSrc).catch(() => null),
      ]);

      // Herb gospodarzy
      if (homeLogo) {
        ctx.drawImage(homeLogo, 170, 220, 140, 140);
      }
      // Herb gości
      if (awayLogo) {
        ctx.drawImage(awayLogo, width - 310, 220, 140, 140);
      }
    } catch {}

    // Nazwy drużyn
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px 'Montserrat', sans-serif";
    ctx.textAlign = "center";
    
    // Zawijanie tekstu dla gospodarza
    ctx.fillText(homeTeamName, 240, 400, 320);
    // Zawijanie tekstu dla gościa
    ctx.fillText(awayTeamName, width - 240, 400, 320);

    // Wynik meczu na środku
    const hs = match.home_score !== null ? match.home_score : "-";
    const as = match.away_score !== null ? match.away_score : "-";

    // Pudełko wyniku
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.strokeStyle = "rgba(246, 201, 82, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(width / 2 - 130, 225, 260, 130, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f6c952";
    ctx.font = "1000 78px 'Montserrat', sans-serif";
    ctx.fillText(`${hs} : ${as}`, width / 2, 318);

    ctx.fillStyle = "#ff4d58";
    ctx.font = "900 16px 'Montserrat', sans-serif";
    const statusText = match.status === "played" ? "WYNIK KOŃCOWY" : "ZAPOWIEDŹ SPOTKANIA";
    ctx.fillText(statusText, width / 2, 385);

    // 6. Karta Strzelców i Bohaterów
    const cardY = 460;
    const cardH = 480;
    ctx.fillStyle = "rgba(16, 20, 28, 0.75)";
    ctx.strokeStyle = "rgba(246, 201, 82, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, cardY, width - 160, cardH, 18);
    ctx.fill();
    ctx.stroke();

    // Nagłówek strzelców
    ctx.fillStyle = "#f6c952";
    ctx.font = "900 22px 'Montserrat', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("⚽ BRAMKI I ASYSTY DELTY", 120, cardY + 50);

    // Lista strzelców
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 20px 'Montserrat', sans-serif";

    if (scorersSummary.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(match.status === "played" ? "Brak wpisanych strzelców w protokole" : "Przed rozpoczęciem meczu", 120, cardY + 100);
    } else {
      let curY = cardY + 95;
      scorersSummary.slice(0, 6).forEach((sc) => {
        ctx.fillStyle = "#f6c952";
        ctx.font = "900 22px 'Montserrat', sans-serif";
        ctx.fillText(`• ${sc.name}`, 120, curY);

        ctx.fillStyle = "#ffffff";
        ctx.font = "800 20px 'Montserrat', sans-serif";
        const goalsText = sc.count > 1 ? ` (${sc.count} gole)` : " (1 gol)";
        ctx.fillText(goalsText, 140 + ctx.measureText(`• ${sc.name}`).width, curY);

        if (sc.assists.length > 0) {
          ctx.fillStyle = "#94a3b8";
          ctx.font = "500 17px 'Montserrat', sans-serif";
          ctx.fillText(`[as. ${sc.assists.join(", ")}]`, 160 + ctx.measureText(`• ${sc.name}${goalsText}`).width, curY);
        }

        curY += 40;
      });
    }

    // Linia wewnątrz karty
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(120, cardY + 350);
    ctx.lineTo(width - 120, cardY + 350);
    ctx.stroke();

    // Wyróżnienia (MVP & Kapitan)
    ctx.textAlign = "left";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 20px 'Montserrat', sans-serif";

    if (mvpName) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("⭐ MVP SPOTKANIA:", 120, cardY + 395);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 22px 'Montserrat', sans-serif";
      ctx.fillText(mvpName, 340, cardY + 395);
    }

    if (captainName) {
      ctx.fillStyle = "#f87171";
      ctx.font = "700 20px 'Montserrat', sans-serif";
      ctx.fillText("👑 KAPITAN DRUŻYNY:", 120, cardY + 435);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 22px 'Montserrat', sans-serif";
      ctx.fillText(captainName, 360, cardY + 435);
    }

    // 7. Stopka z hasłem
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.font = "800 16px 'Montserrat', sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("RAZEM DO WIELKICH RZECZY • DELTA-WARSZAWA.PL", width / 2, height - 60);

    const dataUrl = canvas.toDataURL("image/png");
    setPreviewDataUrl(dataUrl);
    setImageLoaded(true);
  }, [match, players, goalEvents, mvpName, captainName, scorersSummary]);

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setCopied(false);
      setTimeout(() => {
        generatePosterCanvas();
      }, 100);
    }
  }, [isOpen, generatePosterCanvas]);

  const handleDownload = () => {
    if (!previewDataUrl) return;
    setDownloading(true);
    try {
      const link = document.createElement("a");
      const cleanOpponent = (match.home_team.includes("Delta") ? match.away_team : match.home_team)
        .replace(/\s+/g, "_")
        .toLowerCase();
      link.download = `delta_gm_mecz_${cleanOpponent}_${match.match_date}.png`;
      link.href = previewDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          // @ts-ignore
          await navigator.clipboard.write([
            // @ts-ignore
            new ClipboardItem({ "image/png": blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          // Fallback do pobierania
          handleDownload();
        }
      }, "image/png");
    } catch {
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="v200-poster-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-poster-sheet devil-card" onClick={(e) => e.stopPropagation()}>
        <div className="v200-poster-head">
          <div className="v200-poster-title">
            <div className="v200-poster-tag">
              <Sparkles size={14} />
              <span>GRAFIKA SPOŁECZNOŚCIOWA</span>
            </div>
            <h2>Plakat Podsumowania Meczu</h2>
            <p>Pobierz grafikę 1080×1080 w jakości HD gotową do udostępnienia na grupie WhatsApp lub social media.</p>
          </div>
          <button type="button" className="v200-poster-close-btn" onClick={onClose} title="Zamknij">
            <X size={20} />
          </button>
        </div>

        <div className="v200-poster-body">
          {/* Ukryty Canvas wysokiej rozdzielczości */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Podgląd wyrenderowanego obrazu */}
          <div className="v200-poster-preview-container">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Plakat pomeczowy DELTA 2018 GM"
                className="v200-poster-preview-img"
              />
            ) : (
              <div className="v200-poster-loading">
                <Flame size={36} className="v200-spin-icon" />
                <span>Generowanie grafiki meczowej HD…</span>
              </div>
            )}
          </div>
        </div>

        <div className="v200-poster-actions">
          <button
            type="button"
            className="v200-poster-btn secondary"
            onClick={handleCopy}
            disabled={!imageLoaded}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? "Skopiowano do schowka!" : "Kopiuj grafikę"}</span>
          </button>

          <button
            type="button"
            className="v200-poster-btn primary"
            onClick={handleDownload}
            disabled={!imageLoaded || downloading}
          >
            <Download size={18} />
            <span>{downloading ? "Pobieranie…" : "Pobierz plik PNG (HD)"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
