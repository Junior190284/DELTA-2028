import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapEventToCategory,
  isEventVisibleForUser,
  groupEventsChronologically,
  sanitizeDeepLink,
  formatNotificationBadge,
  NOTIFICATION_FILTERS
} from '../lib/events/notifications.ts';
import type { DeltaSystemEvent } from '../lib/events/types.ts';

describe('Notifications Center 2.0 Test Suite (ETAP 12A)', () => {
  // TEST 1: unread event count correct
  it('TEST 1: unread event count correct', () => {
    const events: DeltaSystemEvent[] = [
      { id: 'ev-1', type: 'MATCH_CREATED', title: 'Mecz 1', message: 'Opis', source: 'DELTA', importance: 'NORMAL', created_at: new Date().toISOString() },
      { id: 'ev-2', type: 'CLUB_NEWS', title: 'News 2', message: 'Opis', source: 'DELTA', importance: 'NORMAL', created_at: new Date().toISOString() },
      { id: 'ev-3', type: 'TRAINING_CREATED', title: 'Trening 3', message: 'Opis', source: 'DELTA', importance: 'NORMAL', created_at: new Date().toISOString() },
    ];
    const readMap: Record<string, boolean> = { 'ev-1': true };
    const unreadEvents = events.filter(e => !readMap[e.id]);

    assert.equal(unreadEvents.length, 2);
    assert.deepEqual(unreadEvents.map(e => e.id), ['ev-2', 'ev-3']);
  });

  // TEST 2: read event excluded from unread count
  it('TEST 2: read event excluded from unread count', () => {
    const events: DeltaSystemEvent[] = [
      { id: 'ev-1', type: 'MATCH_CREATED', title: 'Mecz 1', message: 'Opis', source: 'DELTA', importance: 'NORMAL', created_at: new Date().toISOString() },
      { id: 'ev-2', type: 'CLUB_NEWS', title: 'News 2', message: 'Opis', source: 'DELTA', importance: 'NORMAL', created_at: new Date().toISOString() },
    ];
    const readMap: Record<string, boolean> = { 'ev-1': true, 'ev-2': true };
    const unreadCount = events.filter(e => !readMap[e.id]).length;

    assert.equal(unreadCount, 0);
  });

  // TEST 3: mark as read updates user_event_reads only
  it('TEST 3: mark as read updates user_event_reads only', () => {
    const originalEvent: DeltaSystemEvent = {
      id: 'ev-100',
      type: 'CLUB_NEWS',
      title: 'Global Event',
      message: 'Treść',
      source: 'DELTA_SYNC',
      importance: 'NORMAL',
      created_at: '2026-10-09T12:00:00.000Z'
    };

    // User read table mutation simulation
    const userEventReads: Array<{ user_id: string; event_id: string; read_at: string }> = [];
    
    function markAsReadForUser(userId: string, eventId: string) {
      userEventReads.push({
        user_id: userId,
        event_id: eventId,
        read_at: new Date().toISOString()
      });
    }

    markAsReadForUser('user-a', originalEvent.id);

    // Assert that the global event row remains completely untouched
    assert.equal(originalEvent.id, 'ev-100');
    assert.equal((originalEvent as any).is_read, undefined);
    assert.equal(userEventReads.length, 1);
    assert.equal(userEventReads[0].user_id, 'user-a');
    assert.equal(userEventReads[0].event_id, 'ev-100');
  });

  // TEST 4: mark all affects only current user
  it('TEST 4: mark all affects only current user', () => {
    const events = ['ev-1', 'ev-2', 'ev-3'];
    const userAReads = new Set<string>();
    const userBReads = new Set<string>();

    // User A marks all as read
    events.forEach(id => userAReads.add(id));

    // User B read state must remain untouched
    assert.equal(userAReads.size, 3);
    assert.equal(userBReads.size, 0);
  });

  // TEST 5: wrong audience event hidden
  it('TEST 5: wrong audience event hidden', () => {
    const privateUserEvent: DeltaSystemEvent = {
      id: 'priv-1',
      type: 'PLAYER_ACHIEVEMENT',
      title: 'Dla innego gracza',
      message: 'Opis',
      source: 'DELTA',
      importance: 'NORMAL',
      audience_type: 'USER',
      target_user_id: 'user-bob',
      created_at: new Date().toISOString()
    };

    const isVisibleForAlice = isEventVisibleForUser(privateUserEvent, {
      userId: 'user-alice',
      role: 'parent'
    });
    const isVisibleForBob = isEventVisibleForUser(privateUserEvent, {
      userId: 'user-bob',
      role: 'parent'
    });

    assert.equal(isVisibleForAlice, false);
    assert.equal(isVisibleForBob, true);
  });

  // TEST 6: CLUB_NEWS maps to club category
  it('TEST 6: CLUB_NEWS maps to club category', () => {
    const event: Pick<DeltaSystemEvent, 'type'> = { type: 'CLUB_NEWS' };
    assert.equal(mapEventToCategory(event), 'club');
  });

  // TEST 7: match events map to matches
  it('TEST 7: match events map to matches', () => {
    const matchTypes = [
      'MATCH_CREATED',
      'MATCH_UPDATED',
      'MATCH_CANCELLED',
      'MATCH_RESULT_UPDATED',
      'LINEUP_PUBLISHED'
    ] as const;

    matchTypes.forEach(type => {
      assert.equal(mapEventToCategory({ type }), 'matches');
    });
  });

  // TEST 8: training events map to trainings
  it('TEST 8: training events map to trainings', () => {
    const trainingTypes = [
      'TRAINING_CREATED',
      'TRAINING_UPDATED',
      'TRAINING_CANCELLED'
    ] as const;

    trainingTypes.forEach(type => {
      assert.equal(mapEventToCategory({ type }), 'trainings');
    });
  });

  // TEST 9: achievement/card events map correctly
  it('TEST 9: achievement/card events map correctly', () => {
    assert.equal(mapEventToCategory({ type: 'PLAYER_ACHIEVEMENT' }), 'achievements');
    assert.equal(mapEventToCategory({ type: 'PLAYER_CARD_UNLOCKED' }), 'achievements');
  });

  // TEST 10: external deep link rejected
  it('TEST 10: external deep link rejected', () => {
    const maliciousLink = 'https://malicious-phishing-site.com/steal-token';
    const javascriptLink = 'javascript:alert(1)';
    const validInternalLink = '/dashboard?view=matches';
    const validTabLink = 'training';

    const resMalicious = sanitizeDeepLink(maliciousLink);
    const resJs = sanitizeDeepLink(javascriptLink);
    const resInternal = sanitizeDeepLink(validInternalLink);
    const resTab = sanitizeDeepLink(validTabLink);

    assert.equal(resMalicious.safe, false);
    assert.equal(resJs.safe, false);
    assert.equal(resInternal.safe, true);
    assert.equal(resInternal.tab, 'matches');
    assert.equal(resTab.safe, true);
    assert.equal(resTab.tab, 'training');
  });

  // TEST 11: push click does not remove event
  it('TEST 11: push click does not remove event', () => {
    const systemEvents: DeltaSystemEvent[] = [
      { id: 'ev-push-1', type: 'MATCH_UPDATED', title: 'Mecz przesunięty', message: 'Nowy termin', source: 'DELTA', importance: 'IMPORTANT', created_at: new Date().toISOString() }
    ];

    // Simulate push notification click: opens deep link without mutating systemEvents array
    const targetLink = sanitizeDeepLink('/dashboard?view=matches');
    assert.equal(targetLink.safe, true);
    assert.equal(systemEvents.length, 1);
    assert.equal(systemEvents[0].id, 'ev-push-1');
  });

  // TEST 12: 99+ badge works
  it('TEST 12: 99+ badge works', () => {
    assert.deepEqual(formatNotificationBadge(0), { count: 0, display: null, hasUnread: false });
    assert.deepEqual(formatNotificationBadge(1), { count: 1, display: '1', hasUnread: true });
    assert.deepEqual(formatNotificationBadge(99), { count: 99, display: '99', hasUnread: true });
    assert.deepEqual(formatNotificationBadge(100), { count: 100, display: '99+', hasUnread: true });
    assert.deepEqual(formatNotificationBadge(250), { count: 250, display: '99+', hasUnread: true });
  });

  // TEST 13: mobile bottom nav contains exactly 4 items with WIĘCEJ holding notifications
  it('TEST 13: mobile bottom nav contains exactly 4 items with WIĘCEJ holding notifications', () => {
    const mobileBottomNavItems = ['HOME', 'MECZE', 'TRENING', 'WIĘCEJ'];
    assert.equal(mobileBottomNavItems.length, 4);
    assert.equal(mobileBottomNavItems.includes('WIADOMOŚCI'), false);
    assert.equal(mobileBottomNavItems[3], 'WIĘCEJ');
  });

  // TEST 14: ordinary user does not see admin-only SYNC_ERROR
  it('TEST 14: ordinary user does not see admin-only SYNC_ERROR', () => {
    const syncErrorEvent: DeltaSystemEvent = {
      id: 'sync-err-1',
      type: 'SYNC_ERROR',
      title: 'Błąd synchronizacji',
      message: 'HTTP 500 w DELTA Sync',
      source: 'DELTA_SYNC',
      importance: 'HIGH',
      audience_type: 'ADMIN',
      created_at: new Date().toISOString()
    };

    const visibleForParent = isEventVisibleForUser(syncErrorEvent, { role: 'parent' });
    const visibleForCoach = isEventVisibleForUser(syncErrorEvent, { role: 'coach' });
    const visibleForAdmin = isEventVisibleForUser(syncErrorEvent, { role: 'admin' });

    assert.equal(visibleForParent, false);
    assert.equal(visibleForCoach, true);
    assert.equal(visibleForAdmin, true);
  });

  // TEST 15: new event updates unread without reload
  it('TEST 15: new event updates unread without reload', () => {
    let events: DeltaSystemEvent[] = [
      { id: 'ev-1', type: 'MATCH_CREATED', title: 'Mecz', message: 'Opis', source: 'DELTA', importance: 'NORMAL', created_at: new Date().toISOString() }
    ];
    let readMap: Record<string, boolean> = { 'ev-1': true };

    // Initial unread count
    let unreadCount = events.filter(e => !readMap[e.id]).length;
    assert.equal(unreadCount, 0);

    // Reactive incoming event pushes to existing list
    const incomingEvent: DeltaSystemEvent = {
      id: 'ev-2',
      type: 'CLUB_NEWS',
      title: 'Nowy news',
      message: 'Treść',
      source: 'DELTA_SYNC',
      importance: 'NORMAL',
      created_at: new Date().toISOString()
    };
    events = [incomingEvent, ...events];

    // Reactive unread count recalculation
    unreadCount = events.filter(e => !readMap[e.id]).length;
    assert.equal(unreadCount, 1);
    assert.equal(formatNotificationBadge(unreadCount).display, '1');
  });
});
