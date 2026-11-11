import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { PackOpeningResult } from "../lib/cards/types.ts";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "supabase/migrations/20261111_etap_anim1a2_open_pack_atomic.sql"
);

// ============================================================================
// CZĘŚĆ A: AUDYT STRUKTURY I BEZPIECZEŃSTWA PLIKU MIGRACJI SQL
// ============================================================================

test("SQL AUDIT 1: migration file exists and wraps DDL/function in explicit transaction", () => {
  assert.equal(fs.existsSync(MIGRATION_PATH), true, "Migration file must exist");
  const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");

  assert.match(sql, /^\s*--[\s\S]*?\bBEGIN;/m, "Migration must start with BEGIN;");
  assert.match(sql, /\bCOMMIT;\s*$/m, "Migration must end cleanly with COMMIT;");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.pack_opening_logs/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(sql, /uq_pack_opening_logs_unopened_pack/);
  assert.match(sql, /uq_pack_opening_logs_user_idempotency/);
});

test("SQL AUDIT 2: open_pack_atomic enforces SECURITY DEFINER hardening, user advisory lock, and %TYPE", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.open_pack_atomic\(/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = public, pg_temp/);
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.open_pack_atomic\(UUID, UUID, TEXT, TEXT\[\], TEXT\)\s+FROM PUBLIC, anon, authenticated;/
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.open_pack_atomic\(UUID, UUID, TEXT, TEXT\[\], TEXT\)\s+TO service_role;/
  );

  // Serializacja per user_id + ochrona przed konfliktem unique_violation + kompatybilność typów staging/prod
  assert.match(sql, /pg_advisory_xact_lock\(/);
  assert.match(sql, /public\.user_cards\.card_id%TYPE/);
  assert.match(sql, /WHEN unique_violation THEN/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /to_regclass\('public\.pack_definitions'\)/);
  assert.match(sql, /COALESCE\(\(v_dp_result->>'success'\)::BOOLEAN, false\) IS NOT TRUE/);
});

// ============================================================================
// CZĘŚĆ B: SYMULATOR TRANSAKCYJNY POSTGRESQL DLA OPEN_PACK_ATOMIC
// ============================================================================

interface SimCardDef {
  id: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "inferno";
  is_active: boolean;
  card_name: string;
}

interface SimPackRow {
  id: string;
  user_id: string;
  pack_type_id: string;
  is_opened: boolean;
  opened_at: string | null;
  created_at: string;
}

interface SimUserCard {
  user_id: string;
  card_id: string;
  duplicates_count: number;
}

interface SimUserDp {
  user_id: string;
  points_balance: number;
  total_earned: number;
}

interface SimDpTx {
  user_id: string;
  amount: number;
  balance_after: number;
  idempotency_key: string;
  source_type: string;
}

interface SimLogRow {
  user_id: string;
  pack_type_id: string;
  unopened_pack_id: string;
  idempotency_key: string | null;
  response_payload: any;
  delta_points_awarded: number;
}

const DUP_POINTS_SQL: Record<string, number> = {
  common: 4,
  rare: 10,
  epic: 25,
  legendary: 60,
  inferno: 120
};

const PACK_COUNTS_SQL: Record<string, number> = {
  standard_pack: 3,
  matchday_booster: 4,
  gold_booster: 5,
  inferno_booster: 5,
  legend_pack: 6,
  legend_booster: 6
};

class PostgresAtomicSimulator {
  public cardDefs: SimCardDef[];
  public packs: SimPackRow[];
  public userCards: SimUserCard[];
  public userDp: SimUserDp[];
  public dpTransactions: SimDpTx[];
  public packLogs: SimLogRow[];

  private userLocks = new Map<string, Promise<void>>();
  public injectFailure?: {
    onSlotIndex?: number;
    onDpTransaction?: boolean;
    onLogInsert?: boolean;
    beforeFirstInsert?: (txState: { userCards: SimUserCard[] }) => void;
  };

  constructor(init: {
    cardDefs: SimCardDef[];
    packs: SimPackRow[];
    userCards?: SimUserCard[];
    userDp?: SimUserDp[];
  }) {
    this.cardDefs = init.cardDefs.map(c => ({ ...c }));
    this.packs = init.packs.map(p => ({ ...p }));
    this.userCards = (init.userCards || []).map(c => ({ ...c }));
    this.userDp = (init.userDp || []).map(p => ({ ...p }));
    this.dpTransactions = [];
    this.packLogs = [];
  }

  /** Symuluje pg_advisory_xact_lock per user_id z pełnym rollbackiem snapshotu w razie wyjątku */
  private async withUserTransaction<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.userLocks.get(userId) || Promise.resolve();
    let releaseLock!: () => void;
    const nextLock = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    this.userLocks.set(userId, prev.then(() => nextLock));

    await prev;

    // Pełny snapshot stanu na wejściu do transakcji PostgreSQL (BEGIN)
    const snapshot = {
      packs: structuredClone(this.packs),
      userCards: structuredClone(this.userCards),
      userDp: structuredClone(this.userDp),
      dpTransactions: structuredClone(this.dpTransactions),
      packLogs: structuredClone(this.packLogs)
    };

    try {
      const res = await fn();
      // COMMIT (zwolnienie locka w finally)
      return res;
    } catch (err) {
      // ROLLBACK PostgreSQL
      this.packs = snapshot.packs;
      this.userCards = snapshot.userCards;
      this.userDp = snapshot.userDp;
      this.dpTransactions = snapshot.dpTransactions;
      this.packLogs = snapshot.packLogs;
      throw err;
    } finally {
      releaseLock();
    }
  }

  /**
   * Wiernie symuluje działanie SQL public.open_pack_atomic z pliku migracji.
   */
  public async openPackAtomic(params: {
    userId: string | null;
    packId?: string | null;
    packTypeId?: string | null;
    drawnCardIds: string[] | null;
    idempotencyKey?: string | null;
  }): Promise<{
    success: boolean;
    already_processed?: boolean;
    code?: string;
    status?: number;
    error?: string;
    response_payload?: any;
  }> {
    const { userId, packId = null, packTypeId = null, drawnCardIds, idempotencyKey = null } = params;
    const cleanIdem = idempotencyKey && idempotencyKey.trim() !== "" ? idempotencyKey.trim() : null;

    if (!userId) {
      return { success: false, code: "UNAUTHORIZED", status: 401, error: "Wymagana autoryzacja użytkownika." };
    }
    if (!drawnCardIds || drawnCardIds.length === 0) {
      return { success: false, code: "NO_AVAILABLE_CARDS", status: 400, error: "Brak wylosowanych kart." };
    }

    return this.withUserTransaction(userId, async () => {
      // Krok 3 SQL: Idempotencja pod lockiem user_id
      if (cleanIdem) {
        const existingLog = this.packLogs.find(
          l => l.user_id === userId && l.idempotency_key === cleanIdem
        );
        if (existingLog?.response_payload) {
          return {
            success: true,
            already_processed: true,
            response_payload: structuredClone(existingLog.response_payload)
          };
        }
      }

      // Krok 4 SQL: Zajęcie paczki (FOR UPDATE / FOR UPDATE SKIP LOCKED)
      let pack: SimPackRow | undefined;
      if (packId) {
        pack = this.packs.find(p => p.id === packId && p.user_id === userId);
        if (!pack) {
          return { success: false, code: "PACK_NOT_FOUND", status: 404, error: "Nie znaleziono paczki." };
        }
        if (pack.is_opened) {
          return { success: false, code: "ALREADY_OPENED", status: 409, error: "ALREADY_OPENED: Paczka otwarta." };
        }
        if (packTypeId && pack.pack_type_id !== packTypeId) {
          return { success: false, code: "PACK_TYPE_MISMATCH", status: 400, error: "Niezgodny typ paczki." };
        }
      } else {
        if (!packTypeId || packTypeId.trim() === "") {
          return { success: false, code: "NO_UNOPENED_PACK", status: 400, error: "Brak typu paczki." };
        }
        const eligible = this.packs
          .filter(p => p.user_id === userId && p.pack_type_id === packTypeId && !p.is_opened)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        pack = eligible[0];
        if (!pack) {
          return { success: false, code: "NO_UNOPENED_PACK", status: 400, error: "Brak dostępnej paczki." };
        }
      }

      // Krok 5 SQL: Sprawdzenie liczby slotów
      const expectedCount = PACK_COUNTS_SQL[pack.pack_type_id] ?? 3;
      if (drawnCardIds.length !== expectedCount) {
        throw new Error(`INVALID_CARDS_COUNT: oczekiwano ${expectedCount}, otrzymano ${drawnCardIds.length}`);
      }

      // Krok 6 SQL: UPDATE user_unopened_packs
      pack.is_opened = true;
      pack.opened_at = new Date().toISOString();

      // Krok 7 SQL: Przetwarzanie każdego slotu z obsługą unique_violation
      let totalDp = 0;
      const cardsResult: { card_id: string; is_duplicate: boolean; duplicate_points: number }[] = [];

      for (let i = 0; i < drawnCardIds.length; i++) {
        if (this.injectFailure?.onSlotIndex === i) {
          throw new Error(`INJECTED_DB_ERROR_AT_SLOT_${i}`);
        }

        const rawId = drawnCardIds[i];
        const cardDef = this.cardDefs.find(c => c.id === rawId && c.is_active);
        if (!cardDef) {
          throw new Error(`INVALID_OR_INACTIVE_CARD: ${rawId}`);
        }

        await Promise.resolve(); // Yield symulujący operację async

        let existingCard = this.userCards.find(c => c.user_id === userId && c.card_id === rawId);
        let isDup = false;

        if (existingCard) {
          existingCard.duplicates_count += 1;
          isDup = true;
        } else {
          // Symulacja równoległego zewnętrznego insertu między SELECT a INSERT (np. achievements/sync)
          if (i === 0 && this.injectFailure?.beforeFirstInsert) {
            this.injectFailure.beforeFirstInsert({ userCards: this.userCards });
          }

          const collidedWithExternal = this.userCards.find(c => c.user_id === userId && c.card_id === rawId);
          if (collidedWithExternal) {
            // Obsługa EXCEPTION WHEN unique_violation w PL/pgSQL
            collidedWithExternal.duplicates_count += 1;
            isDup = true;
          } else {
            this.userCards.push({ user_id: userId, card_id: rawId, duplicates_count: 0 });
            isDup = false;
          }
        }

        const dupPoints = isDup ? DUP_POINTS_SQL[cardDef.rarity] ?? 4 : 0;
        totalDp += dupPoints;
        cardsResult.push({
          card_id: rawId,
          is_duplicate: isDup,
          duplicate_points: dupPoints
        });
      }

      // Krok 8 SQL: apply_delta_points_transaction
      if (this.injectFailure?.onDpTransaction) {
        throw new Error("DP_TRANSACTION_FAILED: injected SQL error");
      }

      let newBalance = 0;
      const existingWallet = this.userDp.find(w => w.user_id === userId);
      if (totalDp > 0) {
        const dpKey = `pack_dp_${pack.id}`;
        if (this.dpTransactions.some(t => t.idempotency_key === dpKey)) {
          throw new Error("DUPLICATE_DP_TX");
        }
        if (existingWallet) {
          existingWallet.points_balance += totalDp;
          existingWallet.total_earned += totalDp;
          newBalance = existingWallet.points_balance;
        } else {
          newBalance = totalDp;
          this.userDp.push({ user_id: userId, points_balance: newBalance, total_earned: totalDp });
        }
        this.dpTransactions.push({
          user_id: userId,
          amount: totalDp,
          balance_after: newBalance,
          idempotency_key: dpKey,
          source_type: "PACK_DUPLICATE"
        });
      } else {
        newBalance = existingWallet?.points_balance ?? 0;
      }

      // Krok 9 SQL: pozostałe paczki i zapis logu + uq_pack_opening_logs_unopened_pack
      if (this.injectFailure?.onLogInsert) {
        throw new Error("LOG_INSERT_FAILED: injected SQL error");
      }

      if (this.packLogs.some(l => l.unopened_pack_id === pack!.id)) {
        throw new Error("23505 uq_pack_opening_logs_unopened_pack");
      }
      if (cleanIdem && this.packLogs.some(l => l.user_id === userId && l.idempotency_key === cleanIdem)) {
        throw new Error("23505 uq_pack_opening_logs_user_idempotency");
      }

      const remainingCount = this.packs.filter(p => p.user_id === userId && !p.is_opened).length;
      const finalPayload = {
        cards_meta: cardsResult,
        total_delta_points_earned: totalDp,
        new_points_balance: newBalance,
        pack_type_id: pack.pack_type_id,
        consumed_pack_id: pack.id,
        remaining_unopened_packs_count: remainingCount
      };

      this.packLogs.push({
        user_id: userId,
        pack_type_id: pack.pack_type_id,
        unopened_pack_id: pack.id,
        idempotency_key: cleanIdem,
        response_payload: finalPayload,
        delta_points_awarded: totalDp
      });

      return {
        success: true,
        already_processed: false,
        response_payload: structuredClone(finalPayload)
      };
    });
  }

  /** Mapuje payload RPC na kontrakt API PackOpeningResult */
  public mapToApiResponse(rpcRes: Awaited<ReturnType<PostgresAtomicSimulator["openPackAtomic"]>>): {
    status: number;
    body: PackOpeningResult | { error: string; code?: string };
  } {
    if (!rpcRes.success) {
      return {
        status: rpcRes.status || 400,
        body: { error: rpcRes.error || "Błąd otwarcia", code: rpcRes.code }
      };
    }

    const p = rpcRes.response_payload;
    const mappedCards = p.cards_meta.map((meta: any) => {
      const def = this.cardDefs.find(c => c.id === meta.card_id)!;
      return {
        card: {
          id: def.id,
          player_id: "p1",
          season: "2026/27",
          card_type: def.rarity === "inferno" ? "inferno" : "base",
          card_name: def.card_name,
          title: def.card_name,
          rarity: def.rarity,
          artwork_url: null,
          artwork_pose: "standard",
          frame_theme: def.rarity,
          card_number: 1,
          is_active: def.is_active,
          is_limited: false,
          edition_size: null,
          description: "",
          lore: null,
          match_id: null,
          special_event_id: null
        },
        is_duplicate: meta.is_duplicate,
        duplicate_points: meta.duplicate_points
      };
    });

    return {
      status: 200,
      body: {
        cards: mappedCards,
        total_delta_points_earned: p.total_delta_points_earned,
        new_points_balance: p.new_points_balance,
        pack_type_id: p.pack_type_id,
        consumed_pack_id: p.consumed_pack_id,
        remaining_unopened_packs_count: p.remaining_unopened_packs_count,
        enable_3d_walkout: false
      }
    };
  }
}

// ============================================================================
// TESTY WYMAGANE W ZADANIU 7 (ETAP ANIM-1A.2)
// ============================================================================

test("ATOMIC SQL 1 & 2: two different packs opened in parallel by same user with same NEW card never collide and pay accurate DP", async () => {
  const db = new PostgresAtomicSimulator({
    cardDefs: [
      { id: "card-new-inferno", rarity: "inferno", is_active: true, card_name: "Ryszard Inferno" },
      { id: "card-common-1", rarity: "common", is_active: true, card_name: "Kowalski" },
      { id: "card-common-2", rarity: "common", is_active: true, card_name: "Zieliński" }
    ],
    packs: [
      {
        id: "pack-A",
        user_id: "user-1",
        pack_type_id: "standard_pack",
        is_opened: false,
        opened_at: null,
        created_at: "2026-11-11T05:00:00Z"
      },
      {
        id: "pack-B",
        user_id: "user-1",
        pack_type_id: "standard_pack",
        is_opened: false,
        opened_at: null,
        created_at: "2026-11-11T05:01:00Z"
      }
    ],
    userCards: [],
    userDp: [{ user_id: "user-1", points_balance: 100, total_earned: 100 }]
  });

  // Oba równoległe żądania dla dwóch różnych paczek wylosowały tę samą NOWĄ kartę "card-new-inferno"
  const [resA, resB] = await Promise.all([
    db.openPackAtomic({
      userId: "user-1",
      packId: "pack-A",
      packTypeId: "standard_pack",
      drawnCardIds: ["card-new-inferno", "card-common-1", "card-common-2"],
      idempotencyKey: "k-pack-a"
    }),
    db.openPackAtomic({
      userId: "user-1",
      packId: "pack-B",
      packTypeId: "standard_pack",
      drawnCardIds: ["card-new-inferno", "card-common-1", "card-common-2"],
      idempotencyKey: "k-pack-b"
    })
  ]);

  assert.equal(resA.success, true);
  assert.equal(resB.success, true);

  // Pierwsze otwarcie: wszystkie 3 karty nowe (0 DP)
  assert.equal(resA.response_payload.total_delta_points_earned, 0);
  assert.equal(resA.response_payload.cards_meta.every((c: any) => !c.is_duplicate), true);

  // Drugie otwarcie (po zwolnieniu locka): wszystkie 3 karty są duplikatami -> 120 + 4 + 4 = 128 DP!
  assert.equal(resB.response_payload.total_delta_points_earned, 128);
  assert.equal(resB.response_payload.cards_meta.every((c: any) => c.is_duplicate), true);
  assert.equal(resB.response_payload.new_points_balance, 228);

  // Stan w bazie: 3 karty, każda ma duplicates_count = 1 (zero błędów uq_user_card!)
  assert.equal(db.userCards.length, 3);
  assert.equal(db.userCards.every(c => c.duplicates_count === 1), true);
  assert.equal(db.packLogs.length, 2);
});

test("ATOMIC SQL 2B: external concurrent INSERT on user_cards (e.g. achievements/sync) safely triggers unique_violation fallback", async () => {
  const db = new PostgresAtomicSimulator({
    cardDefs: [
      { id: "card-ach", rarity: "epic", is_active: true, card_name: "Mistrz Treningu" },
      { id: "c2", rarity: "common", is_active: true, card_name: "C2" },
      { id: "c3", rarity: "common", is_active: true, card_name: "C3" }
    ],
    packs: [
      {
        id: "pack-ext",
        user_id: "user-1",
        pack_type_id: "standard_pack",
        is_opened: false,
        opened_at: null,
        created_at: "2026-11-11T05:00:00Z"
      }
    ]
  });

  // Symulujemy, że dokładnie między SELECT a INSERT dla 1. slotu, inny moduł wstawia "card-ach"
  db.injectFailure = {
    beforeFirstInsert: ({ userCards }) => {
      userCards.push({ user_id: "user-1", card_id: "card-ach", duplicates_count: 0 });
    }
  };

  const res = await db.openPackAtomic({
    userId: "user-1",
    packId: "pack-ext",
    packTypeId: "standard_pack",
    drawnCardIds: ["card-ach", "c2", "c3"]
  });

  assert.equal(res.success, true);
  assert.equal(res.response_payload.cards_meta[0].is_duplicate, true);
  assert.equal(res.response_payload.cards_meta[0].duplicate_points, 25); // epic = 25 DP
  assert.equal(db.userCards.find(c => c.card_id === "card-ach")?.duplicates_count, 1);
  assert.equal(res.response_payload.new_points_balance, 25);
});

test("ATOMIC SQL 3A: 10 parallel requests without idempotencyKey with 3 packs allow exactly 3 openings", async () => {
  const db = new PostgresAtomicSimulator({
    cardDefs: [{ id: "card-c1", rarity: "common", is_active: true, card_name: "Base" }],
    packs: [
      { id: "p1", user_id: "user-1", pack_type_id: "standard_pack", is_opened: false, opened_at: null, created_at: "2026-11-11T01:00:00Z" },
      { id: "p2", user_id: "user-1", pack_type_id: "standard_pack", is_opened: false, opened_at: null, created_at: "2026-11-11T02:00:00Z" },
      { id: "p3", user_id: "user-1", pack_type_id: "standard_pack", is_opened: false, opened_at: null, created_at: "2026-11-11T03:00:00Z" }
    ]
  });

  const requests = Array.from({ length: 10 }, () =>
    db.openPackAtomic({
      userId: "user-1",
      packTypeId: "standard_pack",
      drawnCardIds: ["card-c1", "card-c1", "card-c1"]
    })
  );

  const results = await Promise.all(requests);
  const successes = results.filter(r => r.success);
  const rejects = results.filter(r => !r.success);

  assert.equal(successes.length, 3, "Dokładnie 3 paczki mogą zostać otwarte");
  assert.equal(rejects.length, 7, "Pozostałe 7 żądań musi zostać odrzuconych");
  assert.equal(rejects.every(r => r.code === "NO_UNOPENED_PACK"), true);

  // Łącznie wylosowano 9 sztuk "card-c1": pierwsza nowa (0 DP), pozostałe 8 to duplikaty -> 8 * 4 = 32 DP
  assert.equal(db.userCards[0].duplicates_count, 8);
  assert.equal(db.userDp[0].points_balance, 32);
  assert.equal(db.packLogs.length, 3);
});

test("ATOMIC SQL 3B & 4: 10 parallel requests with SAME idempotencyKey open 1 pack and return identical API response", async () => {
  const db = new PostgresAtomicSimulator({
    cardDefs: [
      { id: "card-gold", rarity: "rare", is_active: true, card_name: "Matchday" },
      { id: "card-base", rarity: "common", is_active: true, card_name: "Base" }
    ],
    packs: [
      { id: "pack-1", user_id: "user-1", pack_type_id: "standard_pack", is_opened: false, opened_at: null, created_at: "2026-11-11T01:00:00Z" },
      { id: "pack-2", user_id: "user-1", pack_type_id: "standard_pack", is_opened: false, opened_at: null, created_at: "2026-11-11T02:00:00Z" }
    ]
  });

  // 10 równoległych żądań z tym samym kluczem idempotencji
  const parallel = await Promise.all(
    Array.from({ length: 10 }, () =>
      db.openPackAtomic({
        userId: "user-1",
        packId: "pack-1",
        packTypeId: "standard_pack",
        drawnCardIds: ["card-gold", "card-base", "card-base"],
        idempotencyKey: "same-idem-key-xyz"
      })
    )
  );

  // Ponowne (11.) żądanie sekwencyjne po zakończeniu
  const retrySequential = await db.openPackAtomic({
    userId: "user-1",
    packId: "pack-1",
    packTypeId: "standard_pack",
    drawnCardIds: ["card-gold", "card-base", "card-base"],
    idempotencyKey: "same-idem-key-xyz"
  });

  const apiResponses = [...parallel, retrySequential].map(r => db.mapToApiResponse(r));
  const firstApi = apiResponses[0];

  assert.equal(firstApi.status, 200);
  const body = firstApi.body as PackOpeningResult;
  assert.equal(body.cards.length, 3);
  assert.equal(body.consumed_pack_id, "pack-1");
  assert.equal(body.remaining_unopened_packs_count, 1);
  assert.equal(body.total_delta_points_earned, 4);

  // Wszystkie 11 odpowiedzi muszą być bajtowo zgodne co do kontraktu API
  for (const res of apiResponses) {
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, firstApi.body);
  }

  // Tylko paczka-1 została zużyta, paczka-2 nadal zamknięta
  assert.equal(db.packs.find(p => p.id === "pack-1")?.is_opened, true);
  assert.equal(db.packs.find(p => p.id === "pack-2")?.is_opened, false);
  assert.equal(db.packLogs.length, 1);

  // A ponowienie samego pack-1 BEZ klucza idempotencji zwraca 409 ALREADY_OPENED
  const unkeyedRetry = db.mapToApiResponse(
    await db.openPackAtomic({
      userId: "user-1",
      packId: "pack-1",
      packTypeId: "standard_pack",
      drawnCardIds: ["card-gold", "card-base", "card-base"]
    })
  );
  assert.equal(unkeyedRetry.status, 409);
  assert.equal((unkeyedRetry.body as any).code, "ALREADY_OPENED");
});

test("ATOMIC SQL 5: failure midway through transaction triggers complete PostgreSQL rollback", async () => {
  const scenarios = [
    { name: "mid-card failure", inject: { onSlotIndex: 2 } },
    { name: "DP transaction failure", inject: { onDpTransaction: true } },
    { name: "log insert failure", inject: { onLogInsert: true } }
  ];

  for (const sc of scenarios) {
    const db = new PostgresAtomicSimulator({
      cardDefs: [
        { id: "c-leg", rarity: "legendary", is_active: true, card_name: "Legend" },
        { id: "c-new", rarity: "common", is_active: true, card_name: "New" }
      ],
      packs: [
        { id: "pack-rb", user_id: "user-1", pack_type_id: "standard_pack", is_opened: false, opened_at: null, created_at: "2026-11-11T01:00:00Z" }
      ],
      userCards: [{ user_id: "user-1", card_id: "c-leg", duplicates_count: 1 }],
      userDp: [{ user_id: "user-1", points_balance: 50, total_earned: 50 }]
    });

    db.injectFailure = sc.inject;

    await assert.rejects(() =>
      db.openPackAtomic({
        userId: "user-1",
        packId: "pack-rb",
        packTypeId: "standard_pack",
        drawnCardIds: ["c-leg", "c-new", "c-new"],
        idempotencyKey: "rollback-key"
      })
    );

    // Weryfikacja pełnego atomowego rollbacku w bazie dla każdego scenariusza awarii
    assert.equal(db.packs[0].is_opened, false, `${sc.name}: paczka musi pozostać nieotwarta`);
    assert.equal(db.packs[0].opened_at, null, `${sc.name}: opened_at musi być null`);
    assert.equal(db.userCards.length, 1, `${sc.name}: nowa karta c-new musi zostać wycofana`);
    assert.equal(db.userCards[0].duplicates_count, 1, `${sc.name}: duplikat c-leg musi wrócić do 1`);
    assert.equal(db.userDp[0].points_balance, 50, `${sc.name}: saldo DP musi wrócić do 50`);
    assert.equal(db.dpTransactions.length, 0, `${sc.name}: brak wpisu w ledgerze DP`);
    assert.equal(db.packLogs.length, 0, `${sc.name}: brak wpisu w logach otwarć`);
  }
});

test("ATOMIC SQL 6: accurately computes DP for all rarities and maintains transaction ledger integrity", async () => {
  const db = new PostgresAtomicSimulator({
    cardDefs: [
      { id: "c-com", rarity: "common", is_active: true, card_name: "Common" },
      { id: "c-rar", rarity: "rare", is_active: true, card_name: "Rare" },
      { id: "c-epi", rarity: "epic", is_active: true, card_name: "Epic" },
      { id: "c-leg", rarity: "legendary", is_active: true, card_name: "Legendary" },
      { id: "c-inf", rarity: "inferno", is_active: true, card_name: "Inferno" }
    ],
    packs: [
      { id: "pack-dp", user_id: "user-1", pack_type_id: "inferno_booster", is_opened: false, opened_at: null, created_at: "2026-11-11T01:00:00Z" }
    ],
    userCards: [
      { user_id: "user-1", card_id: "c-com", duplicates_count: 0 },
      { user_id: "user-1", card_id: "c-rar", duplicates_count: 0 },
      { user_id: "user-1", card_id: "c-epi", duplicates_count: 0 },
      { user_id: "user-1", card_id: "c-leg", duplicates_count: 0 },
      { user_id: "user-1", card_id: "c-inf", duplicates_count: 0 }
    ],
    userDp: [{ user_id: "user-1", points_balance: 20, total_earned: 20 }]
  });

  const res = await db.openPackAtomic({
    userId: "user-1",
    packId: "pack-dp",
    packTypeId: "inferno_booster",
    drawnCardIds: ["c-com", "c-rar", "c-epi", "c-leg", "c-inf"]
  });

  // 4 + 10 + 25 + 60 + 120 = 219 DP; 20 + 219 = 239 DP
  assert.equal(res.success, true);
  assert.equal(res.response_payload.total_delta_points_earned, 219);
  assert.equal(res.response_payload.new_points_balance, 239);
  assert.equal(db.userDp[0].points_balance, 239);
  assert.equal(db.userDp[0].total_earned, 239);
  assert.equal(db.dpTransactions.length, 1);
  assert.equal(db.dpTransactions[0].idempotency_key, "pack_dp_pack-dp");
  assert.equal(db.dpTransactions[0].amount, 219);
  assert.equal(db.dpTransactions[0].balance_after, 239);
});
