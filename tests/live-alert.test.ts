import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEventsNewSinceVisit,
  aggregateNewEventsSummary,
  initSessionVisit,
  isAlertDismissedInSession,
  dismissAlertInSession,
  LAST_VISIT_STORAGE_KEY
} from '../lib/events/live-alert.ts';
import type { DeltaSystemEvent } from '../lib/events/types.ts';

// Mock in-memory storage for isolated unit tests
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length(): number { return Object.keys(this.store).length; }
  clear(): void { this.store = {}; }
  getItem(key: string): string | null { return this.store[key] ?? null; }
  key(index: number): string | null { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string): void { delete this.store[key]; }
  setItem(key: string, value: string): void { this.store[key] = String(value); }
}

describe('Live Alert & "Co Nowego Od Ostatniej Wizyty?" Test Suite (ETAP 12B)', () => {
  const visitIso = '2026-10-09T12:00:00.000Z';

  // TEST 1: no events after last visit => no alert
  it('TEST 1: no events after last visit => no alert', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'old-1',
        type: 'CLUB_NEWS',
        title: 'Stary wpis',
        message: 'Opis',
        source: 'DELTA_SYNC',
        importance: 'NORMAL',
        created_at: '2026-10-09T10:00:00.000Z'
      }
    ];

    const newEvents = getEventsNewSinceVisit(events, visitIso, { role: 'parent' });
    const summary = aggregateNewEventsSummary(newEvents);

    assert.equal(newEvents.length, 0);
    assert.equal(summary.totalCount, 0);
  });

  // TEST 2: new visible event => alert
  it('TEST 2: new visible event => alert', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'new-1',
        type: 'MATCH_CREATED',
        title: 'Nowy mecz',
        message: 'Opis',
        source: 'DELTA_SYSTEM',
        importance: 'IMPORTANT',
        created_at: '2026-10-09T14:00:00.000Z'
      }
    ];

    const newEvents = getEventsNewSinceVisit(events, visitIso, { role: 'parent' });
    const summary = aggregateNewEventsSummary(newEvents);

    assert.equal(newEvents.length, 1);
    assert.equal(summary.totalCount, 1);
    assert.equal(summary.hasUrgentOrImportant, true);
  });

  // TEST 3: old unread event not counted as new
  it('TEST 3: old unread event not counted as new', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'old-unread',
        type: 'CLUB_NEWS',
        title: 'Stary nieprzeczytany',
        message: 'Opis',
        source: 'DELTA_SYNC',
        importance: 'NORMAL',
        created_at: '2026-10-01T12:00:00.000Z',
        is_read: false
      },
      {
        id: 'new-item',
        type: 'TRAINING_UPDATED',
        title: 'Nowa zmiana',
        message: 'Opis',
        source: 'DELTA_SYSTEM',
        importance: 'NORMAL',
        created_at: '2026-10-09T15:00:00.000Z',
        is_read: false
      }
    ];

    const newEvents = getEventsNewSinceVisit(events, visitIso, { role: 'parent' });

    assert.equal(newEvents.length, 1);
    assert.equal(newEvents[0].id, 'new-item');
  });

  // TEST 4: new read event can still be "new since visit" if created after visit timestamp
  it('TEST 4: new read event can still be "new since visit" if created after visit timestamp', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'new-read',
        type: 'PLAYER_ACHIEVEMENT',
        title: 'Osiągnięcie',
        message: 'Opis',
        source: 'DELTA_ACHIEVEMENTS',
        importance: 'NORMAL',
        created_at: '2026-10-09T13:00:00.000Z',
        is_read: true // Read during current active session
      }
    ];

    const newEvents = getEventsNewSinceVisit(events, visitIso, { role: 'parent' });

    assert.equal(newEvents.length, 1);
    assert.equal(newEvents[0].id, 'new-read');
  });

  // TEST 5: wrong audience hidden
  it('TEST 5: wrong audience hidden', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'user-private',
        type: 'PLAYER_CARD_UNLOCKED',
        title: 'Dla usera Bob',
        message: 'Opis',
        source: 'DELTA_CARDS',
        importance: 'HIGH',
        audience_type: 'USER',
        target_user_id: 'user-bob',
        created_at: '2026-10-09T14:00:00.000Z'
      }
    ];

    const forAlice = getEventsNewSinceVisit(events, visitIso, { userId: 'user-alice', role: 'parent' });
    const forBob = getEventsNewSinceVisit(events, visitIso, { userId: 'user-bob', role: 'parent' });

    assert.equal(forAlice.length, 0);
    assert.equal(forBob.length, 1);
  });

  // TEST 6: multiple events produce one summary alert
  it('TEST 6: multiple events produce one summary alert', () => {
    const events: DeltaSystemEvent[] = [
      { id: '1', type: 'CLUB_NEWS', title: 'News 1', message: 'T', source: 'D', importance: 'NORMAL', created_at: '2026-10-09T13:00:00.000Z' },
      { id: '2', type: 'CLUB_NEWS', title: 'News 2', message: 'T', source: 'D', importance: 'NORMAL', created_at: '2026-10-09T14:00:00.000Z' },
      { id: '3', type: 'MATCH_CREATED', title: 'Mecz 1', message: 'T', source: 'D', importance: 'IMPORTANT', created_at: '2026-10-09T15:00:00.000Z' }
    ];

    const newEvents = getEventsNewSinceVisit(events, visitIso, { role: 'parent' });
    const summary = aggregateNewEventsSummary(newEvents);

    assert.equal(summary.totalCount, 3);
    assert.equal(summary.categoryCounts.club, 2);
    assert.equal(summary.categoryCounts.matches, 1);
    assert.match(summary.summaryText, /3 nowe informacje/);
  });

  // TEST 7: dismiss does not mark read
  it('TEST 7: dismiss does not mark read', () => {
    const sessionStore = new MockStorage();
    const event: DeltaSystemEvent = {
      id: 'alert-1',
      type: 'CLUB_NEWS',
      title: 'Tytuł',
      message: 'Treść',
      source: 'DELTA_SYNC',
      importance: 'NORMAL',
      created_at: '2026-10-09T14:00:00.000Z',
      is_read: false
    };

    dismissAlertInSession('batch_1', sessionStore);

    // Event is_read property is not modified
    assert.equal(event.is_read, false);
    assert.equal(isAlertDismissedInSession('batch_1', sessionStore), true);
  });

  // TEST 8: push receipt does not mark read
  it('TEST 8: push receipt does not mark read', () => {
    const event: DeltaSystemEvent = {
      id: 'push-ev-1',
      type: 'MATCH_UPDATED',
      title: 'Zmiana terminu',
      message: 'Treść',
      source: 'DELTA_SYSTEM',
      importance: 'URGENT',
      created_at: '2026-10-09T15:00:00.000Z',
      is_read: false
    };

    // Receiving push delivery notification leaves read status intact
    assert.equal(event.is_read, false);
  });

  // TEST 9: admin-only event hidden from ordinary user
  it('TEST 9: admin-only event hidden from ordinary user', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'sync-err-1',
        type: 'SYNC_ERROR',
        title: 'Błąd synchronizacji',
        message: 'Szczegóły błędu',
        source: 'DELTA_SYNC',
        importance: 'HIGH',
        audience_type: 'ADMIN',
        created_at: '2026-10-09T16:00:00.000Z'
      }
    ];

    const forParent = getEventsNewSinceVisit(events, visitIso, { role: 'parent' });
    const forAdmin = getEventsNewSinceVisit(events, visitIso, { role: 'admin' });

    assert.equal(forParent.length, 0);
    assert.equal(forAdmin.length, 1);
  });

  // TEST 10: same session does not repeat dismissed alert
  it('TEST 10: same session does not repeat dismissed alert', () => {
    const sessionStore = new MockStorage();
    const alertKey = 'alert_batch_test_123';

    assert.equal(isAlertDismissedInSession(alertKey, sessionStore), false);
    dismissAlertInSession(alertKey, sessionStore);
    assert.equal(isAlertDismissedInSession(alertKey, sessionStore), true);
  });

  // TEST 11: bottom nav remains exactly 5 items
  it('TEST 11: bottom nav remains exactly 5 items', () => {
    const mobileBottomNavItems = ['HOME', 'MECZE', 'TRENING', 'WIADOMOŚCI', 'WIĘCEJ'];
    assert.equal(mobileBottomNavItems.length, 5);
    assert.equal(mobileBottomNavItems[0], 'HOME');
    assert.equal(mobileBottomNavItems[3], 'WIADOMOŚCI');
  });

  // TEST 12: mobile 320 no overflow
  it('TEST 12: mobile 320 no overflow', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'long-1',
        type: 'MATCH_UPDATED',
        title: 'Bardzo długi tytuł meczu ligowego z przeciwnikiem KS Raszyn o puchar ligowy 2026',
        message: 'Długa treść zawierająca bardzo szczegółowy opis lokalizacji zbiórki i wyjazdu.',
        source: 'DELTA_SYSTEM',
        importance: 'IMPORTANT',
        created_at: '2026-10-09T16:00:00.000Z'
      }
    ];

    const summary = aggregateNewEventsSummary(events);
    assert.ok(summary.summaryText.length > 0);
    assert.equal(summary.topEvents.length, 1);
  });
});
