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
  level: number; title: string; currentXP: number; seasonXP: number; currentLevelXP: number;
  nextLevelXP: number; progressPercent: number; activityStreak: number; maxStreak: number;
};
export type RecentCard = {
  userCardId: string; definitionId: string; name: string; rarity: string | null;
  playerName: string | null; acquiredAt: string | null; artworkUrl: string | null;
};
export type AlbumProgress = { owned: number; total: number; percent: number; duplicates: number; unopenedPacks: number };
export type RecentAchievement = { id: string; name: string; description: string | null; icon: string | null; unlockedAt: string | null };
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
  id: string; name?: string | null; title?: string | null; rarity?: string | null;
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
  isUnlocked?: boolean; is_unlocked?: boolean; unlockedAt?: string | null; unlocked_at?: string | null;
  achievement?: { id?: string; name?: string | null; title?: string | null; description?: string | null; icon?: string | null; icon_url?: string | null } | null;
};
export type CommunicationInput = {
  id: string; title: string; summary?: string | null; content?: string | null;
  published_at?: string | null; created_at?: string | null; urgent?: boolean | null;
};
export interface DashboardUI4AdapterInput {
  profile: ProfileInput; access: DashboardUI4Access; teamName?: string | null;
  players?: PlayerInput[]; parentPlayerIds?: string[];
  nextMatch?: EventInput | null; nextMatchCountdown?: string | null;
  nextTraining?: { session: EventInput; start?: string | null; countdown?: string | null } | null;
  gameProfile?: GameProfileInput | null; allCards?: CardDefinitionInput[]; userCards?: UserCardInput[];
  unopenedPacksCount?: number;
  achievements?: AchievementInput[]; news?: CommunicationInput[]; clubUpdates?: CommunicationInput[];
}
