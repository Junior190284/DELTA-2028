"use client";

import React, { useState, useMemo } from "react";
import { 
  Trophy, 
  Dumbbell, 
  Star, 
  Award, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  Flame, 
  MapPin, 
  Goal,
  CheckCircle2
} from "lucide-react";

export interface TimelineItem {
  id: string;
  date: string;
  type: "match" | "training" | "achievement";
  title: string;
  subtitle: string;
  xpEarned: number;
  badge: string;
  location?: string;
  score?: string;
  result?: "W" | "R" | "P";
  goals?: number;
  assists?: number;
  matchRef?: any;
}

interface CareerTimelineProps {
  player: { id: string; display_name: string; shirt_number?: number | string | null; position?: string | null };
  matches: any[];
  trainingSessions: any[];
  matchAttendance: any[];
  trainingAttendance: any[];
  events: any[];
  stats: Record<string, any>;
  trainingStats: Record<string, any>;
  onOpenMatch?: (m: any) => void;
}

export function CareerTimeline({
  player,
  matches = [],
  trainingSessions = [],
  matchAttendance = [],
  trainingAttendance = [],
  events = [],
  stats = {},
  trainingStats = {},
  onOpenMatch
}: CareerTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "matches" | "trainings" | "achievements">("all");

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // 1. ZWERYFIKOWANE TRENINGI (Obecności)
    trainingSessions.forEach(tr => {
      const att = trainingAttendance.find(
        a => a.training_id === tr.id && a.player_id === player.id
      );
      const isPresent = att && (att.status === "present" || att.status === "yes");

      if (isPresent) {
        items.push({
          id: `tr-${tr.id}`,
          date: tr.training_date,
          type: "training",
          title: tr.title || "Trening zespołu",
          subtitle: `${tr.start_time?.slice(0, 5) || "17:00"} • Trening techniczno-taktyczny DELTA`,
          location: tr.location || "Boisko klubowe",
          xpEarned: 40,
          badge: "TRENING ZESPOŁU"
        });
      }
    });

    // 2. ROZEGRANE MECZE LIGOWE
    const playedMatches = matches.filter(m => m.status === "played");
    playedMatches.forEach(m => {
      const att = matchAttendance.find(
        a => a.match_id === m.id && a.player_id === player.id
      );
      const playerEvents = events.filter(
        e => e.match_id === m.id && (e.player_id === player.id || e.assist_player_id === player.id)
      );

      const isParticipant = (att && (att.status === "present" || att.status === "yes")) || playerEvents.length > 0;

      if (isParticipant) {
        const goalsCount = events.filter(
          e => e.match_id === m.id && e.player_id === player.id && e.event_type === "goal"
        ).length;
        const assistsCount = events.filter(
          e => e.match_id === m.id && e.assist_player_id === player.id
        ).length;

        const isHome = (m.home_team || "").toLowerCase().includes("delta");
        const deltaScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
        const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
        const res: "W" | "R" | "P" = deltaScore > oppScore ? "W" : deltaScore === oppScore ? "R" : "P";

        items.push({
          id: `m-${m.id}`,
          date: m.match_date,
          type: "match",
          title: `${m.home_team} vs ${m.away_team}`,
          subtitle: `Mecz ligowy MZPN • Wynik: ${m.home_score ?? "–"} : ${m.away_score ?? "–"}`,
          location: m.venue || "Boisko ligowe",
          xpEarned: 60,
          badge: "MECZ OFICJALNY",
          score: `${m.home_score ?? 0} : ${m.away_score ?? 0}`,
          result: res,
          goals: goalsCount,
          assists: assistsCount,
          matchRef: m
        });
      }
    });

    // 3. PRZEŁOMOWE MOMENTY I OSIĄGNIĘCIA
    // A. Debiut w meczu
    const sortedPlayed = [...playedMatches]
      .filter(m => {
        const att = matchAttendance.find(a => a.match_id === m.id && a.player_id === player.id);
        const hasEv = events.some(e => e.match_id === m.id && e.player_id === player.id);
        return (att && (att.status === "present" || att.status === "yes")) || hasEv;
      })
      .sort((a, b) => a.match_date.localeCompare(b.match_date));

    if (sortedPlayed.length > 0) {
      const debut = sortedPlayed[0];
      items.push({
        id: `milestone-debut`,
        date: debut.match_date,
        type: "achievement",
        title: "Oficjalny Debiut w Barwach DELTY! 🌟",
        subtitle: `Pierwszy występ ligowy przeciwko ${debut.away_team?.includes("Delta") ? debut.home_team : debut.away_team}`,
        location: debut.venue || "Boisko ligowe",
        xpEarned: 100,
        badge: "DEBIUT MECZOWY",
        matchRef: debut
      });
    }

    // B. Pierwsza bramka
    const firstGoalEvent = events
      .filter(e => e.player_id === player.id && e.event_type === "goal")
      .map(e => ({ event: e, match: matches.find(m => m.id === e.match_id) }))
      .filter(x => x.match && x.match.match_date)
      .sort((a, b) => (a.match?.match_date || "").localeCompare(b.match?.match_date || ""))[0];

    if (firstGoalEvent && firstGoalEvent.match) {
      items.push({
        id: `milestone-first-goal`,
        date: firstGoalEvent.match.match_date,
        type: "achievement",
        title: "Pierwsza Oficjalna Bramka Ligowa! ⚽🔥",
        subtitle: `Gol zdobyty w meczu z ${firstGoalEvent.match.away_team?.includes("Delta") ? firstGoalEvent.match.home_team : firstGoalEvent.match.away_team}`,
        location: firstGoalEvent.match.venue || "Boisko ligowe",
        xpEarned: 150,
        badge: "PIERWSZY GOL",
        matchRef: firstGoalEvent.match
      });
    }

    // C. Opaska Kapitańska
    const pStats = stats[player.id];
    if (pStats && pStats.captain && pStats.captain > 0) {
      items.push({
        id: `milestone-captain`,
        date: sortedPlayed[sortedPlayed.length - 1]?.match_date || new Date().toISOString().slice(0, 10),
        type: "achievement",
        title: "Kapitan Drużyny DELTA! 🎖️",
        subtitle: `Wyprowadzenie zespołu na boisko jako lider drużyny`,
        xpEarned: 100,
        badge: "KAPITAN"
      });
    }

    // D. Seria treningowa
    const trStats = trainingStats[player.id];
    if (trStats && trStats.attendanceStreak >= 5) {
      items.push({
        id: `milestone-streak`,
        date: new Date().toISOString().slice(0, 10),
        type: "achievement",
        title: `Płomień Frekwencji: ${trStats.attendanceStreak} treningów z rzędu! 🔥`,
        subtitle: "Wzorowe zaangażowanie i regularność na zbiórkach",
        xpEarned: 120,
        badge: "SERIA OBECNOŚCI"
      });
    }

    // Sortowanie chronologiczne: najnowsze na górze
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [player.id, matches, trainingSessions, matchAttendance, trainingAttendance, events, stats, trainingStats]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "matches") return timelineItems.filter(i => i.type === "match");
    if (activeFilter === "trainings") return timelineItems.filter(i => i.type === "training");
    if (activeFilter === "achievements") return timelineItems.filter(i => i.type === "achievement");
    return timelineItems;
  }, [timelineItems, activeFilter]);

  const counts = useMemo(() => ({
    all: timelineItems.length,
    matches: timelineItems.filter(i => i.type === "match").length,
    trainings: timelineItems.filter(i => i.type === "training").length,
    achievements: timelineItems.filter(i => i.type === "achievement").length
  }), [timelineItems]);

  return (
    <div className="v7b-career-timeline">
      {/* PASEK FILTRÓW */}
      <div className="v7b-timeline-filter-bar">
        <button
          type="button"
          className={`v7b-timeline-filter-btn ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <span>Wszystko</span>
          <span className="count-pill">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`v7b-timeline-filter-btn ${activeFilter === "matches" ? "active" : ""}`}
          onClick={() => setActiveFilter("matches")}
        >
          <Trophy size={14} />
          <span>Mecze</span>
          <span className="count-pill">{counts.matches}</span>
        </button>

        <button
          type="button"
          className={`v7b-timeline-filter-btn ${activeFilter === "trainings" ? "active" : ""}`}
          onClick={() => setActiveFilter("trainings")}
        >
          <Dumbbell size={14} />
          <span>Treningi</span>
          <span className="count-pill">{counts.trainings}</span>
        </button>

        <button
          type="button"
          className={`v7b-timeline-filter-btn ${activeFilter === "achievements" ? "active" : ""}`}
          onClick={() => setActiveFilter("achievements")}
        >
          <Award size={14} />
          <span>Osiągnięcia</span>
          <span className="count-pill">{counts.achievements}</span>
        </button>
      </div>

      {/* OŚ CZASU */}
      {filteredItems.length > 0 ? (
        <div className="v7b-timeline-track">
          {filteredItems.map(item => {
            const formattedDate = new Date(item.date).toLocaleDateString("pl-PL", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            });

            return (
              <div key={item.id} className={`v7b-timeline-node node-${item.type}`}>
                {/* IKONA ORAZ ZNACZNIK OSI */}
                <div className="v7b-timeline-marker">
                  <div className="marker-dot">
                    {item.type === "match" && <Trophy size={14} />}
                    {item.type === "training" && <Dumbbell size={14} />}
                    {item.type === "achievement" && <Star size={14} />}
                  </div>
                  <div className="marker-line" />
                </div>

                {/* KARTA WYDARZENIA */}
                <div className="v7b-timeline-card devil-card">
                  <div className="v7b-card-top-row">
                    <div className="v7b-card-badges">
                      <span className={`v7b-type-badge ${item.type}`}>
                        {item.badge}
                      </span>
                      <span className="v7b-date-badge">
                        <Calendar size={11} /> {formattedDate}
                      </span>
                    </div>

                    <div className="v7b-xp-gain-pill" title="Zdobyte punkty doświadczenia">
                      <Sparkles size={12} />
                      <span>+{item.xpEarned} XP</span>
                    </div>
                  </div>

                  <h3 className="v7b-card-title">{item.title}</h3>
                  <p className="v7b-card-subtitle">{item.subtitle}</p>

                  {item.location && (
                    <div className="v7b-card-location">
                      <MapPin size={12} />
                      <span>{item.location}</span>
                    </div>
                  )}

                  {/* DODATKOWE STATYSTYKI MECZOWE */}
                  {item.type === "match" && (
                    <div className="v7b-match-chips-row">
                      {item.result && (
                        <span className={`result-tag res-${item.result.toLowerCase()}`}>
                          {item.result === "W" ? "WYGRANA" : item.result === "R" ? "REMIS" : "PORAŻKA"}
                        </span>
                      )}
                      {(item.goals || 0) > 0 && (
                        <span className="stat-chip goal-chip">
                          ⚽ {item.goals} {item.goals === 1 ? "bramka" : "bramki"}
                        </span>
                      )}
                      {(item.assists || 0) > 0 && (
                        <span className="stat-chip assist-chip">
                          🎯 {item.assists} {item.assists === 1 ? "asysta" : "asysty"}
                        </span>
                      )}
                      {onOpenMatch && item.matchRef && (
                        <button
                          type="button"
                          className="v7b-open-match-btn"
                          onClick={() => onOpenMatch(item.matchRef)}
                        >
                          <span>Szczegóły meczu</span>
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="v7b-timeline-empty devil-card">
          <Calendar size={36} />
          <h4>Brak zdarzeń na osi kariery</h4>
          <p>
            {activeFilter === "all"
              ? "Historia występów i treningów pojawi się po zapisaniu pierwszych aktywności zawodnika."
              : `Brak zapisanych pozycji w kategorii "${
                  activeFilter === "matches" ? "Mecze" : activeFilter === "trainings" ? "Treningi" : "Osiągnięcia"
                }".`}
          </p>
        </div>
      )}
    </div>
  );
}

export default CareerTimeline;
