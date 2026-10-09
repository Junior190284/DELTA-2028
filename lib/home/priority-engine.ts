import type { DeltaSystemEvent, EventImportance } from '../events/types.ts';
import { isEventVisibleForUser, mapEventToCategory, type UserAudienceContext } from '../events/notifications.ts';
import type { UserRole } from '../security/roles.ts';

export type PriorityActionTier =
  | 'CRITICAL_ALERT' // 1: Cancelled match/training, critical notice, urgent operational emergency
  | 'MATCH_ATTENDANCE' // 2: Missing required match attendance declaration
  | 'LINEUP_CALLUP' // 3: Published lineup / callups
  | 'SCHEDULE_CHANGE' // 4: Schedule / match / training update with high importance
  | 'ADMIN_ALERT' // 4b: Staff / admin operational alert (SYNC_ERROR)
  | 'MATCH_SOON' // 5: Nearest upcoming match
  | 'TRAINING_SOON' // 6: Nearest upcoming training session
  | 'UNREAD_MESSAGES' // 7: Unread system events
  | 'GAMIFICATION'; // 8: Unopened pack / daily spin / unclaimed reward

export interface HomePriorityAction {
  id: string;
  tier: PriorityActionTier;
  priorityScore: number;
  importance: EventImportance;
  category: 'matches' | 'trainings' | 'club' | 'achievements' | 'system' | 'gamification';
  headline: string;
  subtext: string;
  ctaLabel: string;
  targetTab: string;
  targetPayload?: any;
  eventId?: string;
  entityId?: string;
  badgeText?: string;
  timestamp?: string;
  isDismissible?: boolean;
}

export interface MatchEntity {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  match_time?: string | null;
  venue?: string | null;
  round_no?: number | null;
  status?: string;
}

export interface TrainingEntity {
  id: string;
  training_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  title?: string;
}

export interface PriorityEngineInput {
  user: {
    userId?: string | null;
    role?: UserRole | string | null;
    playerIds?: string[];
  };
  events?: DeltaSystemEvent[];
  nextMatch?: MatchEntity | null;
  nextTraining?: TrainingEntity | null;
  parentPlayerIds?: string[];
  attendanceDeclarations?: Array<{ match_id: string; player_id: string; status: string }>;
  hasLineupPublished?: boolean;
  unreadMessagesCount?: number;
  unopenedPacksCount?: number;
  dailySpinAvailable?: boolean;
  nowDate?: Date;
}

export interface PriorityEngineOutput {
  primaryAction: HomePriorityAction | null;
  secondaryActions: HomePriorityAction[];
  reason: string;
  hasPriority: boolean;
}

/**
 * Computes deterministic priority hierarchy for Home/Dashboard based strictly
 * on real operational event importance and required actions without arbitrary time thresholds.
 */
export function computeHomePriorities(input: PriorityEngineInput): PriorityEngineOutput {
  const actions: HomePriorityAction[] = [];
  const now = input.nowDate || new Date();
  const nowTime = now.getTime();

  const userRole = (input.user.role || 'parent') as UserRole;
  const isAdminOrStaff = userRole === 'admin' || userRole === 'coach';
  const visibleEvents = (input.events || []).filter((e) =>
    isEventVisibleForUser(e, {
      userId: input.user.userId,
      role: input.user.role,
      playerIds: input.user.playerIds || input.parentPlayerIds,
    })
  );

  // 1. TIER 1: CRITICAL OPERATIONAL EMERGENCIES (Match/Training cancellations or CRITICAL/URGENT events)
  const criticalEvent = visibleEvents.find(
    (e) =>
      e.type === 'MATCH_CANCELLED' ||
      e.type === 'TRAINING_CANCELLED' ||
      e.importance === 'CRITICAL' ||
      e.importance === 'URGENT'
  );

  if (criticalEvent) {
    const isCancelled = criticalEvent.type === 'MATCH_CANCELLED' || criticalEvent.type === 'TRAINING_CANCELLED';
    actions.push({
      id: `crit_${criticalEvent.id}`,
      tier: 'CRITICAL_ALERT',
      priorityScore: 100,
      importance: 'CRITICAL',
      category: mapEventToCategory(criticalEvent) as any,
      headline: criticalEvent.title,
      subtext: criticalEvent.message || 'Ważna zmiana w harmonogramie drużyny.',
      ctaLabel: isCancelled ? 'Sprawdź szczegóły' : 'Zobacz alert',
      targetTab: criticalEvent.type.startsWith('MATCH')
        ? 'matches'
        : criticalEvent.type.startsWith('TRAINING')
        ? 'training'
        : 'news',
      targetPayload: criticalEvent.metadata,
      eventId: criticalEvent.id,
      badgeText: isCancelled ? 'ODWOŁANE' : 'PILNE',
      timestamp: criticalEvent.created_at,
    });
  }

  // 2. TIER 2: REQUIRED USER ACTION (Missing match attendance declaration on upcoming match)
  if (input.nextMatch && input.nextMatch.status !== 'cancelled') {
    const matchDateObj = new Date(`${input.nextMatch.match_date}T${input.nextMatch.match_time || '12:00:00'}`);
    const timeToMatch = matchDateObj.getTime() - nowTime;

    // Upcoming match (not finished in the past)
    if (timeToMatch > -2 * 3600 * 1000) {
      const playerIds = input.parentPlayerIds || input.user.playerIds || [];
      const declarations = input.attendanceDeclarations || [];

      // Check if player/parent has missing declaration
      const hasMissingDeclaration =
        playerIds.length > 0 &&
        playerIds.some(
          (pId) => !declarations.some((d) => d.match_id === input.nextMatch!.id && d.player_id === pId)
        );

      if (hasMissingDeclaration) {
        actions.push({
          id: `att_match_${input.nextMatch.id}`,
          tier: 'MATCH_ATTENDANCE',
          priorityScore: 90,
          importance: 'IMPORTANT',
          category: 'matches',
          headline: `Potwierdź obecność na meczu: vs ${
            input.nextMatch.away_team === 'K.S. Delta Warszawa GM'
              ? input.nextMatch.home_team
              : input.nextMatch.away_team
          }`,
          subtext: `Mecz zaplanowany na ${input.nextMatch.match_date}, godz. ${
            input.nextMatch.match_time?.slice(0, 5) || 'do ustalenia'
          }.`,
          ctaLabel: 'Zadeklaruj obecność',
          targetTab: 'matches',
          targetPayload: { matchId: input.nextMatch.id, action: 'attendance' },
          entityId: input.nextMatch.id,
          badgeText: 'DEKLARACJA',
        });
      }
    }
  }

  // 3. TIER 3: NEW LINEUP / CALLUP PUBLISHED (Targeted to user and unread/new)
  if (input.hasLineupPublished && input.nextMatch && input.nextMatch.status !== 'cancelled') {
    const lineupEvent = visibleEvents.find(
      (e) => e.type === 'LINEUP_PUBLISHED' && (!e.related_entity_id || e.related_entity_id === input.nextMatch!.id)
    );

    if (lineupEvent && !lineupEvent.is_read) {
      actions.push({
        id: `lineup_${input.nextMatch.id}`,
        tier: 'LINEUP_CALLUP',
        priorityScore: 80,
        importance: 'IMPORTANT',
        category: 'matches',
        headline: `Powołania i skład na mecz vs ${
          input.nextMatch.away_team === 'K.S. Delta Warszawa GM'
            ? input.nextMatch.home_team
            : input.nextMatch.away_team
        }`,
        subtext: 'Trener opublikował oficjalną kadrę meczową na najbliższe spotkanie.',
        ctaLabel: 'Zobacz powołania',
        targetTab: 'matches',
        targetPayload: { matchId: input.nextMatch.id, view: 'lineup' },
        entityId: input.nextMatch.id,
        badgeText: 'POWOŁANIA',
        timestamp: lineupEvent.created_at,
      });
    }
  }

  // 4. TIER 4: IMPORTANT OPERATIONAL CHANGES & ADMIN ALERTS
  // 4a. Schedule Change / Important Match & Training Updates
  const scheduleUpdate = visibleEvents.find(
    (e) =>
      (e.type === 'MATCH_UPDATED' || e.type === 'TRAINING_UPDATED') &&
      (e.importance === 'IMPORTANT' || e.importance === 'HIGH') &&
      !e.is_read
  );
  if (scheduleUpdate) {
    actions.push({
      id: `sched_upd_${scheduleUpdate.id}`,
      tier: 'SCHEDULE_CHANGE',
      priorityScore: 75,
      importance: 'IMPORTANT',
      category: mapEventToCategory(scheduleUpdate) as any,
      headline: scheduleUpdate.title,
      subtext: scheduleUpdate.message || 'Zaktualizowano termin lub szczegóły wydarzenia drużyny.',
      ctaLabel: 'Sprawdź zmiany',
      targetTab: scheduleUpdate.type.startsWith('MATCH') ? 'matches' : 'training',
      targetPayload: scheduleUpdate.metadata,
      eventId: scheduleUpdate.id,
      badgeText: 'ZMIANA',
      timestamp: scheduleUpdate.created_at,
    });
  }

  // 4b. Admin Operational Alert (SYNC_ERROR for staff/admin with real importance)
  if (isAdminOrStaff) {
    const syncError = visibleEvents.find((e) => e.type === 'SYNC_ERROR' && !e.is_read);
    if (syncError) {
      const isUrgentError = syncError.importance === 'CRITICAL' || syncError.importance === 'URGENT';
      actions.push({
        id: `admin_sync_${syncError.id}`,
        tier: 'ADMIN_ALERT',
        priorityScore: isUrgentError ? 100 : 70,
        importance: isUrgentError ? 'CRITICAL' : 'IMPORTANT',
        category: 'system',
        headline: 'Wymaga uwagi: Błąd synchronizacji DELTA Sync',
        subtext: syncError.message || 'Wystąpił problem z pobraniem danych ze strony klubu.',
        ctaLabel: 'Panel synchronizacji',
        targetTab: 'news',
        targetPayload: { view: 'sync' },
        eventId: syncError.id,
        badgeText: 'ADMIN',
      });
    }
  }

  // 5. TIER 5: NEAREST UPCOMING TEAM EVENTS (Informational candidates)
  // 5a. Nearest Upcoming Match
  if (input.nextMatch && input.nextMatch.status !== 'cancelled') {
    const matchDateObj = new Date(`${input.nextMatch.match_date}T${input.nextMatch.match_time || '12:00:00'}`);
    const timeToMatch = matchDateObj.getTime() - nowTime;

    if (timeToMatch > -2 * 3600 * 1000) {
      actions.push({
        id: `match_soon_${input.nextMatch.id}`,
        tier: 'MATCH_SOON',
        priorityScore: 60,
        importance: 'NORMAL',
        category: 'matches',
        headline: `Najbliższy mecz: vs ${
          input.nextMatch.away_team === 'K.S. Delta Warszawa GM'
            ? input.nextMatch.home_team
            : input.nextMatch.away_team
        }`,
        subtext: `${input.nextMatch.match_date} o godz. ${
          input.nextMatch.match_time?.slice(0, 5) || 'do ustalenia'
        } • ${input.nextMatch.venue || 'Mecz ligowy'}`,
        ctaLabel: 'Centrum meczu',
        targetTab: 'matches',
        targetPayload: { matchId: input.nextMatch.id },
        entityId: input.nextMatch.id,
        badgeText: 'MECZ',
      });
    }
  }

  // 5b. Nearest Upcoming Training
  if (input.nextTraining) {
    const trainingDateObj = new Date(
      `${input.nextTraining.training_date}T${input.nextTraining.start_time || '17:00:00'}`
    );
    const timeToTraining = trainingDateObj.getTime() - nowTime;

    if (timeToTraining > -2 * 3600 * 1000) {
      actions.push({
        id: `training_${input.nextTraining.id}`,
        tier: 'TRAINING_SOON',
        priorityScore: 50,
        importance: 'NORMAL',
        category: 'trainings',
        headline: `Najbliższy trening: ${input.nextTraining.training_date}`,
        subtext: `Godz. ${input.nextTraining.start_time?.slice(0, 5) || '17:00'} • ${
          input.nextTraining.location || 'Boisko klubowe'
        }`,
        ctaLabel: 'Centrum treningowe',
        targetTab: 'training',
        targetPayload: { trainingId: input.nextTraining.id },
        entityId: input.nextTraining.id,
        badgeText: 'TRENING',
      });
    }
  }

  // 6. TIER 6: UNREAD COMMUNICATION IN NOTIFICATION CENTER
  const unreadCount = input.unreadMessagesCount || 0;
  if (unreadCount > 0) {
    actions.push({
      id: 'unread_messages_summary',
      tier: 'UNREAD_MESSAGES',
      priorityScore: 40,
      importance: 'NORMAL',
      category: 'club',
      headline:
        unreadCount === 1 ? 'Masz 1 nieprzeczytaną wiadomość' : `Masz ${unreadCount} nieprzeczytane wiadomości`,
      subtext: 'Sprawdź najnowsze komunikaty i powiadomienia w Centrum Wiadomości.',
      ctaLabel: 'Otwórz Wiadomości',
      targetTab: 'news',
      badgeText: `${unreadCount} NOWYCH`,
    });
  }

  // 7. TIER 7: GAMIFICATION / RETENTION (Strictly secondary / tertiary)
  if ((input.unopenedPacksCount || 0) > 0) {
    actions.push({
      id: 'gamification_packs',
      tier: 'GAMIFICATION',
      priorityScore: 25,
      importance: 'LOW',
      category: 'gamification',
      headline: 'Masz nieotwarte paczki kart!',
      subtext: `Czeka na Ciebie ${input.unopenedPacksCount} ${
        input.unopenedPacksCount === 1 ? 'paczka' : 'paczki'
      } do otwarcia.`,
      ctaLabel: 'Otwórz paczki',
      targetTab: 'collection',
      badgeText: 'KARTY',
    });
  } else if (input.dailySpinAvailable) {
    actions.push({
      id: 'gamification_spin',
      tier: 'GAMIFICATION',
      priorityScore: 20,
      importance: 'LOW',
      category: 'gamification',
      headline: 'Daily Spin jest gotowy!',
      subtext: 'Zakręć kołem fortuny i odbierz darmowe nagrody klubowe.',
      ctaLabel: 'Zakręć kołem',
      targetTab: 'home',
      badgeText: 'SPIN',
    });
  }

  // Deduplicate and select Primary vs Secondary
  const seenActionKeys = new Set<string>();
  const uniqueActions: HomePriorityAction[] = [];

  // Sort by priority score descending
  actions.sort((a, b) => b.priorityScore - a.priorityScore);

  actions.forEach((act) => {
    const dedupeKey = act.entityId || act.eventId || act.id;
    if (!seenActionKeys.has(dedupeKey)) {
      seenActionKeys.add(dedupeKey);
      uniqueActions.push(act);
    }
  });

  if (uniqueActions.length === 0) {
    return {
      primaryAction: null,
      secondaryActions: [],
      reason: 'No urgent or actionable events for current user context (Calm Home State).',
      hasPriority: false,
    };
  }

  const primaryAction = uniqueActions[0];
  // Secondary actions strictly exclude the primary action entity
  const secondaryActions = uniqueActions.slice(1, 3);

  return {
    primaryAction,
    secondaryActions,
    reason: `Primary action selected: [${primaryAction.tier}] ${primaryAction.headline}`,
    hasPriority: true,
  };
}
