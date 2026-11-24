export type DataStatus = "available" | "empty" | "unavailable";
export type UnavailableReason = "not_loaded" | "not_authorized" | "no_linked_player";
export type Section<T> = { status: DataStatus; data: T | null; reason?: UnavailableReason };

export type PlayerSummary = { id: string; displayName: string; shirtNumber: number | null; position: string | null };
export type ProfileModel = {
  accountId: string;
  actorKind: "parent" | "player" | "staff" | "user";
  displayName: string;
  teamName: string | null;
  player: Section<PlayerSummary>;
};
export type NextAction = {
  kind: "match" | "training"; id: string | null; title: string; startsAt: string | null;
  location: string | null; opponent: string | null; countdown: string | null;
};
export type LevelProgress = {
  level: number;
  title: string;
  currentXP: number;
  seasonXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  activityStreak: number;
  maxStreak: number;
  verifiedTrainings?: number;
  verifiedMatches?: number;
  stadiumStage?: string;
  attendanceRatePercent?: number | null;
  nextAchievement?: NextAchievementProgress | null;
};
export type RecentCard = {
  userCardId: string; definitionId: string; name: string; rarity: string | null;
  playerName: string | null; acquiredAt: string | null; artworkUrl: string | null;
};
export type SeriesProgress = {
  id: string;
  name: string;
  category: "base" | "matchday" | "inferno" | "other";
  owned: number;
  total: number | null;
  percent: number | null;
};
export type AlbumProgress = {
  owned: number;
  total: number | null;
  percent: number | null;
  duplicates: number;
  unopenedPacks: number;
  series?: SeriesProgress[];
};
export type NextAchievementProgress = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  current: number;
  target: number;
  percent: number;
};
export type RecentAchievement = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  unlockedAt: string | null;
  category?: string | null;
  rarity?: string | null;
};
export type TeamShowcaseSummary = { playerCount: number; featuredPlayers: PlayerSummary[]; entryPoint: "players" };
export type ClubCommunication = {
  id: string; title: string; summary: string | null; publishedAt: string | null;
  source: "news" | "club_update"; urgent: boolean;
};

export interface DashboardUI4Model {
  profile: ProfileModel;
  nextAction: Section<NextAction>;
  progress: Section<LevelProgress>;
  recentCards: Section<RecentCard[]>;
  albumProgress: Section<AlbumProgress>;
  recentAchievements: Section<RecentAchievement[]>;
  teamShowcase: Section<TeamShowcaseSummary>;
  clubCommunications: Section<ClubCommunication[]>;
}

export type DashboardUI4Access = {
  canViewCollection: boolean; canViewAchievements: boolean;
  canViewTeamShowcase: boolean; canViewClubCommunications: boolean;
};
export type ProfileInput = { id: string; role?: string | null; display_name?: string | null };
export type PlayerInput = {
  id: string; display_name?: string | null; name?: string | null; shirt_number?: number | null;
  position?: string | null; active?: boolean | null;
};
export type EventInput = {
  id?: string | null; title?: string | null; starts_at?: string | null; start_time?: string | null;
  location?: string | null; opponent?: string | null;
};
export type GameProfileInput = {
  currentXP: number; seasonXP: number;
  levelInfo: { level: number; currentLevelXP: number; nextLevelXP: number; progressPercent: number; title: string };
  activityStreak: number; maxStreak: number; unopenedPacks?: number;
};
export type CardDefinitionInput = {
  id: string; name?: string | null; title?: string | null; rarity?: string | null; card_type?: string | null;
  image_url?: string | null; artwork_url?: string | null; player?: PlayerInput | null;
};
export type UserCardInput = {
  id: string;
  card_id?: string | null;
  card_definition_id?: string | null;
  quantity?: number | null;
  duplicates_count?: number | null;
  acquired_at?: string | null;
  created_at?: string | null;
  card_definition?: CardDefinitionInput | null;
  card?: CardDefinitionInput | null;
};
export type AchievementInput = {
  id?: string; achievement_id?: string; name?: string | null; title?: string | null;
  description?: string | null; icon?: string | null; icon_url?: string | null;
  category?: string | null; rarity?: string | null;
  isUnlocked?: boolean; is_unlocked?: boolean; unlockedAt?: string | null; unlocked_at?: string | null;
  achievement?: { id?: string; name?: string | null; title?: string | null; description?: string | null; icon?: string | null; icon_url?: string | null; category?: string | null; rarity?: string | null } | null;
};
export type CommunicationInput = {
  id: string; title: string; summary?: string | null; content?: string | null;
  published_at?: string | null; created_at?: string | null; urgent?: boolean | null;
};
export interface SportsXpInput {
  sportsXp: number;
  playerLevel: number;
  currentLvlXp: number;
  neededLvlXp: number;
  progressPercent: number;
  presentTrainings: number;
  presentMatches: number;
  stadiumTierTitle: string;
  attendanceRatePercent?: number | null;
}
export interface DashboardUI4AdapterInput {
  profile: ProfileInput; access: DashboardUI4Access; teamName?: string | null;
  players?: PlayerInput[]; parentPlayerIds?: string[];
  nextMatch?: EventInput | null; nextMatchCountdown?: string | null;
  nextTraining?: { session: EventInput; start?: string | null; countdown?: string | null } | null;
  gameProfile?: GameProfileInput | null;
  sportsXp?: SportsXpInput | null;
  progressUnavailableReason?: UnavailableReason;
  allCards?: CardDefinitionInput[]; userCards?: UserCardInput[];
  unopenedPacksCount?: number;
  isAuthoritativeCatalog?: boolean;
  achievements?: AchievementInput[];
  nextAchievement?: NextAchievementProgress | null;
  news?: CommunicationInput[]; clubUpdates?: CommunicationInput[];
}
