export type SystemEventType =
  | 'MATCH_CREATED'
  | 'MATCH_UPDATED'
  | 'MATCH_CANCELLED'
  | 'MATCH_RESULT_UPDATED'
  | 'TRAINING_CREATED'
  | 'TRAINING_UPDATED'
  | 'TRAINING_CANCELLED'
  | 'LINEUP_PUBLISHED'
  | 'GALLERY_CREATED'
  | 'GALLERY_UPDATED'
  | 'VIDEO_PUBLISHED'
  | 'PLAYER_ACHIEVEMENT'
  | 'PLAYER_CARD_UNLOCKED'
  | 'CLUB_NEWS'
  | 'SYSTEM_MESSAGE'
  | 'SYNC_ERROR';

export type EventAudienceType = 'TEAM' | 'USER' | 'PLAYER' | 'ADMIN';

export interface DeltaSystemEvent {
  id: string; // Deterministic dedupe key or UUID
  type: SystemEventType;
  title: string;
  message: string;
  source: string;
  importance: EventImportance;
  audience_type?: EventAudienceType;
  target_user_id?: string | null;
  target_player_id?: string | null;
  related_entity_type?: 'match' | 'training' | 'lineup' | 'player' | 'achievement' | 'card' | 'club_update' | 'sync' | string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  dedupe_key?: string;
  created_at: string;
  is_read?: boolean;
  is_seen?: boolean;
}

export interface DeltaChangeRecord {
  id?: string;
  entity_type: 'match' | 'training' | 'lineup' | 'club_update' | string;
  entity_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface PushNotificationPreferences {
  matches: boolean;
  schedule_changes: boolean;
  trainings: boolean;
  lineup: boolean;
  results: boolean;
  fantasy: boolean;
  achievements: boolean;
  gallery: boolean;
  tv: boolean;
  club_news: boolean;
}

export const DEFAULT_PUSH_PREFERENCES: PushNotificationPreferences = {
  matches: true,
  schedule_changes: true,
  trainings: true,
  lineup: true,
  results: true,
  fantasy: true,
  achievements: true,
  gallery: true,
  tv: true,
  club_news: true
};
