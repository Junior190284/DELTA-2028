/**
 * DELTA-051T6 — SMART CALENDAR PRO TYPES & UTILITIES
 */

export type SmartCalendarCategory =
  | "match"                  // Oficjalny mecz ligowy / sparing
  | "training"               // Oficjalny trening drużynowy
  | "tournament"             // Turniej piłkarski
  | "individual_training"    // Trening indywidualny
  | "extra_football"         // Dodatkowy trening piłkarski
  | "other_sport"            // Inna dyscyplina sportowa (np. basen, motoryka)
  | "consultation"           // Konsultacja lub rehabilitacja / fizjo
  | "family_event"           // Wydarzenie rodzinne
  | "trip"                   // Wyjazd / zgrupowanie
  | "absence"                // Zgłoszona nieobecność
  | "birthday"               // Urodziny klubowe
  | "info"                   // Komunikat / organizacyjne
  | "other";                 // Inne

export type SmartCalendarVisibility =
  | "private"        // Widoczne wyłącznie dla zawodnika i opiekunów
  | "coach"          // Udostępnione trenerowi / sztabowi
  | "team_proposal"  // Propozycja dla całej drużyny (wymaga zatwierdzenia przez sztab)
  | "public";        // Oficjalne wydarzenie klubowe (dla wszystkich)

export type SmartCalendarStatus =
  | "scheduled"      // Zaplanowane
  | "in_progress"    // W trakcie
  | "completed"      // Zakończone
  | "cancelled"      // Odwołane
  | "postponed";     // Przełożone

export interface SmartCalendarComment {
  id: string;
  event_id: string;
  user_id: string;
  author_name: string;
  author_role: "admin" | "coach" | "parent" | "player";
  content: string;
  is_edited: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SmartCalendarPrivateNote {
  id: string;
  event_id: string;
  user_id: string;
  note: string;
  updated_at: string;
}

export interface SmartCalendarItem {
  id: string;
  title: string;
  category: SmartCalendarCategory;
  event_date: string;       // YYYY-MM-DD
  end_date?: string | null;  // YYYY-MM-DD (dla wydarzeń wielodniowych)
  start_time?: string | null; // HH:MM
  end_time?: string | null;   // HH:MM
  is_all_day?: boolean;
  location?: string | null;
  description?: string | null;
  organizer?: string | null;
  visibility: SmartCalendarVisibility;
  status: SmartCalendarStatus;
  is_official?: boolean;      // Czy to oficjalny mecz/trening klubu (rodzic nie może edytować)
  is_approved?: boolean;
  important?: boolean;
  player_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  // Linkages
  match_id?: string | null;
  training_id?: string | null;
  // Comments and private notes count
  comments_count?: number;
  has_private_note?: boolean;
}

export const CALENDAR_CATEGORIES: {
  key: SmartCalendarCategory;
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}[] = [
  { key: "match", label: "Mecz ligowy / sparing", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" },
  { key: "training", label: "Trening drużynowy", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { key: "tournament", label: "Turniej", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", dot: "bg-purple-400" },
  { key: "individual_training", label: "Trening indywidualny", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30", dot: "bg-sky-400" },
  { key: "extra_football", label: "Dodatkowy trening", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400" },
  { key: "other_sport", label: "Inna dyscyplina", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30", dot: "bg-teal-400" },
  { key: "consultation", label: "Fizjo / Konsultacja", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-400" },
  { key: "family_event", label: "Wydarzenie rodzinne", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", dot: "bg-indigo-400" },
  { key: "trip", label: "Wyjazd / Zgrupowanie", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-400" },
  { key: "absence", label: "Nieobecność", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400" },
  { key: "birthday", label: "Urodziny klubowe", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30", dot: "bg-pink-400" },
  { key: "info", label: "Komunikat klubu", color: "text-slate-300", bg: "bg-white/[0.05]", border: "border-white/10", dot: "bg-slate-300" },
  { key: "other", label: "Inne wydarzenie", color: "text-slate-400", bg: "bg-white/[0.03]", border: "border-white/5", dot: "bg-slate-400" },
];

export const CALENDAR_STATUS_LABELS: Record<SmartCalendarStatus, { label: string; color: string; badge: string }> = {
  scheduled: { label: "Zaplanowane", color: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  in_progress: { label: "W trakcie", color: "text-amber-400", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  completed: { label: "Zakończone", color: "text-slate-400", badge: "bg-slate-700/40 text-slate-300 border-slate-600/30" },
  cancelled: { label: "Odwołane", color: "text-red-400", badge: "bg-red-500/20 text-red-300 border-red-500/30" },
  postponed: { label: "Przełożone", color: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
};

export const CALENDAR_VISIBILITY_LABELS: Record<SmartCalendarVisibility, { label: string; desc: string }> = {
  private: { label: "Prywatne", desc: "Widoczne wyłącznie dla zawodnika i opiekunów" },
  coach: { label: "Udostępnione trenerowi", desc: "Widoczne dla Ciebie i sztabu trenerskiego" },
  team_proposal: { label: "Propozycja dla drużyny", desc: "Wymaga weryfikacji i zatwierdzenia przez sztab" },
  public: { label: "Publiczne klubowe", desc: "Widoczne dla całej społeczności DELTA" },
};

/**
 * Filtruje pozycje kalendarza według uprawnień użytkownika i zakresu widoczności
 */
export function filterCalendarItemsByPermissions(
  items: SmartCalendarItem[],
  userId: string,
  userRole: string,
  userChildPlayerIds: string[] = []
): SmartCalendarItem[] {
  const isStaff = userRole === "admin" || userRole === "coach";

  return items.filter(item => {
    // 1. Zdarzenia publiczne widzą wszyscy
    if (item.visibility === "public") return true;

    // 2. Sztab widzi wszystko oprócz ściśle prywatnych notatek/wydarzeń innych użytkowników
    if (isStaff) {
      if (item.visibility === "coach" || item.visibility === "team_proposal") return true;
      if (item.created_by === userId) return true;
      return false; // ściśle prywatne innych użytkowników nie są udostępniane
    }

    // 3. Rodzic / Zawodnik widzi swoje własne pozycje
    if (item.created_by === userId) return true;

    // 4. Jeśli powiązane z dzieckiem rodzica
    if (item.player_id && userChildPlayerIds.includes(item.player_id)) return true;

    return false;
  });
}
