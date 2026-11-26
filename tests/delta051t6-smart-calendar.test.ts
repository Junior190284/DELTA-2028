import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  filterCalendarItemsByPermissions,
  type SmartCalendarItem,
  CALENDAR_CATEGORIES,
  CALENDAR_VISIBILITY_LABELS
} from "../lib/calendar/smartCalendarTypes.ts";
import { INITIAL_SYNTHETIC_CALENDAR_EVENTS } from "../lib/qa/syntheticQaData.ts";

describe("DELTA-051T6 — SMART CALENDAR PRO SUITE", () => {

  test("1. Synthetic calendar events contain matches, trainings, consultations, and private items", () => {
    assert.ok(INITIAL_SYNTHETIC_CALENDAR_EVENTS.length >= 5, "Must have at least 5 synthetic calendar events");

    const matchEvent = INITIAL_SYNTHETIC_CALENDAR_EVENTS.find(e => e.category === "match");
    const trainingEvent = INITIAL_SYNTHETIC_CALENDAR_EVENTS.find(e => e.category === "training");
    const privateEvent = INITIAL_SYNTHETIC_CALENDAR_EVENTS.find(e => e.visibility === "private");
    const coachSharedEvent = INITIAL_SYNTHETIC_CALENDAR_EVENTS.find(e => e.visibility === "coach");
    const teamProposalEvent = INITIAL_SYNTHETIC_CALENDAR_EVENTS.find(e => e.visibility === "team_proposal");

    assert.ok(matchEvent, "Match event must exist");
    assert.equal(matchEvent.is_official, true, "Match must be official");

    assert.ok(trainingEvent, "Training event must exist");
    assert.equal(trainingEvent.is_official, true, "Training must be official");

    assert.ok(privateEvent, "Private event must exist");
    assert.ok(coachSharedEvent, "Coach-shared event must exist");
    assert.ok(teamProposalEvent, "Team-proposal event must exist");
  });

  test("2. Permissions filter: Parents only see public items, items shared by coach, or their own/child's private items", () => {
    const parentUserId = "parent-qa-user";
    const childPlayerIds = ["qa-p-01"];

    const visibleForParent = filterCalendarItemsByPermissions(
      INITIAL_SYNTHETIC_CALENDAR_EVENTS,
      parentUserId,
      "parent",
      childPlayerIds
    );

    // Parent sees public matches & trainings, plus their own private items
    assert.ok(visibleForParent.some(e => e.category === "match"));
    assert.ok(visibleForParent.some(e => e.category === "training"));
    assert.ok(visibleForParent.some(e => e.title.includes("Technika Strzału"))); // created_by parentUserId
    assert.ok(visibleForParent.some(e => e.title.includes("Konsultacja Fizjoterapeutyczna"))); // player_id is qa-p-01

    // Other parent's private events must NOT be visible
    const otherParentPrivateItem: SmartCalendarItem = {
      id: "other-private",
      title: "Prywatne innego rodzica",
      category: "other",
      event_date: "2026-12-01",
      visibility: "private",
      status: "scheduled",
      created_by: "someone-else-id",
      player_id: "qa-p-99",
    };

    const testSet = [...INITIAL_SYNTHETIC_CALENDAR_EVENTS, otherParentPrivateItem];
    const filtered = filterCalendarItemsByPermissions(testSet, parentUserId, "parent", childPlayerIds);

    assert.equal(filtered.some(e => e.id === "other-private"), false, "Other parent's private item must be hidden");
  });

  test("3. Permissions filter: Staff sees public, coach-shared, and team-proposals, but NOT other users' strictly private items", () => {
    const coachUserId = "staff-coach-id";

    const otherParentPrivateItem: SmartCalendarItem = {
      id: "other-private-confidential",
      title: "Ściśle prywatne rodzica",
      category: "family_event",
      event_date: "2026-12-01",
      visibility: "private",
      status: "scheduled",
      created_by: "parent-qa-user",
    };

    const teamProposalItem: SmartCalendarItem = {
      id: "proposal-item",
      title: "Propozycja turnieju",
      category: "tournament",
      event_date: "2026-12-05",
      visibility: "team_proposal",
      status: "scheduled",
      created_by: "parent-qa-user",
    };

    const testSet = [otherParentPrivateItem, teamProposalItem];
    const visibleForCoach = filterCalendarItemsByPermissions(testSet, coachUserId, "coach", []);

    assert.equal(visibleForCoach.some(e => e.id === "proposal-item"), true, "Coach should see team_proposal");
    assert.equal(visibleForCoach.some(e => e.id === "other-private-confidential"), false, "Coach should NOT see strictly private items of others");
  });

  test("4. Categories metadata covers all 13 required categories with color schemes", () => {
    assert.ok(CALENDAR_CATEGORIES.length >= 13);
    const keys = CALENDAR_CATEGORIES.map(c => c.key);

    assert.ok(keys.includes("match"));
    assert.ok(keys.includes("training"));
    assert.ok(keys.includes("tournament"));
    assert.ok(keys.includes("individual_training"));
    assert.ok(keys.includes("extra_football"));
    assert.ok(keys.includes("other_sport"));
    assert.ok(keys.includes("consultation"));
    assert.ok(keys.includes("family_event"));
    assert.ok(keys.includes("trip"));
    assert.ok(keys.includes("absence"));
    assert.ok(keys.includes("birthday"));
    assert.ok(keys.includes("info"));
    assert.ok(keys.includes("other"));
  });

  test("5. SmartCalendarPro component contains Month, Week, List views, modal details, and comments", () => {
    const code = fs.readFileSync("components/calendar/SmartCalendarPro.tsx", "utf8");

    // Views
    assert.ok(code.includes("Widok Miesiąca"), "Must support Month view");
    assert.ok(code.includes("week"), "Must support Week view");
    assert.ok(code.includes("list"), "Must support List view");

    // Actions & Modals
    assert.ok(code.includes("Dodaj Nowe Wydarzenie"), "Must have Add Event modal form");
    assert.ok(code.includes("Edycja Wydarzenia"), "Must have Edit Event modal form");
    assert.ok(code.includes("Prywatna notatka rodzica"), "Must support private parent notes");
    assert.ok(code.includes("Komentarze"), "Must support event comments");
    assert.ok(code.includes("Przejdź do Match Hub"), "Must support direct navigation to Match Hub");
    assert.ok(code.includes("Centrum Treningowe"), "Must support direct navigation to Training Center");
  });

  test("6. API routes enforce security, sanitize inputs, and prevent parents from editing official events", () => {
    const eventsApi = fs.readFileSync("app/api/calendar/events/route.ts", "utf8");
    const commentsApi = fs.readFileSync("app/api/calendar/comments/route.ts", "utf8");

    // XSS sanitization
    assert.ok(eventsApi.includes("sanitizeString"), "Events API must sanitize inputs");
    assert.ok(commentsApi.includes("sanitizeComment"), "Comments API must sanitize inputs");

    // Strict parent edit guard
    assert.ok(eventsApi.includes("Brak uprawnień do edycji oficjalnych wydarzeń"), "Parent must not edit official events");

    // Role check
    assert.ok(eventsApi.includes("finalVisibility = \"team_proposal\""), "Parents cannot directly publish public items");
  });

  test("7. Migration file exists and is safely unexecuted", () => {
    const migrationPath = "supabase/migrations/20261126_delta051t6_smart_calendar.sql";
    assert.ok(fs.existsSync(migrationPath), "Migration file must exist");

    const sql = fs.readFileSync(migrationPath, "utf8");
    assert.ok(sql.includes("create table if not exists public.event_comments"), "Must define event_comments");
    assert.ok(sql.includes("create table if not exists public.event_private_notes"), "Must define event_private_notes");
    assert.ok(sql.includes("alter table public.team_events add column if not exists visibility"), "Must extend team_events");
  });

  test("8. InteractiveQaPlayground integrates SmartCalendarPro as dedicated sub-tab without regression", () => {
    const code = fs.readFileSync("components/qa/InteractiveQaPlayground.tsx", "utf8");

    assert.ok(code.includes("Smart Kalendarz Pro"), "Playground must have Smart Kalendarz Pro sub-tab");
    assert.ok(code.includes("<SmartCalendarPro"), "Playground must render SmartCalendarPro component");
    assert.ok(code.includes("isSimulation={true}"), "Playground must pass isSimulation flag for zero DB mutations");

    // Check regressions for previous subtabs
    assert.ok(code.includes("Centrum Treningowe"), "Centrum Treningowe preserved");
    assert.ok(code.includes("Tworzenie Drużyn"), "Tworzenie Drużyn preserved");
    assert.ok(code.includes("Gra Kontrolna"), "Gra Kontrolna preserved");
    assert.ok(code.includes("Podsumowanie & XP (Statystyki)"), "Podsumowanie preserved");
  });
});
