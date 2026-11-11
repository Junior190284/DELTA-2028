import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  executeLivePackOpen,
  createOpenPackAttemptKey,
  reconcileUnopenedPacksAfterOpen,
  selectPackSessionToOpen,
  resolvePackDefinitionForUnopenedPack,
  LivePackOpenError
} from "../lib/cards/packOpeningAlbumBridge.ts";
import type {
  CardDefinition,
  PackDefinition,
  PackOpeningResult,
  UserUnopenedPack
} from "../lib/cards/types.ts";

function makeSyntheticCard(
  id: string,
  cardType: string,
  rarity: CardDefinition["rarity"],
  name: string
): CardDefinition {
  return {
    id,
    player_id: `synthetic_player_${id}`,
    season: "2026/27",
    card_type: cardType,
    card_name: name,
    title: cardType.toUpperCase(),
    rarity,
    artwork_url: null,
    artwork_pose: "standard",
    frame_theme: cardType,
    card_number: 99,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: "Syntetyczna karta testowa UI.4",
    lore: null,
    match_id: null,
    special_event_id: null,
    player: {
      id: `synthetic_player_${id}`,
      display_name: name,
      shirt_number: "10",
      position: "POM",
      photo_path: null
    }
  };
}

function makePackDef(id: string, name: string, cardsCount = 3): PackDefinition {
  return {
    id,
    name,
    description: "Test booster",
    cards_count: cardsCount,
    drop_rates: { common: 60, rare: 30, epic: 8, legendary: 1.8, inferno: 0.2 },
    min_rarity: "common",
    theme: id.includes("inferno") ? "inferno" : "standard",
    is_active: true
  };
}

function makeUnopenedPack(id: string, packTypeId: string): UserUnopenedPack {
  return {
    id,
    user_id: "synthetic_user_1",
    pack_type_id: packTypeId,
    source_reason: "test_fixture",
    is_opened: false,
    opened_at: null,
    created_at: "2026-11-11T10:00:00.000Z"
  };
}

test("UI.4.1 executeLivePackOpen sends server request with idempotency key and returns authoritative cards + duplicates + DP", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const expectedServerResponse: PackOpeningResult = {
    cards: [
      { card: makeSyntheticCard("s1", "inferno", "inferno", "TEST ZAWODNIK A"), is_duplicate: false, duplicate_points: 0 },
      { card: makeSyntheticCard("s2", "base", "common", "TEST ZAWODNIK B"), is_duplicate: true, duplicate_points: 4 },
      { card: makeSyntheticCard("s3", "matchday", "rare", "TEST ZAWODNIK C"), is_duplicate: true, duplicate_points: 10 }
    ],
    total_delta_points_earned: 14,
    new_points_balance: 514,
    pack_type_id: "inferno_booster",
    consumed_pack_id: "up_1",
    remaining_unopened_packs_count: 1,
    enable_3d_walkout: true
  };

  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(JSON.stringify(expectedServerResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  const attemptKey = createOpenPackAttemptKey();
  const result = await executeLivePackOpen({
    fetchImpl: mockFetch,
    packTypeId: "inferno_booster",
    userUnopenedPackId: "up_1",
    idempotencyKey: attemptKey
  });

  assert.equal(capturedUrl, "/api/cards/open-pack");
  assert.equal(capturedInit?.method, "POST");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers["Idempotency-Key"], attemptKey);
  const parsedBody = JSON.parse(String(capturedInit?.body));
  assert.equal(parsedBody.pack_type_id, "inferno_booster");
  assert.equal(parsedBody.user_unopened_pack_id, "up_1");
  assert.equal(parsedBody.idempotency_key, attemptKey);

  // Authoritative server data preserved verbatim without UI re-rolling
  assert.equal(result.cards.length, 3);
  assert.deepEqual(
    result.cards.map((c) => c.card.id),
    ["s1", "s2", "s3"]
  );
  assert.equal(result.cards[1].is_duplicate, true);
  assert.equal(result.cards[1].duplicate_points, 4);
  assert.equal(result.total_delta_points_earned, 14);
  assert.equal(result.new_points_balance, 514);
  assert.equal(result.consumed_pack_id, "up_1");
  assert.equal(result.remaining_unopened_packs_count, 1);
});

test("UI.4.2 executeLivePackOpen distinguishes 409 ALREADY_OPENED and API errors cleanly", async () => {
  const conflictFetch = (async () => {
    return new Response(JSON.stringify({ error: "Paczka została już otwarta", code: "ALREADY_OPENED" }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      executeLivePackOpen({
        fetchImpl: conflictFetch,
        packTypeId: "standard_pack",
        idempotencyKey: "k-409"
      }),
    (err: unknown) => {
      assert.ok(err instanceof LivePackOpenError);
      assert.equal(err.code, "ALREADY_OPENED");
      assert.equal(err.status, 409);
      return true;
    }
  );

  const serverErrorFetch = (async () => {
    return new Response(JSON.stringify({ error: "Błąd bazy danych", code: "RPC_FAIL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      executeLivePackOpen({
        fetchImpl: serverErrorFetch,
        packTypeId: "standard_pack",
        idempotencyKey: "k-500"
      }),
    (err: unknown) => {
      assert.ok(err instanceof LivePackOpenError);
      assert.equal(err.code, "RPC_FAIL");
      assert.equal(err.status, 500);
      return true;
    }
  );
});

test("UI.4.3 reconcileUnopenedPacksAfterOpen prevents double-decrement and keeps untouched packs", () => {
  const initialPacks = [
    makeUnopenedPack("up_1", "standard_pack"),
    makeUnopenedPack("up_2", "inferno_booster")
  ];

  // First reconciliation removes up_1
  const afterFirst = reconcileUnopenedPacksAfterOpen(initialPacks, {
    consumed_pack_id: "up_1",
    remaining_unopened_packs_count: 1
  });
  assert.deepEqual(
    afterFirst.map((p) => p.id),
    ["up_2"]
  );

  // Idempotent second invocation for the same consumed_pack_id must NOT remove up_2
  const afterDuplicateEvent = reconcileUnopenedPacksAfterOpen(afterFirst, {
    consumed_pack_id: "up_1",
    remaining_unopened_packs_count: 1
  });
  assert.deepEqual(
    afterDuplicateEvent.map((p) => p.id),
    ["up_2"]
  );

  // Opening final pack leaves empty array
  const afterLast = reconcileUnopenedPacksAfterOpen(afterDuplicateEvent, {
    consumed_pack_id: "up_2",
    remaining_unopened_packs_count: 0
  });
  assert.equal(afterLast.length, 0);
});

test("UI.4.4 selectPackSessionToOpen handles 0 available packs, strict booster click, and onOpenAnother next pack", () => {
  const defs = [
    makePackDef("standard_pack", "Paczka Standardowa", 3),
    makePackDef("inferno_booster", "Inferno Booster", 5)
  ];

  // 0 packs available -> returns null
  assert.equal(
    selectPackSessionToOpen({
      unopenedPacks: [],
      packDefinitions: defs
    }),
    null
  );

  const packs = [
    makeUnopenedPack("up_a", "standard_pack"),
    makeUnopenedPack("up_b", "inferno_booster")
  ];

  // Strict click on empty booster (allowFallbackToAny: false) -> null
  assert.equal(
    selectPackSessionToOpen({
      unopenedPacks: [packs[0]],
      packDefinitions: defs,
      preferredPackTypeId: "inferno_booster",
      allowFallbackToAny: false
    }),
    null
  );

  // onOpenAnother with fallback picks next remaining pack cleanly
  const next = selectPackSessionToOpen({
    unopenedPacks: [packs[1]],
    packDefinitions: defs,
    preferredPackTypeId: "standard_pack",
    allowFallbackToAny: true
  });
  assert.ok(next);
  assert.equal(next.targetUnopenedPack.id, "up_b");
  assert.equal(next.pack.id, "inferno_booster");

  // Unknown pack def falls back safely via resolvePackDefinitionForUnopenedPack
  const resolved = resolvePackDefinitionForUnopenedPack(makeUnopenedPack("up_x", "gold_booster"), []);
  assert.ok(resolved);
  assert.equal(resolved.id, "gold_booster");
  assert.equal(resolved.theme, "gold");
});

test("UI.4.5 DeltaCollectionAlbum integrates CinematicPackExperience with race, DP, sessionKey, and 0-pack protections", () => {
  const albumPath = path.resolve(process.cwd(), "components/DeltaCollectionAlbum.tsx");
  const code = fs.readFileSync(albumPath, "utf8");

  // V2 replaces V1 inside DeltaCollectionAlbum
  assert.match(code, /import CinematicPackExperience from "\.\/pack-opening-v2\/CinematicPackExperience"/);
  assert.doesNotMatch(code, /import PackOpeningExperience from "\.\/PackOpeningExperience"/);
  assert.doesNotMatch(code, /<PackOpeningExperience\b/);

  // Renders CinematicPackExperience with sessionKey, userUnopenedPackId, and accurate unopenedCount
  assert.match(code, /<CinematicPackExperience[\s\S]*sessionKey=\{activePackSession\.sessionKey\}/);
  assert.match(code, /userUnopenedPackId=\{activePackSession\.userUnopenedPackId\}/);
  assert.match(code, /activePackSession\.hasConsumedCurrentPack/);

  // DP balance & unopenedPacks sync immediately on server open confirmation + onClose refreshes silently
  assert.match(code, /onPackConsumed=\{\(result\) =>/);
  assert.match(code, /setDeltaPoints\(result\.new_points_balance\)/);
  assert.match(code, /reconcileUnopenedPacksAfterOpen\(prev, result\)/);
  assert.match(code, /onClose=\{\(\) => \{\s*setActivePackSession\(null\);\s*void fetchCollection\(true\);/s);

  // Guards stale collection responses & burst sync events
  assert.match(code, /collectionFetchGuardRef\s*=\s*useRef\(new FetchSequenceGuard\(\)\)/);
  assert.match(code, /createDebouncedRevalidator\(\(\) => fetchCollection\(true\), 120\)/);

  // Panini & album open check unopenedPacks before opening
  assert.match(code, /if \(unopenedPacks\.length > 0\)\s*\{\s*launchPackFromUnopened\(\);/s);
});

test("UI.4.6 CinematicPackExperience enforces single-flight lock, stale result reset, 409 handling, and read-only SUMMARY 3D preview", () => {
  const modalPath = path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx");
  const code = fs.readFileSync(modalPath, "utf8");

  // Single-flight open lock, request generation cancellation, AbortController & idempotency key
  assert.match(code, /isOpeningInFlightRef\.current/);
  assert.match(code, /openRequestGenRef\.current/);
  assert.match(code, /abortControllerRef\.current/);
  assert.match(code, /attemptIdempotencyKeyRef\.current/);
  assert.match(code, /data-testid="cinematic-open-btn"[\s\S]*?disabled=\{isRequestingOpen\}/s);

  // Resets previous result on sessionKey / pack.id / userUnopenedPackId change so old result cannot be reused
  assert.match(code, /setServerResult\(null\);\s*setIsRequestingOpen\(false\);\s*setOpenError\(null\);\s*setInspectedSummaryCard\(null\);\s*\}, \[sessionKey, pack\.id, userUnopenedPackId\]\)/s);

  // Immediate server notification before animation + 409 ALREADY_OPENED reconciliation
  assert.match(code, /onPackConsumed\?\.\(data\)/);
  assert.match(code, /dispatchPackOpened\(/);
  assert.match(code, /dispatchCollectionUpdated\("pack_opening_success"\)/);
  assert.match(code, /dispatchCollectionUpdated\("already_opened_reconciliation"\)/);
  assert.match(code, /data-testid="cinematic-open-error"/);

  // SUMMARY card click opens 3D interactive preview without economy API calls & Escape closes preview first
  assert.match(code, /data-testid=\{`summary-card-\$\{idx\}`\}/);
  assert.match(code, /data-testid="summary-card-preview-modal"/);
  assert.match(code, /data-testid="summary-preview-close-btn"/);
  assert.match(code, /if \(inspectedSummaryCard\) \{\s*setInspectedSummaryCard\(null\);\s*return;\s*\}/s);
});
