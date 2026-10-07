"use client";

import React, { useState, useMemo } from "react";
import { 
  Flame, 
  Trophy, 
  CalendarDays, 
  Zap, 
  Goal, 
  Crown, 
  Sparkles, 
  TrendingUp,
  Award,
  Medal,
  Star,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { PlayerRecordItem } from "@/lib/achievements/engine";

interface PlayerRecordsViewProps {
  records: PlayerRecordItem[];
  playerName?: string;
  seasonLabel?: string;
}

export default function PlayerRecordsView({
  records,
  playerName = "Zawodnik",
  seasonLabel = "Sezon 2026/27"
}: PlayerRecordsViewProps) {
  const [scope, setScope] = useState<"season" | "career">("season");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const getRecordIcon = (category: string) => {
    switch (category) {
      case "attendance": return <Zap size={18} className="text-emerald-400" />;
      case "goals": return <Goal size={18} className="text-amber-400" />;
      case "leadership": return <Crown size={18} className="text-yellow-400" />;
      case "matches": return <CalendarDays size={18} className="text-sky-400" />;
      case "collection": return <Sparkles size={18} className="text-purple-400" />;
      default: return <Trophy size={18} className="text-amber-400" />;
    }
  };

  const filteredRecords = useMemo(() => {
    if (categoryFilter === "all") return records;
    return records.filter(r => r.category === categoryFilter);
  }, [records, categoryFilter]);

  // Highlight top 3 prestige records
  const topRecords = useMemo(() => {
    return records.slice(0, 3);
  }, [records]);

  return (
    <section className="v200-records-container">
      <header className="v200-records-header">
        <div className="v200-records-title-wrap">
          <span className="v200-records-kicker">
            <Flame size={14} className="gold-text" /> 100% POTWIERDZONE DANE KLUBOWE
          </span>
          <h3>TABLICA REKORDÓW <em>{playerName.toUpperCase()}</em></h3>
          <p className="text-xs text-slate-400 mt-1">
            Oficjalne osiągnięcia zapisane w meczach ligowych i na treningach DELTA Warszawa.
          </p>
        </div>

        {/* Przełącznik Sezon vs Kariera */}
        <div className="v200-records-toggle" role="group" aria-label="Wybór zakresu rekordów">
          <button
            type="button"
            className={scope === "season" ? "active" : ""}
            onClick={() => setScope("season")}
          >
            {seasonLabel}
          </button>
          <button
            type="button"
            className={scope === "career" ? "active" : ""}
            onClick={() => setScope("career")}
          >
            Cała Kariera
          </button>
        </div>
      </header>

      {/* TOP 3 PRESTIGE PODIUM CARDS */}
      {topRecords.length > 0 && (
        <div className="v200-records-podium-grid">
          {topRecords.map((rec, idx) => (
            <div 
              key={rec.id}
              className={`v200-podium-card rank-${idx + 1} ${
                idx === 0 ? "border-amber-400/60 bg-gradient-to-b from-amber-950/30 to-black/90 shadow-[0_8px_30px_rgba(245,158,11,0.2)]" :
                idx === 1 ? "border-slate-400/60 bg-gradient-to-b from-slate-900/30 to-black/90 shadow-[0_8px_30px_rgba(148,163,184,0.15)]" :
                "border-amber-700/60 bg-gradient-to-b from-amber-950/20 to-black/90 shadow-[0_8px_30px_rgba(180,83,9,0.15)]"
              }`}
            >
              <div className="podium-rank-badge">
                {idx === 0 ? "🥇 TOP 1 REKORD" : idx === 1 ? "🥈 TOP 2 REKORD" : "🥉 TOP 3 REKORD"}
              </div>
              <div className="podium-icon-box">
                {getRecordIcon(rec.category)}
              </div>
              <span className="podium-label">{rec.label}</span>
              <div className="podium-val-wrap">
                <strong className="podium-val">{rec.value}</strong>
                {rec.unit && <small className="podium-unit">{rec.unit}</small>}
              </div>
              {rec.details && <span className="podium-details">{rec.details}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="v200-records-filter-bar">
        {[
          { id: "all", label: `Wszystkie (${records.length})` },
          { id: "goals", label: "⚽ Gole & Asysty" },
          { id: "attendance", label: "🏃 Frekwencja" },
          { id: "leadership", label: "👑 Wyróżnienia" },
          { id: "collection", label: "🃏 Kolekcja" }
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`v200-record-filter-btn ${categoryFilter === cat.id ? "active" : ""}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Siatka kafelków rekordów */}
      <div className="v200-records-grid">
        {filteredRecords.map((rec) => (
          <article 
            key={rec.id} 
            className={`v200-record-tile ${rec.isNewRecord ? "is-new-record" : ""}`}
          >
            {rec.isNewRecord && (
              <span className="v200-new-record-tag">
                <Flame size={11} /> NOWY REKORD 🔥
              </span>
            )}

            <div className="v200-record-icon-box">
              {getRecordIcon(rec.category)}
            </div>

            <div className="v200-record-info">
              <span className="v200-record-label">{rec.label}</span>
              <div className="v200-record-value-wrap">
                <strong className="v200-record-value">{rec.value}</strong>
                {rec.unit && <small className="v200-record-unit">{rec.unit}</small>}
              </div>
              {rec.details && (
                <span className="v200-record-details">{rec.details}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
