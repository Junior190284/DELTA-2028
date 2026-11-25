// lib/team/roster-contract.ts
// Strict DTO and Security Sanitization for Team Showcase Roster

export type RosterRole = "primary" | "guest" | "reserve";
export type MembershipStatus = "active" | "injured" | "inactive";

export interface TeamSummaryDto {
  id: string;
  name: string;
  cohortYear: number;
  slug: string;
  category: string;
  active: boolean;
}

export interface TeamRosterPlayerDto {
  id: string;
  displayName: string;
  shirtNumber: number | null;
  position: string;
  rosterRole: RosterRole;
  status: MembershipStatus;
  isCurrentPlayer: boolean;
  canAccessPhoto: boolean;
  photoUrl: string | null;
}

export interface TeamRosterResponse {
  success: true;
  team: TeamSummaryDto;
  callerActiveChildId: string | null;
  callerRole: "admin" | "coach" | "parent";
  players: TeamRosterPlayerDto[];
}

export interface TeamRosterErrorResponse {
  success: false;
  error: string;
  code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
}

/**
 * Strict sanitizer ensuring zero leakage of:
 * - photo_path (never exposed to client)
 * - phone, email, contact data
 * - attendance percentage or history
 * - Sports XP or card collections of teammates
 */
export function sanitizeTeamRosterPlayer(
  raw: {
    id: string;
    display_name: string;
    shirt_number?: string | number | null;
    position?: string | null;
    roster_role?: string | null;
    status?: string | null;
    [key: string]: unknown;
  },
  callerChildIds: string[],
  activeChildId: string | null,
  authorizedPhotoUrl?: string | null
): TeamRosterPlayerDto {
  const isCallerChild = callerChildIds.includes(raw.id);
  const isCurrentActive = Boolean(activeChildId && activeChildId === raw.id);

  const parsedShirt =
    raw.shirt_number !== null && raw.shirt_number !== undefined
      ? parseInt(String(raw.shirt_number).replace(/[^0-9]/g, ""), 10)
      : null;

  const validRole: RosterRole =
    raw.roster_role === "guest" || raw.roster_role === "reserve"
      ? raw.roster_role
      : "primary";

  const validStatus: MembershipStatus =
    raw.status === "injured" || raw.status === "inactive"
      ? raw.status
      : "active";

  return {
    id: String(raw.id),
    displayName: String(raw.display_name || "Zawodnik DELTA").trim(),
    shirtNumber: Number.isNaN(parsedShirt) ? null : parsedShirt,
    position: String(raw.position || "Zawodniczka / Zawodnik").trim(),
    rosterRole: validRole,
    status: validStatus,
    isCurrentPlayer: isCurrentActive || (isCallerChild && !activeChildId),
    canAccessPhoto: isCallerChild,
    photoUrl: isCallerChild ? (authorizedPhotoUrl ?? null) : null,
  };
}
