import type { DeltaSystemEvent, SystemEventType, EventImportance, EventAudienceType } from './types.ts';

export type NotificationCategory =
  | 'all'
  | 'unread'
  | 'matches'
  | 'trainings'
  | 'club'
  | 'achievements'
  | 'multimedia'
  | 'system';

export interface NotificationFilterOption {
  id: NotificationCategory;
  label: string;
  icon?: string;
}

export const NOTIFICATION_FILTERS: NotificationFilterOption[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'unread', label: 'Nieprzeczytane' },
  { id: 'matches', label: 'Mecze' },
  { id: 'trainings', label: 'Treningi' },
  { id: 'club', label: 'Klub' },
  { id: 'achievements', label: 'Osiągnięcia' },
  { id: 'multimedia', label: 'Multimedia' },
  { id: 'system', label: 'System' },
];

/**
 * Maps system event type or entity to a UI presentation category.
 */
export function mapEventToCategory(event: Pick<DeltaSystemEvent, 'type'>): NotificationCategory {
  const type = event.type;

  if (
    type === 'MATCH_CREATED' ||
    type === 'MATCH_UPDATED' ||
    type === 'MATCH_CANCELLED' ||
    type === 'MATCH_RESULT_UPDATED' ||
    type === 'LINEUP_PUBLISHED'
  ) {
    return 'matches';
  }

  if (
    type === 'TRAINING_CREATED' ||
    type === 'TRAINING_UPDATED' ||
    type === 'TRAINING_CANCELLED'
  ) {
    return 'trainings';
  }

  if (type === 'CLUB_NEWS') {
    return 'club';
  }

  if (type === 'PLAYER_ACHIEVEMENT' || type === 'PLAYER_CARD_UNLOCKED') {
    return 'achievements';
  }

  if (
    type === 'GALLERY_CREATED' ||
    type === 'GALLERY_UPDATED' ||
    type === 'VIDEO_PUBLISHED'
  ) {
    return 'multimedia';
  }

  if (type === 'SYSTEM_MESSAGE' || type === 'SYNC_ERROR') {
    return 'system';
  }

  return 'club';
}

export interface UserAudienceContext {
  userId?: string | null;
  role?: string | null;
  playerIds?: string[];
}

/**
 * Checks whether an event is visible to the given user based on audience rules.
 */
export function isEventVisibleForUser(
  event: Pick<DeltaSystemEvent, 'type' | 'audience_type' | 'target_user_id' | 'target_player_id'>,
  user: UserAudienceContext
): boolean {
  const role = user.role || 'parent';
  const isAdminOrStaff = role === 'admin' || role === 'coach' || role === 'staff';

  // SYNC_ERROR is strictly admin/staff only
  if (event.type === 'SYNC_ERROR') {
    return isAdminOrStaff;
  }

  const audienceType: EventAudienceType = event.audience_type || 'TEAM';

  switch (audienceType) {
    case 'ADMIN':
      return isAdminOrStaff;

    case 'USER':
      if (!event.target_user_id) return true;
      if (user.userId && user.userId === event.target_user_id) return true;
      // Admin/staff can inspect if needed, otherwise hidden
      return isAdminOrStaff;

    case 'PLAYER':
      if (!event.target_player_id) return true;
      if (isAdminOrStaff) return true;
      if (user.playerIds && user.playerIds.includes(event.target_player_id)) return true;
      return false;

    case 'TEAM':
    default:
      return true;
  }
}

export type TimeGroupKey = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'EARLIER';

export interface GroupedEvents {
  today: DeltaSystemEvent[];
  yesterday: DeltaSystemEvent[];
  last7Days: DeltaSystemEvent[];
  earlier: DeltaSystemEvent[];
}

/**
 * Groups events chronologically into:
 * - DZIŚ (Today)
 * - WCZORAJ (Yesterday)
 * - OSTATNIE 7 DNI (Last 7 days, excluding today & yesterday)
 * - WCZEŚNIEJ (Earlier)
 */
export function groupEventsChronologically(
  events: DeltaSystemEvent[],
  referenceDate: Date = new Date()
): GroupedEvents {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const refTime = ref.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const grouped: GroupedEvents = {
    today: [],
    yesterday: [],
    last7Days: [],
    earlier: [],
  };

  events.forEach((event) => {
    const eventDate = new Date(event.created_at);
    if (isNaN(eventDate.getTime())) {
      grouped.earlier.push(event);
      return;
    }

    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((refTime - eventDay.getTime()) / oneDayMs);

    if (dayDiff <= 0) {
      grouped.today.push(event);
    } else if (dayDiff === 1) {
      grouped.yesterday.push(event);
    } else if (dayDiff <= 7) {
      grouped.last7Days.push(event);
    } else {
      grouped.earlier.push(event);
    }
  });

  return grouped;
}

export interface SanitizedDeepLinkResult {
  safe: boolean;
  isInternal: boolean;
  tab?: string;
  url?: string;
  sourceUrl?: string;
}

const ALLOWED_TABS = new Set([
  'home',
  'matches',
  'matchday',
  'training',
  'calendar',
  'news',
  'club',
  'achievements',
  'collection',
  'gallery',
  'tv',
  'mychild',
  'teamcenter',
  'league',
]);

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'delta.warszawa.pl',
  'www.delta.warszawa.pl',
  'delta-2028.vercel.app',
]);

/**
 * Sanitizes and validates internal deep links and external URLs.
 * Rejects untrusted external URLs for in-app routing.
 */
export function sanitizeDeepLink(link?: string | null): SanitizedDeepLinkResult {
  if (!link || typeof link !== 'string') {
    return { safe: false, isInternal: false };
  }

  const trimmed = link.trim();

  // Handle explicit tab names
  if (ALLOWED_TABS.has(trimmed.toLowerCase())) {
    return {
      safe: true,
      isInternal: true,
      tab: trimmed.toLowerCase(),
      url: `/dashboard?view=${trimmed.toLowerCase()}`,
    };
  }

  // Handle internal relative paths
  if (trimmed.startsWith('/')) {
    // Check for query parameters like ?view=matches
    const parsed = new URL(trimmed, 'https://delta-2028.vercel.app');
    const view = parsed.searchParams.get('view');
    const path = parsed.pathname.replace(/^\//, '');

    const tab = (view && ALLOWED_TABS.has(view)) ? view : ALLOWED_TABS.has(path) ? path : 'news';

    return {
      safe: true,
      isInternal: true,
      tab,
      url: trimmed,
    };
  }

  // Handle absolute URLs
  try {
    const parsed = new URL(trimmed);
    // Block javascript:, data:, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, isInternal: false };
    }

    if (ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase())) {
      return {
        safe: true,
        isInternal: false,
        sourceUrl: trimmed,
      };
    }

    // Untrusted external URL
    return { safe: false, isInternal: false };
  } catch {
    return { safe: false, isInternal: false };
  }
}

/**
 * Formats unread count for badge display.
 * Rules:
 * 0 -> null / hidden
 * 1-99 -> exact count string
 * 99+ -> "99+"
 */
export function formatNotificationBadge(unreadCount: number): {
  count: number;
  display: string | null;
  hasUnread: boolean;
} {
  const safeCount = Math.max(0, Math.floor(unreadCount || 0));
  if (safeCount === 0) {
    return { count: 0, display: null, hasUnread: false };
  }
  if (safeCount > 99) {
    return { count: safeCount, display: '99+', hasUnread: true };
  }
  return { count: safeCount, display: String(safeCount), hasUnread: true };
}
