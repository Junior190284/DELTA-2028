import type { Player, TrainingGame } from "@/components/training/DeltaTrainingCenter20";

export type TrainingEventType = "goal" | "own_goal";

export interface TrainingLiveEvent {
  id: string;
  game_id: string;
  event_type: TrainingEventType;
  player_id: string | null;         // Strzelec (null = nieznany strzelec)
  assist_player_id: string | null;  // Asystent (null = bez asysty)
  team_side: "A" | "B";             // Do której strony wyniku zalicza się bramka (A = team_a, B = team_b)
  created_at: string;
}

export interface PlayerLiveStat {
  player_id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  games: number;
  goals: number;
  assists: number;
  ga: number;
  own_goals: number;
}

export interface LiveStatsSummary {
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalOwnGoals: number;
  topScorers: PlayerLiveStat[];
  topAssisters: PlayerLiveStat[];
  topGA: PlayerLiveStat[];
  playerStats: Record<string, PlayerLiveStat>;
}

/**
 * Przelicza wynik meczu na podstawie listy zarejestrowanych bramek.
 * Zachowuje kompatybilność: jeśli brak zdarzeń, zachowuje manualny wynik początkowy (jeśli podano fallback).
 */
export function calculateGameScoreFromEvents(
  gameId: string,
  events: TrainingLiveEvent[],
  fallbackScore?: { team_a_score: number; team_b_score: number }
): { team_a_score: number; team_b_score: number; hasEvents: boolean } {
  const matchEvents = events.filter(e => e.game_id === gameId);
  if (matchEvents.length === 0 && fallbackScore) {
    return {
      team_a_score: fallbackScore.team_a_score,
      team_b_score: fallbackScore.team_b_score,
      hasEvents: false,
    };
  }

  let scoreA = 0;
  let scoreB = 0;

  for (const ev of matchEvents) {
    if (ev.team_side === "A") {
      scoreA++;
    } else if (ev.team_side === "B") {
      scoreB++;
    }
  }

  return {
    team_a_score: scoreA,
    team_b_score: scoreB,
    hasEvents: matchEvents.length > 0,
  };
}

/**
 * Agreguje statystyki indywidualne zawodników oraz całego treningu ze wszystkich meczów i zdarzeń.
 */
export function aggregateTrainingLiveStats(
  players: Player[],
  games: TrainingGame[],
  gamePlayers: { game_id: string; player_id: string; team: string }[],
  events: TrainingLiveEvent[]
): LiveStatsSummary {
  const statsMap: Record<string, PlayerLiveStat> = {};

  for (const p of players) {
    statsMap[p.id] = {
      player_id: p.id,
      display_name: p.display_name,
      shirt_number: p.shirt_number,
      position: p.position,
      games: 0,
      goals: 0,
      assists: 0,
      ga: 0,
      own_goals: 0,
    };
  }

  // Oblicz rozegrane mecze dla każdego zawodnika (unikalne wystąpienia w gamePlayers)
  const playerGamesCount: Record<string, Set<string>> = {};
  for (const gp of gamePlayers) {
    if (!playerGamesCount[gp.player_id]) {
      playerGamesCount[gp.player_id] = new Set();
    }
    playerGamesCount[gp.player_id].add(gp.game_id);
  }

  for (const [pid, matchSet] of Object.entries(playerGamesCount)) {
    if (statsMap[pid]) {
      statsMap[pid].games = matchSet.size;
    }
  }

  let totalGoals = 0;
  let totalAssists = 0;
  let totalOwnGoals = 0;

  for (const ev of events) {
    if (ev.event_type === "goal") {
      totalGoals++;
      if (ev.player_id && statsMap[ev.player_id]) {
        statsMap[ev.player_id].goals++;
      }
      if (ev.assist_player_id && statsMap[ev.assist_player_id]) {
        statsMap[ev.assist_player_id].assists++;
        totalAssists++;
      }
    } else if (ev.event_type === "own_goal") {
      totalOwnGoals++;
      if (ev.player_id && statsMap[ev.player_id]) {
        statsMap[ev.player_id].own_goals++;
      }
    }
  }

  // Przelicz G+A
  for (const stat of Object.values(statsMap)) {
    stat.ga = stat.goals + stat.assists;
  }

  const allStats = Object.values(statsMap);

  const topScorers = [...allStats]
    .filter(s => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  const topAssisters = [...allStats]
    .filter(s => s.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals);

  const topGA = [...allStats]
    .filter(s => s.ga > 0)
    .sort((a, b) => b.ga - a.ga || b.goals - a.goals);

  return {
    totalMatches: games.length,
    totalGoals,
    totalAssists,
    totalOwnGoals,
    topScorers,
    topAssisters,
    topGA,
    playerStats: statsMap,
  };
}
