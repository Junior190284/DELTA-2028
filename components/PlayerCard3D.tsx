"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  Flame, 
  Sparkles, 
  Download, 
  Share2, 
  Crown, 
  Shield, 
  Award,
  Zap,
  ChevronRight
} from "lucide-react";
import PlayerPhoto from "./PlayerPhoto";

export type CardTheme = "gold" | "inferno" | "legend";

export interface PlayerCardStats {
  matches: number;
  goals: number;
  assists: number;
  trainings: number;
  mvp: number;
  captain: number;
  streak: number;
}

export interface PlayerCardProps {
  player: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
    photo_path?: string | null;
  };
  stats: PlayerCardStats;
  theme?: CardTheme;
  interactive?: boolean;
  showExport?: boolean;
  onOpenCardDetail?: () => void;
  onOpenPackModal?: () => void;
  unlockedThemes?: Record<CardTheme, boolean>;
  onUnlockTheme?: (theme: CardTheme) => void;
  unlockedBadgesCount?: number;
}

// Obliczenie poziomu XP i tytułu Diabełka
export function calculatePlayerXP(stats: PlayerCardStats) {
  const xp = 
    (stats.matches * 50) + 
    (stats.goals * 30) + 
    (stats.assists * 20) + 
    (stats.trainings * 40) + 
    (stats.mvp * 60) + 
    (stats.captain * 40) +
    (stats.streak * 15);

  const levels = [
    { level: 1, name: "Młody Diabełek", minXP: 0, maxXP: 150 },
    { level: 2, name: "Waleczny Diabełek", minXP: 150, maxXP: 350 },
    { level: 3, name: "Diabełek w Formie", minXP: 350, maxXP: 650 },
    { level: 4, name: "Mistrz Mokotowa", minXP: 650, maxXP: 1050 },
    { level: 5, name: "Filar Drużyny", minXP: 1050, maxXP: 1600 },
    { level: 6, name: "Legenda DELTY GM", minXP: 1600, maxXP: 99999 }
  ];

  const currentLevelObj = levels.find(l => xp >= l.minXP && xp < l.maxXP) || levels[levels.length - 1];
  const nextLevelObj = levels[levels.indexOf(currentLevelObj) + 1] || null;
  
  const progressPercent = nextLevelObj 
    ? Math.min(100, Math.max(0, Math.round(((xp - currentLevelObj.minXP) / (nextLevelObj.minXP - currentLevelObj.minXP)) * 100)))
    : 100;

  return {
    xp,
    level: currentLevelObj.level,
    title: currentLevelObj.name,
    currentLevelMin: currentLevelObj.minXP,
    nextLevelMin: nextLevelObj ? nextLevelObj.minXP : currentLevelObj.maxXP,
    progressPercent
  };
}

export default function PlayerCard3D({
  player,
  stats,
  theme = "gold",
  interactive = true,
  showExport = true,
  onOpenCardDetail,
  onOpenPackModal,
  unlockedThemes: propUnlockedThemes,
  onUnlockTheme,
  unlockedBadgesCount = 0
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeTheme, setActiveTheme] = useState<CardTheme>(theme);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lokalny stan odblokowania kart
  const [localUnlocked, setLocalUnlocked] = useState<Record<CardTheme, boolean>>({
    gold: false,
    inferno: false,
    legend: false
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`delta_packs_${player.id}`);
      if (saved) {
        setLocalUnlocked(JSON.parse(saved));
      }
    } catch {}
  }, [player.id]);

  const effectiveUnlocked = propUnlockedThemes || localUnlocked;
  const isCurrentThemeUnlocked = effectiveUnlocked[activeTheme] ?? false;

  const isRyszard = (player.display_name || "").toLowerCase().includes("ryszard") && 
                    (player.display_name || "").toLowerCase().includes("rybacki");

  const xpData = calculatePlayerXP(stats);

  // Obliczenie OVR w stylu FIFA (80-99)
  const baseRating = 80;
  const matchBonus = Math.min(6, stats.matches * 2);
  const gaBonus = Math.min(8, (stats.goals + stats.assists) * 2);
  const trainBonus = Math.min(5, Math.floor(stats.trainings / 2));
  const ovrRating = Math.min(99, Math.max(82, baseRating + matchBonus + gaBonus + trainBonus));

  // Skrót pozycji w stylu FIFA
  const posUpper = (player.position || "ZAW").toUpperCase();
  const fifaPos = 
    posUpper.includes("BRAMK") ? "BR" :
    posUpper.includes("OBRON") ? "OBR" :
    posUpper.includes("POMOC") ? "POM" :
    posUpper.includes("NAPAST") ? "NAP" : "ZAW";

  // Nazwisko do belki FIFA
  const nameParts = (player.display_name || "ZAWODNIK").trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
  const fifaDisplayName = lastName.toUpperCase();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 3D Tilt & Hologram Glare
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normalizedX = (x / rect.width) * 2 - 1;
    const normalizedY = (y / rect.height) * 2 - 1;

    setRotateX(-normalizedY * 12);
    setRotateY(normalizedX * 12);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.85
    });
  }, [interactive]);

  const handlePointerLeave = useCallback(() => {
    if (!interactive) return;
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  }, [interactive]);

  const handlePointerEnter = useCallback(() => {
    if (!interactive) return;
    setIsHovered(true);
  }, [interactive]);

  // Generator Karty FIFA w wysokiej rozdzielczości (Canvas PNG 1080x1620)
  const generateCardPNG = async (): Promise<string | null> => {
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1620;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // 1. Kształt tarczy FIFA (Card Shield Path)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(90, 40);
      ctx.lineTo(990, 40);
      ctx.lineTo(1040, 90);
      ctx.lineTo(1040, 1420);
      ctx.lineTo(540, 1580);
      ctx.lineTo(40, 1420);
      ctx.lineTo(40, 90);
      ctx.closePath();
      ctx.clip();

      // 2. Tło graficzne tematyczne FIFA
      try {
        const bgImg = new Image();
        bgImg.crossOrigin = "anonymous";
        const bgSrc = `/assets/cards/bg-${activeTheme}.jpg`;
        await new Promise((resolve) => {
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, 1080, 1620);
            const darkOverlay = ctx.createLinearGradient(0, 0, 0, 1620);
            darkOverlay.addColorStop(0, "rgba(0,0,0,0.1)");
            darkOverlay.addColorStop(0.6, "rgba(0,0,0,0.45)");
            darkOverlay.addColorStop(1, "rgba(0,0,0,0.9)");
            ctx.fillStyle = darkOverlay;
            ctx.fillRect(0, 0, 1080, 1620);
            resolve(true);
          };
          bgImg.onerror = () => {
            const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1620);
            bgGrad.addColorStop(0, activeTheme === "inferno" ? "#3d080c" : activeTheme === "legend" ? "#2c0e3e" : "#38290a");
            bgGrad.addColorStop(1, "#080a0e");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1080, 1620);
            resolve(true);
          };
          bgImg.src = bgSrc;
        });
      } catch {}

      // 3. Renderowanie dużego portretu zawodnika (Hero Cutout)
      const photoX = 220;
      const photoY = 120;
      const photoW = 800;
      const photoH = 820;

      try {
        const photoImg = new Image();
        photoImg.crossOrigin = "anonymous";
        const photoSrc = isRyszard 
          ? (activeTheme === "inferno" 
              ? "/assets/players/ryszard-inferno.png" 
              : activeTheme === "legend" 
                ? "/assets/players/ryszard-legend.png" 
                : "/assets/players/ryszard-gold.png")
          : `/api/player-photo/${player.id}`;

        await new Promise((resolve) => {
          photoImg.onload = () => {
            ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
            resolve(true);
          };
          photoImg.onerror = () => {
            // Fallback sylwetki
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            ctx.beginPath();
            ctx.arc(photoX + photoW / 2, photoY + photoH / 2, 280, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "800 48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("DELTA GM 2018", photoX + photoW / 2, photoY + photoH / 2);
            ctx.textAlign = "left";
            resolve(true);
          };
          photoImg.src = photoSrc;
        });
      } catch {
        // Kontynuacja
      }

      // Gradient wygaszający dół zdjęcia przed belką z nazwiskiem
      const photoFade = ctx.createLinearGradient(0, 780, 0, 940);
      photoFade.addColorStop(0, "rgba(0,0,0,0)");
      photoFade.addColorStop(1, activeTheme === "inferno" ? "#1a0406" : activeTheme === "legend" ? "#14071f" : "#1a1306");
      ctx.fillStyle = photoFade;
      ctx.fillRect(0, 780, 1080, 160);

      // 4. Kolumna FIFA po lewej (OVR, Pozycja, Flaga, Herb)
      const colX = 100;
      
      // OVR Rating
      ctx.fillStyle = activeTheme === "inferno" ? "#ff4d5a" : activeTheme === "legend" ? "#d8b4fe" : "#f1c95c";
      ctx.font = "900 130px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(String(ovrRating), colX, 230);

      // Pozycja
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(fifaPos, colX + 8, 300);

      // Flaga Polski (Biało-Czerwona mini belka)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(colX + 8, 335, 64, 18);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(colX + 8, 353, 64, 18);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(colX + 8, 335, 64, 36);

      // Herb DELTY
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          logoImg.onload = () => {
            ctx.drawImage(logoImg, colX + 4, 395, 76, 76);
            resolve(true);
          };
          logoImg.onerror = () => resolve(true);
          logoImg.src = "/teamlogos/gm.png";
        });
      } catch {}

      // Numer na koszulce (Badge)
      if (player.shirt_number) {
        ctx.fillStyle = activeTheme === "inferno" ? "#ff4d5a" : activeTheme === "legend" ? "#c084fc" : "#f1c95c";
        ctx.font = "900 36px Arial";
        ctx.fillText(`#${player.shirt_number}`, colX + 12, 520);
      }

      // 5. Belka z Nazwiskiem (FUT Name Plate)
      const nameBarY = 940;
      const nameBarGrad = ctx.createLinearGradient(120, 0, 960, 0);
      if (activeTheme === "inferno") {
        nameBarGrad.addColorStop(0, "rgba(230, 57, 70, 0.1)");
        nameBarGrad.addColorStop(0.5, "rgba(255, 77, 90, 0.95)");
        nameBarGrad.addColorStop(1, "rgba(230, 57, 70, 0.1)");
      } else if (activeTheme === "legend") {
        nameBarGrad.addColorStop(0, "rgba(192, 132, 252, 0.1)");
        nameBarGrad.addColorStop(0.5, "rgba(216, 180, 254, 0.95)");
        nameBarGrad.addColorStop(1, "rgba(192, 132, 252, 0.1)");
      } else {
        nameBarGrad.addColorStop(0, "rgba(241, 201, 92, 0.1)");
        nameBarGrad.addColorStop(0.5, "rgba(241, 201, 92, 0.95)");
        nameBarGrad.addColorStop(1, "rgba(241, 201, 92, 0.1)");
      }
      ctx.fillStyle = nameBarGrad;
      ctx.fillRect(100, nameBarY, 880, 76);

      // Złote linie nad i pod nazwiskiem
      ctx.strokeStyle = activeTheme === "inferno" ? "#ff4d5a" : activeTheme === "legend" ? "#c084fc" : "#f1c95c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, nameBarY);
      ctx.lineTo(980, nameBarY);
      ctx.moveTo(100, nameBarY + 76);
      ctx.lineTo(980, nameBarY + 76);
      ctx.stroke();

      // Imię i Nazwisko na belce
      ctx.fillStyle = "#0c0f14";
      ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fifaDisplayName, 540, nameBarY + 54);

      if (firstName) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(firstName.toUpperCase(), 540, nameBarY - 12);
      }
      ctx.textAlign = "left";

      // 6. Statystyki FIFA (2 Kolumny x 3 Rzędy)
      const statsY = 1070;
      const leftColX = 220;
      const rightColX = 620;

      // Pionowa linia podziału kolumn
      ctx.strokeStyle = activeTheme === "inferno" ? "rgba(255, 77, 90, 0.4)" : activeTheme === "legend" ? "rgba(192, 132, 252, 0.4)" : "rgba(241, 201, 92, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(540, statsY - 10);
      ctx.lineTo(540, statsY + 230);
      ctx.stroke();

      const statRows = [
        { leftNum: stats.matches, leftTag: "MEC", rightNum: stats.goals + stats.assists, rightTag: "G+A" },
        { leftNum: stats.goals, leftTag: "GOL", rightNum: stats.trainings, rightTag: "TRE" },
        { leftNum: stats.assists, leftTag: "ASY", rightNum: unlockedBadgesCount, rightTag: "ODZ" }
      ];

      statRows.forEach((row, i) => {
        const ry = statsY + i * 78;

        // Lewa Kolumna
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(row.leftNum), leftColX + 70, ry + 44);
        ctx.fillStyle = activeTheme === "inferno" ? "#ff858d" : activeTheme === "legend" ? "#d8b4fe" : "#f1c95c";
        ctx.font = "800 36px Arial";
        ctx.textAlign = "left";
        ctx.fillText(row.leftTag, leftColX + 90, ry + 44);

        // Prawa Kolumna
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(row.rightNum), rightColX + 70, ry + 44);
        ctx.fillStyle = activeTheme === "inferno" ? "#ff858d" : activeTheme === "legend" ? "#d8b4fe" : "#f1c95c";
        ctx.font = "800 36px Arial";
        ctx.textAlign = "left";
        ctx.fillText(row.rightTag, rightColX + 90, ry + 44);
      });

      // 7. Pasek XP / Poziom Diabełka (Na dole)
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(160, 1370, 760, 60);
      ctx.strokeStyle = activeTheme === "inferno" ? "rgba(255, 77, 90, 0.3)" : activeTheme === "legend" ? "rgba(192, 132, 252, 0.3)" : "rgba(241, 201, 92, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(160, 1370, 760, 60);

      ctx.fillStyle = activeTheme === "inferno" ? "#ff858d" : activeTheme === "legend" ? "#d8b4fe" : "#f1c95c";
      ctx.font = "800 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`★ POZIOM ${xpData.level} • ${xpData.title.toUpperCase()} (${xpData.xp} XP) ★`, 540, 1408);
      ctx.textAlign = "left";

      // 8. Zewnętrzna ramka tarczy FIFA
      ctx.restore();
      ctx.strokeStyle = activeTheme === "inferno" ? "#ff4d5a" : activeTheme === "legend" ? "#c084fc" : "#f1c95c";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(90, 40);
      ctx.lineTo(990, 40);
      ctx.lineTo(1040, 90);
      ctx.lineTo(1040, 1420);
      ctx.lineTo(540, 1580);
      ctx.lineTo(40, 1420);
      ctx.lineTo(40, 90);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, 56);
      ctx.lineTo(980, 56);
      ctx.lineTo(1024, 100);
      ctx.lineTo(1024, 1410);
      ctx.lineTo(540, 1560);
      ctx.lineTo(56, 1410);
      ctx.lineTo(56, 100);
      ctx.closePath();
      ctx.stroke();

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("FIFA Card generation error:", err);
      return null;
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateCardPNG();
    if (!dataUrl) {
      showToast("Nie udało się wygenerować grafiki.");
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `fut-karta-${player.display_name.toLowerCase().replace(/\s+/g, "-")}-delta.png`;
    a.click();
    showToast("✓ Karta FIFA została pobrana!");
  };

  const handleShare = async () => {
    const dataUrl = await generateCardPNG();
    if (!dataUrl) return;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `fut-karta-${player.display_name}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Karta FIFA: ${player.display_name}`,
          text: `Oficjalna karta piłkarska FIFA FUT • ${player.display_name} (K.S. Delta Warszawa GM 2018)!`
        });
        showToast("✓ Karta udostępniona!");
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="v101-fut-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="v101-card-toast" role="alert">
          {toastMessage}
        </div>
      )}

      {/* Przełącznik stylów karty FIFA */}
      <div className="v101-fut-theme-bar">
        <span>EDYCJA KARTY:</span>
        <button
          type="button"
          className={activeTheme === "gold" ? "active gold" : "gold"}
          onClick={() => setActiveTheme("gold")}
          title={effectiveUnlocked.gold ? "Złota karta In-Form (Odblokowana)" : "Złota karta In-Form (Zablokowana - rozetnij paczkę)"}
        >
          ✦ In-Form Gold {!effectiveUnlocked.gold && "🔒"}
        </button>
        <button
          type="button"
          className={activeTheme === "inferno" ? "active inferno" : "inferno"}
          onClick={() => setActiveTheme("inferno")}
          title={effectiveUnlocked.inferno ? "Płonąca karta Inferno (Odblokowana)" : "Płonąca karta Inferno (Zablokowana - rozetnij paczkę)"}
        >
          🔥 Inferno {!effectiveUnlocked.inferno && "🔒"}
        </button>
        <button
          type="button"
          className={activeTheme === "legend" ? "active legend" : "legend"}
          onClick={() => setActiveTheme("legend")}
          title={effectiveUnlocked.legend ? "Królewska karta Legendy (Odblokowana)" : "Królewska karta Legendy (Zablokowana - rozetnij paczkę)"}
        >
          👑 Legenda {!effectiveUnlocked.legend && "🔒"}
        </button>

        {onOpenPackModal && (
          <button
            type="button"
            className="v101-fut-pack-trigger-btn"
            onClick={onOpenPackModal}
            title="Odtwórz animację otwierania paczki FIFA (Walkout)"
          >
            <Zap size={13} />
            <span>{!isCurrentThemeUnlocked ? "Rozetnij Paczkę" : "Otwórz Paczkę Ponownie"}</span>
          </button>
        )}
      </div>

      {/* Scena 3D z tarczą FIFA lub Tajemniczą Paczką */}
      <div 
        className="v101-fut-stage"
        style={{ perspective: "1200px" }}
      >
        {!isCurrentThemeUnlocked ? (
          /* ZAPROCZEKTOWANA PACZKA-NIESPODZIANKA (SEALED MYSTERY BOOSTER PACK) */
          <div
            ref={cardRef}
            className={`v101-fut-sealed-card-pack theme-${activeTheme} ${isHovered ? "is-hovered" : ""}`}
            style={{
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.04 : 1}, ${isHovered ? 1.04 : 1}, 1)`,
              transition: isHovered ? "transform 0.08s ease-out" : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)"
            }}
            onPointerMove={handlePointerMove}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onClick={onOpenPackModal}
            role="button"
            tabIndex={0}
            aria-label={`Tajemnicza paczka ${activeTheme}. Kliknij, aby rozciąć i odkryć kartę zawodnika.`}
          >
            {/* Holographic foil sweep */}
            <div className="v101-booster-foil-shine" aria-hidden="true" />
            
            {/* Górne tłoczone zgrzewanie paczki */}
            <div className="v101-pack-crimp top" aria-hidden="true">
              <span className="crimp-pattern" />
              <span className="crimp-text">DELTA GM • OFFICIAL BOOSTER</span>
            </div>

            {/* Centralna zawartość paczki */}
            <div className="v101-pack-front-body">
              <div className="v101-pack-edition-ribbon">
                {activeTheme === "inferno" ? "🔥 INFERNO SPECIAL EDITION" : activeTheme === "legend" ? "👑 TOTY ICON LEGENDA" : "✦ PREMIUM GOLD IN-FORM"}
              </div>

              <div className="v101-pack-hero-crest">
                <div className="v101-pack-crest-aura" />
                <img src="/teamlogos/gm.png" alt="DELTA GM" className="v101-pack-crest-logo" />
              </div>

              <div className="v101-pack-mystery-player">
                <div className="v101-mystery-silhouette">
                  <Shield size={44} className="v101-mystery-shield-icon" />
                  <span className="v101-mystery-lock-tag">
                    <Zap size={14} /> NIEODKRYTA KARTA
                  </span>
                </div>
                <h4 className="v101-mystery-name-hint">??? TAJEMNICZY ZAWODNIK ???</h4>
                <p className="v101-mystery-sub">Nowa karta w Twojej kolekcji czeka na otwarcie!</p>
              </div>

              {/* Pasek rozdarcia z animowanymi strzałkami */}
              <div className="v101-pack-interactive-tear">
                <div className="v101-tear-line" />
                <button type="button" className="v101-tear-action-btn" tabIndex={-1}>
                  <Sparkles size={16} />
                  <span>KLIKNIJ ABY ROZCIĄĆ PACZKĘ</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Dolne tłoczone zgrzewanie paczki */}
            <div className="v101-pack-crimp bottom" aria-hidden="true">
              <span className="crimp-text">EDYCJA LIMITOWANA 2026</span>
              <span className="crimp-pattern" />
            </div>

            {/* Hologram / Specular Glare Foil */}
            <div
              className="v101-fut-glare"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.5) 0%, rgba(255,215,0,0.3) 30%, transparent 70%)`,
                opacity: glarePos.opacity
              }}
              aria-hidden="true"
            />
          </div>
        ) : (
          /* ODKRYTA KARTA FIFA W PEŁNEJ KRASIE */
          <div
            ref={cardRef}
            className={`v101-fut-card theme-${activeTheme} ${isHovered ? "is-hovered" : ""}`}
            style={{
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.03 : 1}, ${isHovered ? 1.03 : 1}, 1)`,
              transition: isHovered ? "transform 0.08s ease-out" : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)"
            }}
            onPointerMove={handlePointerMove}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onClick={onOpenCardDetail}
            role="button"
            tabIndex={0}
            aria-label={`Karta FIFA: ${player.display_name}, Ocena ${ovrRating}, ${fifaPos}`}
          >
            {/* Płonąca ramka & Aktywne tła animowane */}
            <div className="v101-fut-animated-border" aria-hidden="true" />
            
            {/* Efekty cząsteczkowe w zależności od motywu */}
            {activeTheme === "inferno" && (
              <div className="v101-fut-inferno-fx" aria-hidden="true">
                <span className="v101-ember ember-1" />
                <span className="v101-ember ember-2" />
                <span className="v101-ember ember-3" />
                <span className="v101-ember ember-4" />
                <span className="v101-ember ember-5" />
                <span className="v101-ember ember-6" />
                <div className="v101-fire-flicker-overlay" />
              </div>
            )}

            {activeTheme === "gold" && (
              <div className="v101-fut-gold-fx" aria-hidden="true">
                <span className="v101-gold-sparkle sp-1" />
                <span className="v101-gold-sparkle sp-2" />
                <span className="v101-gold-sparkle sp-3" />
                <div className="v101-gold-sheen-sweep" />
              </div>
            )}

            {activeTheme === "legend" && (
              <div className="v101-fut-legend-fx" aria-hidden="true">
                <span className="v101-cosmic-shard sh-1" />
                <span className="v101-cosmic-shard sh-2" />
                <span className="v101-cosmic-shard sh-3" />
                <div className="v101-legend-plasma-pulse" />
              </div>
            )}

            {/* Hologram / Specular Glare Foil */}
            <div
              className="v101-fut-glare"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, rgba(255,215,0,0.25) 30%, rgba(255,0,128,0.18) 55%, transparent 80%)`,
                opacity: glarePos.opacity
              }}
              aria-hidden="true"
            />

            {/* GÓRNA SEKCJA: Kolumna FIFA + DUŻY PORTRET */}
            <div className="v101-fut-top-section">
              {/* Lewa kolumna: OVR, Pozycja, Flaga, Herb */}
              <div className="v101-fut-left-col">
                <span className="v101-fut-ovr">{ovrRating}</span>
                <span className="v101-fut-pos">{fifaPos}</span>
                <span className="v101-fut-flag" title="Polska">
                  <i className="flag-white" />
                  <i className="flag-red" />
                </span>
                <div className="v101-fut-club-crest" title="K.S. Delta Warszawa GM">
                  <img src="/teamlogos/gm.png" alt="DELTA GM" />
                </div>
                {player.shirt_number && (
                  <span className="v101-fut-num-badge">#{player.shirt_number}</span>
                )}
              </div>

              {/* DUŻE ZDJĘCIE ZAWODNIKA (DOMINUJĄCE W KROCIE FIFA) */}
              <div className="v101-fut-portrait-hero">
                <div className="v101-fut-portrait-glow" aria-hidden="true" />
                {isRyszard ? (
                  <img
                    src={
                      activeTheme === "inferno" 
                        ? "/assets/players/ryszard-inferno.png?v=3" 
                        : activeTheme === "legend"
                          ? "/assets/players/ryszard-legend.png?v=3"
                          : "/assets/players/ryszard-gold.png?v=3"
                    }
                    alt={player.display_name}
                    className={`v101-fut-player-img ryszard theme-${activeTheme}`}
                  />
                ) : (
                  <div className="v101-fut-player-img-wrap">
                    <PlayerPhoto playerId={player.id} className="v101-fut-player-img" />
                  </div>
                )}
              </div>
            </div>

            {/* BELKA Z NAZWISKIEM (FUT Name Plate) */}
            <div className="v101-fut-name-plate">
              {firstName && <span className="v101-fut-firstname">{firstName}</span>}
              <h3 className="v101-fut-lastname">{fifaDisplayName}</h3>
            </div>

            {/* DOLNA SEKCJA: Statystyki FIFA (2 Kolumny x 3 Rzędy) */}
            <div className="v101-fut-stats-stage">
              <div className="v101-fut-stats-col left">
                <div className="v101-fut-stat-row">
                  <b>{stats.matches}</b>
                  <span>MEC</span>
                </div>
                <div className="v101-fut-stat-row">
                  <b>{stats.goals}</b>
                  <span>GOL</span>
                </div>
                <div className="v101-fut-stat-row">
                  <b>{stats.assists}</b>
                  <span>ASY</span>
                </div>
              </div>

              <div className="v101-fut-divider" aria-hidden="true" />

              <div className="v101-fut-stats-col right">
                <div className="v101-fut-stat-row">
                  <b>{stats.goals + stats.assists}</b>
                  <span>G+A</span>
                </div>
                <div className="v101-fut-stat-row">
                  <b>{stats.trainings}</b>
                  <span>TRE</span>
                </div>
                <div className="v101-fut-stat-row">
                  <b>{unlockedBadgesCount}</b>
                  <span>ODZ</span>
                </div>
              </div>
            </div>

            {/* BELKA XP DIABEŁKA */}
            <div className="v101-fut-xp-strip">
              <div className="v101-fut-xp-info">
                <Sparkles size={11} />
                <span>LVL {xpData.level} • {xpData.title}</span>
                <b>{xpData.xp} XP</b>
              </div>
              <div className="v101-fut-xp-bar">
                <i style={{ width: `${xpData.progressPercent}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Przyciski pobierania i wysyłania na WhatsApp lub Otwierania */}
      {showExport && (
        <div className="v101-card-actions-bar">
          {!isCurrentThemeUnlocked ? (
            <button
              type="button"
              className="v101-card-btn walkout-open-action"
              onClick={onOpenPackModal}
              title="Rozetnij paczkę i zobacz pełną animację Walkout"
            >
              <Zap size={16} />
              <span>ROZETNIJ PACZKĘ I ODKRYJ KARTĘ</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="v101-card-btn download"
                onClick={handleDownload}
                disabled={exporting}
                title="Pobierz oficjalną kartę FIFA w jakości HD"
              >
                <Download size={15} />
                <span>{exporting ? "Generowanie..." : "Pobierz kartę FIFA (PNG)"}</span>
              </button>
              <button
                type="button"
                className="v101-card-btn share"
                onClick={handleShare}
                disabled={exporting}
                title="Wyślij kartę bezpośrednio na WhatsApp"
              >
                <Share2 size={15} />
                <span>Udostępnij na WhatsApp</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
