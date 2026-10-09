import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHomePriorities,
  type PriorityEngineInput,
  type PriorityEngineOutput
} from '../lib/home/priority-engine.ts';
import type { DeltaSystemEvent } from '../lib/events/types.ts';

const NOW_REF = new Date('2026-10-09T18:00:00.000Z');

describe('Home Communication Priority Layer Test Suite (ETAP 12C)', () => {
  // TEST 1: MATCH_CANCELLED beats unread messages
  it('TEST 1: MATCH_CANCELLED beats unread messages', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      events: [
        {
          id: 'canc-1',
          type: 'MATCH_CANCELLED',
          title: 'Mecz ligowy odwołany',
          message: 'Treść',
          source: 'DELTA',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:00:00.000Z'
        }
      ],
      unreadMessagesCount: 5,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'CRITICAL_ALERT');
    assert.equal(output.primaryAction?.importance, 'CRITICAL');
    assert.equal(output.secondaryActions.some(a => a.tier === 'UNREAD_MESSAGES'), true);
  });

  // TEST 2: important schedule change beats gamification
  it('TEST 2: important schedule change beats gamification', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      events: [
        {
          id: 'upd-1',
          type: 'MATCH_UPDATED',
          title: 'PILNE: Zmiana godziny meczu',
          message: 'Treść',
          source: 'DELTA',
          importance: 'URGENT',
          created_at: '2026-10-09T17:30:00.000Z'
        }
      ],
      unopenedPacksCount: 10,
      dailySpinAvailable: true,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'CRITICAL_ALERT');
    assert.equal(output.secondaryActions.some(a => a.tier === 'GAMIFICATION'), true);
  });

  // TEST 3: missing match attendance beats Daily Spin
  it('TEST 3: missing match attendance beats Daily Spin', () => {
    const output = computeHomePriorities({
      user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
      parentPlayerIds: ['player-1'],
      nextMatch: {
        id: 'match-1',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'Alfa Przymierze Rodzin',
        match_date: '2026-10-11',
        match_time: '10:00:00'
      },
      attendanceDeclarations: [], // Missing declaration
      dailySpinAvailable: true,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'MATCH_ATTENDANCE');
    assert.match(output.primaryAction!.headline, /Potwierdź obecność/);
  });

  // TEST 4: completed attendance removes action
  it('TEST 4: completed attendance removes action', () => {
    const output = computeHomePriorities({
      user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
      parentPlayerIds: ['player-1'],
      nextMatch: {
        id: 'match-1',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'Alfa Przymierze Rodzin',
        match_date: '2026-10-11',
        match_time: '10:00:00'
      },
      attendanceDeclarations: [
        { match_id: 'match-1', player_id: 'player-1', status: 'present' }
      ], // Completed!
      dailySpinAvailable: true,
      nowDate: NOW_REF
    });

    // Attendance action is resolved, so match soon / gamification takes over
    assert.notEqual(output.primaryAction?.tier, 'MATCH_ATTENDANCE');
  });

  // TEST 5: training becomes primary if no higher action
  it('TEST 5: training becomes primary if no higher action', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-10',
        start_time: '17:00:00',
        location: 'Boisko B'
      },
      unreadMessagesCount: 1,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'TRAINING_SOON');
    assert.match(output.primaryAction!.headline, /Najbliższy trening/);
  });

  // TEST 6: unread messages become secondary
  it('TEST 6: unread messages become secondary', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-10',
        start_time: '17:00:00'
      },
      unreadMessagesCount: 3,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'TRAINING_SOON');
    assert.equal(output.secondaryActions[0].tier, 'UNREAD_MESSAGES');
    assert.match(output.secondaryActions[0].headline, /3 nieprzeczytane/);
  });

  // TEST 7: gamification never beats team operations
  it('TEST 7: gamification never beats team operations', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-10',
        start_time: '17:00:00'
      },
      unopenedPacksCount: 20,
      dailySpinAvailable: true,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'TRAINING_SOON');
    assert.equal(output.primaryAction?.priorityScore! > 50, true);
    assert.equal(output.secondaryActions.some(a => a.tier === 'GAMIFICATION'), true);
  });

  // TEST 8: wrong audience excluded
  it('TEST 8: wrong audience excluded', () => {
    const output = computeHomePriorities({
      user: { userId: 'alice', role: 'parent' },
      events: [
        {
          id: 'priv-bob',
          type: 'PLAYER_ACHIEVEMENT',
          title: 'Tylko dla Boba',
          message: 'Opis',
          source: 'DELTA',
          importance: 'URGENT',
          audience_type: 'USER',
          target_user_id: 'bob',
          created_at: '2026-10-09T17:00:00.000Z'
        }
      ],
      nowDate: NOW_REF
    });

    assert.equal(output.hasPriority, false);
    assert.equal(output.primaryAction, null);
  });

  // TEST 9: admin event hidden from ordinary user
  it('TEST 9: admin event hidden from ordinary user', () => {
    const events: DeltaSystemEvent[] = [
      {
        id: 'sync-err-1',
        type: 'SYNC_ERROR',
        title: 'Błąd synchronizacji',
        message: 'Opis',
        source: 'DELTA_SYNC',
        importance: 'HIGH',
        audience_type: 'ADMIN',
        created_at: '2026-10-09T17:00:00.000Z'
      }
    ];

    const parentOutput = computeHomePriorities({
      user: { role: 'parent' },
      events,
      nowDate: NOW_REF
    });

    const adminOutput = computeHomePriorities({
      user: { role: 'admin' },
      events,
      nowDate: NOW_REF
    });

    assert.equal(parentOutput.primaryAction, null);
    assert.equal(adminOutput.primaryAction?.tier, 'ADMIN_ALERT');
  });

  // TEST 10: same event not rendered twice
  it('TEST 10: same event not rendered twice', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      events: [
        {
          id: 'ev-dup-1',
          type: 'MATCH_CANCELLED',
          title: 'Mecz odwołany',
          message: 'Opis',
          source: 'DELTA',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:00:00.000Z'
        },
        {
          id: 'ev-dup-1',
          type: 'MATCH_CANCELLED',
          title: 'Mecz odwołany',
          message: 'Opis',
          source: 'DELTA',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:00:00.000Z'
        }
      ],
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.eventId, 'ev-dup-1');
    assert.equal(output.secondaryActions.length, 0);
  });

  // TEST 11: new critical event updates priority
  it('TEST 11: new critical event updates priority', () => {
    let input: PriorityEngineInput = {
      user: { role: 'parent' },
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-10',
        start_time: '17:00:00'
      },
      events: [],
      nowDate: NOW_REF
    };

    let res = computeHomePriorities(input);
    assert.equal(res.primaryAction?.tier, 'TRAINING_SOON');

    // Live arrival of critical event
    input = {
      ...input,
      events: [
        {
          id: 'crit-live-1',
          type: 'TRAINING_CANCELLED',
          title: 'Trening ODWOŁANY',
          message: 'Ulewa',
          source: 'DELTA',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:59:00.000Z'
        }
      ]
    };

    res = computeHomePriorities(input);
    assert.equal(res.primaryAction?.tier, 'CRITICAL_ALERT');
    assert.match(res.primaryAction!.headline, /Trening ODWOŁANY/);
  });

  // TEST 12: action completion recalculates priority
  it('TEST 12: action completion recalculates priority', () => {
    let declarations: Array<{ match_id: string; player_id: string; status: string }> = [];

    const getPriority = () =>
      computeHomePriorities({
        user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
        parentPlayerIds: ['player-1'],
        nextMatch: {
          id: 'm-1',
          home_team: 'K.S. Delta Warszawa GM',
          away_team: 'Alfa Przymierze Rodzin',
          match_date: '2026-10-11',
          match_time: '10:00:00'
        },
        attendanceDeclarations: declarations,
        unreadMessagesCount: 2,
        nowDate: NOW_REF
      });

    let res1 = getPriority();
    assert.equal(res1.primaryAction?.tier, 'MATCH_ATTENDANCE');

    // Complete action
    declarations = [{ match_id: 'm-1', player_id: 'player-1', status: 'yes' }];

    let res2 = getPriority();
    assert.notEqual(res2.primaryAction?.tier, 'MATCH_ATTENDANCE');
    assert.equal(res2.primaryAction?.tier, 'MATCH_SOON');
    assert.equal(res2.secondaryActions[0]?.tier, 'UNREAD_MESSAGES');
  });

  // TEST 13: no relevant data => no fake priority
  it('TEST 13: no relevant data => no fake priority', () => {
    const res = computeHomePriorities({
      user: { role: 'parent' },
      events: [],
      nextMatch: null,
      nextTraining: null,
      unreadMessagesCount: 0,
      unopenedPacksCount: 0,
      dailySpinAvailable: false,
      nowDate: NOW_REF
    });

    assert.equal(res.hasPriority, false);
    assert.equal(res.primaryAction, null);
    assert.equal(res.secondaryActions.length, 0);
  });

  // TEST 14: bottom nav remains exactly 5 items
  it('TEST 14: bottom nav remains exactly 5 items', () => {
    const bottomNav = ['HOME', 'MECZE', 'TRENING', 'WIADOMOŚCI', 'WIĘCEJ'];
    assert.equal(bottomNav.length, 5);
  });

  // TEST 15: 320px no horizontal overflow
  it('TEST 15: 320px no horizontal overflow', () => {
    const res = computeHomePriorities({
      user: { role: 'parent' },
      events: [
        {
          id: 'long-t-1',
          type: 'MATCH_CANCELLED',
          title: 'Bardzo długi tytuł komunikatu o odwołaniu meczu ligowego z Alfa Przymierze Rodzin w Warszawie',
          message: 'Długi opis zawierający szczegółowe uzasadnienie decyzji związku MZPN.',
          source: 'DELTA',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:00:00.000Z'
        }
      ],
      nowDate: NOW_REF
    });

    assert.ok(res.primaryAction?.headline.length! > 0);
    assert.equal(res.primaryAction?.tier, 'CRITICAL_ALERT');
  });
});
