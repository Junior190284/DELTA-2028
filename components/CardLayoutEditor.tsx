"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  Save, 
  RotateCcw, 
  Upload, 
  Sliders, 
  Eye, 
  Maximize2, 
  Minimize2, 
  Move, 
  RotateCw, 
  Sun, 
  Contrast as ContrastIcon, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronRight,
  User,
  Crown,
  Flame,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import PlayerCard from "./PlayerCard";
import { 
  CardTemplateKey, 
  CardLayoutConfig, 
  DEFAULT_TEMPLATE_LAYOUTS, 
  PlayerCardLayoutRow 
} from "@/lib/cards/types";

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path?: string | null;
}

interface CardLayoutEditorProps {
  players: Player[];
  onLayoutSaved?: () => void;
}

export default function CardLayoutEditor({
  players,
  onLayoutSaved
}: CardLayoutEditorProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || "");
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplateKey>("gold");
  const [previewSize, setPreviewSize] = useState<"sm" | "md" | "lg">("lg");
  const [isFlipped, setIsFlipped] = useState(false);

  // Layout configuration state
  const [scale, setScale] = useState<number>(1.0);
  const [translateX, setTranslateX] = useState<number>(0.0);
  const [translateY, setTranslateY] = useState<number>(0.0);
  const [rotate, setRotate] = useState<number>(0.0);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(1.0);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>("");

  // Loading & Feedback
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savedLayoutsMap, setSavedLayoutsMap] = useState<Map<string, PlayerCardLayoutRow>>(new Map());
  const [loadingLayouts, setLoadingLayouts] = useState(false);

  const selectedPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || players[0];
  }, [players, selectedPlayerId]);

  // Fetch saved layouts on mount and when player changes
  const fetchLayouts = async (playerId: string) => {
    if (!playerId) return;
    setLoadingLayouts(true);
    try {
      const res = await fetch(`/api/cards/layout?playerId=${playerId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.layouts)) {
        const map = new Map<string, PlayerCardLayoutRow>();
        json.layouts.forEach((row: PlayerCardLayoutRow) => {
          map.set(row.template_key, row);
        });
        setSavedLayoutsMap(map);

        // Apply saved layout for current template if exists, otherwise load default
        const saved = map.get(selectedTemplate);
        if (saved) {
          applyLayoutRow(saved);
        } else {
          applyDefaultLayout(selectedTemplate);
        }
      }
    } catch (err) {
      console.error("Failed to load layouts:", err);
    } finally {
      setLoadingLayouts(false);
    }
  };

  useEffect(() => {
    if (selectedPlayerId) {
      fetchLayouts(selectedPlayerId);
    }
  }, [selectedPlayerId]);

  // When template changes, apply saved layout or default
  useEffect(() => {
    const saved = savedLayoutsMap.get(selectedTemplate);
    if (saved) {
      applyLayoutRow(saved);
    } else {
      applyDefaultLayout(selectedTemplate);
    }
  }, [selectedTemplate]);

  const applyLayoutRow = (row: PlayerCardLayoutRow) => {
    setScale(row.scale ?? 1.0);
    setTranslateX(row.translate_x ?? 0.0);
    setTranslateY(row.translate_y ?? 0.0);
    setRotate(row.rotate ?? 0.0);
    setBrightness(row.brightness ?? 1.0);
    setContrast(row.contrast ?? 1.0);
    setCustomPhotoUrl(row.photo_url || "");
  };

  const applyDefaultLayout = (templateKey: CardTemplateKey) => {
    const def = DEFAULT_TEMPLATE_LAYOUTS[templateKey] || DEFAULT_TEMPLATE_LAYOUTS.base;
    setScale(def.scale);
    setTranslateX(def.translateX);
    setTranslateY(def.translateY);
    setRotate(def.rotate || 0);
    setBrightness(def.brightness || 1);
    setContrast(def.contrast || 1);
    setCustomPhotoUrl("");
  };

  // Save layout configuration to Supabase
  const handleSaveLayout = async (applyToAllTemplates: boolean = false) => {
    if (!selectedPlayerId) return;
    setSaving(true);
    setFeedback(null);

    try {
      const templatesToSave: CardTemplateKey[] = applyToAllTemplates 
        ? ["base", "matchday", "gold", "legend", "inferno", "panini"]
        : [selectedTemplate];

      for (const tKey of templatesToSave) {
        const payload = {
          player_id: selectedPlayerId,
          template_key: tKey,
          photo_url: customPhotoUrl || null,
          scale,
          translate_x: translateX,
          translate_y: translateY,
          rotate,
          brightness,
          contrast
        };

        const res = await fetch("/api/cards/layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || "Błąd zapisu");
        }
      }

      setFeedback({ 
        type: "success", 
        text: applyToAllTemplates 
          ? "Zapisano układ dla wszystkich szablonów karty tego zawodnika!" 
          : `Zapisano układ szablonu ${selectedTemplate.toUpperCase()}!` 
      });

      // Refresh map
      fetchLayouts(selectedPlayerId);
      if (onLayoutSaved) onLayoutSaved();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Nie udało się zapisać ustawień." });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleResetLayout = async () => {
    applyDefaultLayout(selectedTemplate);
    try {
      await fetch(`/api/cards/layout?playerId=${selectedPlayerId}&templateKey=${selectedTemplate}`, {
        method: "DELETE"
      });
      setFeedback({ type: "success", text: "Przywrócono domyślne proporcje szablonu." });
      fetchLayouts(selectedPlayerId);
    } catch {}
  };

  // File upload for cutout
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to local Object URL / Base64 for instant live preview
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomPhotoUrl(reader.result);
        setFeedback({ type: "success", text: "Załadowano nową przezroczystą sylwetkę zawodnika!" });
      }
    };
    reader.readAsDataURL(file);
  };

  const layoutOverrideConfig = useMemo(() => ({
    scale,
    translateX,
    translateY,
    rotate,
    brightness,
    contrast,
    photoUrl: customPhotoUrl || undefined
  }), [scale, translateX, translateY, rotate, brightness, contrast, customPhotoUrl]);

  return (
    <div className="v200-card-editor-root">
      {/* Editor Header */}
      <div className="v200-editor-header">
        <div className="v200-editor-title-wrap">
          <div className="v200-editor-badge">
            <Sliders size={14} className="text-yellow-400" />
            <span>VISUAL CARD LAYOUT ENGINE 2.0</span>
          </div>
          <h2>WIZUALNY EDYTOR ARCHITEKTURY KART 3D</h2>
          <p>
            Dostosuj pozycję sylwetki, skalę, przesunięcie X/Y i parametry graficzne per zawodnik oraz szablon w czasie rzeczywistym.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Controls | Right Live 3D Preview */}
      <div className="v200-editor-main-grid">
        
        {/* ================= LEFT COLUMN: CONTROLS & SELECTION ================= */}
        <div className="v200-editor-controls-col">
          
          {/* 1. Player & Template Selectors */}
          <div className="v200-editor-section-box">
            <h3 className="v200-section-title">
              <User size={16} className="text-yellow-400" /> 1. Wybierz Zawodnika i Szablon
            </h3>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Zawodnik DELTA GM:
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} (#{p.shirt_number || "—"}) — {p.position || "Zawodnik"}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="block text-xs font-bold text-slate-300 mb-1.5">Szablon / Ranga Karty:</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { key: "base", label: "BASE", color: "#9ca3af", icon: "📦" },
                    { key: "matchday", label: "MATCHDAY", color: "#38bdf8", icon: "⚡" },
                    { key: "gold", label: "GOLD", color: "#facc15", icon: "🌟" },
                    { key: "legend", label: "LEGEND", color: "#c084fc", icon: "👑" },
                    { key: "inferno", label: "INFERNO", color: "#ef4444", icon: "🔥" },
                    { key: "panini", label: "PANINI", color: "#34d399", icon: "📖" }
                  ].map(tpl => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.key as CardTemplateKey)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-black border transition flex flex-col items-center gap-1 ${
                        selectedTemplate === tpl.key 
                          ? "bg-slate-800 text-white shadow-lg scale-105" 
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                      style={{ borderColor: selectedTemplate === tpl.key ? tpl.color : undefined }}
                    >
                      <span className="text-sm">{tpl.icon}</span>
                      <span>{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cutout Photo Source */}
          <div className="v200-editor-section-box">
            <h3 className="v200-section-title">
              <Upload size={16} className="text-cyan-400" /> 2. Źródło Przezroczystej Sylwetki (PNG)
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="cutoutUploadInput"
                  accept="image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handlePhotoFileUpload}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("cutoutUploadInput")?.click()}
                  className="py-2 px-4 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold transition flex items-center gap-2"
                >
                  <Upload size={14} /> Wgraj plik sylwetki PNG (Transparent)
                </button>

                {customPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomPhotoUrl("")}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Usuń własną grafikę
                  </button>
                )}
              </div>

              <label className="block text-[11px] text-slate-400">
                Lub wklej bezpośredni URL do wyciętego PNG:
                <input
                  type="text"
                  placeholder="https://.../player-cutout.png"
                  value={customPhotoUrl}
                  onChange={e => setCustomPhotoUrl(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </label>
            </div>
          </div>

          {/* 3. Live Sliders (Scale, X, Y, Rotate, Light) */}
          <div className="v200-editor-section-box">
            <div className="flex items-center justify-between mb-2">
              <h3 className="v200-section-title m-0">
                <Sliders size={16} className="text-emerald-400" /> 3. Kalibracja Pozycji & Skali
              </h3>
              
              {/* Nudge D-Pad Controls */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setTranslateX(x => Math.max(-50, x - 1))}
                  title="W lewo (-1%)"
                  className="p-1 hover:bg-slate-800 rounded text-slate-300"
                >
                  <ArrowLeft size={13} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setTranslateY(y => Math.max(-50, y - 1))}
                  title="W górę (-1%)"
                  className="p-1 hover:bg-slate-800 rounded text-slate-300"
                >
                  <ArrowUp size={13} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setTranslateY(y => Math.min(50, y + 1))}
                  title="W dół (+1%)"
                  className="p-1 hover:bg-slate-800 rounded text-slate-300"
                >
                  <ArrowDown size={13} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setTranslateX(x => Math.min(50, x + 1))}
                  title="W prawo (+1%)"
                  className="p-1 hover:bg-slate-800 rounded text-slate-300"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {/* Scale Slider */}
              <div className="v200-slider-row">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Skala Wielkości (Scale):</span>
                  <span className="text-yellow-400 font-mono">{scale.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="2.2"
                    step="0.01"
                    value={scale}
                    onChange={e => setScale(parseFloat(e.target.value))}
                    className="v200-range-slider flex-1"
                  />
                  <button 
                    type="button" 
                    onClick={() => setScale(1.0)} 
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    1.0x
                  </button>
                </div>
              </div>

              {/* Translate X */}
              <div className="v200-slider-row">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Przesunięcie Poziome (X):</span>
                  <span className="text-cyan-400 font-mono">{translateX > 0 ? `+${translateX.toFixed(1)}%` : `${translateX.toFixed(1)}%`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="0.5"
                    value={translateX}
                    onChange={e => setTranslateX(parseFloat(e.target.value))}
                    className="v200-range-slider flex-1"
                  />
                  <button 
                    type="button" 
                    onClick={() => setTranslateX(0)} 
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    Centrum
                  </button>
                </div>
              </div>

              {/* Translate Y */}
              <div className="v200-slider-row">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Przesunięcie Pionowe (Y):</span>
                  <span className="text-emerald-400 font-mono">{translateY > 0 ? `+${translateY.toFixed(1)}%` : `${translateY.toFixed(1)}%`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="0.5"
                    value={translateY}
                    onChange={e => setTranslateY(parseFloat(e.target.value))}
                    className="v200-range-slider flex-1"
                  />
                  <button 
                    type="button" 
                    onClick={() => setTranslateY(0)} 
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    Centrum
                  </button>
                </div>
              </div>

              {/* Rotate Slider */}
              <div className="v200-slider-row">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Kąt Obrócenia (Rotate):</span>
                  <span className="text-purple-400 font-mono">{rotate}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={rotate}
                    onChange={e => setRotate(parseFloat(e.target.value))}
                    className="v200-range-slider flex-1"
                  />
                  <button 
                    type="button" 
                    onClick={() => setRotate(0)} 
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    0°
                  </button>
                </div>
              </div>

              {/* Brightness & Contrast Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>Jasność:</span>
                    <span className="font-mono">{brightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={brightness}
                    onChange={e => setBrightness(parseFloat(e.target.value))}
                    className="v200-range-slider w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>Kontrast:</span>
                    <span className="font-mono">{contrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={contrast}
                    onChange={e => setContrast(parseFloat(e.target.value))}
                    className="v200-range-slider w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Action Buttons & Save */}
          <div className="v200-editor-section-box space-y-3">
            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                feedback.type === "success" 
                  ? "bg-emerald-950/80 border border-emerald-700 text-emerald-300" 
                  : "bg-rose-950/80 border border-rose-700 text-rose-300"
              }`}>
                {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSaveLayout(false)}
                disabled={saving}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Save size={16} /> {saving ? "Zapisywanie w bazie..." : `Zapisz Szablon ${selectedTemplate.toUpperCase()}`}
              </button>

              <button
                type="button"
                onClick={() => handleSaveLayout(true)}
                disabled={saving}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                title="Zastosuj tę samą pozycję sylwetki do wszystkich szablonów tego zawodnika"
              >
                <Layers size={15} /> Zastosuj do Wszystkich
              </button>

              <button
                type="button"
                onClick={handleResetLayout}
                disabled={saving}
                className="p-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition"
                title="Przywróć domyślne dla tego szablonu"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: LIVE 3D PREVIEW STAGE ================= */}
        <div className="v200-editor-preview-col">
          <div className="v200-preview-stage-box">
            
            {/* Top Toolbar */}
            <div className="v200-preview-toolbar">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Eye size={14} className="text-yellow-400" /> PODGLĄD 3D NA ŻYWO:
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  (Proporcja 2:3)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Size toggle */}
                {(["sm", "md", "lg"] as const).map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPreviewSize(sz)}
                    className={`px-2 py-1 rounded text-[10px] font-black uppercase transition ${
                      previewSize === sz 
                        ? "bg-amber-400 text-black" 
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {sz}
                  </button>
                ))}

                {/* Flip button */}
                <button
                  type="button"
                  onClick={() => setIsFlipped(f => !f)}
                  className="ml-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
                >
                  <RotateCw size={12} /> {isFlipped ? "Awers (Przód)" : "Rewers (Tył)"}
                </button>
              </div>
            </div>

            {/* Live Interactive PlayerCard Render */}
            <div className="v200-preview-card-viewport">
              <PlayerCard
                player={selectedPlayer}
                templateOverride={selectedTemplate}
                layoutOverride={layoutOverrideConfig}
                size={previewSize}
                isFlipped={isFlipped}
                onFlipChange={setIsFlipped}
                showFlip={true}
                interactive={true}
              />
            </div>

            {/* Live Architecture Info Banner */}
            <div className="v200-preview-footer-stats">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">WARSTWA 1 (TŁO):</span>
                  <b className="text-white uppercase">{selectedTemplate} Arena 3D</b>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">WARSTWA 2 (SYLWETKA):</span>
                  <b className="text-cyan-400">{customPhotoUrl ? "Własny PNG" : "Klubowy Cutout"}</b>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">WARSTWA 3 (DANE):</span>
                  <b className="text-emerald-400">HTML/CSS Dynamiczny</b>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">WARSTWA 4 & 5 (RAMA/FX):</span>
                  <b className="text-purple-400">Foil & Specular Glow</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
