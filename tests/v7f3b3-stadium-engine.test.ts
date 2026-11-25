import test from "node:test";
import assert from "node:assert/strict";

/**
 * DELTA INFERNO — V7F.3B.3a
 * ATOMIC STADIUM UNLOCK ENGINE — SPECIFICATION & STATE MACHINE SIMULATION
 * 
 * UWAGA METODOLOGICZNA: Niniejszy pakiet testów stanowi symulację maszyny stanów
 * i kontraktu logiki w pamięci (in-memory state machine simulation).
 * NIE jest rzeczywistym testem transakcji bazy danych PostgreSQL (ponieważ w trybie
 * STRICT READ-ONLY obowiązuje całkowity zakaz zapisu i migracji na Supabase Staging).
 * 
 * Symulacja weryfikuje 100% reguł kontraktowych projektowanej migracji PostgreSQL:
 * - Blokada transakcyjna (FOR UPDATE per player_id)
 * - CTE INSERT ... ON CONFLICT (player_id, stadium_key) DO NOTHING RETURNING
 * - Rejestracja w player_stadium_audit_log wyłącznie dla nowo powstałych wpisów
 * - Trwałość praw nabytych (XP drop nie cofa stadionów)
 * - Nietykalność stadionów 'revoked'
 * - Autoryzacja i kontrola dostępu (brak uprawnień dla rodzica/anon)
 */

interface StadiumTierDef {
  stadium_key: string;
  rules_version: string;
  name: string;
  min_xp: number;
  sort_order: number;
  is_active: boolean;
}

const CANONICAL_TIERS: StadiumTierDef[] = [
  { stadium_key: "debiutant", rules_version: "v7f", name: "Debiutant", min_xp: 0, sort_order: 1, is_active: true },
  { stadium_key: "mlody_talent", rules_version: "v7f", name: "Młody Talent", min_xp: 400, sort_order: 2, is_active: true },
  { stadium_key: "wschodzaca_gwiazda", rules_version: "v7f", name: "Wschodząca Gwiazda", min_xp: 1200, sort_order: 3, is_active: true },
  { stadium_key: "gwiazda_akademii", rules_version: "v7f", name: "Gwiazda Akademii", min_xp: 2400, sort_order: 4, is_active: true },
  { stadium_key: "legenda_delty", rules_version: "v7f", name: "Legenda DELTY", min_xp: 4000, sort_order: 5, is_active: true }
];

interface PlayerStadiumUnlock {
  id: string;
  player_id: string;
  stadium_key: string;
  rules_version: string;
  status: "unlocked" | "revoked";
  unlocked_at: string;
  required_xp_threshold: number;
  achieved_xp: number;
  unlocked_by_trigger: string;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
}

interface PlayerStadiumAuditLog {
  id: string;
  player_id: string;
  stadium_key: string;
  action: "UNLOCKED" | "REVOKED" | "RESTORED" | "BACKFILL" | "ANONYMIZED";
  previous_xp?: number | null;
  new_xp?: number | null;
  reason: string;
  performed_by?: string | null;
  metadata?: any;
  is_anonymized: boolean;
  created_at: string;
}

// Symulator atomowej bazy danych i silnika PostgreSQL
class MockPostgresStadiumEngine {
  players = new Set<string>(["p-1", "p-2", "p-3"]);
  unlocks: PlayerStadiumUnlock[] = [];
  auditLog: PlayerStadiumAuditLog[] = [];
  tierDefinitions: StadiumTierDef[] = [...CANONICAL_TIERS];
  rowLocks = new Set<string>();

  // Symulacja calculate_verified_player_xp
  calculateVerifiedXp(playerId: string, verifiedXpMap: Map<string, number>): number {
    return verifiedXpMap.get(playerId) || 0;
  }

  // Symulacja sync_player_stadium_unlocks z transakcją
  syncPlayerStadiumUnlocks(params: {
    playerId: string;
    verifiedXp: number;
    callerRole: "service_role" | "staff" | "parent" | "anon";
    callerId?: string;
    triggerSource?: string;
    failAuditWrite?: boolean;
  }): { success: boolean; newUnlocksCount: number; error?: string } {
    const { playerId, verifiedXp, callerRole, callerId, triggerSource = "attendance_sync", failAuditWrite = false } = params;

    // 1. Sprawdzenie uprawnień (Task 5: anon i rodzic nie mogą wykonywać synchronizacji)
    if (callerRole !== "service_role" && callerRole !== "staff") {
      throw new Error("42501: Access denied: stadium synchronization requires staff privileges or service_role");
    }

    // 2. Walidacja player_id i blokada wiersza (FOR UPDATE)
    if (!this.players.has(playerId)) {
      throw new Error(`P0002: Player not found: ${playerId}`);
    }

    if (this.rowLocks.has(playerId)) {
      throw new Error(`40P01: Deadlock or concurrent transaction locked player ${playerId}`);
    }
    this.rowLocks.add(playerId);

    // Kopia migawkowa stanu dla obsługi atomowego rollbacku
    const snapshotUnlocks = JSON.parse(JSON.stringify(this.unlocks));
    const snapshotAudit = JSON.parse(JSON.stringify(this.auditLog));

    try {
      // 3. Pobranie aktywnych progów wersji 'v7f'
      const qualifying = this.tierDefinitions.filter(
        t => t.rules_version === "v7f" && t.is_active && verifiedXp >= t.min_xp
      );

      // 4. CTE newly_inserted: INSERT ... ON CONFLICT (player_id, stadium_key) DO NOTHING RETURNING
      const newlyInserted: PlayerStadiumUnlock[] = [];

      for (const tier of qualifying) {
        // Sprawdzenie ograniczenia uq_player_stadium (player_id, stadium_key)
        const exists = this.unlocks.some(u => u.player_id === playerId && u.stadium_key === tier.stadium_key);
        if (!exists) {
          const newUnlock: PlayerStadiumUnlock = {
            id: `unlock-${Math.random().toString(36).substring(2, 9)}`,
            player_id: playerId,
            stadium_key: tier.stadium_key,
            rules_version: tier.rules_version,
            status: "unlocked",
            unlocked_at: new Date().toISOString(),
            required_xp_threshold: tier.min_xp,
            achieved_xp: verifiedXp,
            unlocked_by_trigger: triggerSource
          };
          this.unlocks.push(newUnlock);
          newlyInserted.push(newUnlock);
        }
      }

      // 5. CTE inserted_audit: INSERT INTO player_stadium_audit_log TYLKO dla newlyInserted
      if (failAuditWrite) {
        throw new Error("Simulated audit write failure for rollback verification");
      }

      for (const n of newlyInserted) {
        this.auditLog.push({
          id: `audit-${Math.random().toString(36).substring(2, 9)}`,
          player_id: n.player_id,
          stadium_key: n.stadium_key,
          action: "UNLOCKED",
          previous_xp: null,
          new_xp: n.achieved_xp,
          reason: `Automatyczne odblokowanie stadionu po weryfikacji obecności (próg ${n.required_xp_threshold} XP)`,
          performed_by: callerId || null,
          metadata: {
            trigger_source: triggerSource,
            rules_version: n.rules_version,
            required_xp_threshold: n.required_xp_threshold,
            achieved_xp: n.achieved_xp
          },
          is_anonymized: false,
          created_at: new Date().toISOString()
        });
      }

      return { success: true, newUnlocksCount: newlyInserted.length };
    } catch (err: any) {
      // Rollback transakcji
      this.unlocks = snapshotUnlocks;
      this.auditLog = snapshotAudit;
      throw err;
    } finally {
      this.rowLocks.delete(playerId);
    }
  }
}

test("V7F.3B.3 — 1. Odblokowania na progach: 0, 400, 1200, 2400, 4000 XP", () => {
  const engine = new MockPostgresStadiumEngine();

  // 0 XP -> debiutant
  const res0 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 0, callerRole: "service_role" });
  assert.equal(res0.newUnlocksCount, 1);
  assert.equal(engine.unlocks.length, 1);
  assert.equal(engine.unlocks[0].stadium_key, "debiutant");
  assert.equal(engine.unlocks[0].required_xp_threshold, 0);
  assert.equal(engine.unlocks[0].achieved_xp, 0);

  // 400 XP -> mlody_talent
  const res400 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 400, callerRole: "service_role" });
  assert.equal(res400.newUnlocksCount, 1);
  assert.equal(engine.unlocks.length, 2);
  assert.ok(engine.unlocks.some(u => u.stadium_key === "mlody_talent" && u.required_xp_threshold === 400));

  // 1200 XP -> wschodzaca_gwiazda
  const res1200 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 1200, callerRole: "service_role" });
  assert.equal(res1200.newUnlocksCount, 1);
  assert.equal(engine.unlocks.length, 3);
  assert.ok(engine.unlocks.some(u => u.stadium_key === "wschodzaca_gwiazda" && u.required_xp_threshold === 1200));

  // 2400 XP -> gwiazda_akademii
  const res2400 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 2400, callerRole: "service_role" });
  assert.equal(res2400.newUnlocksCount, 1);
  assert.equal(engine.unlocks.length, 4);
  assert.ok(engine.unlocks.some(u => u.stadium_key === "gwiazda_akademii" && u.required_xp_threshold === 2400));

  // 4000 XP -> legenda_delty
  const res4000 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 4000, callerRole: "service_role" });
  assert.equal(res4000.newUnlocksCount, 1);
  assert.equal(engine.unlocks.length, 5);
  assert.ok(engine.unlocks.some(u => u.stadium_key === "legenda_delty" && u.required_xp_threshold === 4000));
});

test("V7F.3B.3 — 2. Jednoczesne przekroczenie wielu progów (awans skokowy)", () => {
  const engine = new MockPostgresStadiumEngine();

  // Gracz p-2 od razu osiąga 1450 XP (np. import historyczny lub podwójne zatwierdzenie)
  // Powinien odblokować jednocześnie: debiutant (0), mlody_talent (400), wschodzaca_gwiazda (1200)
  const res = engine.syncPlayerStadiumUnlocks({ playerId: "p-2", verifiedXp: 1450, callerRole: "service_role" });
  assert.equal(res.newUnlocksCount, 3);
  assert.equal(engine.unlocks.length, 3);
  assert.equal(engine.auditLog.length, 3);

  const keys = engine.unlocks.map(u => u.stadium_key);
  assert.ok(keys.includes("debiutant"));
  assert.ok(keys.includes("mlody_talent"));
  assert.ok(keys.includes("wschodzaca_gwiazda"));
  assert.ok(!keys.includes("gwiazda_akademii"));
});

test("V7F.3B.3 — 3. Dwie równoległe synchronizacje (symulacja row-lock FOR UPDATE)", () => {
  const engine = new MockPostgresStadiumEngine();

  // Blokada per player_id
  engine.rowLocks.add("p-1");
  assert.throws(
    () => engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 500, callerRole: "service_role" }),
    /Deadlock or concurrent transaction locked/
  );
  engine.rowLocks.delete("p-1");

  // Po zwolnieniu blokady synchronizacja przebiega pomyślnie
  const res = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 500, callerRole: "service_role" });
  assert.equal(res.success, true);
  assert.equal(res.newUnlocksCount, 2); // debiutant + mlody_talent
});

test("V7F.3B.3 — 4. Ponowna synchronizacja (Idempotency — 0 nowych wierszy i 0 wpisów w audycie)", () => {
  const engine = new MockPostgresStadiumEngine();

  // Pierwsza synchronizacja: 500 XP
  const res1 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 500, callerRole: "service_role" });
  assert.equal(res1.newUnlocksCount, 2);
  assert.equal(engine.unlocks.length, 2);
  assert.equal(engine.auditLog.length, 2);

  // Druga synchronizacja z identycznym XP: 500 XP
  const res2 = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 500, callerRole: "service_role" });
  assert.equal(res2.newUnlocksCount, 0, "Ponowna synchronizacja nie może tworzyć nowych wpisów");
  assert.equal(engine.unlocks.length, 2);
  assert.equal(engine.auditLog.length, 2, "Dziennik audytu NIE może rejestrować wpisów przy braku zmian");
});

test("V7F.3B.3 — 5. Spadek XP po korekcie (trwałość praw nabytych zawodnika)", () => {
  const engine = new MockPostgresStadiumEngine();

  // Gracz zdobył 1200 XP -> Debiutant, Młody Talent, Wschodząca Gwiazda
  engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 1200, callerRole: "service_role" });
  assert.equal(engine.unlocks.length, 3);

  // Trener koryguje obecność na treningach: XP spada do 300 XP
  // Synchronizacja po korekcie:
  const resDrop = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 300, callerRole: "service_role" });
  assert.equal(resDrop.newUnlocksCount, 0);

  // Wszystkie 3 stadiony POZOSTAJĄ w tabeli ze statusem 'unlocked'
  assert.equal(engine.unlocks.length, 3, "Stadiony nabyte pozostają nabyte na zawsze");
  const keys = engine.unlocks.map(u => u.stadium_key);
  assert.ok(keys.includes("wschodzaca_gwiazda"));
  assert.ok(keys.includes("mlody_talent"));
  assert.ok(keys.includes("debiutant"));
  assert.ok(engine.unlocks.every(u => u.status === "unlocked"));
});

test("V7F.3B.3 — 6. Odblokowanie już istniejące (ON CONFLICT DO NOTHING)", () => {
  const engine = new MockPostgresStadiumEngine();
  // Wstawienie ręczne
  engine.unlocks.push({
    id: "man-1",
    player_id: "p-1",
    stadium_key: "debiutant",
    rules_version: "v7f",
    status: "unlocked",
    unlocked_at: new Date().toISOString(),
    required_xp_threshold: 0,
    achieved_xp: 0,
    unlocked_by_trigger: "manual_coach_grant"
  });

  const res = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 200, callerRole: "service_role" });
  assert.equal(res.newUnlocksCount, 0, "Istniejący stadion debiutant nie zostaje zduplikowany");
  assert.equal(engine.unlocks.length, 1);
  assert.equal(engine.unlocks[0].id, "man-1");
});

test("V7F.3B.3 — 7. Status 'revoked' nie może być automatycznie odblokowany przez synchronizację", () => {
  const engine = new MockPostgresStadiumEngine();

  // Administrator cofnął stadion mlody_talent za niesportowe zachowanie
  engine.unlocks.push({
    id: "rev-1",
    player_id: "p-1",
    stadium_key: "mlody_talent",
    rules_version: "v7f",
    status: "revoked",
    unlocked_at: new Date().toISOString(),
    required_xp_threshold: 400,
    achieved_xp: 500,
    unlocked_by_trigger: "attendance_sync",
    revoked_at: new Date().toISOString(),
    revocation_reason: "Dyskwalifikacja dyscyplinarna"
  });

  // Gracz bierze udział w kolejnych meczach i ma 800 XP
  const res = engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 800, callerRole: "service_role" });

  // Nowo odblokowany powinien być wyłącznie 'debiutant' (0 XP)
  // 'mlody_talent' pozostaje nienaruszony ze statusem 'revoked'
  assert.equal(res.newUnlocksCount, 1); // tylko debiutant
  const revokedRecord = engine.unlocks.find(u => u.stadium_key === "mlody_talent");
  assert.equal(revokedRecord?.status, "revoked", "Status revoked nie może ulec nadpisaniu na unlocked");
  assert.equal(revokedRecord?.revocation_reason, "Dyskwalifikacja dyscyplinarna");
});

test("V7F.3B.3 — 8. Izolacja dwóch zawodników", () => {
  const engine = new MockPostgresStadiumEngine();

  engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 1500, callerRole: "service_role" });
  engine.syncPlayerStadiumUnlocks({ playerId: "p-2", verifiedXp: 200, callerRole: "service_role" });

  const p1Unlocks = engine.unlocks.filter(u => u.player_id === "p-1");
  const p2Unlocks = engine.unlocks.filter(u => u.player_id === "p-2");

  assert.equal(p1Unlocks.length, 3); // debiutant, mlody_talent, wschodzaca_gwiazda
  assert.equal(p2Unlocks.length, 1); // debiutant

  assert.equal(engine.auditLog.filter(a => a.player_id === "p-1").length, 3);
  assert.equal(engine.auditLog.filter(a => a.player_id === "p-2").length, 1);
});

test("V7F.3B.3 — 9. Użytkownik bez uprawnień (anon lub rodzic) zostaje odrzucony", () => {
  const engine = new MockPostgresStadiumEngine();

  assert.throws(
    () => engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 100, callerRole: "anon" }),
    /42501: Access denied/
  );

  assert.throws(
    () => engine.syncPlayerStadiumUnlocks({ playerId: "p-1", verifiedXp: 100, callerRole: "parent" }),
    /42501: Access denied/
  );
});

test("V7F.3B.3 — 10. Błędny player_id rzuca błąd i nie wykonuje operacji", () => {
  const engine = new MockPostgresStadiumEngine();

  assert.throws(
    () => engine.syncPlayerStadiumUnlocks({ playerId: "p-non-existent", verifiedXp: 100, callerRole: "service_role" }),
    /P0002: Player not found/
  );
  assert.equal(engine.unlocks.length, 0);
  assert.equal(engine.auditLog.length, 0);
});

test("V7F.3B.3 — 11. Awaria zapisu audytu powoduje pełny rollback transakcji", () => {
  const engine = new MockPostgresStadiumEngine();

  assert.throws(
    () => engine.syncPlayerStadiumUnlocks({
      playerId: "p-1",
      verifiedXp: 500,
      callerRole: "service_role",
      failAuditWrite: true
    }),
    /Simulated audit write failure/
  );

  // Weryfikacja atomowego cofnięcia: ani unlock, ani audit nie mogą pozostać w bazie
  assert.equal(engine.unlocks.length, 0, "Brak zapisu unlock po awarii audytu");
  assert.equal(engine.auditLog.length, 0, "Brak wpisu audytu po rollbacku");
});

test("V7F.3B.3 — 12. Poprawność liczby i zawartości wpisów w audycie", () => {
  const engine = new MockPostgresStadiumEngine();

  // Awans z 0 do 450 XP (2 nowe stadiony)
  engine.syncPlayerStadiumUnlocks({
    playerId: "p-1",
    verifiedXp: 450,
    callerRole: "staff",
    callerId: "admin-uuid-1",
    triggerSource: "attendance_sync"
  });

  assert.equal(engine.auditLog.length, 2);
  const auditDebiutant = engine.auditLog.find(a => a.stadium_key === "debiutant");
  const auditMlodyTalent = engine.auditLog.find(a => a.stadium_key === "mlody_talent");

  assert.ok(auditDebiutant);
  assert.equal(auditDebiutant.action, "UNLOCKED");
  assert.equal(auditDebiutant.new_xp, 450);
  assert.equal(auditDebiutant.performed_by, "admin-uuid-1");
  assert.equal(auditDebiutant.is_anonymized, false);

  assert.ok(auditMlodyTalent);
  assert.equal(auditMlodyTalent.action, "UNLOCKED");
  assert.equal(auditMlodyTalent.new_xp, 450);
  assert.equal(auditMlodyTalent.performed_by, "admin-uuid-1");
});
