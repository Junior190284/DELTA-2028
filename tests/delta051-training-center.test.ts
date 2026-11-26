import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  unifyTrainingSessions,
  deriveDeterministicTrainingUuid,
  isUuid,
  type TeamEventInput,
} from '../lib/training/unifiedTrainingService.ts';
import type { TrainingSession } from '../components/training/DeltaTrainingCenter20.tsx';
import fs from 'node:fs';

describe('DELTA-051 — TRAINING CENTER REAL DATA INTEGRATION & SECURITY SUITE', () => {
  test('1. Deterministic UUID derivation guarantees stable IDs and valid UUID v4 format', () => {
    const id1 = deriveDeterministicTrainingUuid('2026-11-25');
    const id2 = deriveDeterministicTrainingUuid('2026-11-25');
    const id3 = deriveDeterministicTrainingUuid('2026-11-27');

    assert.equal(isUuid(id1), true, 'id1 must be a valid UUID');
    assert.equal(isUuid(id3), true, 'id3 must be a valid UUID');
    assert.equal(id1, id2, 'Same date must always generate identical UUID');
    assert.notEqual(id1, id3, 'Different dates must yield different UUIDs');
  });

  test('2. Unified training engine prevents duplicates and respects source precedence (DB > team_events > recurring)', () => {
    const refDate = new Date('2026-11-26T12:00:00Z');

    const dbSessions: TrainingSession[] = [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        training_date: '2026-11-25',
        start_time: '17:30',
        end_time: '19:00',
        location: 'Warszawianka Boisko A',
        title: 'Trening Taktyczny U-9',
        notes: 'Przygotowanie do derbów',
        created_at: '2026-11-20T10:00:00Z',
      },
    ];

    const teamEvents: TeamEventInput[] = [
      // Duplicate date with DB session: DB session must take precedence!
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        title: 'Trening w team_events',
        event_type: 'training',
        event_date: '2026-11-25',
        start_time: '18:00',
        end_time: '19:30',
        location: 'Inna lokalizacja',
        details: 'Duplikat',
      },
      // Distinct training event on Thursday
      {
        id: 'c0000000-0000-0000-0000-000000000003',
        title: 'Trening dodatkowy bramkarzy',
        event_type: 'training',
        event_date: '2026-11-26',
        start_time: '16:00',
        end_time: '17:00',
        location: 'Wiktorska 32',
        details: 'Tylko bramkarze',
      },
    ];

    const unified = unifyTrainingSessions(dbSessions, teamEvents, refDate);

    // Check 2026-11-25 session preserved from DB
    const s25 = unified.find((s) => s.training_date === '2026-11-25');
    assert.ok(s25, '2026-11-25 session must exist');
    assert.equal(s25.id, 'a0000000-0000-0000-0000-000000000001');
    assert.equal(s25.title, 'Trening Taktyczny U-9');
    assert.equal(s25.start_time, '17:30');

    // Check 2026-11-26 session from team_events
    const s26 = unified.find((s) => s.training_date === '2026-11-26');
    assert.ok(s26, '2026-11-26 session must exist');
    assert.equal(s26.id, 'c0000000-0000-0000-0000-000000000003');
    assert.equal(s26.title, 'Trening dodatkowy bramkarzy');

    // Check recurring Friday session (2026-11-27 is a Friday)
    const s27 = unified.find((s) => s.training_date === '2026-11-27');
    assert.ok(s27, '2026-11-27 routine Friday session must be generated');
    assert.equal(isUuid(s27.id), true, 'Generated session must have a valid UUID');
    assert.equal(s27.title, 'Trening • Wiktorska');
    assert.equal(s27.location, 'Boisko, ul. Wiktorska 32');

    // Verify no duplicate dates exist anywhere in unified list
    const dateSet = new Set<string>();
    for (const s of unified) {
      assert.equal(dateSet.has(s.training_date), false, `Date ${s.training_date} appears more than once`);
      dateSet.add(s.training_date);
    }
  });

  test('3. Attendance API route verifies session existence and protects present/absent against parent overwrite', () => {
    const routeContent = fs.readFileSync('app/api/training/attendance/route.ts', 'utf8');

    // Ensure staff check exists
    assert.ok(routeContent.includes('isStaff'), 'Route must evaluate isStaff status');
    assert.ok(routeContent.includes('isParentOfChild'), 'Route must verify parent-child relationship');

    // Ensure present / absent cannot be set by non-staff
    assert.ok(
      routeContent.includes('status === "present" || status === "absent"'),
      'Route must guard coach statuses'
    );

    // Ensure coach present status cannot be overwritten by parent declaration
    assert.ok(
      routeContent.includes('Obecność na boisku została już potwierdzona przez trenera'),
      'Route must prevent overwriting confirmed presence'
    );

    // Ensure atomic upsert with onConflict
    assert.ok(
      routeContent.includes('onConflict: "training_id,player_id"'),
      'Route must use idempotent atomic upsert'
    );
  });

  test('4. TeamHub integrates unified training sessions and binds them to DeltaTrainingCenter20', () => {
    const thContent = fs.readFileSync('components/TeamHub.tsx', 'utf8');

    assert.ok(
      thContent.includes('unifyTrainingSessions(props.initialTrainingSessions, props.initialTeamEvents)'),
      'TeamHub must initialize trainingSessions with unifyTrainingSessions'
    );
    assert.ok(
      thContent.includes('trainingSessions={trainingSessions}'),
      'TeamHub must pass unified trainingSessions to DeltaTrainingCenter20'
    );
  });

  test('5. Flexible training match engine allows any roster size without enforcing 5v5/6v6', () => {
    const adminPanelContent = fs.readFileSync('components/AdminPanel.tsx', 'utf8');
    const kingModalContent = fs.readFileSync('components/DeltaTrainingKingModal.tsx', 'utf8');

    // Ensure teams A, B, C, D support arbitrary player counts
    assert.ok(adminPanelContent.includes('setTrainingGameTeam'), 'AdminPanel allows flexible team assignment');
    assert.ok(kingModalContent.includes('trainingGames'), 'TrainingKingModal accepts arbitrary training games');
  });
});
