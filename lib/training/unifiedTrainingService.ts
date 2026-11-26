import { createHash } from "crypto";
import type { TrainingSession } from "@/components/training/DeltaTrainingCenter20";

export interface TeamEventInput {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  details: string | null;
  important?: boolean;
  player_id?: string | null;
  created_at?: string;
}

/**
 * Deterministically derives a valid UUID v4-format string from a stable date string.
 * This guarantees consistent training IDs across renders and sessions without collision.
 */
export function deriveDeterministicTrainingUuid(dateStr: string): string {
  const hash = createHash("md5").update(`delta-training-${dateStr.trim()}`).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16),
    "a" + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join("-");
}

/**
 * Validates if a string is a standard UUID.
 */
export function isUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Resolves the immutable, persistent identity of a training session.
 * CRITICAL RULE (DELTA-051T7A - STABLE TRAINING IDENTITY):
 * An existing training session's ID MUST NOT change when rescheduled (e.g. date, start_time or end_time changes).
 * Rescheduling an existing session preserves its exact same primary key UUID so that:
 * 1. training_attendance rows remain valid without cascading deletes or foreign key breaks
 * 2. training_games and training_game_players remain attached
 * 3. training_events (goals and assists) remain intact
 * 4. Earned XP (+40 XP per attendance) remains 100% stable and idempotent
 */
export function getStableTrainingSessionId(
  session: { id?: string | null; training_date?: string | null }
): string {
  if (isUuid(session.id)) {
    return session.id!;
  }
  return deriveDeterministicTrainingUuid(session.training_date || "default-session");
}

/**
 * Unifies training sessions from:
 * 1. public.training_sessions (authoritative DB sessions)
 * 2. public.team_events (where event_type === "training" or title contains "trening")
 * 3. Recurring schedule items (Wednesday Warszawianka, Friday Wiktorska)
 *
 * Rules:
 * - One date = One persistent, deterministic training unit
 * - Authoritative DB training_sessions take precedence
 * - Custom team_events (rescheduled / renamed / special location) take second precedence
 * - Recurring schedule fills gaps for routine team trainings
 * - All sessions receive a permanent UUID suitable for training_attendance & games foreign keys
 */
export function unifyTrainingSessions(
  dbSessions: TrainingSession[],
  teamEvents: TeamEventInput[] = [],
  referenceDate: Date = new Date()
): TrainingSession[] {
  const sessionMap = new Map<string, TrainingSession>();

  // 1. Authoritative training_sessions
  for (const s of dbSessions) {
    if (!s || !s.training_date) continue;
    const dateKey = s.training_date.trim();
    sessionMap.set(dateKey, {
      ...s,
      id: getStableTrainingSessionId(s),
      title: s.title || "Trening",
      start_time: s.start_time || "17:00",
      end_time: s.end_time || "18:30",
      location: s.location || "Górny Mokotów",
    });
  }

  // 2. Training events from team_events
  const trainingEvents = teamEvents.filter(
    (e) =>
      e &&
      e.event_date &&
      (e.event_type === "training" ||
        /trening/i.test(e.title || "") ||
        /trening/i.test(e.details || ""))
  );

  for (const e of trainingEvents) {
    const dateKey = e.event_date.trim();
    if (!sessionMap.has(dateKey)) {
      const stableId = isUuid(e.id) ? e.id : deriveDeterministicTrainingUuid(dateKey);
      sessionMap.set(dateKey, {
        id: stableId,
        training_date: dateKey,
        start_time: e.start_time || "17:00",
        end_time: e.end_time || "18:30",
        location: e.location || "Górny Mokotów",
        title: e.title || "Trening",
        notes: e.details || null,
        created_at: e.created_at || `${dateKey}T17:00:00Z`,
      });
    }
  }

  // 3. Recurring schedule: Wednesday (Warszawianka) & Friday (Wiktorska)
  // Window: 2 months back to 4 months forward
  const now = referenceDate;
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 12);
  const end = new Date(now.getFullYear(), now.getMonth() + 4, 1, 12);

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (day !== 3 && day !== 5) continue; // Wednesday=3, Friday=5

    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;

    if (!sessionMap.has(dateKey)) {
      const isWednesday = day === 3;
      const stableId = deriveDeterministicTrainingUuid(dateKey);
      sessionMap.set(dateKey, {
        id: stableId,
        training_date: dateKey,
        start_time: "17:00",
        end_time: "18:30",
        location: isWednesday ? "Warszawianka, ul. Piaseczyńska 35" : "Boisko, ul. Wiktorska 32",
        title: isWednesday ? "Trening • Warszawianka" : "Trening • Wiktorska",
        notes: "17:00–18:30 • stały trening drużyny",
        created_at: `${dateKey}T17:00:00Z`,
      });
    }
  }

  // Sort descending by training_date (newest first for history, upcoming naturally ordered)
  return Array.from(sessionMap.values()).sort((a, b) =>
    b.training_date.localeCompare(a.training_date)
  );
}
