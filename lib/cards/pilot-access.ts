/**
 * DELTA COLLECTION 3D ENGINE — PILOT ACCESS SERVICE
 * 
 * Server-side evaluation of 3D Walkout presentation access.
 * Strict Default Deny policy.
 * 
 * Invariants:
 * 1. Default Deny: Returns false unless explicitly verified.
 * 2. Explicit approved user IDs only (whitelist).
 * 3. NO automatic access for admins or coaches.
 * 4. Zero client parameters (no URL params, no headers, no body overrides).
 * 5. Tester IDs strictly on server (never in client JS).
 * 6. Central kill switch in app_settings or environment variable.
 * 7. Any error, timeout, or missing config safely falls back to false.
 */

import { createAdminClient } from "../supabase/admin.ts";

export interface PilotConfig {
  kill_switch?: boolean;
  enabled?: boolean;
  allowed_user_ids?: string[];
}

export interface DeterminePilotAccessOptions {
  /** Optional override for testing or manual injection of config */
  mockConfig?: PilotConfig | null;
  /** Force bypass database lookup (e.g. for unit tests) */
  skipDb?: boolean;
}

/**
 * Evaluates whether the given user is authorized to receive Universal Walkout 3D.
 * 
 * @param supabase Authenticated Supabase client (server-side only)
 * @param userId Verified user ID from Supabase auth
 * @param options Optional overrides for testing
 * @returns boolean true ONLY if pilot is enabled, kill-switch is inactive, and userId is in whitelist
 */
export async function determine3DWalkoutAccess(
  supabase?: any,
  userId?: string | null,
  options?: DeterminePilotAccessOptions
): Promise<boolean> {
  // 1. Identity validation (Default Deny on unauthenticated or invalid user)
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return false;
  }

  // 2. Central Server Kill Switch (Environment variable overrides all)
  if (process.env.COLLECTION_3D_KILL_SWITCH === "true") {
    return false;
  }

  try {
    let config: PilotConfig | null = options?.mockConfig || null;

    if (!config && !options?.skipDb) {
      // Use service_role client on server if available, so allowed_user_ids is never readable by regular user clients
      let db = supabase;
      if (typeof window === "undefined" && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) {
        try {
          db = createAdminClient();
        } catch {
          db = supabase;
        }
      }

      if (db) {
        const { data, error } = await db
          .from("app_settings")
          .select("value")
          .eq("key", "collection_3d_pilot")
          .maybeSingle();

        if (error && error.code !== "PGRST116" && error.code !== "PGRST205") {
          console.warn("[PilotAccess] Warning reading app_settings:", error.message);
        }

        if (data?.value && typeof data.value === "object") {
          config = data.value as PilotConfig;
        }
      }
    }

    // 3. Central Kill Switch check from DB config
    if (config?.kill_switch === true) {
      return false;
    }

    // 4. Pilot Enabled check (must be explicitly enabled)
    const isDbEnabled = config?.enabled === true;
    const isEnvEnabled = process.env.PILOT_3D_WALKOUT_ENABLED === "true";
    if (!isDbEnabled && !isEnvEnabled) {
      return false;
    }

    // 5. Gather allowed user IDs from DB and server environment
    const allowedSet = new Set<string>();

    if (config?.allowed_user_ids && Array.isArray(config.allowed_user_ids)) {
      config.allowed_user_ids.forEach(id => {
        if (typeof id === "string" && id.trim()) {
          allowedSet.add(id.trim().toLowerCase());
        }
      });
    }

    const envTesterIds = (process.env.PILOT_3D_WALKOUT_TESTER_IDS || "")
      .split(",")
      .map(id => id.trim().toLowerCase())
      .filter(Boolean);

    envTesterIds.forEach(id => allowedSet.add(id));

    // Whitelist must be non-empty
    if (allowedSet.size === 0) {
      return false;
    }

    // 6. Strict Whitelist Check - NO automatic admin/coach bypass!
    const normalizedUserId = userId.trim().toLowerCase();
    return allowedSet.has(normalizedUserId);
  } catch (err) {
    // Safety: any error falls back safely to false
    console.warn("[PilotAccess] Error resolving pilot access:", err);
    return false;
  }
}
