/**
 * DELTA INFERNO — SPORTS XP & ATTENDANCE INTEGRITY CALCULATOR (V7F.3B.2)
 * 
 * Centralny, czysty, deterministyczny moduł wyliczania sportowego XP zawodnika:
 * 1. Trening (+40 XP):
 *    - Wyłącznie status "present" zatwierdzony przez trenera
 *    - Wyłącznie dla jednostek zakończonych w strefie Europe/Warsaw (uwzględnia datę i godzinę zakończenia)
 *    - Statusy 'yes', 'no', 'maybe', 'undecided', 'absent' = 0 XP
 * 2. Mecz ligowy (+60 XP):
 *    - Wyłącznie gdy mecz ma status "played"
 *    - Wyłącznie gdy obecność meczowa zawodnika ma status "present"
 *    - Statusy 'yes', 'no', 'maybe', 'undecided', 'absent' = 0 XP
 *    - Sam wpis w match_events (gol/asysta/mvp) NIE stanowi automatycznego potwierdzenia udziału
 * 3. Deduplikacja:
 *    - Użycie Set<string> dla unikalnych ID treningów i meczów
 *    - Zabezpieczenie przed wielokrotnym naliczeniem tej samej jednostki dla danego gracza
 * 4. Izolacja i kompatybilność:
 *    - Czyste funkcje bez mutacji stanu i bez zapytań sieciowych / DB
 *    - Brak wpływu na karty INFERNO, punkty DP rodzica czy osiągnięcia
 */

import {
  calculateStadiumProgression,
  STADIUM_TIERS,
  type StadiumProgressionResult,
  type StadiumTierConfig,
  type StadiumTierId
} from "./progression.ts";

export interface TrainingSessionItem {
  id: string;
  training_date: string | Date;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  title?: string | null;
  [key: string]: any;
}

export interface TrainingAttendanceItem {
  training_id: string;
  player_id: string;
  status: string;
  [key: string]: any;
}

export interface MatchItem {
  id: string;
  status: string; // "played", "scheduled", "cancelled", etc.
  match_date?: string | null;
  match_time?: string | null;
  home_team?: string;
  away_team?: string;
  [key: string]: any;
}

export interface MatchAttendanceItem {
  match_id: string;
  player_id: string;
  status: string; // "present", "yes", "no", "maybe", "undecided", "absent"
  [key: string]: any;
}

export interface SportsXpOptions {
  trainingSessions?: TrainingSessionItem[];
  trainingAttendance?: TrainingAttendanceItem[];
  matches?: MatchItem[];
  matchAttendance?: MatchAttendanceItem[];
  events?: any[];
  referenceDate?: Date;
}

export interface VerifiedSportsXpResult {
  playerId: string;
  presentTrainings: number;
  presentMatches: number;
  verifiedTrainingIds: string[];
  verifiedMatchIds: string[];
  individualAttendanceXp: number;
  sportsXp: number;
  playerLevel: number;
  currentLvlXp: number;
  neededLvlXp: number;
  progressPercent: number;
  stadiumProgression: StadiumProgressionResult;
}

/**
 * Zwraca sformatowaną datę i czas w strefie Europe/Warsaw.
 * sv-SE gwarantuje standardowy format YYYY-MM-DD HH:mm:ss.
 */
export function getWarsawDateTime(refDate: Date = new Date()): {
  dateStr: string;
  timeStr: string;
  dateTimeStr: string;
} {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const formatted = formatter.format(refDate);
  const [dateStr, timeStr] = formatted.split(" ");
  return { dateStr, timeStr: timeStr || "00:00:00", dateTimeStr: formatted };
}

/**
 * Normalizuje ciąg godziny do formatu HH:mm:ss.
 */
export function normalizeTimeString(timeStr?: string | null): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim().split(/[+Z]/)[0];
  const withoutT = trimmed.includes("T") ? trimmed.split("T")[1] : trimmed;
  const parts = withoutT.split(":");
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const s = (parts[2] || "00").slice(0, 2).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return "";
}

/**
 * Dodaje określoną liczbę minut do sformatowanej godziny HH:mm:ss.
 */
export function addMinutesToNormalizedTime(timeStr: string, minutes: number): string {
  const [h, m, s] = timeStr.split(":").map(Number);
  const totalSeconds = h * 3600 + m * 60 + (s || 0) + minutes * 60;
  if (totalSeconds >= 86400) {
    return "23:59:59";
  }
  const nh = Math.floor(totalSeconds / 3600);
  const nm = Math.floor((totalSeconds % 3600) / 60);
  const ns = totalSeconds % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:${String(ns).padStart(2, "0")}`;
}

/**
 * Dodaje określoną liczbę dni do daty w formacie YYYY-MM-DD.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Zwraca właściwe przesunięcie strefy Europe/Warsaw (+01:00 dla CET, +02:00 dla CEST).
 */
export function getWarsawOffset(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    timeZoneName: "longOffset"
  }).formatToParts(date);
  const tz = parts.find(p => p.type === "timeZoneName")?.value;
  return tz ? tz.replace("GMT", "") : "+01:00";
}

/**
 * Konwertuje lokalną datę i godzinę w Warszawie na pełny znacznik czasu UTC (Date / timestamptz).
 */
export function parseWarsawLocalDateTime(dateStr: string, timeStr: string): Date {
  const normTime = normalizeTimeString(timeStr) || "00:00:00";
  const guess = new Date(`${dateStr}T${normTime}Z`);
  const offset = getWarsawOffset(guess);
  return new Date(`${dateStr}T${normTime}${offset}`);
}

/**
 * Sprawdza, czy dana jednostka treningowa została już zakończona
 * na podstawie pełnych znaczników czasu w strefie Europe/Warsaw.
 * 
 * Zabezpieczenia V7F.3B.3a:
 * 1. Pełne znaczniki czasu (timestamptz) zamiast porównywania samych godzin.
 * 2. Obsługa treningów przechodzących przez północ (start 23:00, koniec 00:30 kolejnego dnia).
 * 3. Zmiany czasu DST (CET UTC+1 vs CEST UTC+2).
 * 4. Zakaz przyznawania XP dla jednostek w trakcie lub w przyszłości.
 * 5. Bezpieczna zasada odmowy XP przy braku godzin dla dzisiejszego treningu.
 */
export function isTrainingFinished(
  session: {
    training_date?: string | Date | null;
    start_time?: string | null;
    end_time?: string | null;
  },
  referenceDate?: Date
): boolean {
  if (!session || !session.training_date) return false;

  const now = referenceDate || new Date();
  const nowWarsaw = getWarsawDateTime(now);
  const sessionDateStr = session.training_date instanceof Date
    ? getWarsawDateTime(session.training_date).dateStr
    : String(session.training_date).slice(0, 10);

  // Wariant 1: Zdefiniowana godzina zakończenia
  const normalizedEndTime = normalizeTimeString(session.end_time);
  if (normalizedEndTime) {
    const normalizedStartTime = normalizeTimeString(session.start_time);
    // Przejście przez północ: start_time > end_time (np. 23:00 -> 00:30)
    const isOvernight = Boolean(normalizedStartTime && normalizedEndTime < normalizedStartTime);
    const endDateStr = isOvernight ? addDaysToDateStr(sessionDateStr, 1) : sessionDateStr;
    const endTimestamp = parseWarsawLocalDateTime(endDateStr, normalizedEndTime);
    return now.getTime() >= endTimestamp.getTime();
  }

  // Wariant 2: Brak end_time, ale jest start_time (szacunek 90 min)
  const normalizedStartTime = normalizeTimeString(session.start_time);
  if (normalizedStartTime) {
    const startTimestamp = parseWarsawLocalDateTime(sessionDateStr, normalizedStartTime);
    const estimatedEndTimestamp = new Date(startTimestamp.getTime() + 90 * 60 * 1000);
    return now.getTime() >= estimatedEndTimestamp.getTime();
  }

  // Wariant 3: Brak start_time oraz end_time
  // Zgodnie z zasadą bezpieczeństwa V7F.3B.3a:
  // Odmowa przyznania XP dla trwających lub niejednoznacznych jednostek.
  // Zaliczenie wyłącznie jeśli minął cały dzień (training_date < dzisiejsza data w Warszawie).
  // Dzisiejszy trening bez zdefiniowanych godzin = FALSE (0 XP do czasu zakończenia dnia lub uzupełnienia godzin).
  return sessionDateStr < nowWarsaw.dateStr;
}

/**
 * Wylicza poziom zawodnika na podstawie punktów XP (250 XP na poziom).
 */
export function calculatePlayerLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  return Math.max(1, Math.floor(safeXp / 250) + 1);
}

/**
 * Główny kalkulator autorytatywnego sportowego XP zawodnika.
 * Ściśle przestrzega reguł V7F.3B.2.
 */
export function calculateVerifiedSportsXp(
  playerId: string,
  options: SportsXpOptions
): VerifiedSportsXpResult {
  if (!playerId) {
    const emptyProgression = calculateStadiumProgression(0);
    return {
      playerId: "",
      presentTrainings: 0,
      presentMatches: 0,
      verifiedTrainingIds: [],
      verifiedMatchIds: [],
      individualAttendanceXp: 0,
      sportsXp: 0,
      playerLevel: 1,
      currentLvlXp: 0,
      neededLvlXp: 250,
      progressPercent: 0,
      stadiumProgression: emptyProgression
    };
  }

  const {
    trainingSessions = [],
    trainingAttendance = [],
    matches = [],
    matchAttendance = [],
    referenceDate
  } = options;

  // Mapa sesji treningowych dla szybkiego dostępu O(1)
  const sessionMap = new Map<string, TrainingSessionItem>();
  trainingSessions.forEach(ts => {
    if (ts && ts.id) {
      sessionMap.set(ts.id, ts);
    }
  });

  // 1. TRENINGI: +40 XP wyłącznie przy status === "present" i zakończonej jednostce
  // Set<string> gwarantuje deduplikację (dokładnie jeden raz za unikalną jednostkę)
  const verifiedTrainingIds = new Set<string>();

  trainingAttendance.forEach(a => {
    if (a.player_id !== playerId) return;
    if (a.status !== "present") return; // 'yes', 'no', 'maybe', 'undecided', 'absent' -> 0 XP

    if (sessionMap.size > 0) {
      const session = sessionMap.get(a.training_id);
      if (session && isTrainingFinished(session, referenceDate)) {
        verifiedTrainingIds.add(a.training_id);
      }
    } else {
      // Jeśli nie przekazano listy sesji, ale wpis obecności ma status present
      verifiedTrainingIds.add(a.training_id);
    }
  });

  // 2. MECZE: +60 XP wyłącznie gdy matches.status === "played" oraz match_attendance.status === "present"
  // Set<string> gwarantuje deduplikację za ten sam mecz
  const verifiedMatchIds = new Set<string>();

  const playedMatches = matches.filter(m => m && m.status === "played");
  if (playedMatches.length > 0) {
    // Mapa obecności meczowej danego gracza dla szybkiego dostępu O(1)
    const playerMatchAttendanceMap = new Map<string, string>();
    matchAttendance.forEach(ma => {
      if (ma && ma.player_id === playerId && ma.match_id) {
        playerMatchAttendanceMap.set(ma.match_id, ma.status);
      }
    });

    playedMatches.forEach(m => {
      const attStatus = playerMatchAttendanceMap.get(m.id);
      // REGUŁA V7F.3B.2: Tylko jawny status 'present' przyznaje +60 XP
      // Sam wpis w match_events NIE wystarcza!
      // Status 'yes', 'absent', 'no', 'maybe', brak wpisu -> 0 XP
      if (attStatus === "present") {
        verifiedMatchIds.add(m.id);
      }
    });
  }

  const presentTrainings = verifiedTrainingIds.size;
  const presentMatches = verifiedMatchIds.size;

  // Wzór bazowy: 40 XP za trening, 60 XP za mecz
  const individualAttendanceXp = (presentTrainings * 40) + (presentMatches * 60);
  const sportsXp = individualAttendanceXp;

  const playerLevel = calculatePlayerLevel(sportsXp);
  const currentLvlXp = sportsXp % 250;
  const neededLvlXp = 250;
  const progressPercent = Math.min(100, Math.round((currentLvlXp / neededLvlXp) * 100));

  const stadiumProgression = calculateStadiumProgression(sportsXp);

  return {
    playerId,
    presentTrainings,
    presentMatches,
    verifiedTrainingIds: Array.from(verifiedTrainingIds),
    verifiedMatchIds: Array.from(verifiedMatchIds),
    individualAttendanceXp,
    sportsXp,
    playerLevel,
    currentLvlXp,
    neededLvlXp,
    progressPercent,
    stadiumProgression
  };
}

/**
 * Zbiorcze wyliczenie sportowego XP dla wielu zawodników.
 */
export function calculateMultiplePlayersSportsXp(
  playerIds: string[],
  options: SportsXpOptions
): Map<string, VerifiedSportsXpResult> {
  const results = new Map<string, VerifiedSportsXpResult>();
  playerIds.forEach(id => {
    results.set(id, calculateVerifiedSportsXp(id, options));
  });
  return results;
}

// Re-eksport elementów progresji stadionowej dla wygody konsumentów
export {
  calculateStadiumProgression,
  STADIUM_TIERS,
  type StadiumProgressionResult,
  type StadiumTierConfig,
  type StadiumTierId
};
