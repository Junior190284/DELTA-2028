"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, CalendarDays, Edit3, ShieldAlert, Filter, ChevronRight, Trophy } from "lucide-react";
import { formatTeamName } from "@/lib/teams";

interface MatchItem {
  id: string;
  match_date: string;
  match_time?: string | null;
  home_team: string;
  away_team: string;
  home_score?: number | null;
  away_score?: number | null;
  status: "scheduled" | "played" | "cancelled" | string;
  round_no?: number | string | null;
  venue?: string | null;
}

interface DeltaAdminMatchesToCompleteProps {
  matches: MatchItem[];
  events?: any[];
  attendance?: any[];
  onOpenMatchEdit: (match: MatchItem) => void;
}

export default function DeltaAdminMatchesToComplete({
  matches,
  events = [],
  attendance = [],
  onOpenMatchEdit
}: DeltaAdminMatchesToCompleteProps) {
  const [filter, setFilter] = useState<"to_complete" | "all" | "completed">("to_complete");

  // Determine what is missing for each match
  const analyzedMatches = matches.map(m => {
    const isPast = new Date(`${m.match_date}T${m.match_time || "23:59:00"}`) <= new Date();
    const hasScore = m.home_score !== null && m.home_score !== undefined && m.away_score !== null && m.away_score !== undefined;
    const matchEvents = events.filter(e => e.match_id === m.id);
    const hasStats = matchEvents.length > 0;
    const hasAttendance = attendance.some(a => a.match_id === m.id);

    const missingItems: string[] = [];
    if (isPast && !hasScore) missingItems.push("Brak wyniku końcowego");
    if (hasScore && !hasStats && (m.home_score! > 0 || m.away_score! > 0)) missingItems.push("Brak strzelców / asyst");
    if (!hasAttendance) missingItems.push("Brak listy obecności");

    const isComplete = hasScore && (hasStats || (m.home_score === 0 && m.away_score === 0));
    const isToComplete = missingItems.length > 0 && isPast;

    return {
      match: m,
      isPast,
      hasScore,
      hasStats,
      missingItems,
      isComplete,
      isToComplete
    };
  });

  const filtered = analyzedMatches.filter(item => {
    if (filter === "to_complete") return item.isToComplete;
    if (filter === "completed") return item.isComplete;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl bg-slate-900/80 border border-white/10">
        <div>
          <span className="eyebrow gold flex items-center gap-1.5">
            <ShieldAlert size={14} /> KONTROLA DANYCH MECZOWYCH
          </span>
          <h3 className="text-lg font-black text-white m-0">MECZE DO UZUPEŁNIENIA</h3>
          <p className="text-xs text-slate-400 m-0 mt-0.5">
            Mecze przeszłe wymagające wpisania wyniku, powiązań strzelców, asyst lub potwierdzenia składu.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "to_complete" ? "bg-red-600 text-white shadow-lg" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            onClick={() => setFilter("to_complete")}
          >
            Do uzupełnienia ({analyzedMatches.filter(x => x.isToComplete).length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "completed" ? "bg-emerald-600 text-white shadow-lg" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            onClick={() => setFilter("completed")}
          >
            Kompletne ({analyzedMatches.filter(x => x.isComplete).length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all" ? "bg-amber-500 text-black shadow-lg" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            onClick={() => setFilter("all")}
          >
            Wszystkie ({matches.length})
          </button>
        </div>
      </div>

      {/* Match Cards List */}
      <div className="space-y-3">
        {filtered.map(({ match: m, missingItems, isComplete }) => (
          <div
            key={m.id}
            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
              isComplete
                ? "bg-slate-900/60 border-emerald-500/30"
                : missingItems.length > 0
                ? "bg-gradient-to-r from-red-950/40 via-slate-900/90 to-slate-900 border-red-500/40"
                : "bg-slate-900/80 border-white/10"
            }`}
          >
            {/* Left: Date, Teams & Score */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] uppercase font-black text-slate-400">
                  {new Date(`${m.match_date}T12:00:00`).toLocaleDateString("pl-PL", { month: "short" }).toUpperCase()}
                </span>
                <b className="text-base font-black text-white leading-none">
                  {new Date(`${m.match_date}T12:00:00`).getDate()}
                </b>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    Kolejka {m.round_no || "—"} • {m.venue || "Mecz"}
                  </span>
                  {isComplete ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                      ✓ KOMPLETNY
                    </span>
                  ) : missingItems.length > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold">
                      DO UZUPEŁNIENIA
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-sm font-black text-white mt-1">
                  <span>{formatTeamName(m.home_team)}</span>
                  <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-amber-400 text-xs">
                    {m.home_score !== null && m.home_score !== undefined ? `${m.home_score} : ${m.away_score}` : "– : –"}
                  </span>
                  <span>{formatTeamName(m.away_team)}</span>
                </div>
              </div>
            </div>

            {/* Middle: Missing Items Checklist */}
            <div className="flex-1 md:px-4">
              {missingItems.length > 0 ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-red-400 block uppercase">Brakuje w systemie:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingItems.map(item => (
                      <span key={item} className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-red-300 text-[10px] font-bold">
                        ⚠️ {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Wszystkie dane meczowe są kompletne
                </span>
              )}
            </div>

            {/* Right: Quick Edit Action */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                className="v200-tc-action-btn gold"
                onClick={() => onOpenMatchEdit(m)}
              >
                <Edit3 size={13} /> EDYTUJ / UZUPEŁNIJ
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-white/10 text-slate-400 text-xs">
            Brak meczów w wybranej kategorii.
          </div>
        )}
      </div>
    </div>
  );
}
