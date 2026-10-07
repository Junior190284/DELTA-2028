"use client";

import React, { useState } from "react";
import { X, ShieldAlert, AlertTriangle, Check, RefreshCcw } from "lucide-react";

interface DeltaAdminResetBadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetCompleted?: () => void;
}

export default function DeltaAdminResetBadgesModal({
  isOpen,
  onClose,
  onResetCompleted
}: DeltaAdminResetBadgesModalProps) {
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async () => {
    if (confirmationPhrase !== "RESET-ODZNAKI-2026") {
      setErrorMsg("Wpisz dokładnie hasło: RESET-ODZNAKI-2026");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/reset-achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationPhrase })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          if (onResetCompleted) onResetCompleted();
          onClose();
        }, 2000);
      } else {
        setErrorMsg(data.error || "Wystąpił błąd podczas resetowania.");
      }
    } catch (err: any) {
      setErrorMsg("Błąd połączenia: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head bg-red-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <ShieldAlert size={24} />
            </div>
            <div>
              <span className="eyebrow gold text-red-400">BEZPIECZEŃSTWO ADMINISTRATORA</span>
              <h2 className="text-xl font-black text-white m-0">RESET OSIĄGNIĘĆ I ODZNAK</h2>
            </div>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block">Uwaga: Ta operacja jest nieodwracalna!</strong>
              <p className="text-[11px] text-red-300/90 leading-relaxed">
                Zostaną usunięte wyłącznie <b>odznaki i osiągnięcia zawodników</b> (np. przed startem nowego sezonu).
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
            <strong className="text-white text-xs block">Co NIE ZOSTANIE usunięte:</strong>
            <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
              <li>Karty w kolekcjach użytkowników (karty 3D pozostają nienaruszone)</li>
              <li>Mecze, gole, asysty i statystyki historyczne</li>
              <li>Konta i profile użytkowników</li>
              <li>Historia otwarć paczek i punkty DP</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-900/60 border border-red-500 text-red-200 text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-900/60 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2">
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1.5 pt-2">
            <label className="text-slate-300 font-bold block">
              Wpisz hasło potwierdzające: <code className="text-amber-400 font-mono">RESET-ODZNAKI-2026</code>
            </label>
            <input
              type="text"
              value={confirmationPhrase}
              onChange={e => setConfirmationPhrase(e.target.value)}
              placeholder="RESET-ODZNAKI-2026"
              className="w-full bg-slate-950 text-white font-mono text-xs p-3 rounded-xl border border-red-500/40 outline-none focus:border-red-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex justify-between items-center">
          <button type="button" className="v200-tc-action-btn" onClick={onClose}>
            ANULUJ
          </button>
          <button
            type="button"
            disabled={loading || confirmationPhrase !== "RESET-ODZNAKI-2026"}
            className="v200-tc-action-btn"
            style={{
              background: confirmationPhrase === "RESET-ODZNAKI-2026" ? "#dc2626" : "rgba(255,255,255,0.05)",
              color: "#fff"
            }}
            onClick={handleReset}
          >
            <RefreshCcw size={13} /> {loading ? "Resetowanie…" : "POTWIERDŹ I ZRESETUJ"}
          </button>
        </div>
      </div>
    </div>
  );
}
