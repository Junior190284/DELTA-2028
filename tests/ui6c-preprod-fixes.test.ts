import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ensureUserProfileExists,
  sanitizeSafeRedirectPath,
  type BootstrappedProfileRow
} from "../lib/auth/profile-bootstrap.ts";
import {
  resolveWalkoutPresentation,
  cardToWalkoutData,
  DEMO_GOLD_DATA
} from "../lib/cards/walkout-config.ts";
import { PackExperienceController } from "../lib/cards/packExperienceController.ts";
import {
  fromProductionCard,
  toUnifiedCardShowcase,
  toProductionCard
} from "../components/collection-3d/adapter.ts";
import { adaptLegacyToDeltaCardModel } from "../lib/cards/deltaCardModel.ts";
import { resolveSafePlayerImageUrl } from "../lib/cards/playerVisuals.ts";
import type { CardDefinition, PackOpeningResult } from "../lib/cards/types.ts";

function createMockProfilesAdminClient(initialRows: BootstrappedProfileRow[]) {
  const store = new Map<string, BootstrappedProfileRow>(
    initialRows.map((r) => [r.id, { ...r }])
  );
  let insertAttempts = 0;
  let updateAttempts = 0;
  let upsertAttempts = 0;
  let commitQueue = Promise.resolve();

  const adminClient: any = {
    from(table: string) {
      assert.equal(table, "profiles", "Only public.profiles may be queried by profile bootstrap");
      return {
        select() {
          return {
            eq(col: string, val: string) {
              assert.equal(col, "id");
              return {
                async maybeSingle() {
                  // Yield a microtask to allow real async interleaving under concurrency tests
                  await Promise.resolve();
                  const hit = store.get(val);
                  return { data: hit ? { ...hit } : null, error: null };
                }
              };
            }
          };
        },
        insert(row: BootstrappedProfileRow) {
          insertAttempts++;
          return {
            select() {
              return {
                async maybeSingle() {
                  let result: { data: BootstrappedProfileRow | null; error: any } = {
                    data: null,
                    error: null
                  };
                  commitQueue = commitQueue.then(async () => {
                    await Promise.resolve();
                    if (store.has(row.id)) {
                      result = {
                        data: null,
                        error: {
                          code: "23505",
                          message: 'duplicate key value violates unique constraint "profiles_pkey"'
                        }
                      };
                      return;
                    }
                    const saved: BootstrappedProfileRow = {
                      id: row.id,
                      role: row.role,
                      display_name: row.display_name
                    };
                    store.set(row.id, saved);
                    result = { data: { ...saved }, error: null };
                  });
                  await commitQueue;
                  return result;
                }
              };
            }
          };
        },
        update() {
          updateAttempts++;
          throw new Error("Bootstrap must never call profiles.update()");
        },
        upsert() {
          upsertAttempts++;
          throw new Error("Bootstrap must never call profiles.upsert()");
        }
      };
    }
  };

  return {
    adminClient,
    store,
    getStats: () => ({ insertAttempts, updateAttempts, upsertAttempts })
  };
}

function makeCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: "card_test_1",
    player_id: "player_other_1",
    season: "2026/27",
    card_type: "base",
    card_name: "Jan Kowalski — Base",
    title: "BASE",
    rarity: "common",
    artwork_url: null,
    artwork_pose: "standard",
    frame_theme: "gold",
    card_number: 11,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: "Opis",
    lore: null,
    match_id: null,
    special_event_id: null,
    player: {
      id: "player_other_1",
      display_name: "Jan Kowalski",
      shirt_number: "11",
      position: "POM",
      photo_path: null
    },
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// ETAP 1: GOOGLE OAUTH, SAFE REDIRECT, PROFILE_MISSING LOOP & BOOTSTRAP
// -----------------------------------------------------------------------------

test("UI.6C ETAP 1.1: sanitizeSafeRedirectPath blocks open redirects and preserves relative routes", () => {
  assert.equal(sanitizeSafeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("/dashboard?tab=collection#top"), "/dashboard?tab=collection#top");
  assert.equal(sanitizeSafeRedirectPath(null), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath(""), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("https://evil.example/steal"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("http://evil.example"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("//evil.example"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("///evil.example"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("/\\evil.example"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("javascript:alert(1)"), "/dashboard");
  assert.equal(sanitizeSafeRedirectPath("/dashboard\r\nSet-Cookie: bad=1"), "/dashboard");
});

test("UI.6C ETAP 1.2: New Google OAuth user without profile receives role='parent' regardless of metadata", async () => {
  const { adminClient, store, getStats } = createMockProfilesAdminClient([]);

  const res = await ensureUserProfileExists(adminClient, {
    id: "00000000-0000-4000-8000-000000000101",
    email: "nowy.rodzic@example.com",
    user_metadata: {
      full_name: "Nowy Rodzic",
      role: "admin" // Must be ignored completely
    }
  });

  assert.equal(res.error, null);
  assert.equal(res.created, true);
  assert.equal(res.profile?.role, "parent");
  assert.equal(res.profile?.display_name, "Nowy Rodzic");
  assert.equal(store.get("00000000-0000-4000-8000-000000000101")?.role, "parent");
  assert.deepEqual(getStats(), { insertAttempts: 1, updateAttempts: 0, upsertAttempts: 0 });
});

test("UI.6C ETAP 1.3: Existing parent, coach, and admin profiles/roles are never overwritten", async () => {
  const existingRows: BootstrappedProfileRow[] = [
    { id: "u-admin", role: "admin", display_name: "Trener Admin" },
    { id: "u-coach", role: "coach", display_name: "Asystent Coach" },
    { id: "u-parent", role: "parent", display_name: "Istniejacy Rodzic" }
  ];
  const { adminClient, store, getStats } = createMockProfilesAdminClient(existingRows);

  for (const row of existingRows) {
    const res = await ensureUserProfileExists(adminClient, {
      id: row.id,
      email: `${row.id}@delta.local`,
      user_metadata: { full_name: "Changed Name Attempt", role: "guest" }
    });
    assert.equal(res.error, null);
    assert.equal(res.created, false);
    assert.equal(res.profile?.role, row.role);
    assert.equal(res.profile?.display_name, row.display_name);
    assert.equal(store.get(row.id)?.role, row.role);
    assert.equal(store.get(row.id)?.display_name, row.display_name);
  }

  assert.deepEqual(getStats(), { insertAttempts: 0, updateAttempts: 0, upsertAttempts: 0 });
});

test("UI.6C ETAP 1.4: Simultaneous callbacks and repeated logins handle 23505 race idempotently", async () => {
  const { adminClient, store, getStats } = createMockProfilesAdminClient([]);
  const userPayload = {
    id: "00000000-0000-4000-8000-000000000202",
    email: "race@example.com",
    user_metadata: { name: "Konto Rownoczesne", role: "admin" }
  };

  // 5 concurrent callbacks/SSR requests before profile exists
  const concurrent = await Promise.all([
    ensureUserProfileExists(adminClient, userPayload),
    ensureUserProfileExists(adminClient, userPayload),
    ensureUserProfileExists(adminClient, userPayload),
    ensureUserProfileExists(adminClient, userPayload),
    ensureUserProfileExists(adminClient, userPayload)
  ]);

  assert.equal(concurrent.filter((r) => r.created).length, 1);
  for (const r of concurrent) {
    assert.equal(r.error, null);
    assert.equal(r.profile?.role, "parent");
    assert.equal(r.profile?.display_name, "Konto Rownoczesne");
  }

  // Subsequent reload / second login creates nothing new
  const reloadRes = await ensureUserProfileExists(adminClient, userPayload);
  assert.equal(reloadRes.created, false);
  assert.equal(reloadRes.profile?.role, "parent");
  assert.equal(store.size, 1);
  assert.equal(getStats().updateAttempts, 0);
  assert.equal(getStats().upsertAttempts, 0);
});

test("UI.6C ETAP 1.5: Auth callback, login loop break, and SQL migration invariants", () => {
  const callbackCode = fs.readFileSync(path.resolve(process.cwd(), "app/auth/callback/route.ts"), "utf8");
  assert.match(callbackCode, /sanitizeSafeRedirectPath/);
  assert.match(callbackCode, /ensureUserProfileExists/);

  const loginCode = fs.readFileSync(path.resolve(process.cwd(), "app/login/page.tsx"), "utf8");
  assert.match(loginCode, /if\s*\(error\)\s*\{[\s\S]*profile_missing[\s\S]*return;/);
  assert.match(loginCode, /Wyloguj/);

  const sql = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/20261111_ui6c_oauth_profile_bootstrap.sql"),
    "utf8"
  );
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(sql, /'parent'/);
  assert.match(sql, /ROLLBACK PLAN/);
});

// -----------------------------------------------------------------------------
// ETAP 2: WALKOUT PRIORITY NORMALIZATION
// -----------------------------------------------------------------------------

test("UI.6C ETAP 2: Walkout normalizes card_type, frame_theme, and rarity for Legendary, Epic, Inferno, Standard", () => {
  // 1. Legendary MVP (card_type='mvp', frame_theme='legend', rarity='legendary') -> DELTA_ICON (80)
  const legMvp = makeCard({ id: "c_leg", card_type: "mvp", frame_theme: "legend", rarity: "legendary" });
  assert.deepEqual(resolveWalkoutPresentation(legMvp), { theme: "DELTA_ICON", priority: 80 });

  // 2. Epic goal_hunter with frame_theme='gold' -> GOLD_MASTER (60)
  const epicGoalHunter = makeCard({ id: "c_epic", card_type: "goal_hunter", frame_theme: "gold", rarity: "epic" });
  assert.deepEqual(resolveWalkoutPresentation(epicGoalHunter), { theme: "GOLD_MASTER", priority: 60 });

  // 3. Inferno -> INFERNO (100)
  const infCard = makeCard({ id: "c_inf", card_type: "inferno", frame_theme: "inferno", rarity: "inferno" });
  assert.deepEqual(resolveWalkoutPresentation(infCard), { theme: "INFERNO", priority: 100 });

  // 4. Matchday starter (card_type='matchday', frame_theme='gold', rarity='rare') -> MATCHDAY_HERO (40)
  const matchdayStarter = makeCard({ id: "c_mtch", card_type: "matchday", frame_theme: "gold", rarity: "rare" });
  assert.deepEqual(resolveWalkoutPresentation(matchdayStarter), { theme: "MATCHDAY_HERO", priority: 40 });

  // 5. Standard starter (card_type='base', frame_theme='gold', rarity='common') -> no walkout (priority 0)
  const stdStarter = makeCard({ id: "c_std", card_type: "base", frame_theme: "gold", rarity: "common" });
  assert.equal(resolveWalkoutPresentation(stdStarter).priority, 0);

  // 6. Training starter (card_type='training_warrior', frame_theme='gold', rarity='rare') -> no walkout (priority 0)
  const trnStarter = makeCard({ id: "c_trn", card_type: "training_warrior", frame_theme: "gold", rarity: "rare" });
  assert.equal(resolveWalkoutPresentation(trnStarter).priority, 0);

  // PackExperienceController checks with enable_3d_walkout true & false:
  const makePackResult = (cards: CardDefinition[], enable3d: boolean): PackOpeningResult => ({
    cards: cards.map((card) => ({ card, is_duplicate: false, duplicate_points: 0 })),
    total_delta_points_earned: 0,
    new_points_balance: 100,
    pack_type_id: "test_pack",
    remaining_unopened_packs_count: 0,
    enable_3d_walkout: enable3d
  });

  // Epic goal_hunter + Standard triggers GOLD_MASTER walkout when flag=true
  const cEpic = new PackExperienceController({ result: makePackResult([stdStarter, epicGoalHunter], true) });
  assert.equal(cEpic.getState().hasWalkout, true);
  assert.equal(cEpic.getState().heroCard?.card.id, "c_epic");
  assert.equal(cEpic.getState().heroCard?.theme, "GOLD_MASTER");

  // Legendary MVP beats Epic goal_hunter -> DELTA_ICON heroCard + longer walkout duration
  const cLeg = new PackExperienceController({ result: makePackResult([epicGoalHunter, legMvp], true) });
  assert.equal(cLeg.getState().hasWalkout, true);
  assert.equal(cLeg.getState().heroCard?.card.id, "c_leg");
  assert.equal(cLeg.getState().heroCard?.theme, "DELTA_ICON");
  assert.equal(cLeg.getState().walkoutDurationMs, 4800);

  // Standard-only pack has no walkout
  const cStd = new PackExperienceController({ result: makePackResult([stdStarter, trnStarter], true) });
  assert.equal(cStd.getState().hasWalkout, false);
  assert.equal(cStd.getState().heroCard, null);

  // enable_3d_walkout = false suppresses walkout even for Inferno/Legendary/Epic
  const cDisabled = new PackExperienceController({ result: makePackResult([infCard, legMvp, epicGoalHunter], false) });
  assert.equal(cDisabled.getState().hasWalkout, false);
  assert.equal(cDisabled.getState().heroCard, null);
  assert.equal(cDisabled.getState().is3DWalkoutEnabled, false);
});

// -----------------------------------------------------------------------------
// ETAP 3: NO RYSZARD FALLBACK FOR OTHER PLAYERS & NEUTRAL SILHOUETTE
// -----------------------------------------------------------------------------

test("UI.6C ETAP 3: Players without photos never fall back to Ryszard assets across 3D/miniature/walkout", () => {
  const otherCardNoPhoto = makeCard({
    id: "c_piotr",
    card_type: "goal_hunter",
    frame_theme: "gold",
    rarity: "epic",
    artwork_url: null,
    player: {
      id: "player_piotr",
      display_name: "Piotr Zieliński",
      shirt_number: "10",
      position: "POM",
      photo_path: null
    }
  });

  // Even if poisoned with Ryszard URL, non-Ryszard player resolves null
  assert.equal(
    resolveSafePlayerImageUrl({
      playerName: "Piotr Zieliński",
      artworkUrl: "/assets/players/ryszard-gold.png",
      photoPath: "/assets/cards/inferno-3d/player-default.png"
    }),
    null
  );

  // Own dedicated photo is preserved
  assert.equal(
    resolveSafePlayerImageUrl({
      playerName: "Piotr Zieliński",
      photoPath: "/api/player-photo/player_piotr"
    }),
    "/api/player-photo/player_piotr"
  );

  const p3d = fromProductionCard(otherCardNoPhoto);
  assert.equal(p3d.imageUrl, null);
  assert.equal(toProductionCard(p3d).artwork_url, null);

  const showcase = toUnifiedCardShowcase(otherCardNoPhoto);
  assert.equal(showcase.card3D.imageUrl, null);
  assert.equal(showcase.deltaCard.playerImage, null);

  const legacyModel = adaptLegacyToDeltaCardModel({ card: otherCardNoPhoto });
  assert.equal(legacyModel.playerImage, null);

  const walkoutData = cardToWalkoutData(otherCardNoPhoto);
  assert.equal(walkoutData.playerImage, null);
  assert.equal(walkoutData.cardImage, null);
  assert.equal(DEMO_GOLD_DATA.playerImage, null);
  assert.equal(DEMO_GOLD_DATA.cardImage, null);

  // Ryszard's own card still renders his own photo cleanly
  const ryszardCard = makeCard({
    id: "c_ryszard",
    card_type: "inferno",
    frame_theme: "inferno",
    rarity: "inferno",
    artwork_url: "/assets/players/ryszard-inferno.png",
    player: {
      id: "player_ryszard",
      display_name: "Ryszard Rybacki",
      shirt_number: "7",
      position: "NAP",
      photo_path: "/assets/players/ryszard-rybacki.png"
    }
  });
  const rShowcase = toUnifiedCardShowcase(ryszardCard);
  assert.equal(rShowcase.card3D.imageUrl, "/assets/players/ryszard-inferno.png");
  assert.equal(rShowcase.deltaCard.playerImage, "/assets/players/ryszard-inferno.png");

  // Component source guard against regression of player-default.png / player-cutout.png / ryszard-rybacki.png fallbacks
  for (const relFile of [
    "components/collection-3d/Card3DEngine.tsx",
    "components/inferno-3d/InfernoCard3D.tsx",
    "components/InfernoWalkoutReveal.tsx",
    "components/PlayerVideoHighlightModal.tsx"
  ]) {
    const src = fs.readFileSync(path.resolve(process.cwd(), relFile), "utf8");
    assert.equal(src.includes("player-default.png"), false, `${relFile} must not reference player-default.png`);
    assert.equal(src.includes("player-cutout.png"), false, `${relFile} must not reference player-cutout.png`);
  }
  const adapterSrc = fs.readFileSync(path.resolve(process.cwd(), "components/collection-3d/adapter.ts"), "utf8");
  assert.equal(adapterSrc.includes("player-default.png"), false);
});
