"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  Save, 
  RotateCcw, 
  Upload, 
  Sliders, 
  Eye, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  User,
  Crown,
  Flame,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Shield,
  BookOpen
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

const TEMPLATES_LIST: { key: CardTemplateKey; label: string; color: string; icon: string }[] = [
  { key: "base", label: "BASE", color: "#94a3b8", icon: "🛡️" },
  { key: "matchday", label: "MATCHDAY", color: "#38bdf8", icon: "⚡" },
  { key: "gold", label: "GOLD", color: "#f59e0b", icon: "🌟" },
  { key: "legend", label: "LEGEND", color: "#c084fc", icon: "👑" },
  { key: "inferno", label: "INFERNO", color: "#ef4444", icon: "🔥" },
  { key: "panini", label: "PANINI", color: "#34d399", icon: "📖" }
];

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

        await fetch("/api/cards/layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // Save to local cache as well
        try {
          const cacheRaw = localStorage.getItem("delta_card_layouts_cache") || "{}";
          const cache = JSON.parse(cacheRaw);
          templatesToSave.forEach(tk => {
            cache[`${selectedPlayerId}_${tk}`] = {
              scale,
              translateX,
              translateY,
              rotate,
              brightness,
              contrast,
              photoUrl: customPhotoUrl || null
            };
          });
          localStorage.setItem("delta_card_layouts_cache", JSON.stringify(cache));
        } catch {}
      }

      setFeedback({ 
        type: "success", 
        text: applyToAllTemplates 
          ? "Zapisano układ dla wszystkich szablonów karty tego zawodnika!" 
          : `Zapisano układ szablonu ${selectedTemplate.toUpperCase()}!` 
      });

      fetchLayouts(selectedPlayerId);
      if (onLayoutSaved) onLayoutSaved();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Nie udało się zapisać ustawień." });
    } finally {
      setSaving(false);
    }
  };

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

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    <div className="cle-root">
      {/* NAGŁÓWEK EDYTORA */}
      <div className="cle-header">
        <div className="cle-badge-row">
          <span className="cle-engine-tag">
            <Sliders size={13} />
            <span>VISUAL CARD LAYOUT ENGINE 2.0</span>
          </span>
        </div>
        <h2 className="cle-title">Wizualny Edytor Architektury Kart 3D</h2>
        <p className="cle-subtitle">
          Dostosuj pozycję sylwetki, skalę, przesunięcie X/Y i parametry per zawodnik oraz szablon w czasie rzeczywistym.
        </p>
      </div>

      {/* GŁÓWNY GRID */}
      <div className="cle-grid">
        
        {/* LEWA KOLUMNA: PANELE KONTROLNE */}
        <div className="cle-controls-col">
          
          {/* 1. SEKCJA: WYBÓR ZAWODNIKA I SZABLONU */}
          <div className="cle-box">
            <div className="cle-box-head">
              <User size={16} className="text-amber-400" />
              <span>1. Wybierz Zawodnika i Szablon</span>
            </div>

            <div className="cle-form-group">
              <label className="cle-label">Zawodnik DELTA GM:</label>
              <select
                value={selectedPlayerId}
                onChange={e => setSelectedPlayerId(e.target.value)}
                className="cle-select"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} (#{p.shirt_number || "—"}) — {p.position || "Zawodnik"}
                  </option>
                ))}
              </select>
            </div>

            <div className="cle-form-group">
              <label className="cle-label">Szablon / Ranga Karty:</label>
              <div className="cle-template-grid">
                {TEMPLATES_LIST.map(tpl => {
                  const isSelected = selectedTemplate === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.key)}
                      className={`cle-tpl-btn ${isSelected ? "active" : ""}`}
                      style={{
                        borderColor: isSelected ? tpl.color : undefined,
                        boxShadow: isSelected ? `0 0 14px ${tpl.color}40` : undefined
                      }}
                    >
                      <span className="cle-tpl-icon">{tpl.icon}</span>
                      <span className="cle-tpl-label" style={{ color: isSelected ? tpl.color : undefined }}>
                        {tpl.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. SEKCJA: ŹRÓDŁO SYLWETKI (PNG) */}
          <div className="cle-box">
            <div className="cle-box-head">
              <Upload size={16} className="text-cyan-400" />
              <span>2. Źródło Przezroczystej Sylwetki (PNG)</span>
            </div>

            <div className="cle-form-group">
              <div className="flex items-center gap-3 flex-wrap">
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
                  className="cle-btn-upload"
                >
                  <Upload size={14} /> Wgraj plik sylwetki PNG (Transparent)
                </button>

                {customPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomPhotoUrl("")}
                    className="cle-btn-remove-photo"
                  >
                    Usuń własną grafikę
                  </button>
                )}
              </div>

              <label className="cle-label mt-2">
                Lub wklej bezpośredni URL do wyciętego PNG:
                <input
                  type="text"
                  placeholder="https://.../player-cutout.png"
                  value={customPhotoUrl}
                  onChange={e => setCustomPhotoUrl(e.target.value)}
                  className="cle-input-text mt-1"
                />
              </label>
            </div>
          </div>

          {/* 3. SEKCJA: SUWAKI POZYCJI I SKALI */}
          <div className="cle-box">
            <div className="cle-box-head-split">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-emerald-400" />
                <span>3. Kalibracja Pozycji & Skali</span>
              </div>
              
              {/* D-PAD KONTROLKI */}
              <div className="cle-dpad">
                <button 
                  type="button" 
                  onClick={() => setTranslateX(x => Math.max(-50, x - 1))}
                  title="W lewo (-1%)"
                  className="cle-dpad-btn"
                >
                  <ArrowLeft size={13} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setTranslateY(y => Math.max(-50, y - 1))}
                  title="W górę (-1%)"
                  className="cle-dpad-btn"
                >
                  <ArrowUp size={13} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setTranslateY(y => Math.min(50, y + 1))}
                  title="W dół (+1%)"
                  className="cle-dpad-btn"
                >
                  <ArrowDown size={13} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setTranslateX(x => Math.min(50, x + 1))}
                  title="W prawo (+1%)"
                  className="cle-dpad-btn"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* Skala */}
              <div className="cle-slider-group">
                <div className="cle-slider-header">
                  <span>Skala Wielkości (Scale):</span>
                  <span className="cle-val text-amber-400">{scale.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.2"
                    step="0.01"
                    value={scale}
                    onChange={e => setScale(parseFloat(e.target.value))}
                    className="cle-range-slider flex-1 range-amber"
                  />
                  <button 
                    type="button" 
                    onClick={() => setScale(1.0)} 
                    className="cle-btn-reset-mini"
                  >
                    1.0x
                  </button>
                </div>
              </div>

              {/* Poziom X */}
              <div className="cle-slider-group">
                <div className="cle-slider-header">
                  <span>Przesunięcie Poziome (X):</span>
                  <span className="cle-val text-cyan-400">
                    {translateX > 0 ? `+${translateX.toFixed(1)}%` : `${translateX.toFixed(1)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="0.5"
                    value={translateX}
                    onChange={e => setTranslateX(parseFloat(e.target.value))}
                    className="cle-range-slider flex-1 range-cyan"
                  />
                  <button 
                    type="button" 
                    onClick={() => setTranslateX(0)} 
                    className="cle-btn-reset-mini"
                  >
                    Centrum
                  </button>
                </div>
              </div>

              {/* Pion Y */}
              <div className="cle-slider-group">
                <div className="cle-slider-header">
                  <span>Przesunięcie Pionowe (Y):</span>
                  <span className="cle-val text-emerald-400">
                    {translateY > 0 ? `+${translateY.toFixed(1)}%` : `${translateY.toFixed(1)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="0.5"
                    value={translateY}
                    onChange={e => setTranslateY(parseFloat(e.target.value))}
                    className="cle-range-slider flex-1 range-emerald"
                  />
                  <button 
                    type="button" 
                    onClick={() => setTranslateY(0)} 
                    className="cle-btn-reset-mini"
                  >
                    Centrum
                  </button>
                </div>
              </div>

              {/* Kąt obrotu */}
              <div className="cle-slider-group">
                <div className="cle-slider-header">
                  <span>Kąt Obrócenia (Rotate):</span>
                  <span className="cle-val text-purple-400">{rotate}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={rotate}
                    onChange={e => setRotate(parseFloat(e.target.value))}
                    className="cle-range-slider flex-1 range-purple"
                  />
                  <button 
                    type="button" 
                    onClick={() => setRotate(0)} 
                    className="cle-btn-reset-mini"
                  >
                    0°
                  </button>
                </div>
              </div>

              {/* Jasność & Kontrast */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="cle-slider-group">
                  <div className="cle-slider-header">
                    <span>Jasność:</span>
                    <span className="cle-val text-slate-300">{brightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={brightness}
                    onChange={e => setBrightness(parseFloat(e.target.value))}
                    className="cle-range-slider w-full range-slate"
                  />
                </div>

                <div className="cle-slider-group">
                  <div className="cle-slider-header">
                    <span>Kontrast:</span>
                    <span className="cle-val text-slate-300">{contrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={contrast}
                    onChange={e => setContrast(parseFloat(e.target.value))}
                    className="cle-range-slider w-full range-slate"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. SEKCJA: ZAPISYWANIE */}
          <div className="cle-box space-y-3">
            {feedback && (
              <div className={`cle-feedback ${feedback.type}`}>
                {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSaveLayout(false)}
                disabled={saving}
                className="cle-btn-save-main flex-1"
              >
                <Save size={15} /> {saving ? "Zapisywanie..." : `Zapisz Szablon ${selectedTemplate.toUpperCase()}`}
              </button>

              <button
                type="button"
                onClick={() => handleSaveLayout(true)}
                disabled={saving}
                className="cle-btn-save-all"
                title="Zastosuj tę samą pozycję sylwetki do wszystkich szablonów tego zawodnika"
              >
                <Layers size={14} /> Dla Wszystkich Szablonów
              </button>

              <button
                type="button"
                onClick={handleResetLayout}
                disabled={saving}
                className="cle-btn-reset-full"
                title="Przywróć domyślne proporcje dla tego szablonu"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA: PODGLĄD 3D NA ŻYWO */}
        <div className="cle-preview-col">
          <div className="cle-preview-box">
            
            {/* Pasek narzędzi podglądu */}
            <div className="cle-preview-toolbar">
              <div className="flex items-center gap-2">
                <span className="cle-preview-title flex items-center gap-1.5">
                  <Eye size={15} className="text-amber-400" /> Podgląd 3D na żywo
                </span>
                <span className="cle-aspect-tag">2:3 Fut Ratio</span>
              </div>

              <div className="flex items-center gap-1.5">
                {(["sm", "md", "lg"] as const).map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPreviewSize(sz)}
                    className={`cle-size-btn ${previewSize === sz ? "active" : ""}`}
                  >
                    {sz.toUpperCase()}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsFlipped(f => !f)}
                  className="cle-flip-btn"
                >
                  <RotateCw size={13} /> {isFlipped ? "Awers (Przód)" : "Rewers (Tył)"}
                </button>
              </div>
            </div>

            {/* Viewport Karty 3D */}
            <div className="cle-card-viewport">
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

            {/* Pasek warstw */}
            <div className="cle-layer-info-bar">
              <div className="cle-layer-info-card">
                <span className="cle-lic-label">Warstwa 1 (Tło):</span>
                <b className="cle-lic-val text-amber-400 uppercase">{selectedTemplate} Arena 3D</b>
              </div>
              <div className="cle-layer-info-card">
                <span className="cle-lic-label">Warstwa 2 (Sylwetka):</span>
                <b className="cle-lic-val text-cyan-400">{customPhotoUrl ? "Własny PNG" : "Klubowy Cutout"}</b>
              </div>
              <div className="cle-layer-info-card">
                <span className="cle-lic-label">Warstwa 3 (Dane):</span>
                <b className="cle-lic-val text-emerald-400">HTML/CSS Dynamiczny</b>
              </div>
              <div className="cle-layer-info-card">
                <span className="cle-lic-label">Warstwa 4/5 (FX):</span>
                <b className="cle-lic-val text-purple-400">Specular Glow & Holo</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INLINE CSS STYLES FOR NEXT.JS APP ROUTER */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cle-root {
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
          color: #ffffff !important;
          box-sizing: border-box !important;
          font-family: inherit !important;
        }

        .cle-root button {
          cursor: pointer !important;
        }

        .cle-header {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          background: rgba(15, 23, 42, 0.7) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 16px !important;
          padding: 14px 18px !important;
        }

        .cle-badge-row {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .cle-engine-tag {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          font-size: 9.5px !important;
          font-weight: 900 !important;
          padding: 3px 8px !important;
          border-radius: 999px !important;
          background: rgba(245, 158, 11, 0.15) !important;
          color: #fcd34d !important;
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          letter-spacing: 0.5px !important;
        }

        .cle-title {
          font-size: 15px !important;
          font-weight: 900 !important;
          margin: 4px 0 0 0 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          color: #ffffff !important;
        }

        .cle-subtitle {
          font-size: 11.5px !important;
          color: #94a3b8 !important;
          margin: 0 !important;
        }

        .cle-grid {
          display: grid !important;
          grid-template-columns: 1fr 440px !important;
          gap: 18px !important;
          width: 100% !important;
          align-items: start !important;
        }

        .cle-controls-col {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }

        .cle-box {
          background: rgba(15, 23, 42, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 14px !important;
          padding: 14px 16px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 10px !important;
          box-sizing: border-box !important;
        }

        .cle-box-head {
          font-size: 12px !important;
          font-weight: 900 !important;
          color: #ffffff !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        .cle-box-head-split {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          color: #ffffff !important;
          text-transform: uppercase !important;
        }

        .cle-form-group {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
        }

        .cle-label {
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #cbd5e1 !important;
        }

        .cle-select, .cle-input-text {
          width: 100% !important;
          padding: 8px 12px !important;
          background: #090e17 !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          font-size: 11.5px !important;
          box-sizing: border-box !important;
          outline: none !important;
        }

        .cle-select:focus, .cle-input-text:focus {
          border-color: #f59e0b !important;
        }

        /* TEMPLATES */
        .cle-template-grid {
          display: grid !important;
          grid-template-columns: repeat(6, 1fr) !important;
          gap: 6px !important;
        }

        .cle-tpl-btn {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 3px !important;
          padding: 8px 4px !important;
          border-radius: 10px !important;
          background: rgba(0, 0, 0, 0.5) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #94a3b8 !important;
          cursor: pointer !important;
          transition: 0.15s ease !important;
          text-align: center !important;
        }

        .cle-tpl-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }

        .cle-tpl-btn.active {
          background: rgba(15, 23, 42, 0.95) !important;
          transform: translateY(-2px) !important;
        }

        .cle-tpl-icon {
          font-size: 15px !important;
        }

        .cle-tpl-label {
          font-size: 9.5px !important;
          font-weight: 900 !important;
          letter-spacing: 0.5px !important;
        }

        /* BUTTONS */
        .cle-btn-upload {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 7px 14px !important;
          border-radius: 9px !important;
          background: rgba(6, 182, 212, 0.15) !important;
          border: 1px solid rgba(6, 182, 212, 0.4) !important;
          color: #67e8f9 !important;
          font-size: 11.5px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          transition: 0.15s ease !important;
        }

        .cle-btn-upload:hover {
          background: rgba(6, 182, 212, 0.3) !important;
          color: #ffffff !important;
        }

        .cle-btn-remove-photo {
          font-size: 11px !important;
          color: #f87171 !important;
          background: none !important;
          border: none !important;
          text-decoration: underline !important;
          cursor: pointer !important;
        }

        /* DPAD */
        .cle-dpad {
          display: flex !important;
          align-items: center !important;
          gap: 3px !important;
          background: rgba(0, 0, 0, 0.6) !important;
          padding: 3px !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .cle-dpad-btn {
          padding: 4px 6px !important;
          border-radius: 5px !important;
          background: transparent !important;
          border: none !important;
          color: #cbd5e1 !important;
          cursor: pointer !important;
          display: grid !important;
          place-items: center !important;
          transition: 0.1s ease !important;
        }

        .cle-dpad-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }

        /* SLIDERS */
        .cle-slider-group {
          display: flex !important;
          flex-direction: column !important;
          gap: 3px !important;
        }

        .cle-slider-header {
          display: flex !important;
          justify-content: space-between !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #cbd5e1 !important;
        }

        .cle-val {
          font-family: monospace !important;
          font-weight: 900 !important;
          font-size: 11.5px !important;
        }

        .cle-range-slider {
          height: 6px !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.15) !important;
          cursor: pointer !important;
        }

        .range-amber { accent-color: #f59e0b !important; }
        .range-cyan { accent-color: #06b6d4 !important; }
        .range-emerald { accent-color: #10b981 !important; }
        .range-purple { accent-color: #a855f7 !important; }
        .range-slate { accent-color: #cbd5e1 !important; }

        .cle-btn-reset-mini {
          padding: 3px 7px !important;
          border-radius: 6px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #94a3b8 !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .cle-btn-reset-mini:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
        }

        /* SAVE BUTTONS */
        .cle-btn-save-main {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          padding: 9px 16px !important;
          border-radius: 10px !important;
          background: linear-gradient(90deg, #f59e0b, #eab308) !important;
          border: none !important;
          color: #000000 !important;
          font-size: 11.5px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          cursor: pointer !important;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35) !important;
          transition: 0.15s ease !important;
        }

        .cle-btn-save-main:hover {
          transform: translateY(-1px) !important;
        }

        .cle-btn-save-all {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 9px 14px !important;
          border-radius: 10px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          transition: 0.15s ease !important;
        }

        .cle-btn-save-all:hover {
          background: rgba(255, 255, 255, 0.15) !important;
        }

        .cle-btn-reset-full {
          padding: 9px 12px !important;
          border-radius: 10px !important;
          background: rgba(220, 38, 38, 0.15) !important;
          border: 1px solid rgba(220, 38, 38, 0.3) !important;
          color: #f87171 !important;
          cursor: pointer !important;
          display: grid !important;
          place-items: center !important;
        }

        .cle-btn-reset-full:hover {
          background: rgba(220, 38, 38, 0.3) !important;
        }

        .cle-feedback {
          padding: 8px 12px !important;
          border-radius: 9px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }

        .cle-feedback.success {
          background: rgba(16, 185, 129, 0.15) !important;
          border: 1px solid rgba(16, 185, 129, 0.4) !important;
          color: #34d399 !important;
        }

        .cle-feedback.error {
          background: rgba(239, 68, 68, 0.15) !important;
          border: 1px solid rgba(239, 68, 68, 0.4) !important;
          color: #f87171 !important;
        }

        /* PREVIEW RIGHT COLUMN */
        .cle-preview-col {
          display: flex !important;
          flex-direction: column !important;
        }

        .cle-preview-box {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 16px !important;
          padding: 14px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }

        .cle-preview-toolbar {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .cle-preview-title {
          font-size: 12px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          color: #ffffff !important;
        }

        .cle-aspect-tag {
          font-size: 9.5px !important;
          font-family: monospace !important;
          color: #94a3b8 !important;
          background: rgba(255, 255, 255, 0.05) !important;
          padding: 1px 5px !important;
          border-radius: 4px !important;
        }

        .cle-size-btn {
          padding: 3px 7px !important;
          border-radius: 6px !important;
          background: rgba(255, 255, 255, 0.06) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #94a3b8 !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
        }

        .cle-size-btn.active {
          background: #f59e0b !important;
          color: #000000 !important;
          border-color: #f59e0b !important;
        }

        .cle-flip-btn {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 3px 8px !important;
          border-radius: 6px !important;
          background: rgba(255, 255, 255, 0.06) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #cbd5e1 !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .cle-flip-btn:hover {
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.12) !important;
        }

        .cle-card-viewport {
          min-height: 440px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 10px 0 !important;
          background: radial-gradient(circle at center, rgba(30, 41, 59, 0.5) 0%, rgba(0, 0, 0, 0.8) 100%) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        .cle-layer-info-bar {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 6px !important;
        }

        .cle-layer-info-card {
          background: rgba(0, 0, 0, 0.5) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          border-radius: 8px !important;
          padding: 6px 8px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }

        .cle-lic-label {
          font-size: 9.5px !important;
          color: #94a3b8 !important;
        }

        .cle-lic-val {
          font-size: 10.5px !important;
          font-weight: 800 !important;
        }

        @media (max-width: 1050px) {
          .cle-grid {
            grid-template-columns: 1fr !important;
          }
          .cle-template-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      ` }} />
    </div>
  );
}
