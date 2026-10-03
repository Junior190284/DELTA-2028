"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Camera, 
  Download, 
  Share2, 
  X, 
  Sparkles, 
  Upload, 
  Trophy, 
  Flame, 
  Crown, 
  Layers, 
  Sliders, 
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  ZoomIn,
  Move
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";

interface PlayerOption {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position?: string | null;
  photo_path?: string | null;
}

interface DeltaPhotoBoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: PlayerOption[];
  defaultPlayerName?: string;
}

type FrameTheme = "inferno" | "champions" | "mvp" | "official";
type AspectRatio = "story" | "square" | "card"; // story = 9:16, square = 1:1, card = 3:4

export default function DeltaPhotoBoothModal({
  isOpen,
  onClose,
  players = [],
  defaultPlayerName = "ZAWODNIK DELTA"
}: DeltaPhotoBoothModalProps) {
  const [mounted, setMounted] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>("/teamlogos/gm.png");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [shirtNumber, setShirtNumber] = useState("10");
  const [headline, setHeadline] = useState("MECZ LIGOWY DELTA 2018");
  const [matchDetails, setMatchDetails] = useState("WALKA DO OSTATNIEJ MINUTY!");
  const [frameTheme, setFrameTheme] = useState<FrameTheme>("inferno");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("story");
  
  // Photo transforms
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [filterMode, setFilterMode] = useState<"normal" | "vivid" | "golden" | "bw">("vivid");

  // Sticker toggles
  const [showCrest, setShowCrest] = useState(true);
  const [showTrophy, setShowTrophy] = useState(true);
  const [showFire, setShowFire] = useState(true);

  // Status
  const [downloading, setDownloading] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setZoom(1.0);
        setPanX(0);
        setPanY(0);
        cardSound.playHover();
      };
      reader.readAsDataURL(file);
    }
  };

  // Draw Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions based on aspect ratio
    let w = 1080;
    let h = 1920; // 9:16 story
    if (aspectRatio === "square") {
      w = 1080;
      h = 1080;
    } else if (aspectRatio === "card") {
      w = 1080;
      h = 1440;
    }

    canvas.width = w;
    canvas.height = h;

    // 1. Draw Background Dark Stadium Gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 3, 50, w / 2, h / 2, w);
    if (frameTheme === "inferno") {
      bgGrad.addColorStop(0, "#450a0a");
      bgGrad.addColorStop(0.5, "#1e0808");
      bgGrad.addColorStop(1, "#080303");
    } else if (frameTheme === "champions") {
      bgGrad.addColorStop(0, "#451a03");
      bgGrad.addColorStop(0.5, "#181005");
      bgGrad.addColorStop(1, "#080602");
    } else if (frameTheme === "mvp") {
      bgGrad.addColorStop(0, "#3b0764");
      bgGrad.addColorStop(0.5, "#150524");
      bgGrad.addColorStop(1, "#07020d");
    } else {
      bgGrad.addColorStop(0, "#0c1a30");
      bgGrad.addColorStop(0.5, "#080e1a");
      bgGrad.addColorStop(1, "#03060a");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Child Photo
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        // Photo clipping area inside frame
        const marginX = 40;
        const marginTop = aspectRatio === "story" ? 180 : 120;
        const photoH = aspectRatio === "story" ? h - 560 : aspectRatio === "card" ? h - 420 : h - 380;
        const photoW = w - marginX * 2;

        ctx.beginPath();
        ctx.roundRect(marginX, marginTop, photoW, photoH, 30);
        ctx.clip();

        // Filters
        if (filterMode === "vivid") {
          ctx.filter = "contrast(115%) saturate(125%) brightness(105%)";
        } else if (filterMode === "golden") {
          ctx.filter = "sepia(25%) saturate(120%) brightness(105%)";
        } else if (filterMode === "bw") {
          ctx.filter = "grayscale(100%) contrast(120%)";
        }

        // Draw centered and scaled
        const imgAspect = img.width / img.height;
        const targetAspect = photoW / photoH;
        let drawW, drawH, drawX, drawY;

        if (imgAspect > targetAspect) {
          drawH = photoH * zoom;
          drawW = drawH * imgAspect;
        } else {
          drawW = photoW * zoom;
          drawH = drawW / imgAspect;
        }

        drawX = marginX + (photoW - drawW) / 2 + panX;
        drawY = marginTop + (photoH - drawH) / 2 + panY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Draw Overlays and Frame Artwork
        drawFrameGraphics(ctx, w, h);
      };
      img.src = imageSrc;
    } else {
      drawFrameGraphics(ctx, w, h);
    }
  }, [isOpen, imageSrc, playerName, shirtNumber, headline, matchDetails, frameTheme, aspectRatio, zoom, panX, panY, filterMode, showCrest, showTrophy, showFire]);

  // Render Frame Borders, Text & Club Artwork
  const drawFrameGraphics = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();

    // 1. Outer Neon / Gold Border
    ctx.lineWidth = 14;
    if (frameTheme === "inferno") {
      ctx.strokeStyle = "#ef4444";
      ctx.shadowColor = "#dc2626";
      ctx.shadowBlur = 30;
    } else if (frameTheme === "champions") {
      ctx.strokeStyle = "#f59e0b";
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 35;
    } else if (frameTheme === "mvp") {
      ctx.strokeStyle = "#c084fc";
      ctx.shadowColor = "#9333ea";
      ctx.shadowBlur = 30;
    } else {
      ctx.strokeStyle = "#38bdf8";
      ctx.shadowColor = "#0284c7";
      ctx.shadowBlur = 25;
    }
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.shadowBlur = 0; // reset shadow

    // 2. Top Header Bar
    const topBarH = aspectRatio === "story" ? 140 : 100;
    ctx.fillStyle = "rgba(10, 14, 24, 0.88)";
    ctx.fillRect(20, 20, w - 40, topBarH);

    // Top Gold Tag
    ctx.fillStyle = frameTheme === "inferno" ? "#f87171" : frameTheme === "champions" ? "#fde047" : frameTheme === "mvp" ? "#c084fc" : "#38bdf8";
    ctx.font = "900 24px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "4px";
    ctx.fillText("★ DELTA WARSZAWA 2018 GM ★", w / 2, 65);

    // Top Headline
    ctx.fillStyle = "#ffffff";
    ctx.font = "1000 36px system-ui, -apple-system, sans-serif";
    ctx.fillText(headline.toUpperCase(), w / 2, 115);

    // 3. Bottom Hero Card Banner
    const bannerH = aspectRatio === "story" ? 340 : aspectRatio === "card" ? 280 : 250;
    const bannerY = h - bannerH - 20;

    // Glass backdrop for bottom
    ctx.fillStyle = "rgba(8, 11, 20, 0.94)";
    ctx.fillRect(20, bannerY, w - 40, bannerH);

    // Golden / Accent Top Line on banner
    ctx.fillStyle = frameTheme === "inferno" ? "#dc2626" : frameTheme === "champions" ? "#f59e0b" : frameTheme === "mvp" ? "#9333ea" : "#0284c7";
    ctx.fillRect(20, bannerY, w - 40, 8);

    // Player Number Badge Box
    const badgeSize = 90;
    const badgeX = 60;
    const badgeY = bannerY + 35;
    ctx.fillStyle = frameTheme === "inferno" ? "#991b1b" : frameTheme === "champions" ? "#b45309" : "#4c1d95";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 20);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "1000 44px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`#${shirtNumber}`, badgeX + badgeSize / 2, badgeY + 62);

    // Player Name
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "1000 52px system-ui, -apple-system, sans-serif";
    ctx.fillText(playerName.toUpperCase(), badgeX + badgeSize + 30, badgeY + 52);

    // Sub-details / Match notes
    ctx.fillStyle = frameTheme === "inferno" ? "#fca5a5" : frameTheme === "champions" ? "#fef08a" : "#e9d5ff";
    ctx.font = "800 28px system-ui, -apple-system, sans-serif";
    ctx.fillText(matchDetails.toUpperCase(), badgeX + badgeSize + 30, badgeY + 95);

    // Club Motto Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 20px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OFICJALNY KLUBOWY SYSTEM SZKOLENIOWY • DELTA-WARSZAWA.PL", w / 2, h - 50);

    // 4. Stickers & Emojis
    if (showFire) {
      ctx.font = "46px serif";
      ctx.fillText("🔥", w - 90, bannerY + 65);
    }
    if (showTrophy) {
      ctx.font = "46px serif";
      ctx.fillText("🏆", w - 160, bannerY + 65);
    }

    ctx.restore();
  };

  // Download Action
  const handleDownload = () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    cardSound.playPurchase();
    setCelebrating(true);

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `DELTA_2018_${playerName.replace(/\s+/g, "_")}_${aspectRatio}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Błąd pobierania grafiki:", e);
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setCelebrating(false);
      }, 1800);
    }
  };

  // Native Mobile Web Share
  const handleShare = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `DELTA_${playerName}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Klubowa grafika DELTA - ${playerName}`,
            text: `Dumny zawodnik DELTA Warszawa 2018 GM! 🔴⚫ #DeltaWarszawa`,
            files: [file]
          });
        } else {
          handleDownload();
        }
      });
    } catch (e) {
      handleDownload();
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="v200-modal-overlay animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {celebrating && <CanvasParticles theme="gold" active={true} />}

      <div className="v200-photobooth-modal animate-scaleUp">
        {/* Header */}
        <div className="v200-pb-header">
          <div className="v200-pb-header-left">
            <div className="v200-pb-badge">
              <Camera size={14} className="text-yellow-400 animate-pulse" />
              <span>STUDIO GRAFIK KLUBOWYCH</span>
            </div>
            <h2>FOTO-BUDKA DELTA 📸</h2>
            <p>Twórz profesjonalne plakaty, grafiki meczowe i relacje na Instagram / WhatsApp!</p>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="v200-pb-close-btn"
            aria-label="Zamknij"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Layout: Left Live Canvas, Right Controls */}
        <div className="v200-pb-layout">
          {/* Left Canvas Preview Stage */}
          <div className="v200-pb-canvas-stage">
            <div className={`v200-pb-canvas-wrapper ratio-${aspectRatio}`}>
              <canvas ref={canvasRef} className="v200-pb-canvas" />
            </div>

            {/* Quick Action Buttons below Canvas */}
            <div className="v200-pb-canvas-actions">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="v200-pb-btn-download"
              >
                <Download size={18} />
                <span>{downloading ? "GENEROWANIE HD..." : "POBIERZ GRAFIKĘ (HD)"}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="v200-pb-btn-share"
                title="Udostępnij na WhatsApp lub Instagram"
              >
                <Share2 size={18} />
                <span>UDOSTĘPNIJ</span>
              </button>
            </div>
          </div>

          {/* Right Customizer Panel */}
          <div className="v200-pb-controls custom-scrollbar">
            {/* 1. Upload Photo */}
            <div className="v200-pb-control-group">
              <label className="v200-pb-label">
                <ImageIcon size={14} className="text-yellow-400" />
                <span>1. ZDJĘCIE ZAWODNIKA</span>
              </label>

              <div className="v200-pb-upload-box">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="pb-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="v200-pb-upload-trigger-btn"
                >
                  <Upload size={16} />
                  <span>Wgraj zdjęcie z telefonu / aparatu</span>
                </button>

                {players.length > 0 && (
                  <select 
                    onChange={(e) => {
                      const p = players.find(x => x.id === e.target.value);
                      if (p) {
                        setPlayerName(p.display_name);
                        setShirtNumber(p.shirt_number || "10");
                        if (p.photo_path) setImageSrc(p.photo_path);
                      }
                    }}
                    className="v200-pb-player-select"
                  >
                    <option value="">-- Wybierz zawodnika z kadry --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} #{p.shirt_number || "-"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2. Format / Aspect Ratio */}
            <div className="v200-pb-control-group">
              <label className="v200-pb-label">
                <Layers size={14} className="text-yellow-400" />
                <span>2. FORMAT GRAFIKI</span>
              </label>
              <div className="v200-pb-format-selector">
                <button
                  type="button"
                  onClick={() => setAspectRatio("story")}
                  className={`v200-pb-format-btn ${aspectRatio === "story" ? "active" : ""}`}
                >
                  <span className="v200-fmt-icon">📱</span>
                  <span>Story / Rolka</span>
                  <small>9:16</small>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("square")}
                  className={`v200-pb-format-btn ${aspectRatio === "square" ? "active" : ""}`}
                >
                  <span className="v200-fmt-icon">🖼️</span>
                  <span>Post / WhatsApp</span>
                  <small>1:1</small>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("card")}
                  className={`v200-pb-format-btn ${aspectRatio === "card" ? "active" : ""}`}
                >
                  <span className="v200-fmt-icon">⚽</span>
                  <span>Karta Meczowa</span>
                  <small>3:4</small>
                </button>
              </div>
            </div>

            {/* 3. Frame Style Themes */}
            <div className="v200-pb-control-group">
              <label className="v200-pb-label">
                <Sparkles size={14} className="text-yellow-400" />
                <span>3. SZABLON RAMKI KLUBOWEJ</span>
              </label>
              <div className="v200-pb-theme-grid">
                <button
                  type="button"
                  onClick={() => setFrameTheme("inferno")}
                  className={`v200-pb-theme-btn inferno ${frameTheme === "inferno" ? "active" : ""}`}
                >
                  <Flame size={16} className="text-red-500" />
                  <span>INFERNO MATCHDAY</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFrameTheme("champions")}
                  className={`v200-pb-theme-btn champions ${frameTheme === "champions" ? "active" : ""}`}
                >
                  <Trophy size={16} className="text-yellow-400" />
                  <span>ZWYCIĘZCY / PUCHAR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFrameTheme("mvp")}
                  className={`v200-pb-theme-btn mvp ${frameTheme === "mvp" ? "active" : ""}`}
                >
                  <Crown size={16} className="text-purple-400" />
                  <span>SERDUSZKO MVP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFrameTheme("official")}
                  className={`v200-pb-theme-btn official ${frameTheme === "official" ? "active" : ""}`}
                >
                  <Sparkles size={16} className="text-sky-400" />
                  <span>DUMA DELTY 2018</span>
                </button>
              </div>
            </div>

            {/* 4. Text Details */}
            <div className="v200-pb-control-group">
              <label className="v200-pb-label">
                <Sliders size={14} className="text-yellow-400" />
                <span>4. NAPISY I DANE ZAWODNIKA</span>
              </label>

              <div className="v200-pb-input-grid">
                <div className="v200-pb-input-box">
                  <label>Imię i Nazwisko</label>
                  <input 
                    type="text" 
                    value={playerName} 
                    onChange={(e) => setPlayerName(e.target.value)} 
                    placeholder="np. Staś Kowalski"
                  />
                </div>

                <div className="v200-pb-input-box">
                  <label>Numer na koszulce</label>
                  <input 
                    type="text" 
                    value={shirtNumber} 
                    onChange={(e) => setShirtNumber(e.target.value)} 
                    placeholder="10"
                    maxLength={3}
                  />
                </div>

                <div className="v200-pb-input-box full">
                  <label>Nagłówek wydarzenia</label>
                  <input 
                    type="text" 
                    value={headline} 
                    onChange={(e) => setHeadline(e.target.value)} 
                    placeholder="np. Mecz Ligowy vs SEMP"
                  />
                </div>

                <div className="v200-pb-input-box full">
                  <label>Hasło meczowe / wynik</label>
                  <input 
                    type="text" 
                    value={matchDetails} 
                    onChange={(e) => setMatchDetails(e.target.value)} 
                    placeholder="np. Walka do ostatniej minuty!"
                  />
                </div>
              </div>
            </div>

            {/* 5. Photo Zoom & Pan Adjustments */}
            <div className="v200-pb-control-group">
              <label className="v200-pb-label">
                <ZoomIn size={14} className="text-yellow-400" />
                <span>5. DOPASOWANIE KADRU I FILTR</span>
              </label>

              <div className="v200-pb-sliders">
                <div className="v200-pb-slider-row">
                  <span>Zoom: {Math.round(zoom * 100)}%</span>
                  <input 
                    type="range" 
                    min="0.6" 
                    max="2.5" 
                    step="0.05" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))} 
                  />
                </div>

                <div className="v200-pb-slider-row">
                  <span>Przesuń pionowo</span>
                  <input 
                    type="range" 
                    min="-400" 
                    max="400" 
                    step="5" 
                    value={panY} 
                    onChange={(e) => setPanY(parseInt(e.target.value))} 
                  />
                </div>

                {/* Filter Selector */}
                <div className="v200-pb-filter-pills">
                  <button
                    type="button"
                    onClick={() => setFilterMode("normal")}
                    className={`v200-pb-pill ${filterMode === "normal" ? "active" : ""}`}
                  >
                    Oryginalne
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("vivid")}
                    className={`v200-pb-pill ${filterMode === "vivid" ? "active" : ""}`}
                  >
                    Żywe Kolory ⚡
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("golden")}
                    className={`v200-pb-pill ${filterMode === "golden" ? "active" : ""}`}
                  >
                    Złoty Blask 🌟
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("bw")}
                    className={`v200-pb-pill ${filterMode === "bw" ? "active" : ""}`}
                  >
                    Czarno-Białe 🎬
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
