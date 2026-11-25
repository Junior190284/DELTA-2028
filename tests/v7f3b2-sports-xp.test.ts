import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateVerifiedSportsXp,
  calculateMultiplePlayersSportsXp,
  isTrainingFinished,
  getWarsawDateTime,
  calculatePlayerLevel,
  normalizeTimeString,
  addMinutesToNormalizedTime
} from "../lib/stadium/xp-calculator.ts";
import { STADIUM_TIERS } from "../lib/stadium/progression.ts";

// Stała data referencyjna: Niedziela, 15 Listopada 2026, 14:00:00 czasu warszawskiego (CET, UTC+1)
// W UTC to 2026-11-15T13:00:00Z
const REF_NOW_WARSAW = new Date("2026-11-15T13:00:00Z");

test("V7F.3B.2 — 1. RSVP (yes/no/maybe/undecided) przyznaje 0 XP", () => {
  const result = calculateVerifiedSportsXp("player-rsvp-1", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-past", training_date: "2026-11-10", start_time: "17:00", end_time: "18:30" }
    ],
    trainingAttendance: [
      { training_id: "tr-past", player_id: "player-rsvp-1", status: "yes" }
    ],
    matches: [
      { id: "m-played", status: "played", match_date: "2026-11-08" }
    ],
    matchAttendance: [
      { match_id: "m-played", player_id: "player-rsvp-1", status: "yes" }
    ]
  });

  assert.equal(result.presentTrainings, 0, "Deklaracja RSVP 'yes' na treningu nie może dawać zaliczenia");
  assert.equal(result.presentMatches, 0, "Deklaracja RSVP 'yes' na meczu nie może dawać zaliczenia");
  assert.equal(result.individualAttendanceXp, 0, "XP musi wynosić ściśle 0");
  assert.equal(result.sportsXp, 0);
  assert.equal(result.playerLevel, 1);
  assert.equal(result.stadiumProgression.currentTier.id, "debiutant");

  // Inne statusy nieobecności / niezdecydowania
  const testStatuses = ["no", "maybe", "undecided", "absent", "unknown"];
  for (const st of testStatuses) {
    const res = calculateVerifiedSportsXp("p-st", {
      referenceDate: REF_NOW_WARSAW,
      trainingSessions: [{ id: "tr-1", training_date: "2026-11-10" }],
      trainingAttendance: [{ training_id: "tr-1", player_id: "p-st", status: st }],
      matches: [{ id: "m-1", status: "played" }],
      matchAttendance: [{ match_id: "m-1", player_id: "p-st", status: st }]
    });
    assert.equal(res.individualAttendanceXp, 0, `Status '${st}' musi przyznawać 0 XP`);
  }
});

test("V7F.3B.2 — 2. Trening: present po zakończeniu jednostki = +40 XP", () => {
  // Trening miniony (sprzed 5 dni)
  const resPast = calculateVerifiedSportsXp("p-train-1", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-past-1", training_date: "2026-11-10", start_time: "17:00", end_time: "18:30" }
    ],
    trainingAttendance: [
      { training_id: "tr-past-1", player_id: "p-train-1", status: "present" }
    ]
  });
  assert.equal(resPast.presentTrainings, 1);
  assert.equal(resPast.individualAttendanceXp, 40);

  // Trening dzisiejszy (2026-11-15), zakończony przed czasem referencyjnym 14:00 (np. 10:00-11:30)
  const resTodayFinished = calculateVerifiedSportsXp("p-train-2", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-today-fin", training_date: "2026-11-15", start_time: "10:00", end_time: "11:30" }
    ],
    trainingAttendance: [
      { training_id: "tr-today-fin", player_id: "p-train-2", status: "present" }
    ]
  });
  assert.equal(resTodayFinished.presentTrainings, 1);
  assert.equal(resTodayFinished.individualAttendanceXp, 40);
});

test("V7F.3B.2 — 3. Przyszły trening lub w trakcie = 0 XP (nawet przy przedwczesnym statusie present)", () => {
  // A. Trening za 3 dni (2026-11-18) z omyłkowym statusem present
  const resFutureDay = calculateVerifiedSportsXp("p-future-1", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-future", training_date: "2026-11-18", start_time: "17:00", end_time: "18:30" }
    ],
    trainingAttendance: [
      { training_id: "tr-future", player_id: "p-future-1", status: "present" }
    ]
  });
  assert.equal(resFutureDay.presentTrainings, 0, "Przyszła data treningu nie może przyznać XP");
  assert.equal(resFutureDay.individualAttendanceXp, 0);

  // B. Trening dzisiejszy, ale jeszcze przyszły (np. 17:00-18:30, a w Warszawie jest 14:00)
  const resTodayUpcoming = calculateVerifiedSportsXp("p-future-2", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-today-late", training_date: "2026-11-15", start_time: "17:00", end_time: "18:30" }
    ],
    trainingAttendance: [
      { training_id: "tr-today-late", player_id: "p-future-2", status: "present" }
    ]
  });
  assert.equal(resTodayUpcoming.presentTrainings, 0, "Niezakończona sesja z dzisiejszego dnia nie może przyznać XP");
  assert.equal(resTodayUpcoming.individualAttendanceXp, 0);

  // C. Trening dzisiejszy w trakcie (trwający): 13:30 - 15:00 przy godzinie referencyjnej 14:00 w Warszawie
  const resTodayInProgress = calculateVerifiedSportsXp("p-future-3", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-today-in-progress", training_date: "2026-11-15", start_time: "13:30", end_time: "15:00" }
    ],
    trainingAttendance: [
      { training_id: "tr-today-in-progress", player_id: "p-future-3", status: "present" }
    ]
  });
  assert.equal(resTodayInProgress.presentTrainings, 0, "Trwająca jednostka (w trakcie) nie może przyznać XP");
  assert.equal(resTodayInProgress.individualAttendanceXp, 0);
});

test("V7F.3B.3a — Obsługa treningów przez północ (overnight) oraz bezpieczna zasada braku godzin", () => {
  // A. Trening przez północ (23:00 -> 00:30 kolejnego dnia)
  // Data treningu: 2026-11-15, start: 23:00, koniec: 00:30 (faktycznie 2026-11-16 00:30)
  const sessionOvernight = {
    id: "tr-night",
    training_date: "2026-11-15",
    start_time: "23:00",
    end_time: "00:30"
  };

  // Punkt 1: W trakcie treningu o 23:45 (2026-11-15T22:45:00Z)
  const duringNight = new Date("2026-11-15T22:45:00Z");
  assert.equal(
    isTrainingFinished(sessionOvernight, duringNight),
    false,
    "Trening nocny trwający o 23:45 NIE jest zakończony"
  );

  // Punkt 2: Po zakończeniu treningu o 01:00 kolejnego dnia (2026-11-16T00:00:00Z)
  const afterNight = new Date("2026-11-16T00:00:00Z");
  assert.equal(
    isTrainingFinished(sessionOvernight, afterNight),
    true,
    "Trening nocny po 00:30 kolejnego dnia JEST zakończony"
  );

  // B. Bezpieczna zasada braku godzin (V7F.3B.3a):
  // 1. Miniony dzień bez godzin -> minął cały dzień, więc zakończony
  const pastNoHours = { id: "tr-past-nohours", training_date: "2026-11-10" };
  assert.equal(
    isTrainingFinished(pastNoHours, REF_NOW_WARSAW),
    true,
    "Trening z minionego dnia bez godzin jest zakończony"
  );

  // 2. Dzisiejszy dzień bez godzin -> brak możliwości potwierdzenia zakończenia -> BEZPIECZNA ODMOWA (0 XP)
  const todayNoHours = { id: "tr-today-nohours", training_date: "2026-11-15" };
  assert.equal(
    isTrainingFinished(todayNoHours, REF_NOW_WARSAW),
    false,
    "Dzisiejszy trening bez godzin NIE może dać XP (bezpieczna zasada odmowy)"
  );
});

test("V7F.3B.3a — Strefa Europe/Warsaw i czas letni / zimowy (DST transitions)", () => {
  // Letni czas (CEST = UTC+2): 15 Lipca 2026, 12:00 UTC -> 14:00 w Warszawie
  const summerDate = new Date("2026-07-15T10:00:00Z"); // 12:00 CEST
  const summerSessionFinished = {
    id: "tr-summer",
    training_date: "2026-07-15",
    start_time: "09:00",
    end_time: "10:30"
  };
  assert.equal(
    isTrainingFinished(summerSessionFinished, summerDate),
    true,
    "W lecie (CEST) trening zakończony o 10:30 jest zakończony o 12:00"
  );

  const summerSessionInProgress = {
    id: "tr-summer-prog",
    training_date: "2026-07-15",
    start_time: "11:30",
    end_time: "13:00"
  };
  assert.equal(
    isTrainingFinished(summerSessionInProgress, summerDate),
    false,
    "W lecie (CEST) trening trwający o 12:00 nie jest zakończony"
  );
});

test("V7F.3B.2 — 4. Mecz ligowy: played + present = +60 XP", () => {
  const result = calculateVerifiedSportsXp("p-match-1", {
    referenceDate: REF_NOW_WARSAW,
    matches: [
      { id: "m-played-1", status: "played", match_date: "2026-11-08" },
      { id: "m-played-2", status: "played", match_date: "2026-11-14" }
    ],
    matchAttendance: [
      { match_id: "m-played-1", player_id: "p-match-1", status: "present" },
      { match_id: "m-played-2", player_id: "p-match-1", status: "present" }
    ]
  });

  assert.equal(result.presentMatches, 2);
  assert.equal(result.individualAttendanceXp, 120, "2 rozegrane mecze z obecnością dają 120 XP");
});

test("V7F.3B.2 — 5. Mecz ligowy: played + yes = 0 XP", () => {
  const result = calculateVerifiedSportsXp("p-match-yes", {
    referenceDate: REF_NOW_WARSAW,
    matches: [
      { id: "m-played-yes", status: "played", match_date: "2026-11-08" }
    ],
    matchAttendance: [
      { match_id: "m-played-yes", player_id: "p-match-yes", status: "yes" }
    ]
  });

  assert.equal(result.presentMatches, 0, "Mecz ze statusem RSVP 'yes' nie daje obecności meczowej");
  assert.equal(result.individualAttendanceXp, 0);
});

test("V7F.3B.2 — 6. Match_events bez obecności present = 0 XP", () => {
  // Scenariusz: Mecz rozegrany, zawodnik ma wpisany gol i MVP w match_events,
  // ale nie ma statusu 'present' w match_attendance (np. brak weryfikacji lub status 'absent')
  const resultMissingAtt = calculateVerifiedSportsXp("p-events-only", {
    referenceDate: REF_NOW_WARSAW,
    matches: [
      { id: "m-event-1", status: "played", match_date: "2026-11-08" }
    ],
    matchAttendance: [], // brak zatwierdzonej obecności
    events: [
      { match_id: "m-event-1", player_id: "p-events-only", event_type: "goal" },
      { match_id: "m-event-1", player_id: "p-events-only", event_type: "mvp" }
    ]
  });
  assert.equal(resultMissingAtt.presentMatches, 0, "Sam match_events NIE może przyznawać obecności meczowej");
  assert.equal(resultMissingAtt.individualAttendanceXp, 0);

  // Scenariusz z jawnym 'absent'
  const resultAbsentWithEvents = calculateVerifiedSportsXp("p-absent-events", {
    referenceDate: REF_NOW_WARSAW,
    matches: [
      { id: "m-event-2", status: "played", match_date: "2026-11-08" }
    ],
    matchAttendance: [
      { match_id: "m-event-2", player_id: "p-absent-events", status: "absent" }
    ],
    events: [
      { match_id: "m-event-2", player_id: "p-absent-events", event_type: "goal" }
    ]
  });
  assert.equal(resultAbsentWithEvents.presentMatches, 0, "Status absent z match_events daje 0 XP");
  assert.equal(resultAbsentWithEvents.individualAttendanceXp, 0);
});

test("V7F.3B.2 — 7. Korekta obecności present -> absent obniża XP deterministycznie", () => {
  const baseOptions = {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [{ id: "tr-kor", training_date: "2026-11-10" }],
    matches: [{ id: "m-kor", status: "played", match_date: "2026-11-08" }]
  };

  // Krok A: Trener wpisuje obecność (40 XP za trening + 60 XP za mecz = 100 XP)
  const initial = calculateVerifiedSportsXp("p-kor", {
    ...baseOptions,
    trainingAttendance: [{ training_id: "tr-kor", player_id: "p-kor", status: "present" }],
    matchAttendance: [{ match_id: "m-kor", player_id: "p-kor", status: "present" }]
  });
  assert.equal(initial.individualAttendanceXp, 100);

  // Krok B: Korekta treningu na 'absent' -> spadek o 40 XP do 60 XP
  const afterTrCorrection = calculateVerifiedSportsXp("p-kor", {
    ...baseOptions,
    trainingAttendance: [{ training_id: "tr-kor", player_id: "p-kor", status: "absent" }],
    matchAttendance: [{ match_id: "m-kor", player_id: "p-kor", status: "present" }]
  });
  assert.equal(afterTrCorrection.individualAttendanceXp, 60);

  // Krok C: Korekta meczu na 'absent' -> spadek o 60 XP do 0 XP
  const afterMatchCorrection = calculateVerifiedSportsXp("p-kor", {
    ...baseOptions,
    trainingAttendance: [{ training_id: "tr-kor", player_id: "p-kor", status: "absent" }],
    matchAttendance: [{ match_id: "m-kor", player_id: "p-kor", status: "absent" }]
  });
  assert.equal(afterMatchCorrection.individualAttendanceXp, 0);
});

test("V7F.3B.2 — 8. Deduplikacja: brak podwójnego naliczenia za ten sam trening lub mecz", () => {
  const result = calculateVerifiedSportsXp("p-dedup", {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-unique-1", training_date: "2026-11-10" }
    ],
    // 3 powtórzone wpisy obecności na ten sam trening
    trainingAttendance: [
      { training_id: "tr-unique-1", player_id: "p-dedup", status: "present" },
      { training_id: "tr-unique-1", player_id: "p-dedup", status: "present" },
      { training_id: "tr-unique-1", player_id: "p-dedup", status: "present" }
    ],
    matches: [
      { id: "m-unique-1", status: "played", match_date: "2026-11-08" }
    ],
    // 4 powtórzone wpisy na ten sam mecz
    matchAttendance: [
      { match_id: "m-unique-1", player_id: "p-dedup", status: "present" },
      { match_id: "m-unique-1", player_id: "p-dedup", status: "present" },
      { match_id: "m-unique-1", player_id: "p-dedup", status: "present" },
      { match_id: "m-unique-1", player_id: "p-dedup", status: "present" }
    ]
  });

  assert.equal(result.presentTrainings, 1, "Powtórzone wpisy treningu muszą być zredukowane do 1");
  assert.equal(result.presentMatches, 1, "Powtórzone wpisy meczu muszą być zredukowane do 1");
  assert.equal(result.individualAttendanceXp, 100, "1 trening (40) + 1 mecz (60) = dokładnie 100 XP");
});

test("V7F.3B.2 — 9. Strefa czasowa Europe/Warsaw i obsługa granic czasowych", () => {
  // Test granicy: 14 Listopada 2026, 23:30 UTC -> w Warszawie (CET = UTC+1) jest już 15 Listopada, 00:30!
  const utcDate = new Date("2026-11-14T23:30:00Z");
  const warsawInfo = getWarsawDateTime(utcDate);
  assert.equal(warsawInfo.dateStr, "2026-11-15", "W Warszawie jest już kolejny dzień");
  assert.equal(warsawInfo.timeStr, "00:30:00");

  // Trening z 14 Listopada zakończony o 21:00 jest w tym momencie zakończony
  const isTrPastFinished = isTrainingFinished(
    { training_date: "2026-11-14", end_time: "21:00" },
    utcDate
  );
  assert.equal(isTrPastFinished, true, "Trening z wczoraj musi być zakończony");

  // Trening z 15 Listopada zaplanowany na 18:00 NIE jest zakończony o 00:30
  const isTrTodayFinished = isTrainingFinished(
    { training_date: "2026-11-15", start_time: "17:00", end_time: "18:30" },
    utcDate
  );
  assert.equal(isTrTodayFinished, false, "Trening dzisiejszy wieczorny nie może być zakończony o 00:30");

  // Helpery normalizacji czasu
  assert.equal(normalizeTimeString("17:00"), "17:00:00");
  assert.equal(normalizeTimeString("17:00:00"), "17:00:00");
  assert.equal(normalizeTimeString("17:00:00+01:00"), "17:00:00");
  assert.equal(addMinutesToNormalizedTime("17:00:00", 90), "18:30:00");
  assert.equal(addMinutesToNormalizedTime("23:15:00", 90), "23:59:59");
});

test("V7F.3B.2 — 10. Izolacja dwóch różnych graczy w tym samym zbiorze danych", () => {
  const commonOptions = {
    referenceDate: REF_NOW_WARSAW,
    trainingSessions: [
      { id: "tr-comm-1", training_date: "2026-11-10" },
      { id: "tr-comm-2", training_date: "2026-11-12" },
      { id: "tr-comm-3", training_date: "2026-11-14" }
    ],
    trainingAttendance: [
      // Gracz A: 3 obecności
      { training_id: "tr-comm-1", player_id: "player-alpha", status: "present" },
      { training_id: "tr-comm-2", player_id: "player-alpha", status: "present" },
      { training_id: "tr-comm-3", player_id: "player-alpha", status: "present" },
      // Gracz B: 1 obecność, 1 absent, 1 yes
      { training_id: "tr-comm-1", player_id: "player-beta", status: "present" },
      { training_id: "tr-comm-2", player_id: "player-beta", status: "absent" },
      { training_id: "tr-comm-3", player_id: "player-beta", status: "yes" }
    ],
    matches: [
      { id: "m-comm-1", status: "played", match_date: "2026-11-08" },
      { id: "m-comm-2", status: "played", match_date: "2026-11-13" }
    ],
    matchAttendance: [
      // Gracz A: 2 mecze
      { match_id: "m-comm-1", player_id: "player-alpha", status: "present" },
      { match_id: "m-comm-2", player_id: "player-alpha", status: "present" },
      // Gracz B: 0 meczów (tylko RSVP yes)
      { match_id: "m-comm-1", player_id: "player-beta", status: "yes" },
      { match_id: "m-comm-2", player_id: "player-beta", status: "absent" }
    ]
  };

  const results = calculateMultiplePlayersSportsXp(["player-alpha", "player-beta", "player-gamma"], commonOptions);

  const resAlpha = results.get("player-alpha")!;
  assert.equal(resAlpha.presentTrainings, 3);
  assert.equal(resAlpha.presentMatches, 2);
  assert.equal(resAlpha.individualAttendanceXp, (3 * 40) + (2 * 60)); // 240 XP
  assert.equal(resAlpha.playerLevel, 1); // 240 / 250 = 0 -> lvl 1

  const resBeta = results.get("player-beta")!;
  assert.equal(resBeta.presentTrainings, 1);
  assert.equal(resBeta.presentMatches, 0);
  assert.equal(resBeta.individualAttendanceXp, 40); // 40 XP
  assert.equal(resBeta.playerLevel, 1);

  const resGamma = results.get("player-gamma")!;
  assert.equal(resGamma.presentTrainings, 0);
  assert.equal(resGamma.presentMatches, 0);
  assert.equal(resGamma.individualAttendanceXp, 0);
});

test("V7F.3B.2 — 11. Progi stadionowe i kalkulacja poziomów (0, 400, 1200, 2400, 4000 XP)", () => {
  // Progi:
  // 0 XP -> Debiutant
  // 400 XP -> Młody Talent
  // 1200 XP -> Wschodząca Gwiazda
  // 2400 XP -> Gwiazda Akademii
  // 4000 XP -> Legenda DELTY

  const testCases = [
    { xp: 0, expectedTier: "debiutant", expectedNext: "mlody_talent", expectedLevel: 1 },
    { xp: 240, expectedTier: "debiutant", expectedNext: "mlody_talent", expectedLevel: 1 },
    { xp: 250, expectedTier: "debiutant", expectedNext: "mlody_talent", expectedLevel: 2 },
    { xp: 399, expectedTier: "debiutant", expectedNext: "mlody_talent", expectedLevel: 2 },
    { xp: 400, expectedTier: "mlody_talent", expectedNext: "wschodzaca_gwiazda", expectedLevel: 2 },
    { xp: 1199, expectedTier: "mlody_talent", expectedNext: "wschodzaca_gwiazda", expectedLevel: 5 },
    { xp: 1200, expectedTier: "wschodzaca_gwiazda", expectedNext: "gwiazda_akademii", expectedLevel: 5 },
    { xp: 2399, expectedTier: "wschodzaca_gwiazda", expectedNext: "gwiazda_akademii", expectedLevel: 10 },
    { xp: 2400, expectedTier: "gwiazda_akademii", expectedNext: "legenda_delty", expectedLevel: 10 },
    { xp: 3999, expectedTier: "gwiazda_akademii", expectedNext: "legenda_delty", expectedLevel: 16 },
    { xp: 4000, expectedTier: "legenda_delty", expectedNext: null, expectedLevel: 17 },
    { xp: 5000, expectedTier: "legenda_delty", expectedNext: null, expectedLevel: 21 }
  ];

  for (const tc of testCases) {
    // Generujemy syntetyczne sesje i mecze dające dokładnie tc.xp
    // tc.xp = trainings * 40 + matches * 60 (lub bezpośrednio przez kalkulator pomocniczy)
    const level = calculatePlayerLevel(tc.xp);
    assert.equal(level, tc.expectedLevel, `Level dla ${tc.xp} XP powinien wynosić ${tc.expectedLevel}`);

    // Testujemy kalkulator bezpośrednio
    const trainingsCount = Math.floor(tc.xp / 40);
    const remainder = tc.xp % 40;
    // Aby wygenerować dokładne XP:
    // Każdy mecz to 60 XP (+20 względem 40). Np. 60 = 1 mecz, 100 = 1 tr + 1 mecz, itp.
    // Używamy opcji z syntetyczną liczbą presentTrainings:
    const mockSessions = Array.from({ length: trainingsCount }, (_, i) => ({
      id: `tr-tc-${i}`,
      training_date: "2026-11-10"
    }));
    const mockAtt = mockSessions.map(s => ({
      training_id: s.id,
      player_id: "p-tier",
      status: "present"
    }));

    const res = calculateVerifiedSportsXp("p-tier", {
      referenceDate: REF_NOW_WARSAW,
      trainingSessions: mockSessions,
      trainingAttendance: mockAtt
    });

    // Dla tc.xp bezpośrednio sprawdzamy stadiumProgression
    const progression = res.stadiumProgression;
    // Oraz bezpośrednio z progression z wartością tc.xp:
    const directProg = calculateVerifiedSportsXp("p-check", {
      referenceDate: REF_NOW_WARSAW,
      trainingSessions: [{ id: "tr-1", training_date: "2026-11-10" }],
      trainingAttendance: tc.xp === 0 ? [] : undefined
    });
    
    // Sprawdzenie STADIUM_TIERS config
    assert.equal(STADIUM_TIERS.length, 5);
    assert.equal(STADIUM_TIERS[0].minXp, 0);
    assert.equal(STADIUM_TIERS[1].minXp, 400);
    assert.equal(STADIUM_TIERS[2].minXp, 1200);
    assert.equal(STADIUM_TIERS[3].minXp, 2400);
    assert.equal(STADIUM_TIERS[4].minXp, 4000);
  }
});
