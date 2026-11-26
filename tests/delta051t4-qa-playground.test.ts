import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SYNTHETIC_QA_PLAYERS,
  SYNTHETIC_QA_TRAINING_SESSION,
  INITIAL_SYNTHETIC_ATTENDANCE,
  INITIAL_SYNTHETIC_GAMES,
  INITIAL_SYNTHETIC_GAME_PLAYERS
} from '../lib/qa/syntheticQaData.ts';

describe('DELTA-051T4 — INTERACTIVE QA PLAYGROUND & ALLOWLIST TESTS', () => {
  test('1. Synthetic QA Dataset conforms to schema and contains 16 synthetic players', () => {
    assert.equal(SYNTHETIC_QA_PLAYERS.length, 16, 'Must contain exactly 16 synthetic players');
    
    // Check no real names leaked in display_name
    for (const p of SYNTHETIC_QA_PLAYERS) {
      assert.ok(p.display_name.startsWith('Zawodnik QA'), `Player ${p.display_name} must be clearly synthetic`);
      assert.equal(p.active, true, 'Synthetic player must be active');
    }

    // Check synthetic training session
    assert.equal(SYNTHETIC_QA_TRAINING_SESSION.id, 'qa-session-simulated-001');
    assert.ok(SYNTHETIC_QA_TRAINING_SESSION.title.includes('QA Playground'));
  });

  test('2. Server-side allowlist guard blocks unauthorized users from dev-center', () => {
    const pageCode = fs.readFileSync('app/preview/dev-center/page.tsx', 'utf8');

    // Check allowlist logic
    assert.ok(pageCode.includes('QA_TESTER_ALLOWLIST'), 'Must check QA_TESTER_ALLOWLIST env variable');
    assert.ok(pageCode.includes('redirect("/dashboard?error=dev_center_unauthorized")'), 'Must redirect unauthorized users');
    assert.ok(pageCode.includes('isStaff'), 'Must permit staff');
  });

  test('3. InteractiveQaPlayground enforces zero database mutations and in-memory state', () => {
    const componentCode = fs.readFileSync('components/qa/InteractiveQaPlayground.tsx', 'utf8');

    // Ensure zero fetch calls to mutating endpoints
    assert.ok(!componentCode.includes('fetch("/api/training'), 'Playground must NOT call training API endpoints');
    assert.ok(!componentCode.includes('supabase.from('), 'Playground must NOT execute supabase DB queries');
    assert.ok(componentCode.includes('SYMULACJA QA — BRAK ZAPISU DO BAZY'), 'Must clearly label in-memory simulation');
  });

  test('4. Playground supports flexible team assignments (A, B, C, D) and score update', () => {
    const componentCode = fs.readFileSync('components/qa/InteractiveQaPlayground.tsx', 'utf8');

    // Ensure 4 teams A, B, C, D are present
    assert.ok(componentCode.includes('["A", "B", "C", "D"]'), 'Must support teams A, B, C, D');
    assert.ok(componentCode.includes('assignPlayerToTeam'), 'Must support player assignment');
    assert.ok(componentCode.includes('handleUpdateScore'), 'Must support score update');
    assert.ok(componentCode.includes('handleResetScenario'), 'Must support scenario reset');
  });

  test('5. Sub-tabs cover all required areas (Centrum Treningowe, Tworzenie drużyn, Gra kontrolna, Podsumowanie)', () => {
    const componentCode = fs.readFileSync('components/qa/InteractiveQaPlayground.tsx', 'utf8');

    assert.ok(componentCode.includes('Centrum Treningowe'), 'Must have Centrum Treningowe sub-tab');
    assert.ok(componentCode.includes('Tworzenie Drużyn'), 'Must have Tworzenie Drużyn sub-tab');
    assert.ok(componentCode.includes('Gra Kontrolna'), 'Must have Gra Kontrolna sub-tab');
    assert.ok(componentCode.includes('Podsumowanie & XP'), 'Must have Podsumowanie sub-tab');
  });
});
