"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Bell, Info, X, ChevronRight, Sparkles, Trophy, Zap, Calendar } from "lucide-react";
import type { DeltaSystemEvent } from "@/lib/events/types";

interface DeltaLiveAlertBannerProps {
  events: DeltaSystemEvent[];
  onDismiss: (eventId: string) => void;
  onNavigate: (tab: string, extra?: any) => void;
}

export default function DeltaLiveAlertBanner({
  events,
  onDismiss,
  onNavigate
}: DeltaLiveAlertBannerProps) {
  const [dismissedLocal, setDismissedLocal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("delta_dismissed_alerts");
      if (saved) setDismissedLocal(JSON.parse(saved));
    } catch {}
  }, []);

  const handleDismiss = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const updated = { ...dismissedLocal, [eventId]: true };
    setDismissedLocal(updated);
    try {
      localStorage.setItem("delta_dismissed_alerts", JSON.stringify(updated));
    } catch {}
    onDismiss(eventId);
  };

  const handleAction = (event: DeltaSystemEvent) => {
    let targetTab = "news";
    if (event.type.startsWith("MATCH")) targetTab = "matches";
    else if (event.type.startsWith("TRAINING")) targetTab = "training";
    else if (event.type === "PLAYER_CARD_UNLOCKED") targetTab = "collection";
    else if (event.type === "PLAYER_ACHIEVEMENT") targetTab = "achievements";

    onNavigate(targetTab, event.metadata);
  };

  // Find active important event (not urgent modal, but important alert banner)
  const importantEvents = events.filter(
    e => e.importance === "IMPORTANT" && !dismissedLocal[e.id]
  );

  const activeImportant = importantEvents.length > 0 ? importantEvents[0] : null;

  if (!activeImportant) return null;

  return (
    <div 
      className="delta-important-alert-banner animate-slideDown"
      role="alert"
      onClick={() => handleAction(activeImportant)}
    >
      <div className="delta-alert-inner">
        <div className="delta-alert-icon-wrap">
          <AlertTriangle size={18} className="delta-alert-icon" />
        </div>

        <div className="delta-alert-text">
          <strong className="delta-alert-title">{activeImportant.title}</strong>
          <span className="delta-alert-desc">{activeImportant.message}</span>
        </div>

        <div className="delta-alert-actions">
          <button 
            type="button" 
            className="delta-alert-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(activeImportant);
            }}
          >
            <span>Sprawdź</span>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="delta-alert-close-btn"
            onClick={(e) => handleDismiss(e, activeImportant.id)}
            aria-label="Zamknij alert"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
