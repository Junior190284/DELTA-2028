"use client";

import React, { useState } from "react";
import { 
  Flame, 
  Trophy, 
  CalendarDays, 
  Zap, 
  Goal, 
  Crown, 
  Sparkles, 
  TrendingUp,
  Award
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

  const getRecordIcon = (category: string) => {
    switch (category) {
      case "attendance": return <Zap size={18} />;
      case "goals": return <Goal size={18} />;
      case "leadership": return <Crown size={18} />;
      case "matches": return <CalendarDays size={18} />;
      case "collection": return <Sparkles size={18} />;
      default: return <Trophy size={18} />;
    }
  };

  return (
    <section className="v200-records-container">
      <header className="v200-records-header">
        <div className="v200-records-title-wrap">
          <span className="v200-records-kicker">
            <Flame size={14} className="gold-text" /> 100% POTWIERDZONE DANE KLUBOWE
          </span>
          <h3>MOJE REKORDY <em>{playerName.toUpperCase()}</em></h3>
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

      {/* Siatka kafelków rekordów */}
      <div className="v200-records-grid">
        {records.map((rec) => (
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
