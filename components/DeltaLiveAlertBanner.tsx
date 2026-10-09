"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  X,
  Flame,
  Zap,
  Trophy,
  Camera,
  Video,
  Info,
  Sparkles,
  ArrowRight
} from "lucide-react";
import type { DeltaSystemEvent } from "@/lib/events/types";
import {
  initSessionVisit,
  getEventsNewSinceVisit,
  aggregateNewEventsSummary,
  isAlertDismissedInSession,
  dismissAlertInSession,
  type LiveAlertSummary
} from "@/lib/events/live-alert";
import { sanitizeDeepLink } from "@/lib/events/notifications";

interface DeltaLiveAlertBannerProps {
  events: DeltaSystemEvent[];
  userId?: string;
  userRole?: string;
  parentPlayerIds?: string[];
  onDismiss?: (alertKey: string) => void;
  onNavigate: (tab: string, extra?: any) => void;
  onOpenNotifications?: () => void;
}

export default function DeltaLiveAlertBanner({
  events,
  userId = "guest_user",
  userRole = "parent",
  parentPlayerIds = [],
  onDismiss,
  onNavigate,
  onOpenNotifications
}: DeltaLiveAlertBannerProps) {
  const [previousVisitIso, setPreviousVisitIso] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const { previousVisitIso } = initSessionVisit();
      setPreviousVisitIso(previousVisitIso);
    } catch {}
  }, []);

  const newEvents = useMemo(() => {
    if (!previousVisitIso) return [];
    return getEventsNewSinceVisit(events, previousVisitIso, {
      userId,
      role: userRole,
      playerIds: parentPlayerIds
    });
  }, [events, previousVisitIso, userId, userRole, parentPlayerIds]);

  const summary = useMemo<LiveAlertSummary>(() => {
    return aggregateNewEventsSummary(newEvents);
  }, [newEvents]);

  // Generate a deterministic key for the current batch of new events
  const alertSessionKey = useMemo(() => {
    if (!newEvents.length) return "";
    return `alert_batch_${newEvents.map(e => e.id).sort().slice(0, 3).join("_")}`;
  }, [newEvents]);

  useEffect(() => {
    if (alertSessionKey) {
      const isDismissed = isAlertDismissedInSession(alertSessionKey);
      setDismissed(isDismissed);
    }
  }, [alertSessionKey]);

  if (dismissed || summary.totalCount === 0) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    if (alertSessionKey) {
      dismissAlertInSession(alertSessionKey);
      if (onDismiss) onDismiss(alertSessionKey);
    }
  };

  const handlePrimaryAction = () => {
    if (summary.totalCount === 1) {
      const single = summary.topEvents[0];
      const deepLinkRaw = single.metadata?.deepLink || single.metadata?.route;
      const sanitized = sanitizeDeepLink(deepLinkRaw);

      if (sanitized.safe && sanitized.isInternal && sanitized.tab) {
        onNavigate(sanitized.tab, single.metadata);
        return;
      }
      if (single.type.startsWith("MATCH")) {
        onNavigate("matches", single.metadata);
        return;
      }
      if (single.type.startsWith("TRAINING")) {
        onNavigate("training", single.metadata);
        return;
      }
    }

    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      onNavigate("news");
    }
  };

  const isUrgent = summary.highestImportance === "URGENT";
  const isImportant = summary.highestImportance === "IMPORTANT";

  return (
    <div
      className="delta-live-alert-container px-3 sm:px-4 py-2 w-full max-w-7xl mx-auto animate-slideDown"
      role="status"
      aria-live="polite"
      aria-label="Podsumowanie nowych informacji od ostatniej wizyty"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all shadow-lg ${
          isUrgent
            ? "bg-gradient-to-r from-red-950/90 via-slate-900/95 to-red-950/80 border-red-500/50 shadow-red-950/30"
            : isImportant
            ? "bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-slate-950/90 border-amber-500/40 shadow-amber-950/20"
            : "bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950/95 border-white/15 shadow-black/40"
        }`}
      >
        {/* Main compact bar */}
        <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={handlePrimaryAction}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isUrgent
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : isImportant
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : "bg-white/10 text-white border-white/15"
              }`}
            >
              {isUrgent ? (
                <Flame className="w-5 h-5 animate-pulse" />
              ) : isImportant ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                    isUrgent
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : isImportant
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-white/10 text-slate-300 border-white/10"
                  }`}
                >
                  {isUrgent ? "PILNE" : isImportant ? "WAŻNE" : "CO NOWEGO"}
                </span>
                <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                  OD OSTATNIEJ WIZYTY
                </span>
              </div>

              <h4 className="text-white font-bold text-xs sm:text-sm truncate m-0 leading-tight">
                {summary.summaryText}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {summary.totalCount > 1 && (
              <button
                type="button"
                className="hidden md:flex text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Zwiń" : "Podgląd"}
              </button>
            )}

            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1 ${
                isUrgent
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
                  : isImportant
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/20"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
              }`}
              onClick={handlePrimaryAction}
            >
              <span>Zobacz</span>
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors ml-1"
              onClick={handleDismiss}
              aria-label="Zamknij alert"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Expanded mini-list preview */}
        {expanded && summary.topEvents.length > 0 && (
          <div className="px-4 pb-3 pt-1 border-t border-white/10 bg-black/20 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Najważniejsze pozycje:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.topEvents.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-xl bg-slate-900/80 border border-white/5 text-xs flex items-start gap-2 hover:border-white/20 cursor-pointer transition-colors"
                  onClick={() => {
                    const deepLinkRaw = item.metadata?.deepLink || item.metadata?.route;
                    const sanitized = sanitizeDeepLink(deepLinkRaw);
                    if (sanitized.safe && sanitized.isInternal && sanitized.tab) {
                      onNavigate(sanitized.tab, item.metadata);
                    } else if (item.type.startsWith("MATCH")) {
                      onNavigate("matches", item.metadata);
                    } else if (item.type.startsWith("TRAINING")) {
                      onNavigate("training", item.metadata);
                    } else {
                      onNavigate("news");
                    }
                  }}
                >
                  <div className="text-amber-400 mt-0.5">•</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{item.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
