import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  resolveMissionAction,
  MISSION_ACTION_REGISTRY
} from '../lib/missions/missionActionRegistry.ts';

describe('DELTA-050 — SMART MISSION CENTER 2.0 & MOBILE RECOVERY TESTS', () => {

  it('1. Mission Action Registry resolves all canonical daily and weekly missions correctly', () => {
    // Daily Spin
    const spinAction = resolveMissionAction('daily_spin_2026-11-26');
    assert.strictEqual(spinAction.type, 'DAILY_SPIN');
    assert.strictEqual(spinAction.ctaLabel, 'ZAKRĘĆ KOŁEM');

    // Daily Minigame
    const minigameAction = resolveMissionAction('daily_minigame_2026-11-26');
    assert.strictEqual(minigameAction.type, 'LAUNCH_MINIGAME');
    assert.strictEqual(minigameAction.minigameMode, 'free_kicks');
    assert.strictEqual(minigameAction.ctaLabel, 'TRENUJ W MINIGRZE');

    // Weekly Score
    const scoreAction = resolveMissionAction('weekly_score_2026-11-23');
    assert.strictEqual(scoreAction.type, 'LAUNCH_MINIGAME');
    assert.strictEqual(scoreAction.ctaLabel, 'ZDOBYWAJ PUNKTY (500)');

    // Fallback D1, D2, D3, W1, W2, W3
    assert.strictEqual(resolveMissionAction('d1').type, 'DAILY_SPIN');
    assert.strictEqual(resolveMissionAction('d2').type, 'OPEN_MODAL');
    assert.strictEqual(resolveMissionAction('d3').type, 'LAUNCH_MINIGAME');
    assert.strictEqual(resolveMissionAction('w1').type, 'NAVIGATE_TAB');
    assert.strictEqual(resolveMissionAction('w1').targetTab, 'training');
    assert.strictEqual(resolveMissionAction('w2').type, 'OPEN_MODAL');
    assert.strictEqual(resolveMissionAction('w2').modalAction, 'knowledge');
    assert.strictEqual(resolveMissionAction('w3').type, 'NAVIGATE_TAB');
    assert.strictEqual(resolveMissionAction('w3').targetTab, 'collection');
  });

  it('2. Unknown or future mission IDs safely fallback without crashing or invalid routes', () => {
    const unknownAction = resolveMissionAction('future_mission_xyz');
    assert.strictEqual(unknownAction.type, 'NAVIGATE_TAB');
    assert.strictEqual(unknownAction.targetTab, 'home');
    assert.ok(unknownAction.ctaLabel.length > 0);
  });

  it('3. DeltaDailyMissionsModal exports onExecuteAction prop and renders CTA buttons for incomplete missions', () => {
    const modalPath = path.resolve(process.cwd(), 'components/DeltaDailyMissionsModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.ok(content.includes('onExecuteAction'), 'Props must include onExecuteAction');
    assert.ok(content.includes('resolveMissionAction'), 'Must resolve target action via registry');
    assert.ok(content.includes('actionTarget.ctaLabel'), 'Must display CTA button label');
  });

  it('4. TeamHub passes onExecuteAction and handles all registry target types', () => {
    const hubPath = path.resolve(process.cwd(), 'components/TeamHub.tsx');
    const content = fs.readFileSync(hubPath, 'utf8');

    assert.ok(content.includes('onExecuteAction'), 'TeamHub must wire onExecuteAction');
    assert.ok(content.includes('target.type === "NAVIGATE_TAB"'), 'Must handle tab navigation');
    assert.ok(content.includes('target.type === "OPEN_MODAL"'), 'Must handle modal open');
    assert.ok(content.includes('target.type === "LAUNCH_MINIGAME"'), 'Must launch minigames');
    assert.ok(content.includes('target.type === "DAILY_SPIN"'), 'Must open daily spin');
    assert.ok(content.includes('dailySpinModalOpen'), 'Must manage dailySpinModalOpen state');
    assert.ok(content.includes('<DailyInfernoSpin'), 'Must render DailyInfernoSpin component');
  });

  it('5. DeltaTyperModal supports Fantasy League tab and clean state presentation', () => {
    const typerPath = path.resolve(process.cwd(), 'components/DeltaTyperModal.tsx');
    const content = fs.readFileSync(typerPath, 'utf8');

    assert.ok(content.includes('"fantasy"'), 'Typer modal must include fantasy tab');
    assert.ok(content.includes('DELTA FANTASY LEAGUE'), 'Must render Fantasy League header');
    assert.ok(content.includes('START ROZGRYWEK WRAZ Z RUNDĄ WIOSENNĄ'), 'Must render clean schedule explanation instead of 404');
    assert.ok(!content.includes('404'), 'Must not display 404 error');
  });

  it('6. Road to Glory mobile modal and tabs are properly protected and styled', () => {
    const rtgPath = path.resolve(process.cwd(), 'components/player/PlayerExperience3D.tsx');
    const content = fs.readFileSync(rtgPath, 'utf8');

    assert.ok(content.includes('CareerTimeline'), 'Must include CareerTimeline component');
    assert.ok(content.includes('MOJA KARIERA'), 'Must include Moja Kariera section');
    assert.ok(content.includes('lockBodyScroll'), 'Must use lockBodyScroll for mobile modal');
  });
});
