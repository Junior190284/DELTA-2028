"use client";

import React, { useState, useMemo } from "react";
import { 
  Flame, 
  Zap, 
  CalendarDays, 
  Trophy, 
  Bell, 
  ChevronRight, 
  X, 
  AlertCircle,
  RefreshCw,
  Sparkles
} from "lucide-react";

export type LiveBarType = 
  | "match" 
  | "training" 
  | "lineup" 
  | "achievement" 
  | "news" 
  | "sync";

export interface LiveBarEvent {
  id: string;
  type: LiveBarType;
  priority: number; // 1 (najwyższy) do 6
  badge: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  targetTab: string;
  extraPayload?: any;
}

interface DeltaLiveBarProps {
  matches?: Array<{
    id: string;
    match_date: string;
    match_time: string | null;
    home_team: string;
    away_team: string;
    venue: string | null;
    status: string;
  }>;
  trainingSessions?: Array<{
    id: string;
    training_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    title: string;
  }>;
  news?: Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    published_at: string;
  }>;
  unansweredNotices?: Array<any>;
  onNavigate: (tab: string, extra?: any) => void;
}

export default function DeltaLiveBar({
  matches = [],
  trainingSessions = [],
  news = [],
  unansweredNotices = [],
  onNavigate,
}: DeltaLiveBarProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Wyliczanie aktualnego najważniejszego zdarzenia
  const activeEvent = useMemo<LiveBarEvent | null>(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const candidateEvents: LiveBarEvent[] = [];

    // 1. MATCH: Sprawdzenie czy dzisiaj lub w najbliższych 24h jest mecz
    const todayMatch = matches.find(m => m.match_date === todayStr && m.status !== "cancelled");
    if (todayMatch) {
      let timeNote = "DZISIAJ";
      if (todayMatch.match_time) {
        const [h, m] = todayMatch.match_time.split(":").map(Number);
        const matchMinutes = h * 60 + m;
        const diff = matchMinutes - currentTimeMinutes;
        if (diff > 0 && diff <= 180) {
          timeNote = `ZA ${diff} MIN`;
        } else if (diff <= 0 && diff >= -120) {
          timeNote = "MECZ TRWA";
        } else {
          timeNote = `GODZ. ${todayMatch.match_time}`;
        }
      }
      candidateEvents.push({
        id: `match-${todayMatch.id}`,
        type: "match",
        priority: 1,
        badge: "🔴 MECZ",
        title: `${timeNote}: ${todayMatch.home_team} vs ${todayMatch.away_team}`,
        subtitle: todayMatch.venue || "Górny Mokotów",
        actionLabel: "ZOBACZ",
        targetTab: "matches",
        extraPayload: todayMatch
      });
    }

    // 2. TRAINING: Sprawdzenie czy dzisiaj jest trening
    const todayTraining = trainingSessions.find(t => t.training_date === todayStr);
    if (todayTraining) {
      let isLive = false;
      let timeNote = todayTraining.start_time ? `${todayTraining.start_time}` : "DZISIAJ";
      if (todayTraining.start_time && todayTraining.end_time) {
        const [sh, sm] = todayTraining.start_time.split(":").map(Number);
        const [eh, em] = todayTraining.end_time.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (currentTimeMinutes >= startMin && currentTimeMinutes <= endMin) {
          isLive = true;
          timeNote = "TRWA TERAZ";
        } else {
          timeNote = `${todayTraining.start_time}–${todayTraining.end_time}`;
        }
      }
      candidateEvents.push({
        id: `training-${todayTraining.id}`,
        type: "training",
        priority: isLive ? 1 : 2,
        badge: isLive ? "🔥 TRENING LIVE" : "🏃 TRENING",
        title: `${timeNote}: ${todayTraining.title || "Trening rocznika 2018"}`,
        subtitle: todayTraining.location || "Boisko",
        actionLabel: "OTWÓRZ",
        targetTab: "training",
        extraPayload: todayTraining
      });
    }

    // 3. UNANSWERED NOTICES / CRITICAL NEWS:
    if (unansweredNotices.length > 0) {
      candidateEvents.push({
        id: `notices-${unansweredNotices.length}`,
        type: "news",
        priority: 3,
        badge: "📢 KOMUNIKAT",
        title: `${unansweredNotices.length} nowe ważne wiadomości klubowe`,
        subtitle: "Wymagana odpowiedź lub potwierdzenie",
        actionLabel: "SPRAWDŹ",
        targetTab: "news"
      });
    } else if (news.length > 0) {
      const latestNews = news[0];
      const newsDate = new Date(latestNews.published_at);
      const diffHours = (now.getTime() - newsDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 48) {
        candidateEvents.push({
          id: `news-${latestNews.id}`,
          type: "news",
          priority: 4,
          badge: "📰 AKTUALNOŚCI",
          title: latestNews.title,
          actionLabel: "CZYTAJ",
          targetTab: "news"
        });
      }
    }

    // Filtrujemy zdarzenia odrzucone (dismissed)
    const validEvents = candidateEvents
      .filter(e => !dismissedIds.includes(e.id))
      .sort((a, b) => a.priority - b.priority);

    return validEvents.length > 0 ? validEvents[0] : null;
  }, [matches, trainingSessions, news, unansweredNotices, dismissedIds]);

  if (!activeEvent) return null;

  const handleAction = () => {
    onNavigate(activeEvent.targetTab, activeEvent.extraPayload);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => [...prev, activeEvent.id]);
  };

  const getTypeIcon = () => {
    switch (activeEvent.type) {
      case "match":
        return <Flame size={15} className="v200-livebar-icon pulse-fire" />;
      case "training":
        return <Zap size={15} className="v200-livebar-icon pulse-gold" />;
      case "achievement":
        return <Trophy size={15} className="v200-livebar-icon gold-text" />;
      case "news":
        return <Bell size={15} className="v200-livebar-icon crimson-text" />;
      case "sync":
      default:
        return <RefreshCw size={14} className="v200-livebar-icon" />;
    }
  };

  return (
    <aside 
      className={`v200-live-bar type-${activeEvent.type}`}
      role="region"
      aria-label="Aktywne wydarzenie DELTA Live"
      onClick={handleAction}
    >
      <div className="v200-livebar-content">
        <div className="v200-livebar-pill">
          {getTypeIcon()}
          <span>{activeEvent.badge}</span>
        </div>

        <div className="v200-livebar-text-wrap">
          <strong className="v200-livebar-title">{activeEvent.title}</strong>
          {activeEvent.subtitle && (
            <span className="v200-livebar-subtitle">{activeEvent.subtitle}</span>
          )}
        </div>
      </div>

      <div className="v200-livebar-actions">
        <button
          type="button"
          className="v200-livebar-cta"
          onClick={(e) => {
            e.stopPropagation();
            handleAction();
          }}
          aria-label={activeEvent.actionLabel}
        >
          <span>{activeEvent.actionLabel}</span>
          <ChevronRight size={13} />
        </button>

        <button
          type="button"
          className="v200-livebar-dismiss"
          onClick={handleDismiss}
          title="Ukryj powiadomienie"
          aria-label="Ukryj powiadomienie"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
