import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PackOpeningError,
  openPackServerSide,
  openPackWithIdempotency,
  type IdempotencyEntry
} from "../lib/cards/engine.ts";
import type { CardRarity } from "../lib/cards/types.ts";

const DUPLICATE_POINTS_BY_RARITY: Record<CardRarity, number> = {
  common: 4,
  rare: 10,
  epic: 25,
  legendary: 60,
  inferno: 120
};

interface MockCardDef {
  id: string;
  player_id: string;
  season: string;
  card_type: string;
  card_name: string;
  title: string;
  rarity: CardRarity;
  artwork_url: string | null;
  artwork_pose: string;
  frame_theme: string;
  description: string;
  lore: string;
  is_active: boolean;
  player?: {
    id: string;
    display_name: string;
    shirt_number: number | null;
    position: string | null;
    photo_path: string | null;
  };
  match?: null;
}

interface MockPackRow {
  id: string;
  user_id: string;
  pack_type_id: string;
  is_opened: boolean;
  opened_at?: string | null;
  created_at: string;
}

interface MockUserCard {
  id: string;
  user_id: string;
  card_id: string;
  duplicates_count: number;
  obtained_at: string;
}

interface MockLogRow {
  id: string;
  user_id: string;
  pack_type_id: string;
  unopened_pack_id: string;
  idempotency_key: string | null;
  drawn_card_ids: string[];
  cards_meta: Array<{ card_id: string; is_duplicate: boolean; duplicate_points: number }>;
  delta_points_awarded: number;
  response_payload: any;
}

type RpcMode =
  | "atomic"
  | "missing_pgrst202"
  | "missing_42883"
  | "permission_denied_42501"
  | "db_error"
  | "invalid_payload"
  | "reject_already_opened";

interface DirectMutationEvent {
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  payload: unknown;
}

function createAtomicSupabaseMock(initial?: {
  cards?: MockCardDef[];
  packs?: MockPackRow[];
  userCards?: MockUserCard[];
  pointsByUser?: Record<string, { points_balance: number; total_earned: number }>;
  logs?: MockLogRow[];
  players?: Array<{ id: string; display_name: string; active: boolean }>;
  packDefs?: Record<
    string,
    { id: string; cards_count: number; drop_rates: Record<CardRarity, number>; min_rarity: CardRarity }
  >;
  rpcMode?: RpcMode;
  rpcDelayMs?: number;
  omitRpcMethod?: boolean;
}) {
  const defaultCards: MockCardDef[] = initial?.cards ?? [
    {
      id: "11111111-1111-4111-8111-111111111111",
      player_id: "p1",
      season: "2026/27",
      card_type: "base",
      card_name: "Ryszard Rybacki — Base",
      title: "Base",
      rarity: "common",
      artwork_url: "/assets/players/ryszard-gold.png",
      artwork_pose: "arms_crossed",
      frame_theme: "gold",
      description: "Base card",
      lore: "DELTA",
      is_active: true,
      player: {
        id: "p1",
        display_name: "Ryszard Rybacki",
        shirt_number: 9,
        position: "Napastnik",
        photo_path: "/assets/players/ryszard-rybacki.png"
      },
      match: null
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      player_id: "p2",
      season: "2026/27",
      card_type: "matchday",
      card_name: "Mateusz Nowak — Matchday",
      title: "Matchday",
      rarity: "rare",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "gold",
      description: "Matchday card",
      lore: "DELTA",
      is_active: true,
      player: {
        id: "p2",
        display_name: "Mateusz Nowak",
        shirt_number: 10,
        position: "Pomocnik",
        photo_path: null
      },
      match: null
    }
  ];

  const defaultPackDefs = initial?.packDefs ?? {
    standard_pack: {
      id: "standard_pack",
      cards_count: 3,
      drop_rates: { common: 70, rare: 22, epic: 6, legendary: 1.8, inferno: 0.2 },
      min_rarity: "common" as CardRarity
    },
    gold_booster: {
      id: "gold_booster",
      cards_count: 5,
      drop_rates: { common: 35, rare: 45, epic: 15, legendary: 4.5, inferno: 0.5 },
      min_rarity: "rare" as CardRarity
    }
  };

  const state = {
    cards: structuredClone(defaultCards),
    packs: structuredClone(initial?.packs ?? []),
    userCards: structuredClone(initial?.userCards ?? []),
    pointsByUser: structuredClone(initial?.pointsByUser ?? {}),
    logs: structuredClone(initial?.logs ?? []),
    players: structuredClone(initial?.players ?? []),
    packDefs: structuredClone(defaultPackDefs),
    rpcMode: (initial?.rpcMode ?? "atomic") as RpcMode,
    rpcDelayMs: initial?.rpcDelayMs ?? 0,
    rpcCalls: 0,
    lastRpcArgs: null as Record<string, any> | null,
    directTableMutations: [] as DirectMutationEvent[]
  };

  // Symulacja pg_advisory_xact_lock per user_id w PostgreSQL
  const userMutexes = new Map<string, Promise<void>>();
  async function withUserAdvisoryLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = userMutexes.get(userId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => {
      release = resolve;
    });
    userMutexes.set(userId, prev.then(() => next));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  function applyFilters(rows: any[], filters: Array<{ op: "eq" | "in"; col: string; val: any }>) {
    return rows.filter(row =>
      filters.every(f => {
        if (f.op === "eq") return row[f.col] === f.val;
        if (f.op === "in") return Array.isArray(f.val) && f.val.includes(row[f.col]);
        return true;
      })
    );
  }

  const client: any = {
    from(table: string) {
      const filters: Array<{ op: "eq" | "in"; col: string; val: any }> = [];
      let orderBy: { col: string; ascending: boolean } | null = null;
      let limitVal: number | null = null;

      const getTableRows = () => {
        switch (table) {
          case "pack_opening_logs":
            return state.logs;
          case "user_unopened_packs":
            return state.packs;
          case "pack_definitions":
            return Object.values(state.packDefs);
          case "card_definitions":
            return state.cards;
          case "players":
            return state.players;
          default:
            return [];
        }
      };

      const executeSelect = async () => {
        if (table === "user_unopened_packs") {
          const idFilter = filters.find(f => f.op === "eq" && f.col === "id");
          if (idFilter && typeof idFilter.val === "string" && idFilter.val.startsWith("starter_pack")) {
            // Symulacja PostgreSQL SQLSTATE 22P02 dla nie-UUID przekazanego do UUID column
            return {
              data: null,
              error: {
                code: "22P02",
                message: `invalid input syntax for type uuid: "${idFilter.val}"`
              }
            };
          }
        }

        let rows = applyFilters([...getTableRows()], filters);
        if (orderBy) {
          const { col, ascending } = orderBy;
          rows.sort((a, b) => {
            if (a[col] === b[col]) return 0;
            return ascending ? (a[col] > b[col] ? 1 : -1) : a[col] < b[col] ? 1 : -1;
          });
        }
        if (typeof limitVal === "number") {
          rows = rows.slice(0, limitVal);
        }
        return { data: structuredClone(rows), error: null };
      };

      const builder: any = {
        select() {
          return builder;
        },
        eq(col: string, val: any) {
          filters.push({ op: "eq", col, val });
          return builder;
        },
        in(col: string, val: any[]) {
          filters.push({ op: "in", col, val });
          return builder;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderBy = { col, ascending: opts?.ascending !== false };
          return builder;
        },
        limit(count: number) {
          limitVal = count;
          return builder;
        },
        async maybeSingle() {
          const res = await executeSelect();
          if (res.error) return { data: null, error: res.error };
          return { data: res.data[0] ?? null, error: null };
        },
        async single() {
          const res = await executeSelect();
          if (res.error) return { data: null, error: res.error };
          if (!res.data[0]) return { data: null, error: { code: "PGRST116", message: "No rows found" } };
          return { data: res.data[0], error: null };
        },
        then(resolve: any, reject: any) {
          return executeSelect().then(resolve, reject);
        },
        insert(payload: unknown) {
          state.directTableMutations.push({ table, op: "insert", payload });
          throw new Error(`FORBIDDEN NON-ATOMIC INSERT ON ${table}`);
        },
        update(payload: unknown) {
          state.directTableMutations.push({ table, op: "update", payload });
          throw new Error(`FORBIDDEN NON-ATOMIC UPDATE ON ${table}`);
        },
        upsert(payload: unknown) {
          state.directTableMutations.push({ table, op: "upsert", payload });
          throw new Error(`FORBIDDEN NON-ATOMIC UPSERT ON ${table}`);
        },
        delete() {
          state.directTableMutations.push({ table, op: "delete", payload: filters });
          throw new Error(`FORBIDDEN NON-ATOMIC DELETE ON ${table}`);
        }
      };

      return builder;
    }
  };

  if (!initial?.omitRpcMethod) {
    client.rpc = async (fnName: string, args: Record<string, any>) => {
      assert.equal(fnName, "open_pack_atomic");
      state.rpcCalls += 1;
      state.lastRpcArgs = args;

      if (state.rpcDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, state.rpcDelayMs));
      }

      if (state.rpcMode === "missing_pgrst202") {
        return {
          data: null,
          error: {
            code: "PGRST202",
            message: "Could not find the function public.open_pack_atomic(p_drawn_card_ids, p_idempotency_key, p_pack_id, p_pack_type_id, p_user_id) in the schema cache"
          }
        };
      }
      if (state.rpcMode === "missing_42883") {
        return {
          data: null,
          error: {
            code: "42883",
            message: "function public.open_pack_atomic(uuid, uuid, text, text[], text) does not exist"
          }
        };
      }
      if (state.rpcMode === "permission_denied_42501") {
        return {
          data: null,
          error: {
            code: "42501",
            message: "permission denied for function open_pack_atomic"
          }
        };
      }
      if (state.rpcMode === "db_error") {
        return {
          data: null,
          error: {
            code: "XX000",
            message: "simulated internal PostgreSQL error"
          }
        };
      }
      if (state.rpcMode === "invalid_payload") {
        return { data: null, error: null };
      }
      if (state.rpcMode === "reject_already_opened") {
        return {
          data: {
            success: false,
            code: "ALREADY_OPENED",
            status: 409,
            error: "ALREADY_OPENED: Paczka została już otwarta."
          },
          error: null
        };
      }

      const userId: string = args.p_user_id;
      const packId: string | null = args.p_pack_id ?? null;
      const packTypeId: string = args.p_pack_type_id ?? "standard_pack";
      const drawnCardIds: string[] = Array.isArray(args.p_drawn_card_ids) ? args.p_drawn_card_ids : [];
      const idemKey: string | null = args.p_idempotency_key ?? null;

      return withUserAdvisoryLock(userId, async () => {
        if (!userId) {
          return { data: { success: false, code: "UNAUTHORIZED", status: 401, error: "Brak user_id" }, error: null };
        }

        if (idemKey) {
          const existingLog = state.logs.find(
            l => l.user_id === userId && l.idempotency_key === idemKey
          );
          if (existingLog) {
            return {
              data: {
                success: true,
                already_processed: true,
                response_payload: existingLog.response_payload
              },
              error: null
            };
          }
        }

        if (!drawnCardIds.length) {
          return {
            data: { success: false, code: "NO_AVAILABLE_CARDS", status: 400, error: "Brak kart" },
            error: null
          };
        }

        let targetPack: MockPackRow | undefined;
        if (packId) {
          targetPack = state.packs.find(p => p.id === packId && p.user_id === userId);
          if (!targetPack) {
            return {
              data: { success: false, code: "PACK_NOT_FOUND", status: 404, error: "Nie znaleziono paczki" },
              error: null
            };
          }
          if (targetPack.is_opened) {
            return {
              data: { success: false, code: "ALREADY_OPENED", status: 409, error: "ALREADY_OPENED" },
              error: null
            };
          }
          if (packTypeId && targetPack.pack_type_id !== packTypeId) {
            return {
              data: { success: false, code: "PACK_TYPE_MISMATCH", status: 400, error: "Niezgodny typ" },
              error: null
            };
          }
        } else {
          targetPack = state.packs
            .filter(p => p.user_id === userId && p.pack_type_id === packTypeId && !p.is_opened)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
          if (!targetPack) {
            return {
              data: { success: false, code: "NO_UNOPENED_PACK", status: 400, error: "Brak dostępnej paczki" },
              error: null
            };
          }
        }

        // Konsumpcja paczki
        targetPack.is_opened = true;
        targetPack.opened_at = new Date().toISOString();

        // Rozliczenie kart i duplikatów dokładnie jak w SQL open_pack_atomic
        const cardsMeta: Array<{ card_id: string; is_duplicate: boolean; duplicate_points: number }> = [];
        let totalDpEarned = 0;

        for (const cardId of drawnCardIds) {
          const cardDef = state.cards.find(c => c.id === cardId && c.is_active);
          if (!cardDef) {
            return {
              data: { success: false, code: "INVALID_CARD_ID", status: 400, error: "Nieaktywna karta" },
              error: null
            };
          }

          const existingUserCard = state.userCards.find(
            uc => uc.user_id === userId && uc.card_id === cardId
          );

          if (existingUserCard) {
            existingUserCard.duplicates_count += 1;
            const dp = DUPLICATE_POINTS_BY_RARITY[cardDef.rarity] ?? 4;
            totalDpEarned += dp;
            cardsMeta.push({ card_id: cardId, is_duplicate: true, duplicate_points: dp });
          } else {
            state.userCards.push({
              id: `uc-${state.userCards.length + 1}`,
              user_id: userId,
              card_id: cardId,
              duplicates_count: 0,
              obtained_at: new Date().toISOString()
            });
            cardsMeta.push({ card_id: cardId, is_duplicate: false, duplicate_points: 0 });
          }
        }

        const currentDp = state.pointsByUser[userId] ?? { points_balance: 0, total_earned: 0 };
        currentDp.points_balance += totalDpEarned;
        currentDp.total_earned += totalDpEarned;
        state.pointsByUser[userId] = currentDp;

        const remainingCount = state.packs.filter(p => p.user_id === userId && !p.is_opened).length;
        const payload = {
          cards_meta: cardsMeta,
          total_delta_points_earned: totalDpEarned,
          new_points_balance: currentDp.points_balance,
          pack_type_id: targetPack.pack_type_id,
          consumed_pack_id: targetPack.id,
          remaining_unopened_packs_count: remainingCount
        };

        state.logs.push({
          id: `log-${state.logs.length + 1}`,
          user_id: userId,
          pack_type_id: targetPack.pack_type_id,
          unopened_pack_id: targetPack.id,
          idempotency_key: idemKey,
          drawn_card_ids: drawnCardIds,
          cards_meta: cardsMeta,
          delta_points_awarded: totalDpEarned,
          response_payload: payload
        });

        return {
          data: {
            success: true,
            already_processed: false,
            response_payload: payload
          },
          error: null
        };
      });
    };
  }

  return { client, state };
}

// ============================================================================
// TESTY INTEGRACJI OPEN_PACK_ATOMIC + BEZPIECZEŃSTWA (ETAP ANIM-1A.4)
// ============================================================================

test("1. Odrzuca nieuwierzytelnione wywołanie (UNAUTHORIZED 401) bez zapytań do RPC", async () => {
  const { client, state } = createAtomicSupabaseMock();

  await assert.rejects(
    () => openPackServerSide(client, "", undefined, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "UNAUTHORIZED" && err.statusCode === 401
  );

  assert.equal(state.rpcCalls, 0);
  assert.equal(state.directTableMutations.length, 0);
});

test("2. Prawidłowe otwarcie posiadanej paczki przez RPC open_pack_atomic zużywa paczkę i zapisuje karty", async () => {
  const userId = "user-valid-1";
  const packId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const { client, state } = createAtomicSupabaseMock({
    packs: [
      {
        id: packId,
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        user_id: userId,
        pack_type_id: "gold_booster",
        is_opened: false,
        created_at: "2026-11-11T00:01:00.000Z"
      }
    ]
  });

  const result = await openPackWithIdempotency({
    supabase: client,
    userId,
    userUnopenedPackId: packId,
    packTypeId: "standard_pack",
    idempotencyKey: "req-valid-001",
    store: new Map<string, IdempotencyEntry>()
  });

  assert.equal(result.cards.length, 3);
  assert.equal(result.pack_type_id, "standard_pack");
  assert.equal(result.consumed_pack_id, packId);
  assert.equal(result.remaining_unopened_packs_count, 1);
  assert.equal(state.rpcCalls, 1);
  assert.equal(state.lastRpcArgs?.p_user_id, userId);
  assert.equal(state.lastRpcArgs?.p_pack_id, packId);
  assert.equal(state.lastRpcArgs?.p_idempotency_key, "req-valid-001");
  assert.equal(state.packs.find(p => p.id === packId)?.is_opened, true);
  assert.equal(state.packs.find(p => p.id === "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")?.is_opened, false);
  assert.equal(state.directTableMutations.length, 0, "Engine nie może mutować tabel poza RPC");
});

test("3. Dwie lub więcej identycznych kart w jednej paczce oraz wcześniejsze duplikaty poprawnie aktualizują duplicates_count i DP", async () => {
  const userId = "user-dups-1";
  const packId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const singleEpicCard: MockCardDef = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    player_id: "p1",
    season: "2026/27",
    card_type: "goal_hunter",
    card_name: "Ryszard Rybacki — Łowca Goli",
    title: "Łowca Goli",
    rarity: "epic", // duplikat = +25 DP
    artwork_url: "/assets/players/ryszard-legend.png",
    artwork_pose: "action_dribble",
    frame_theme: "legend",
    description: "Epic",
    lore: "DELTA",
    is_active: true
  };

  // Tylko 1 aktywna karta epic -> wszystkie 3 sloty w standard_pack wylosują tę samą kartę
  const { client, state } = createAtomicSupabaseMock({
    cards: [singleEpicCard],
    packs: [
      {
        id: packId,
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      }
    ],
    pointsByUser: {
      [userId]: { points_balance: 100, total_earned: 100 }
    }
  });

  const result = await openPackServerSide(client, userId, packId, "standard_pack");

  assert.equal(result.cards.length, 3);
  assert.equal(result.cards[0].is_duplicate, false);
  assert.equal(result.cards[0].duplicate_points, 0);
  assert.equal(result.cards[1].is_duplicate, true);
  assert.equal(result.cards[1].duplicate_points, 25);
  assert.equal(result.cards[2].is_duplicate, true);
  assert.equal(result.cards[2].duplicate_points, 25);
  assert.equal(result.total_delta_points_earned, 50);
  assert.equal(result.new_points_balance, 150);

  assert.equal(state.userCards.length, 1, "Powinien powstać wyłącznie jeden rekord user_cards");
  assert.equal(state.userCards[0].duplicates_count, 2);
  assert.equal(state.pointsByUser[userId].points_balance, 150);
  assert.equal(state.directTableMutations.length, 0);
});

test("4. Brak paczki w DB, obca paczka, otwarta paczka oraz fałszywy starter_pack_1 są blokowane bez przyznania kart lub DP", async () => {
  const userId = "user-nopack-1";
  const foreignPackId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const openedPackId = "99999999-9999-4999-8999-999999999999";

  const { client, state } = createAtomicSupabaseMock({
    packs: [
      {
        id: foreignPackId,
        user_id: "other-user",
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      },
      {
        id: openedPackId,
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: true,
        opened_at: "2026-11-10T12:00:00.000Z",
        created_at: "2026-11-10T00:00:00.000Z"
      }
    ]
  });

  // 0 dostępnych nieotwartych paczek
  await assert.rejects(
    () => openPackServerSide(client, userId, undefined, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "NO_UNOPENED_PACK" && err.statusCode === 400
  );

  // Obca paczka
  await assert.rejects(
    () => openPackServerSide(client, userId, foreignPackId, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "PACK_NOT_FOUND" && err.statusCode === 404
  );

  // Już otwarta paczka
  await assert.rejects(
    () => openPackServerSide(client, userId, openedPackId, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "ALREADY_OPENED" && err.statusCode === 409
  );

  // Wirtualny ID starter_pack_1 (nie-UUID -> 22P02 w PostgreSQL -> 404 PACK_NOT_FOUND)
  await assert.rejects(
    () => openPackServerSide(client, userId, "starter_pack_1", "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "PACK_NOT_FOUND" && err.statusCode === 404
  );

  assert.equal(state.rpcCalls, 0);
  assert.equal(state.userCards.length, 0);
  assert.equal(state.directTableMutations.length, 0);
});

test("5. KRYTYCZNE: Brak RPC (PGRST202 / 42883 / 42501 / brak .rpc) zwraca 503 RPC_UNAVAILABLE bez fallbacku nieatomowego", async () => {
  const userId = "user-no-rpc-1";
  const modes: Array<{ mode?: RpcMode; omitRpcMethod?: boolean; label: string }> = [
    { mode: "missing_pgrst202", label: "PGRST202" },
    { mode: "missing_42883", label: "42883" },
    { mode: "permission_denied_42501", label: "42501" },
    { omitRpcMethod: true, label: "missing client.rpc" }
  ];

  for (const scenario of modes) {
    const packId = "12121212-1212-4121-8121-121212121212";
    const { client, state } = createAtomicSupabaseMock({
      packs: [
        {
          id: packId,
          user_id: userId,
          pack_type_id: "standard_pack",
          is_opened: false,
          created_at: "2026-11-11T00:00:00.000Z"
        }
      ],
      pointsByUser: { [userId]: { points_balance: 50, total_earned: 50 } },
      rpcMode: scenario.mode ?? "atomic",
      omitRpcMethod: scenario.omitRpcMethod
    });

    await assert.rejects(
      () => openPackServerSide(client, userId, packId, "standard_pack"),
      (err: any) => err instanceof PackOpeningError && err.code === "RPC_UNAVAILABLE" && err.statusCode === 503,
      `Scenariusz ${scenario.label} powinien zwrócić 503 RPC_UNAVAILABLE`
    );

    assert.equal(state.directTableMutations.length, 0, `${scenario.label}: brak zapisu nieatomowego!`);
    assert.equal(state.userCards.length, 0, `${scenario.label}: brak przyznanych kart!`);
    assert.equal(state.pointsByUser[userId].points_balance, 50, `${scenario.label}: saldo DP nienaruszone!`);
    assert.equal(state.packs[0].is_opened, false, `${scenario.label}: paczka pozostała nieotwarta!`);
  }
});

test("6. Błąd wykonania RPC lub odrzucenie biznesowe w DB kończy się kontrolowanym błędem bez zapisu nagród", async () => {
  const userId = "user-rpc-err-1";
  const packId = "34343434-3434-4343-8343-343434343434";

  // Błąd wewnętrzny PostgreSQL -> DB_WRITE_ERROR 500
  const dbErrMock = createAtomicSupabaseMock({
    packs: [{ id: packId, user_id: userId, pack_type_id: "standard_pack", is_opened: false, created_at: "2026-11-11T00:00:00.000Z" }],
    rpcMode: "db_error"
  });
  await assert.rejects(
    () => openPackServerSide(dbErrMock.client, userId, packId, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "DB_WRITE_ERROR" && err.statusCode === 500
  );
  assert.equal(dbErrMock.state.directTableMutations.length, 0);
  assert.equal(dbErrMock.state.userCards.length, 0);

  // Nieprawidłowa odpowiedź RPC (null) -> DB_WRITE_ERROR 500
  const nullPayloadMock = createAtomicSupabaseMock({
    packs: [{ id: packId, user_id: userId, pack_type_id: "standard_pack", is_opened: false, created_at: "2026-11-11T00:00:00.000Z" }],
    rpcMode: "invalid_payload"
  });
  await assert.rejects(
    () => openPackServerSide(nullPayloadMock.client, userId, packId, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "DB_WRITE_ERROR" && err.statusCode === 500
  );

  // Odrzucenie biznesowe z RPC -> ALREADY_OPENED 409
  const rejectMock = createAtomicSupabaseMock({
    packs: [{ id: packId, user_id: userId, pack_type_id: "standard_pack", is_opened: false, created_at: "2026-11-11T00:00:00.000Z" }],
    rpcMode: "reject_already_opened"
  });
  await assert.rejects(
    () => openPackServerSide(rejectMock.client, userId, packId, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "ALREADY_OPENED" && err.statusCode === 409
  );
});

test("7. Ponowione żądanie z tym samym idempotency_key (także przy 0 pozostałych paczek i po restarcie instancji) odtwarza wynik z pack_opening_logs", async () => {
  const userId = "user-idem-1";
  const onlyPackId = "56565656-5656-4565-8565-565656565656";
  const singleCard: MockCardDef = {
    id: "78787878-7878-4787-8787-787878787878",
    player_id: "p1",
    season: "2026/27",
    card_type: "inferno",
    card_name: "Ryszard Rybacki — INFERNO",
    title: "INFERNO",
    rarity: "inferno", // duplikat = +120 DP
    artwork_url: "/assets/players/ryszard-inferno.png",
    artwork_pose: "inferno_flame",
    frame_theme: "inferno",
    description: "Inferno",
    lore: "DELTA",
    is_active: true
  };

  const { client, state } = createAtomicSupabaseMock({
    cards: [singleCard],
    packs: [
      {
        id: onlyPackId,
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      }
    ]
  });

  // 1. Pierwsze otwarcie w instancji A (również 2 współbieżne z tym samym kluczem w ramach 1 procesu)
  const storeA = new Map<string, IdempotencyEntry>();
  const [r1, r2] = await Promise.all([
    openPackWithIdempotency({
      supabase: client,
      userId,
      userUnopenedPackId: onlyPackId,
      packTypeId: "standard_pack",
      idempotencyKey: "idem-retry-xyz",
      store: storeA
    }),
    openPackWithIdempotency({
      supabase: client,
      userId,
      userUnopenedPackId: onlyPackId,
      packTypeId: "standard_pack",
      idempotencyKey: "idem-retry-xyz",
      store: storeA
    })
  ]);

  assert.equal(state.rpcCalls, 1, "Współbieżne żądania z tym samym kluczem wykonują tylko jedno RPC");
  assert.deepEqual(r1, r2);
  assert.equal(r1.remaining_unopened_packs_count, 0);
  assert.equal(r1.total_delta_points_earned, 240); // 0 + 120 + 120
  assert.equal(state.pointsByUser[userId].points_balance, 240);

  // 2. Retry na nowej instancji (pusty cache pamięciowy storeB) mimo że użytkownik ma już 0 paczek!
  const storeB = new Map<string, IdempotencyEntry>();
  const r3 = await openPackWithIdempotency({
    supabase: client,
    userId,
    userUnopenedPackId: onlyPackId,
    packTypeId: "standard_pack",
    idempotencyKey: "idem-retry-xyz",
    store: storeB
  });

  assert.equal(state.rpcCalls, 1, "Retry odtworzony bezpiecznie z trwałego pack_opening_logs");
  assert.equal(r3.consumed_pack_id, onlyPackId);
  assert.equal(r3.total_delta_points_earned, 240);
  assert.equal(r3.new_points_balance, 240);
  assert.equal(r3.cards.length, 3);
  assert.equal(r3.cards[0].card.id, singleCard.id);
  assert.equal(state.pointsByUser[userId].points_balance, 240, "DP nie mogą zostać naliczone drugi raz");
  assert.equal(state.userCards[0].duplicates_count, 2, "duplicates_count nie może wzrosnąć po retry");
});

test("8. Równoległe otwarcia bez klucza idempotencji są bezpiecznie serializowane (1 paczka -> 1 win + 1 reject; 2 paczki -> oba spójne)", async () => {
  const userId = "user-concurrent-1";
  const card: MockCardDef = {
    id: "abababab-abab-4aba-8aba-abababababab",
    player_id: "p1",
    season: "2026/27",
    card_type: "base",
    card_name: "Ryszard Rybacki — Base",
    title: "Base",
    rarity: "common", // duplikat = +4 DP
    artwork_url: null,
    artwork_pose: "standard",
    frame_theme: "gold",
    description: "Base",
    lore: "DELTA",
    is_active: true
  };

  // Scenariusz A: 1 paczka, 2 równoległe wywołania
  const mockOnePack = createAtomicSupabaseMock({
    cards: [card],
    packs: [
      {
        id: "10101010-1010-4101-8101-101010101010",
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      }
    ],
    rpcDelayMs: 10
  });

  const settledOne = await Promise.allSettled([
    openPackServerSide(mockOnePack.client, userId, undefined, "standard_pack"),
    openPackServerSide(mockOnePack.client, userId, undefined, "standard_pack")
  ]);

  const winsOne = settledOne.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled");
  const failsOne = settledOne.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  assert.equal(winsOne.length, 1, "Tylko 1 z 2 równoległych żądań na 1 paczce może wygrać");
  assert.equal(failsOne.length, 1);
  assert.equal((failsOne[0].reason as PackOpeningError).code, "NO_UNOPENED_PACK");
  assert.equal(mockOnePack.state.userCards[0].duplicates_count, 2); // 1 new + 2 dups w jednej paczce
  assert.equal(mockOnePack.state.pointsByUser[userId].points_balance, 8); // 0 + 4 + 4

  // Scenariusz B: 2 paczki, 2 równoległe wywołania -> serializacja w DB rozlicza 1 new + 5 dups = 20 DP bez utraty duplikatu
  const mockTwoPacks = createAtomicSupabaseMock({
    cards: [card],
    packs: [
      {
        id: "20202020-2020-4202-8202-202020202020",
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      },
      {
        id: "30303030-3030-4303-8303-303030303030",
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:01:00.000Z"
      }
    ],
    rpcDelayMs: 10
  });

  const settledTwo = await Promise.all([
    openPackServerSide(mockTwoPacks.client, userId, undefined, "standard_pack"),
    openPackServerSide(mockTwoPacks.client, userId, undefined, "standard_pack")
  ]);

  const consumedIds = new Set(settledTwo.map(r => r.consumed_pack_id));
  assert.equal(consumedIds.size, 2, "Każde otwarcie musi zużyć inną paczkę");
  assert.equal(mockTwoPacks.state.userCards.length, 1);
  assert.equal(mockTwoPacks.state.userCards[0].duplicates_count, 5, "Łącznie 6 kart tego samego typu = 1 + 5 duplikatów");
  assert.equal(mockTwoPacks.state.pointsByUser[userId].points_balance, 20); // 5 * 4 DP
});

test("9. Nieaktywne karty (is_active = false) nie są losowane, a brak kart bez aktywnych graczy daje NO_AVAILABLE_CARDS", async () => {
  const userId = "user-pool-1";
  const packId = "40404040-4040-4404-8404-404040404040";
  const activeCardId = "50505050-5050-4505-8505-505050505050";
  const inactiveCardId = "60606060-6060-4606-8606-606060606060";

  const { client, state } = createAtomicSupabaseMock({
    cards: [
      {
        id: activeCardId,
        player_id: "p1",
        season: "2026/27",
        card_type: "base",
        card_name: "Aktywna Karta",
        title: "Base",
        rarity: "common",
        artwork_url: null,
        artwork_pose: "standard",
        frame_theme: "gold",
        description: "Active",
        lore: "DELTA",
        is_active: true
      },
      {
        id: inactiveCardId,
        player_id: "p2",
        season: "2026/27",
        card_type: "base",
        card_name: "Nieaktywna Karta",
        title: "Base",
        rarity: "inferno",
        artwork_url: null,
        artwork_pose: "standard",
        frame_theme: "inferno",
        description: "Inactive",
        lore: "DELTA",
        is_active: false
      }
    ],
    packs: [
      {
        id: packId,
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      }
    ]
  });

  const res = await openPackServerSide(client, userId, packId, "standard_pack");
  assert.ok(res.cards.every(c => c.card.id === activeCardId));
  assert.ok((state.lastRpcArgs?.p_drawn_card_ids as string[]).every(id => id === activeCardId));

  const emptyPoolMock = createAtomicSupabaseMock({
    cards: [],
    players: [],
    packs: [
      {
        id: packId,
        user_id: userId,
        pack_type_id: "standard_pack",
        is_opened: false,
        created_at: "2026-11-11T00:00:00.000Z"
      }
    ]
  });

  await assert.rejects(
    () => openPackServerSide(emptyPoolMock.client, userId, packId, "standard_pack"),
    (err: any) => err instanceof PackOpeningError && err.code === "NO_AVAILABLE_CARDS"
  );
  assert.equal(emptyPoolMock.state.rpcCalls, 0);
});

test("10. KONTRAKT API I SYNC: collection/route.ts bez wirtualnych starterów, open-pack/route.ts używa createAdminClient() i zachowuje pilot-access + cardSync", () => {
  const collectionRoute = fs.readFileSync(
    path.resolve(process.cwd(), "app/api/cards/collection/route.ts"),
    "utf-8"
  );
  const openPackRoute = fs.readFileSync(
    path.resolve(process.cwd(), "app/api/cards/open-pack/route.ts"),
    "utf-8"
  );
  const engineSource = fs.readFileSync(
    path.resolve(process.cwd(), "lib/cards/engine.ts"),
    "utf-8"
  );
  const cardSyncSource = fs.readFileSync(
    path.resolve(process.cwd(), "lib/cards/cardSync.ts"),
    "utf-8"
  );

  // collection/route.ts: brak wirtualnych paczek startowych
  assert.doesNotMatch(collectionRoute, /starter_pack_1/);
  assert.doesNotMatch(collectionRoute, /starter_pack_2/);
  assert.doesNotMatch(collectionRoute, /Pakiet powitalny DELTA GM/);
  assert.match(collectionRoute, /unopenedPacks\s*=\s*up\s*\|\|\s*\[\];/);

  // open-pack/route.ts: auth z serwera, adminClient, 503 przy braku konfiguracji serwisowej, enable_3d_walkout zachowane
  assert.match(openPackRoute, /createClient\(\)/);
  assert.match(openPackRoute, /supabase\.auth\.getUser\(\)/);
  assert.match(openPackRoute, /createAdminClient\(\)/);
  assert.match(openPackRoute, /code:\s*"RPC_UNAVAILABLE"[\s\S]{0,80}status:\s*503/);
  assert.match(openPackRoute, /openPackWithIdempotency\(/);
  assert.match(openPackRoute, /determine3DWalkoutAccess\(supabase,\s*user\.id\)/);
  assert.match(openPackRoute, /enable_3d_walkout/);

  // engine.ts: wyłączne użycie RPC open_pack_atomic, zero zapisów nieatomowych i rollbacku TS
  assert.match(engineSource, /\.rpc\("open_pack_atomic"/);
  assert.doesNotMatch(engineSource, /rollbackPackOpening/);
  assert.doesNotMatch(engineSource, /\.from\("user_cards"\)\.(insert|update|upsert)/);
  assert.doesNotMatch(engineSource, /\.from\("user_delta_points"\)\.(insert|update|upsert)/);
  assert.doesNotMatch(engineSource, /\.from\("user_unopened_packs"\)\.(insert|update|upsert)/);

  // cardSync.ts: kontrakt pól spójny z PackOpeningResult zwracanym przez open-pack
  assert.match(cardSyncSource, /pack_type_id:\s*string/);
  assert.match(cardSyncSource, /consumed_pack_id\?:\s*string\s*\|\s*null/);
  assert.match(cardSyncSource, /remaining_unopened_packs_count\?:\s*number/);
  assert.match(cardSyncSource, /total_delta_points_earned\?:\s*number/);
  assert.match(cardSyncSource, /new_points_balance\?:\s*number/);
});
