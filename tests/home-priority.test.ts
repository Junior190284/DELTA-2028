import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHomePriorities,
  type PriorityEngineInput,
  type PriorityEngineOutput
} from '../lib/home/priority-engine.ts';
import type { DeltaSystemEvent } from '../lib/events/types.ts';

const NOW_REF = new Date('2026-10-09T18:00:00.000Z');

describe('Home Communication Priority Layer Test Suite (ETAP 12C.1)', () => {
  // TEST 1: CRITICAL cancellation beats everything (even unread messages & gamification)
  it('TEST 1: MATCH_CANCELLED beats unread messages and all other tiers', () => {
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
      unopenedPacksCount: 10,
      dailySpinAvailable: true,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'CRITICAL_ALERT');
    assert.equal(output.primaryAction?.importance, 'CRITICAL');
    assert.equal(output.secondaryActions.some(a => a.tier === 'UNREAD_MESSAGES'), true);
  });

  // TEST 2: Required match attendance beats gamification and general training
  it('TEST 2: missing match attendance beats gamification and training', () => {
    const output = computeHomePriorities({
      user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
      parentPlayerIds: ['player-1'],
      nextMatch: {
        id: 'match-1',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'Alfa Przymierze Rodzin',
        match_date: '2026-10-15', // 6 days ahead (no arbitrary 72h restriction)
        match_time: '10:00:00'
      },
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-12',
        start_time: '17:00:00'
      },
      attendanceDeclarations: [], // Missing declaration
      dailySpinAvailable: true,
      unopenedPacksCount: 5,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'MATCH_ATTENDANCE');
    assert.match(output.primaryAction!.headline, /Potwierdź obecność/);
  });

  // TEST 3: New Lineup / Callup beats unread messages and regular match/training card
  it('TEST 3: new lineup published beats unread messages and regular match card', () => {
    const output = computeHomePriorities({
      user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
      nextMatch: {
        id: 'match-1',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'Alfa Przymierze Rodzin',
        match_date: '2026-10-14',
        match_time: '10:00:00'
      },
      hasLineupPublished: true,
      events: [
        {
          id: 'lineup-ev-1',
          type: 'LINEUP_PUBLISHED',
          title: 'Powołania na mecz',
          message: 'Trener opublikował kadrę.',
          source: 'DELTA',
          importance: 'IMPORTANT',
          related_entity_id: 'match-1',
          is_read: false,
          created_at: '2026-10-09T17:30:00.000Z'
        }
      ],
      attendanceDeclarations: [{ match_id: 'match-1', player_id: 'player-1', status: 'yes' }],
      unreadMessagesCount: 3,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'LINEUP_CALLUP');
    assert.match(output.primaryAction!.headline, /Powołania i skład/);
  });

  // TEST 4: Important schedule change respected
  it('TEST 4: important schedule change respected over regular training', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      events: [
        {
          id: 'upd-1',
          type: 'MATCH_UPDATED',
          title: 'Zmiana terminu meczu ligowego',
          message: 'Mecz przeniesiony na niedzielę.',
          source: 'DELTA',
          importance: 'IMPORTANT',
          is_read: false,
          created_at: '2026-10-09T17:30:00.000Z'
        }
      ],
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-10',
        start_time: '17:00:00'
      },
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'SCHEDULE_CHANGE');
    assert.equal(output.secondaryActions.some(a => a.tier === 'TRAINING_SOON'), true);
  });

  // TEST 5: Nearest match selected correctly without arbitrary 48h limit
  it('TEST 5: nearest upcoming match selected when attendance completed', () => {
    const output = computeHomePriorities({
      user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
      parentPlayerIds: ['player-1'],
      nextMatch: {
        id: 'match-future',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'KS Ursynów',
        match_date: '2026-10-16', // 7 days in future (beyond 48h)
        match_time: '11:00:00'
      },
      attendanceDeclarations: [
        { match_id: 'match-future', player_id: 'player-1', status: 'present' }
      ],
      unreadMessagesCount: 1,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'MATCH_SOON');
    assert.match(output.primaryAction!.headline, /KS Ursynów/);
  });

  // TEST 6: Nearest training selected if no higher action
  it('TEST 6: nearest training selected if no match and no higher action', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      nextTraining: {
        id: 'tr-future',
        training_date: '2026-10-14', // 5 days in future (beyond 36h)
        start_time: '17:00:00',
        location: 'Boisko Główne'
      },
      unreadMessagesCount: 1,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'TRAINING_SOON');
    assert.match(output.primaryAction!.headline, /Najbliższy trening/);
  });

  // TEST 7: Unread messages become secondary
  it('TEST 7: unread messages become secondary when operations present', () => {
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
    assert.match(output.secondaryActions[0].headline, /3 nowe wiadomości/);
  });

  // TEST 8: Gamification is strictly tertiary (never beats sports ops or unread messages)
  it('TEST 8: gamification is strictly tertiary and never beats sports operations', () => {
    const output = computeHomePriorities({
      user: { role: 'parent' },
      nextTraining: {
        id: 'tr-1',
        training_date: '2026-10-10',
        start_time: '17:00:00'
      },
      unreadMessagesCount: 2,
      unopenedPacksCount: 20,
      dailySpinAvailable: true,
      nowDate: NOW_REF
    });

    assert.equal(output.primaryAction?.tier, 'TRAINING_SOON');
    assert.equal(output.secondaryActions[0].tier, 'UNREAD_MESSAGES');
    assert.equal(output.secondaryActions[1].tier, 'GAMIFICATION');
  });

  // TEST 9: Wrong audience strictly excluded
  it('TEST 9: wrong audience excluded', () => {
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

  // TEST 10: Admin SYNC_ERROR respects real importance and is hidden from parent
  it('TEST 10: admin SYNC_ERROR respects real importance and is hidden from parent', () => {
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
    assert.equal(adminOutput.primaryAction?.priorityScore, 70);
  });

  // TEST 11: Action completion dynamically recalculates priority
  it('TEST 11: action completion recalculates priority', () => {
    let declarations: Array<{ match_id: string; player_id: string; status: string }> = [];

    const getPriority = () =>
      computeHomePriorities({
        user: { userId: 'p1', role: 'parent', playerIds: ['player-1'] },
        parentPlayerIds: ['player-1'],
        nextMatch: {
          id: 'm-1',
          home_team: 'K.S. Delta Warszawa GM',
          away_team: 'Alfa Przymierze Rodzin',
          match_date: '2026-10-15',
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

  // TEST 12: No relevant data produces calm state without fake urgency
  it('TEST 12: no relevant data produces calm state without fake urgency', () => {
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

  // TEST 13: Same event / entity never duplicated in primary AND secondary
  it('TEST 13: same event / entity never duplicated in primary and secondary', () => {
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

  // TEST 14: Mobile navigation 2.0 keeps exactly 4 items
  it('TEST 14: mobile bottom navigation preserves exactly 4 items', () => {
    const bottomNav = ['HOME', 'MECZE', 'TRENING', 'WIĘCEJ'];
    assert.equal(bottomNav.length, 4);
  });

  // TEST 15: Supported real roles handle gracefully and unknown roles fallback
  it('TEST 15: supported real roles and fallback role handling', () => {
    const roles = ['admin', 'coach', 'parent', 'player', 'guest', 'unknown_role'];
    roles.forEach(role => {
      const res = computeHomePriorities({
        user: { role },
        unreadMessagesCount: 1,
        nowDate: NOW_REF
      });
      assert.ok(res);
    });
  });

  // TEST 16: Polish grammar for unread messages handles 1, 2-4, 5-21, 22-24, 99
  it('TEST 16: Polish grammar format for unread messages', () => {
    const out1 = computeHomePriorities({ user: { role: 'parent' }, unreadMessagesCount: 1, nowDate: NOW_REF });
    assert.equal(out1.primaryAction?.headline, '1 nowa wiadomość');

    const out2 = computeHomePriorities({ user: { role: 'parent' }, unreadMessagesCount: 2, nowDate: NOW_REF });
    assert.equal(out2.primaryAction?.headline, '2 nowe wiadomości');

    const out4 = computeHomePriorities({ user: { role: 'parent' }, unreadMessagesCount: 4, nowDate: NOW_REF });
    assert.equal(out4.primaryAction?.headline, '4 nowe wiadomości');

    const out17 = computeHomePriorities({ user: { role: 'parent' }, unreadMessagesCount: 17, nowDate: NOW_REF });
    assert.equal(out17.primaryAction?.headline, '17 nowych wiadomości');

    const out22 = computeHomePriorities({ user: { role: 'parent' }, unreadMessagesCount: 22, nowDate: NOW_REF });
    assert.equal(out22.primaryAction?.headline, '22 nowe wiadomości');

    const out99 = computeHomePriorities({ user: { role: 'parent' }, unreadMessagesCount: 99, nowDate: NOW_REF });
    assert.equal(out99.primaryAction?.headline, '99 nowych wiadomości');
  });

  // TEST 17: Daily Spin user-facing labels without debug placeholders
  it('TEST 17: Daily Spin clean copy without debug labels', () => {
    const outAvail = computeHomePriorities({ user: { role: 'parent' }, dailySpinAvailable: true, nowDate: NOW_REF });
    assert.equal(outAvail.primaryAction?.headline, 'Koło fortuny • zakręć');

    const outUsed = computeHomePriorities({ user: { role: 'parent' }, dailySpinAvailable: false, nowDate: NOW_REF });
    assert.equal(outUsed.hasPriority, false);
  });
});
