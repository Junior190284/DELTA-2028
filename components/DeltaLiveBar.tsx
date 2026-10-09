"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Sparkles, 
  Users,
  Shield,
  Layers,
  Newspaper
} from "lucide-react";

export type LiveBarType = 
  | "urgent_match_change" 
  | "match" 
  | "training" 
  | "lineup" 
  | "news" 
  | "achievement" 
  | "card" 
  | "sync";

export interface LiveBarEvent {
  id: string;
  type: LiveBarType;
  priority: number; // 1 (najwyższy) do 6
  badge: string;
  badgeType: "LIVE" | "NEW" | "URGENT" | "ALERT" | "INFO";
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
    venue_changed?: boolean;
    time_changed?: boolean;
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
    type?: string;
    title: string;
    body: string | null;
    priority?: string;
    published_at: string;
  }>;
  unansweredNotices?: Array<any>;
  hasPublishedLineup?: boolean;
  latestLineupMatch?: any;
  newAchievementTitle?: string | null;
  newCardTitle?: string | null;
  onNavigate: (tab: string, extra?: any) => void;
}

export default function DeltaLiveBar({
  matches = [],
  trainingSessions = [],
  news = [],
  unansweredNotices = [],
  hasPublishedLineup = false,
  latestLineupMatch = null,
  newAchievementTitle = null,
  newCardTitle = null,
  onNavigate,
}: DeltaLiveBarProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [readNewsIds, setReadNewsIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedDismissed = localStorage.getItem("delta_dismissed_livebar");
      if (savedDismissed) setDismissedIds(JSON.parse(savedDismissed));

      const savedRead = localStorage.getItem("delta_read_news");
      if (savedRead) setReadNewsIds(JSON.parse(savedRead));
    } catch {}
  }, []);

  // Logika wyliczania najważniejszego aktywnego zdarzenia według 6 priorytetów
  const activeEvent = useMemo<LiveBarEvent | null>(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const candidateEvents: LiveBarEvent[] = [];

    // =========================================================
    // PRIORYTET 1: URGENT MATCH CHANGE (Zmiana terminu / miejsca)
    // =========================================================
    const urgentMatch = matches.find(m => 
      (m.venue_changed || m.time_changed || m.status === "changed") && 
      new Date(m.match_date).getTime() >= now.getTime() - 86400000
    );
    if (urgentMatch) {
      candidateEvents.push({
        id: `urgent-match-${urgentMatch.id}`,
        type: "urgent_match_change",
        priority: 1,
        badge: "PILNE",
        badgeType: "URGENT",
        title: `Zmiana meczu: ${urgentMatch.home_team} vs ${urgentMatch.away_team}`,
        subtitle: urgentMatch.venue ? `Nowe miejsce: ${urgentMatch.venue}` : `Godzina: ${urgentMatch.match_time || "do ustalenia"}`,
        actionLabel: "SPRAWDŹ",
        targetTab: "matches",
        extraPayload: urgentMatch
      });
    }

    // =========================================================
    // PRIORYTET 2: AKTYWNY MECZ / MECZ WKRÓTCE (Matchday State)
    // =========================================================
    const todayMatch = matches.find(m => m.match_date === todayStr && m.status !== "cancelled");
    if (todayMatch) {
      let timeNote = "DZISIAJ";
      let isLive = false;
      if (todayMatch.match_time) {
        const [h, m] = todayMatch.match_time.split(":").map(Number);
        const matchMinutes = h * 60 + m;
        const diff = matchMinutes - currentTimeMinutes;
        if (diff > 0 && diff <= 180) {
          timeNote = `MECZ ZA ${diff} MIN`;
        } else if (diff <= 0 && diff >= -120) {
          timeNote = "MECZ TRWA";
          isLive = true;
        } else {
          timeNote = `GODZ. ${todayMatch.match_time}`;
        }
      }
      candidateEvents.push({
        id: `match-${todayMatch.id}`,
        type: "match",
        priority: 2,
        badge: isLive ? "LIVE" : "MATCHDAY",
        badgeType: isLive ? "LIVE" : "ALERT",
        title: `${timeNote}: ${todayMatch.home_team} vs ${todayMatch.away_team}`,
        subtitle: todayMatch.venue || "Górny Mokotów",
        actionLabel: "ZOBACZ",
        targetTab: "matches",
        extraPayload: todayMatch
      });
    }

    // =========================================================
    // PRIORYTET 3: AKTYWNY TRENING (Training State)
    // =========================================================
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
          timeNote = "TRENING TRWA";
        } else if (startMin - currentTimeMinutes > 0 && startMin - currentTimeMinutes <= 120) {
          timeNote = `TRENING ZA ${startMin - currentTimeMinutes} MIN`;
        } else {
          timeNote = `TRENING ${todayTraining.start_time}–${todayTraining.end_time}`;
        }
      }
      candidateEvents.push({
        id: `training-${todayTraining.id}`,
        type: "training",
        priority: isLive ? 2.5 : 3,
        badge: isLive ? "LIVE" : "TRENING",
        badgeType: isLive ? "LIVE" : "INFO",
        title: `${timeNote}: ${todayTraining.title || "Trening rocznika 2018"}`,
        subtitle: todayTraining.location || "Boisko DELTA",
        actionLabel: "OTWÓRZ",
        targetTab: "training",
        extraPayload: todayTraining
      });
    }

    // =========================================================
    // PRIORYTET 4: OPUBLIKOWANY SKŁAD (Lineup State)
    // =========================================================
    if (hasPublishedLineup && latestLineupMatch) {
      candidateEvents.push({
        id: `lineup-${latestLineupMatch.id || "latest"}`,
        type: "lineup",
        priority: 4,
        badge: "SKŁAD",
        badgeType: "NEW",
        title: `Opublikowano wyjściowy skład na mecz!`,
        subtitle: `${latestLineupMatch.home_team || "DELTA"} vs ${latestLineupMatch.away_team || "Rywal"}`,
        actionLabel: "ZOBACZ SKŁAD",
        targetTab: "matches",
        extraPayload: latestLineupMatch
      });
    }

    // =========================================================
    // PRIORYTET 5: WAŻNA WIADOMOŚĆ / KOMUNIKAT KLUBOWY
    // =========================================================
    if (unansweredNotices.length > 0) {
      candidateEvents.push({
        id: `notices-${unansweredNotices.length}`,
        type: "news",
        priority: 5,
        badge: "KOMUNIKAT",
        badgeType: "ALERT",
        title: `${unansweredNotices.length} ważne wiadomości klubowe`,
        subtitle: "Wymagana odpowiedź lub potwierdzenie obecności",
        actionLabel: "SPRAWDŹ",
        targetTab: "news"
      });
    } else if (news.length > 0) {
      const unreadNews = news.filter(n => !readNewsIds.includes(n.id));
      if (unreadNews.length > 0) {
        const latestNews = unreadNews[0];
        const isUrgent = latestNews.priority === "high" || latestNews.priority === "urgent";
        candidateEvents.push({
          id: `news-${latestNews.id}`,
          type: "news",
          priority: isUrgent ? 4.5 : 5.2,
          badge: isUrgent ? "PILNE" : "NOWA WIADOMOŚĆ",
          badgeType: isUrgent ? "URGENT" : "NEW",
          title: latestNews.title,
          subtitle: "Nowy komunikat od sztabu drużyny",
          actionLabel: "CZYTAJ",
          targetTab: "news",
          extraPayload: latestNews
        });
      }
    }

    // =========================================================
    // PRIORYTET 6: NOWE OSIĄGNIĘCIE LUB NOWA KARTA
    // =========================================================
    if (newAchievementTitle) {
      candidateEvents.push({
        id: `ach-${newAchievementTitle}`,
        type: "achievement",
        priority: 6,
        badge: "OSIĄGNIĘCIE",
        badgeType: "NEW",
        title: `Nowe osiągnięcie: ${newAchievementTitle}`,
        subtitle: "Sprawdź w Gablocie Mistrzów DELTA",
        actionLabel: "ZOBACZ",
        targetTab: "achievements"
      });
    } else if (newCardTitle) {
      candidateEvents.push({
        id: `card-${newCardTitle}`,
        type: "card",
        priority: 6.5,
        badge: "NOWA KARTA",
        badgeType: "NEW",
        title: `Odblokowano nową kartę: ${newCardTitle}`,
        subtitle: "Zobacz w klaserze DELTA Collection",
        actionLabel: "OTWÓRZ",
        targetTab: "collection"
      });
    }

    // Filtrujemy zdarzenia odrzucone (dismissed) i sortujemy po priorytecie
    const validEvents = candidateEvents
      .filter(e => !dismissedIds.includes(e.id))
      .sort((a, b) => a.priority - b.priority);

    return validEvents.length > 0 ? validEvents[0] : null;
  }, [
    matches, 
    trainingSessions, 
    news, 
    unansweredNotices, 
    hasPublishedLineup, 
    latestLineupMatch, 
    newAchievementTitle, 
    newCardTitle, 
    dismissedIds, 
    readNewsIds
  ]);

  if (!activeEvent) return null;

  const handleAction = () => {
    if (activeEvent.type === "news" && activeEvent.extraPayload?.id) {
      markNewsAsRead(activeEvent.extraPayload.id);
    }
    onNavigate(activeEvent.targetTab, activeEvent.extraPayload);
  };

  const markNewsAsRead = (newsId: string) => {
    try {
      const updated = Array.from(new Set([...readNewsIds, newsId]));
      setReadNewsIds(updated);
      localStorage.setItem("delta_read_news", JSON.stringify(updated));
    } catch {}
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeEvent.type === "news" && activeEvent.extraPayload?.id) {
      markNewsAsRead(activeEvent.extraPayload.id);
    }
    const updated = [...dismissedIds, activeEvent.id];
    setDismissedIds(updated);
    try {
      localStorage.setItem("delta_dismissed_livebar", JSON.stringify(updated));
    } catch {}
  };

  const getTypeIcon = () => {
    switch (activeEvent.type) {
      case "urgent_match_change":
        return <AlertCircle size={15} className="delta-livebar-icon icon-urgent" />;
      case "match":
        return <Flame size={15} className="delta-livebar-icon icon-match" />;
      case "training":
        return <Zap size={15} className="delta-livebar-icon icon-training" />;
      case "lineup":
        return <Users size={15} className="delta-livebar-icon icon-lineup" />;
      case "achievement":
        return <Trophy size={15} className="delta-livebar-icon icon-ach" />;
      case "card":
        return <Layers size={15} className="delta-livebar-icon icon-card" />;
      case "news":
      default:
        return <Bell size={15} className="delta-livebar-icon icon-news" />;
    }
  };

  return (
    <aside 
      className={`delta-sticky-live-bar type-${activeEvent.type} badge-${activeEvent.badgeType.toLowerCase()} animate-fadeIn`}
      role="region"
      aria-label="Aktywne wydarzenie DELTA Live"
      onClick={handleAction}
    >
      <div className="delta-livebar-inner">
        <div className="delta-livebar-content">
          {/* Badge indicator */}
          <div className={`delta-livebar-badge badge-${activeEvent.badgeType.toLowerCase()}`}>
            {getTypeIcon()}
            <span>{activeEvent.badge}</span>
          </div>

          {/* Text Title & Subtitle */}
          <div className="delta-livebar-text-group">
            <strong className="delta-livebar-title">{activeEvent.title}</strong>
            {activeEvent.subtitle && (
              <span className="delta-livebar-subtitle">{activeEvent.subtitle}</span>
            )}
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="delta-livebar-actions">
          <button
            type="button"
            className="delta-livebar-cta-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleAction();
            }}
            aria-label={activeEvent.actionLabel}
          >
            <span>{activeEvent.actionLabel}</span>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="delta-livebar-dismiss-btn"
            onClick={handleDismiss}
            title="Ukryj powiadomienie"
            aria-label="Ukryj"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
