// lib/security/roles.ts
// Central Role Validation & Permission Enforcement

export type UserRole = 'admin' | 'coach' | 'parent' | 'player' | 'guest';

export interface PermissionCheckContext {
  userId: string;
  role: UserRole;
  parentPlayerIds?: string[];
}

export function canManageMatches(role: UserRole): boolean {
  return role === 'admin' || role === 'coach';
}

export function canGrantCards(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'admin';
}

export function canEditMatchEvents(role: UserRole): boolean {
  return role === 'admin' || role === 'coach';
}

export function canManageTraining(role: UserRole): boolean {
  return role === 'admin' || role === 'coach';
}

export function canAccessChildData(context: PermissionCheckContext, targetPlayerId: string): boolean {
  if (context.role === 'admin' || context.role === 'coach') return true;
  if (context.role === 'parent' && context.parentPlayerIds) {
    return context.parentPlayerIds.includes(targetPlayerId);
  }
  return false;
}
