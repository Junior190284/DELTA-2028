export interface UserGamificationState {
  canDailySpin: boolean;
  unopenedPacksCount: number;
  unclaimedAchievementsCount: number;
  availableQuizCount: number;
  streakCount: number;
  collectionProgressPercent: number;
}

export type ActionId = "daily_spin" | "open_pack" | "claim_achievement" | "take_quiz" | "check_missions" | "completed_all";

export interface NextBestActionData {
  id: ActionId;
  title: string;
  description: string;
  ctaText: string;
  iconName: "Gift" | "Flame" | "Trophy" | "HelpCircle" | "CheckCircle2";
  badgeText: string;
  badgeColor: string;
  priority: number;
  actionType: string;
}

export function determineNextBestAction(state: UserGamificationState): NextBestActionData {
  // Priority 1: Unopened packs waiting
  if (state.unopenedPacksCount > 0) {
    return {
      id: "open_pack",
      title: "Masz nieotwarte paczki!",
      description: `Czeka na Ciebie ${state.unopenedPacksCount} ${state.unopenedPacksCount === 1 ? "nowa paczka" : "nowe paczki"} kart. Otwórz je i powiększ swój album!`,
      ctaText: "Otwórz paczki",
      iconName: "Gift",
      badgeText: `${state.unopenedPacksCount} DO OTWARCIA`,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      priority: 1,
      actionType: "OPEN_PACKS"
    };
  }

  // Priority 2: Daily Spin available
  if (state.canDailySpin) {
    return {
      id: "daily_spin",
      title: "Darmowy Daily Spin gotowy!",
      description: `Zakręć kołem fortuny i kontynuuj serię logowania (Dzień ${state.streakCount}/7).`,
      ctaText: "Zakręć kołem",
      iconName: "Flame",
      badgeText: "DARMOWY SPIN",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
      priority: 2,
      actionType: "DAILY_SPIN"
    };
  }

  // Priority 3: Unclaimed achievements
  if (state.unclaimedAchievementsCount > 0) {
    return {
      id: "claim_achievement",
      title: "Odznaki gotowe do odebrania!",
      description: `Zdobyłeś ${state.unclaimedAchievementsCount} ${state.unclaimedAchievementsCount === 1 ? "nowe osiągnięcie" : "nowe osiągnięcia"}. Odbierz swoje nagrody DP!`,
      ctaText: "Odbierz odznaki",
      iconName: "Trophy",
      badgeText: `${state.unclaimedAchievementsCount} DO ODBIORU`,
      badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
      priority: 3,
      actionType: "CLAIM_ACHIEVEMENTS"
    };
  }

  // Priority 4: Available quizzes
  if (state.availableQuizCount > 0) {
    return {
      id: "take_quiz",
      title: "Quiz wiedzy klubowej",
      description: `Sprawdź swoją wiedzę o DELTA Warszawa i zdobądź punkty za wynik >= 75%.`,
      ctaText: "Rozpocznij quiz",
      iconName: "HelpCircle",
      badgeText: "QUIZ GOTOWY",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      priority: 4,
      actionType: "START_QUIZ"
    };
  }

  // Fallback / All caught up
  return {
    id: "completed_all",
    title: "Wszystko na bieżąco!",
    description: `Świetna robota! Wykonałeś wszystkie dzisiejsze zadania. Twój album jest wypełniony w ${state.collectionProgressPercent}%.`,
    ctaText: "Przeglądaj album",
    iconName: "CheckCircle2",
    badgeText: "100% NA DZIŚ",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    priority: 5,
    actionType: "VIEW_ALBUM"
  };
}

export function mapStreakDays(streakCount: number, canSpin: boolean) {
  return [1, 2, 3, 4, 5, 6, 7].map(day => {
    const isClaimed = day < streakCount || (day === streakCount && !canSpin);
    const isCurrent = day === streakCount && canSpin;
    const isFuture = day > streakCount;
    return { day, isClaimed, isCurrent, isFuture };
  });
}

export function formatCountdownTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getAchievementState(current: number, target: number, claimed: boolean): "LOCKED" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED" {
  if (claimed) return "CLAIMED";
  if (current >= target) return "COMPLETED";
  if (current > 0) return "IN_PROGRESS";
  return "LOCKED";
}

export function getCelebrationTier(tier: "bronze" | "silver" | "gold" | "diamond" | "inferno"): 1 | 2 | 3 | 4 {
  switch (tier) {
    case "bronze":
      return 1;
    case "silver":
      return 2;
    case "gold":
      return 3;
    case "diamond":
    case "inferno":
      return 4;
    default:
      return 1;
  }
}
