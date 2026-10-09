import type { DeltaSystemEvent, EventImportance } from './types.ts';
import { isEventVisibleForUser, mapEventToCategory, type UserAudienceContext } from './notifications.ts';

export interface LiveAlertSummary {
  totalCount: number;
  hasUrgentOrImportant: boolean;
  highestImportance: EventImportance;
  categoryCounts: {
    matches: number;
    trainings: number;
    club: number;
    achievements: number;
    multimedia: number;
    system: number;
  };
  summaryText: string;
  topEvents: DeltaSystemEvent[];
}

export const LAST_VISIT_STORAGE_KEY = 'delta_last_visit_iso';
export const CURRENT_SESSION_VISIT_KEY = 'delta_current_session_visit_iso';
export const DISMISSED_ALERTS_SESSION_KEY = 'delta_dismissed_live_alerts_session';

/**
 * Retrieves the recorded previous visit ISO timestamp.
 * If not set, defaults to 24 hours ago.
 */
export function getStoredPreviousVisit(storage?: Storage): string {
  if (typeof window === 'undefined' && !storage) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  const stored = store.getItem(LAST_VISIT_STORAGE_KEY);
  if (stored && !isNaN(new Date(stored).getTime())) {
    return stored;
  }

  // Fallback: 24h ago
  const defaultPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    store.setItem(LAST_VISIT_STORAGE_KEY, defaultPast);
  } catch {}
  return defaultPast;
}

/**
 * Initializes visit tracking for the current session.
 * Keeps previous visit stable during the active session and records current visit for subsequent visits.
 */
export function initSessionVisit(
  localStore?: Storage,
  sessionStore?: Storage,
  nowDate: Date = new Date()
): { previousVisitIso: string; currentSessionIso: string } {
  const lStore = localStore || (typeof window !== 'undefined' ? window.localStorage : undefined);
  const sStore = sessionStore || (typeof window !== 'undefined' ? window.sessionStorage : undefined);

  const nowIso = nowDate.toISOString();

  // Check if current session already has a recorded start time
  let sessionPreviousVisit = sStore?.getItem(CURRENT_SESSION_VISIT_KEY);
  if (!sessionPreviousVisit) {
    // New session: previous visit is what was stored in localStorage
    sessionPreviousVisit = lStore?.getItem(LAST_VISIT_STORAGE_KEY) || new Date(nowDate.getTime() - 24 * 3600 * 1000).toISOString();
    try {
      sStore?.setItem(CURRENT_SESSION_VISIT_KEY, sessionPreviousVisit);
      // Update localStorage with current timestamp for future sessions
      lStore?.setItem(LAST_VISIT_STORAGE_KEY, nowIso);
    } catch {}
  }

  return {
    previousVisitIso: sessionPreviousVisit,
    currentSessionIso: nowIso,
  };
}

/**
 * Filters events that were created strictly after the user's previous visit
 * and are visible to the user under audience rules.
 */
export function getEventsNewSinceVisit(
  events: DeltaSystemEvent[],
  previousVisitIso: string,
  user: UserAudienceContext
): DeltaSystemEvent[] {
  const previousVisitTime = new Date(previousVisitIso).getTime();
  if (isNaN(previousVisitTime)) return [];

  return events.filter((e) => {
    const eventTime = new Date(e.created_at).getTime();
    if (isNaN(eventTime)) return false;

    // Must be created AFTER previous visit
    if (eventTime <= previousVisitTime) return false;

    // Must be visible according to audience
    return isEventVisibleForUser(e, user);
  });
}

/**
 * Aggregates a list of new events into a high-level summary for the Live Alert banner.
 */
export function aggregateNewEventsSummary(newEvents: DeltaSystemEvent[]): LiveAlertSummary {
  const categoryCounts = {
    matches: 0,
    trainings: 0,
    club: 0,
    achievements: 0,
    multimedia: 0,
    system: 0,
  };

  let hasUrgentOrImportant = false;
  let highestImportance: EventImportance = 'LOW';

  newEvents.forEach((e) => {
    const cat = mapEventToCategory(e);
    if (cat in categoryCounts) {
      categoryCounts[cat as keyof typeof categoryCounts]++;
    }

    if (e.importance === 'URGENT' || e.importance === 'CRITICAL') {
      hasUrgentOrImportant = true;
      highestImportance = 'URGENT';
    } else if (
      (e.importance === 'IMPORTANT' || e.importance === 'HIGH') &&
      highestImportance !== 'URGENT'
    ) {
      hasUrgentOrImportant = true;
      highestImportance = 'IMPORTANT';
    }
  });

  // Build descriptive Polish summary
  const parts: string[] = [];
  if (categoryCounts.club > 0) {
    parts.push(categoryCounts.club === 1 ? '1 wiadomość klubowa' : `${categoryCounts.club} wiadomości klubowe`);
  }
  if (categoryCounts.matches > 0) {
    parts.push(categoryCounts.matches === 1 ? '1 mecz' : `${categoryCounts.matches} mecze`);
  }
  if (categoryCounts.trainings > 0) {
    parts.push(categoryCounts.trainings === 1 ? '1 trening' : `${categoryCounts.trainings} treningi`);
  }
  if (categoryCounts.achievements > 0) {
    parts.push(categoryCounts.achievements === 1 ? '1 osiągnięcie' : `${categoryCounts.achievements} osiągnięcia`);
  }
  if (categoryCounts.multimedia > 0) {
    parts.push(categoryCounts.multimedia === 1 ? '1 multimedia' : `${categoryCounts.multimedia} multimedia`);
  }
  if (categoryCounts.system > 0) {
    parts.push(categoryCounts.system === 1 ? '1 komunikat systemowy' : `${categoryCounts.system} komunikaty systemowe`);
  }

  let summaryText = '';
  if (newEvents.length === 0) {
    summaryText = 'Brak nowych informacji od ostatniej wizyty';
  } else if (newEvents.length === 1) {
    summaryText = newEvents[0].title;
  } else {
    summaryText = `${newEvents.length} nowe informacje od ostatniej wizyty (${parts.slice(0, 2).join(', ')})`;
  }

  // Top 3-5 priority items
  const sorted = [...newEvents].sort((a, b) => {
    const rank = (imp: EventImportance) => (imp === 'URGENT' || imp === 'CRITICAL' ? 3 : imp === 'IMPORTANT' || imp === 'HIGH' ? 2 : 1);
    const diff = rank(b.importance) - rank(a.importance);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    totalCount: newEvents.length,
    hasUrgentOrImportant,
    highestImportance,
    categoryCounts,
    summaryText,
    topEvents: sorted.slice(0, 4),
  };
}

/**
 * Checks if a specific alert session key has been dismissed in the current session.
 */
export function isAlertDismissedInSession(alertKey: string, sessionStore?: Storage): boolean {
  if (typeof window === 'undefined' && !sessionStore) return false;
  const store = sessionStore || (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  if (!store) return false;

  try {
    const raw = store.getItem(DISMISSED_ALERTS_SESSION_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    return !!map[alertKey];
  } catch {
    return false;
  }
}

/**
 * Records an alert dismissal in the current session without modifying event read state.
 */
export function dismissAlertInSession(alertKey: string, sessionStore?: Storage): void {
  if (typeof window === 'undefined' && !sessionStore) return;
  const store = sessionStore || (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  if (!store) return;

  try {
    const raw = store.getItem(DISMISSED_ALERTS_SESSION_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[alertKey] = true;
    store.setItem(DISMISSED_ALERTS_SESSION_KEY, JSON.stringify(map));
  } catch {}
}
