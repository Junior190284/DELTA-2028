/**
 * DELTA INFERNO — STADIUM PROGRESSION ENGINE (V7F.1B)
 * 
 * Czysty, w pełni deterministyczny moduł wyliczania progresji stadionowej zawodnika.
 * Ściśle odzwierciedla autorytatywne punkty XP ze zweryfikowanej obecności sportowej:
 * - Trening (+40 XP): wyłącznie status "present" potwierdzony przez trenera na odbytej sesji
 * - Mecz (+60 XP): wyłącznie rozegrany mecz (status === "played") z potwierdzonym udziałem
 * - Bez migracji SQL, bez zapisu do bazy danych, bez fikcyjnych nagród.
 */

export type StadiumTierId = 
  | "debiutant" 
  | "mlody_talent" 
  | "wschodzaca_gwiazda" 
  | "gwiazda_akademii" 
  | "legenda_delty";

export interface StadiumTierConfig {
  id: StadiumTierId;
  name: string;
  stageNumber: number;
  minXp: number;
  subtitle: string;
  description: string;
  hasGraphic: boolean;
  bgWebp?: string;
  bgPng?: string;
  accentColor: string;
  milestoneRule: string;
  focusArea: string;
}

export const STADIUM_TIERS: StadiumTierConfig[] = [
  {
    id: "debiutant",
    name: "Debiutant",
    stageNumber: 1,
    minXp: 0,
    subtitle: "Pierwsze kroki w Akademii DELTA",
    description: "Startowa arena treningowa. Regularne zbiórki budują technikę użytkową, dynamikę motoryczną oraz dyscyplinę młodego piłkarza.",
    hasGraphic: true,
    bgWebp: "/assets/stadium-experience/stadium_debiutant.webp",
    bgPng: "/assets/stadium-experience/stadium_debiutant.png",
    accentColor: "#f6c952",
    milestoneRule: "Dostępny od początku drogi sportowej (0 XP)",
    focusArea: "Fundamenty: prowadzenie piłki, przyjęcie kierunkowe, motoryka"
  },
  {
    id: "mlody_talent",
    name: "Młody Talent",
    stageNumber: 2,
    minXp: 400,
    subtitle: "Rytm meczowy i rozgrywki ligowe MZPN",
    description: "Klubowy stadion ligowy z profesjonalnym oświetleniem. Rozwój zespołowy, decyzyjność pod presją i pierwsze zmagania turniejowe.",
    hasGraphic: true,
    bgWebp: "/assets/stadium-experience/stadium_mlody_talent.webp",
    bgPng: "/assets/stadium-experience/stadium_mlody_talent.png",
    accentColor: "#e22e30",
    milestoneRule: "Odblokowanie po osiągnięciu 400 XP sportowego",
    focusArea: "Gra ligowa: współpraca formacji, skuteczność strzelecka, asysty"
  },
  {
    id: "wschodzaca_gwiazda",
    name: "Wschodząca Gwiazda",
    stageNumber: 3,
    minXp: 1200,
    subtitle: "Regularny reprezentant rocznika",
    description: "Duża arena ligowa ze wsparciem trybun. Dojrzałość taktyczna, wysoka powtarzalność zagrań i stabilna forma w meczach ligowych.",
    hasGraphic: false, // neutralny estetyczny stan zablokowany
    accentColor: "#38bdf8",
    milestoneRule: "Wymaga 1200 XP potwierdzonego udziału",
    focusArea: "Taktyka pozycyjna: pressing, szybkie przejście A/D, czytanie gry"
  },
  {
    id: "gwiazda_akademii",
    name: "Gwiazda Akademii",
    stageNumber: 4,
    minXp: 2400,
    subtitle: "Lider formacji i filar zespołu",
    description: "Centralna arena mistrzowska akademii DELTA. Odpowiedzialność za wynik, przewodzenie zespołowi w kluczowych momentach meczów.",
    hasGraphic: false,
    accentColor: "#a855f7",
    milestoneRule: "Wymaga 2400 XP potwierdzonego udziału",
    focusArea: "Przywództwo: organizacja gry, kreacja sytuacji, mentalność zwycięzcy"
  },
  {
    id: "legenda_delty",
    name: "Legenda DELTY",
    stageNumber: 5,
    minXp: 4000,
    subtitle: "Najwyższy laur zaangażowania klubowego",
    description: "Monumentalny stadion legendy. Symbol wzorowej frekwencji, pasji i wieloletniego oddania barwom klubowym DELTA 2018 Górny Mokotów.",
    hasGraphic: false,
    accentColor: "#fbbf24",
    milestoneRule: "Wymaga 4000 XP potwierdzonego udziału",
    focusArea: "Mistrzostwo: wzór dla młodszych roczników, ikona zaangażowania"
  }
];

export interface StadiumProgressionResult {
  currentTier: StadiumTierConfig;
  nextTier: StadiumTierConfig | null;
  currentXp: number;
  xpInCurrentTier: number;
  xpNeededForNextTier: number;
  remainingXp: number;
  progressPercent: number; // 0 do 100 (używa Math.floor dla uczciwości wskaźnika)
  isMaxTier: boolean;
  unlockedTierIds: StadiumTierId[];
}

/**
 * Bezpieczna, deterministyczna funkcja określająca status progresji stadionowej.
 * Nie wykonuje zapytań sieciowych ani zapisu do bazy.
 */
export function calculateStadiumProgression(xp: number): StadiumProgressionResult {
  const safeXp = Math.max(0, Math.floor(xp || 0));

  let currentTierIndex = 0;
  for (let i = 0; i < STADIUM_TIERS.length; i++) {
    if (safeXp >= STADIUM_TIERS[i].minXp) {
      currentTierIndex = i;
    }
  }

  const currentTier = STADIUM_TIERS[currentTierIndex];
  const isMaxTier = currentTierIndex === STADIUM_TIERS.length - 1;
  const nextTier = isMaxTier ? null : STADIUM_TIERS[currentTierIndex + 1];

  let xpInCurrentTier = 0;
  let xpNeededForNextTier = 0;
  let remainingXp = 0;
  let progressPercent = 100;

  if (nextTier) {
    xpNeededForNextTier = nextTier.minXp - currentTier.minXp;
    xpInCurrentTier = safeXp - currentTier.minXp;
    remainingXp = nextTier.minXp - safeXp;
    progressPercent = Math.min(
      100,
      Math.max(0, Math.floor((xpInCurrentTier / xpNeededForNextTier) * 100))
    );
  }

  const unlockedTierIds = STADIUM_TIERS
    .slice(0, currentTierIndex + 1)
    .map(t => t.id);

  return {
    currentTier,
    nextTier,
    currentXp: safeXp,
    xpInCurrentTier,
    xpNeededForNextTier,
    remainingXp,
    progressPercent,
    isMaxTier,
    unlockedTierIds
  };
}

export function isStadiumUnlocked(tierId: StadiumTierId, xp: number): boolean {
  const cfg = STADIUM_TIERS.find(t => t.id === tierId);
  if (!cfg) return false;
  return (xp || 0) >= cfg.minXp;
}
