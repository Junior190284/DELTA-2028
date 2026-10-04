"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, RotateCcw, PenTool, Sparkles, Award } from "lucide-react";
import { CardDefinition } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

interface DigitalSignatureModalProps {
  card: CardDefinition;
  onClose: () => void;
  onSaved?: (signatureDataUrl: string) => void;
}

export default function DigitalSignatureModal({
  card,
  onClose,
  onSaved
}: DigitalSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState<"gold" | "neon" | "silver">("gold");
  const [mounted, setMounted] = useState(false);

  const playerKey = card.player_id || card.id;
  const storageKey = `delta_sig_${playerKey}`;

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Load existing signature if present
    const existing = localStorage.getItem(storageKey);
    if (existing && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && canvasRef.current) {
          ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          setHasDrawn(true);
        }
      };
      img.src = existing;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [storageKey]);

  const getStrokeColor = () => {
    if (inkColor === "gold") return "#f1c95c";
    if (inkColor === "neon") return "#38bdf8";
    return "#e2e8f0";
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getStrokeColor();
    ctx.shadowColor = inkColor === "gold" ? "rgba(241, 201, 92, 0.8)" : "rgba(56, 189, 248, 0.8)";
    ctx.shadowBlur = 6;

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    cardSound.playHover();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    localStorage.setItem(storageKey, dataUrl);
    cardSound.playPurchase();
    cardSound.playHaptic("heavy");
    onSaved?.(dataUrl);
    onClose();
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="v200-picker-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "rgba(3, 5, 8, 0.94)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflow: "hidden"
      }}
      onClick={onClose}
    >
      <div 
        className="v200-sig-modal"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "linear-gradient(145deg, #111827, #0b0f17)",
          border: "1px solid rgba(241, 201, 92, 0.35)",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.9), 0 0 30px rgba(241, 201, 92, 0.15)",
          color: "#fff"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <PenTool size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">WIRTUALNY AUTOGRAF</h3>
              <p className="text-xs text-amber-300/80">{card.player?.display_name || card.card_name} • # {card.player?.shirt_number || "GM"}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ink Color Selector */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-slate-400">Wybierz styl graweru:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInkColor("gold")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                inkColor === "gold" ? "bg-amber-500/30 text-amber-300 border border-amber-400" : "bg-white/5 text-slate-400 border border-transparent"
              }`}
            >
              <Sparkles size={11} /> Złoty
            </button>
            <button
              type="button"
              onClick={() => setInkColor("neon")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                inkColor === "neon" ? "bg-sky-500/30 text-sky-300 border border-sky-400" : "bg-white/5 text-slate-400 border border-transparent"
              }`}
            >
              <Sparkles size={11} /> Neon
            </button>
          </div>
        </div>

        {/* Canvas Pad */}
        <div 
          className="relative rounded-xl border border-dashed border-amber-500/40 bg-black/60 p-1 flex items-center justify-center mb-4 overflow-hidden"
          style={{ height: "200px" }}
        >
          <canvas
            ref={canvasRef}
            width={440}
            height={192}
            className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 gap-1.5">
              <PenTool size={24} className="opacity-40" />
              <span className="text-xs font-medium tracking-wide">Złóż podpis palcem lub myszką w tym polu</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={clearCanvas}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw size={14} /> Wyczyść
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              hasDrawn 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:brightness-110 shadow-lg shadow-amber-500/25" 
                : "bg-white/10 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Check size={16} /> ZAPISZ AUTOGRAF NA REWERSIE
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
