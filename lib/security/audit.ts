// lib/security/audit.ts
// Central Audit Logging Helper

import { createClient } from '@/lib/supabase/server';

export interface AuditLogPayload {
  userId: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}

export async function logAuditAction(payload: AuditLogPayload): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('audit_logs').insert({
      user_id: payload.userId,
      user_email: payload.userEmail || null,
      user_role: payload.userRole || 'user',
      action: payload.action,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId || null,
      old_data: payload.oldData || null,
      new_data: payload.newData || null,
      ip_address: payload.ipAddress || null,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Failed to write audit log:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Audit log exception:', err);
    return false;
  }
}
