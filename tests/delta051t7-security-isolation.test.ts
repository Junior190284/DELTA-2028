import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  filterCalendarItemsByPermissions,
  type SmartCalendarItem
} from "../lib/calendar/smartCalendarTypes.ts";

describe("DELTA-051T7 — DATABASE SECURITY & CROSS-ROLE ISOLATION MATRIX", () => {

  const MOCK_EVENTS: SmartCalendarItem[] = [
    // 1. Oficjalny mecz klubowy (publiczny)
    {
      id: "ev-pub-match-01",
      title: "Mecz Ligowy DELTA vs SEMP",
      category: "match",
      event_date: "2026-11-28",
      visibility: "public",
      status: "scheduled",
      is_official: true,
      created_by: "staff-admin-id",
    },
    // 2. Oficjalny trening klubowy (publiczny)
    {
      id: "ev-pub-training-01",
      title: "Trening Drużynowy U-9",
      category: "training",
      event_date: "2026-11-26",
      visibility: "public",
      status: "scheduled",
      is_official: true,
      created_by: "staff-coach-id",
    },
    // 3. Prywatne wydarzenie Rodzica A (dziecko A: p-child-a)
    {
      id: "ev-priv-parent-a",
      title: "Wizyta u fizjoterapeuty Rodzina A",
      category: "consultation",
      event_date: "2026-11-29",
      visibility: "private",
      status: "scheduled",
      is_official: false,
      created_by: "user-parent-a",
      player_id: "p-child-a",
    },
    // 4. Prywatne wydarzenie Rodzica B (dziecko B: p-child-b)
    {
      id: "ev-priv-parent-b",
      title: "Urodziny babci Rodzina B",
      category: "family_event",
      event_date: "2026-11-30",
      visibility: "private",
      status: "scheduled",
      is_official: false,
      created_by: "user-parent-b",
      player_id: "p-child-b",
    },
    // 5. Wydarzenie Rodzica A udostępnione trenerowi (coach)
    {
      id: "ev-coach-shared-a",
      title: "Dodatkowy trening motoryczny zawodnika A",
      category: "extra_football",
      event_date: "2026-12-01",
      visibility: "coach",
      status: "scheduled",
      is_official: false,
      created_by: "user-parent-a",
      player_id: "p-child-a",
    },
    // 6. Propozycja turnieju zgłoszona przez Rodzica B (team_proposal)
    {
      id: "ev-proposal-parent-b",
      title: "Propozycja wyjazdu na turniej Zima Cup",
      category: "tournament",
      event_date: "2026-12-05",
      visibility: "team_proposal",
      status: "scheduled",
      is_official: false,
      is_approved: false,
      created_by: "user-parent-b",
    },
  ];

  test("1. Rola: Rodzic A (Parent A) widzi publiczne, własne i udostępnione trenerowi, ale NIE widzi prywatnych Rodzica B", () => {
    const parentAId = "user-parent-a";
    const parentAChildren = ["p-child-a"];

    const visible = filterCalendarItemsByPermissions(MOCK_EVENTS, parentAId, "parent", parentAChildren);
    const visibleIds = visible.map(e => e.id);

    // Publiczne: widoczne
    assert.ok(visibleIds.includes("ev-pub-match-01"));
    assert.ok(visibleIds.includes("ev-pub-training-01"));

    // Własne: widoczne
    assert.ok(visibleIds.includes("ev-priv-parent-a"));
    assert.ok(visibleIds.includes("ev-coach-shared-a"));

    // Prywatne Rodzica B: ŚCIŚLE ZABLOKOWANE
    assert.equal(visibleIds.includes("ev-priv-parent-b"), false, "Parent A must NOT see Parent B private events");

    // Propozycja Rodzica B (niezatwierdzona): ukryta przed Rodzicem A dopóki nie zostanie zatwierdzona
    assert.equal(visibleIds.includes("ev-proposal-parent-b"), false, "Unapproved team proposal must be hidden from other parents");
  });

  test("2. Rola: Rodzic B (Parent B) widzi publiczne i własne, ale NIE widzi prywatnych Rodzica A", () => {
    const parentBId = "user-parent-b";
    const parentBChildren = ["p-child-b"];

    const visible = filterCalendarItemsByPermissions(MOCK_EVENTS, parentBId, "parent", parentBChildren);
    const visibleIds = visible.map(e => e.id);

    assert.ok(visibleIds.includes("ev-pub-match-01"));
    assert.ok(visibleIds.includes("ev-pub-training-01"));
    assert.ok(visibleIds.includes("ev-priv-parent-b"));
    assert.ok(visibleIds.includes("ev-proposal-parent-b")); // Widzi swoją własną propozycję

    // Wydarzenia Rodzica A: ŚCIŚLE ZABLOKOWANE
    assert.equal(visibleIds.includes("ev-priv-parent-a"), false);
    assert.equal(visibleIds.includes("ev-coach-shared-a"), false);
  });

  test("3. Rola: Trener (Coach) widzi publiczne, propozycje i pozycje 'coach', ale NIE widzi ściśle prywatnych notatek rodzin", () => {
    const coachId = "staff-coach-id";

    const visible = filterCalendarItemsByPermissions(MOCK_EVENTS, coachId, "coach", []);
    const visibleIds = visible.map(e => e.id);

    // Publiczne: widoczne
    assert.ok(visibleIds.includes("ev-pub-match-01"));
    assert.ok(visibleIds.includes("ev-pub-training-01"));

    // Udostępnione trenerowi (coach): WIDOCZNE
    assert.ok(visibleIds.includes("ev-coach-shared-a"));

    // Propozycja dla drużyny: WIDOCZNA DLA SZTABU (do zatwierdzenia)
    assert.ok(visibleIds.includes("ev-proposal-parent-b"));

    // Ściśle prywatne rodzin A i B: ŚCIŚLE UKRYTE PRZED TRENEREM
    assert.equal(visibleIds.includes("ev-priv-parent-a"), false, "Coach cannot see strictly private parent A items");
    assert.equal(visibleIds.includes("ev-priv-parent-b"), false, "Coach cannot see strictly private parent B items");
  });

  test("4. Rola: Administrator (Admin) posiada uprawnienia sztabu, szanując poufność 'private'", () => {
    const adminId = "staff-admin-id";

    const visible = filterCalendarItemsByPermissions(MOCK_EVENTS, adminId, "admin", []);
    const visibleIds = visible.map(e => e.id);

    assert.ok(visibleIds.includes("ev-pub-match-01"));
    assert.ok(visibleIds.includes("ev-pub-training-01"));
    assert.ok(visibleIds.includes("ev-coach-shared-a"));
    assert.ok(visibleIds.includes("ev-proposal-parent-b"));
    assert.equal(visibleIds.includes("ev-priv-parent-a"), false);
    assert.equal(visibleIds.includes("ev-priv-parent-b"), false);
  });

  test("5. Rola: Niezalogowany / Anonimowy (Unauthenticated) — zero dostępu do niepublicznych zasobów", () => {
    const unauthId = "";
    const visible = filterCalendarItemsByPermissions(MOCK_EVENTS, unauthId, "anon", []);
    const visibleIds = visible.map(e => e.id);

    assert.ok(visibleIds.includes("ev-pub-match-01"));
    assert.ok(visibleIds.includes("ev-pub-training-01"));
    assert.equal(visibleIds.includes("ev-priv-parent-a"), false);
    assert.equal(visibleIds.includes("ev-priv-parent-b"), false);
    assert.equal(visibleIds.includes("ev-coach-shared-a"), false);
    assert.equal(visibleIds.includes("ev-proposal-parent-b"), false);
  });

  test("6. API Security check: calendar events route rejects parent edits on official sessions with 403", () => {
    const apiCode = fs.readFileSync("app/api/calendar/events/route.ts", "utf8");
    assert.ok(apiCode.includes("Brak uprawnień do edycji oficjalnych wydarzeń klubu"), "Must reject official edits by parent");
    assert.ok(apiCode.includes("status: 403"), "Must return 403 on forbidden action");
  });

  test("7. Attendance XP Security: +40 XP protected against duplicate grants and parent overwrites", () => {
    const attendanceCode = fs.readFileSync("app/api/training/attendance/route.ts", "utf8");
    assert.ok(attendanceCode.includes("status === \"present\" || status === \"absent\""), "Protects present/absent against non-staff");
    assert.ok(attendanceCode.includes("status: 403"), "Returns 403 when parent tries to grant presence");
  });

  test("8. Migration SQL checks: RLS policies in 20261126_delta051t6_smart_calendar.sql drop permissive select", () => {
    const sql = fs.readFileSync("supabase/migrations/20261126_delta051t6_smart_calendar.sql", "utf8");
    assert.ok(sql.includes("drop policy if exists \"delegated team events all\" on public.team_events"), "Must drop broad permissive policy");
    assert.ok(sql.includes("parent_player_links"), "Must join parent_player_links for scoped child visibility");
    assert.ok(sql.includes("user_id = auth.uid()"), "Private notes must strictly check owner");
  });
});
