import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
}

export interface BootstrappedProfileRow {
  id: string;
  role: string;
  display_name: string | null;
}

export interface ProfileBootstrapResult {
  profile: BootstrappedProfileRow | null;
  created: boolean;
  error: string | null;
}

const DEFAULT_FALLBACK_DISPLAY_NAME = "Rodzic DELTA";
const ALLOWED_CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;

/**
 * Sanitizes OAuth callback `next` targets so redirects never leave the application origin.
 * Rejects absolute URLs, protocol-relative URLs (`//`), backslash smuggling (`/\`), and control chars.
 */
export function sanitizeSafeRedirectPath(
  rawNext: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (typeof rawNext !== "string") {
    return fallback;
  }

  const trimmed = rawNext.trim();
  if (!trimmed || ALLOWED_CONTROL_CHAR_RE.test(trimmed)) {
    return fallback;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  try {
    const sentinelOrigin = "https://delta.internal";
    const parsed = new URL(trimmed, sentinelOrigin);
    if (
      parsed.origin !== sentinelOrigin ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname.startsWith("//")
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Derives a safe display_name for a brand-new profile strictly from verified auth metadata or email.
 * Never reads or trusts role claims.
 */
export function deriveSafeProfileDisplayName(user: AuthUserLike): string {
  const meta = user.user_metadata || {};
  const candidates = [meta.full_name, meta.name, meta.display_name];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const cleaned = candidate.replace(/\s+/g, " ").trim().slice(0, 80);
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }

  if (typeof user.email === "string" && user.email.trim().length > 0) {
    const localPart = user.email.split("@")[0]?.trim() || "";
    const cleaned = (localPart || user.email.trim()).slice(0, 80);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  return DEFAULT_FALLBACK_DISPLAY_NAME;
}

function isDuplicateKeyError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key value violates unique constraint/i.test(error.message || "");
}

/**
 * Idempotently guarantees a `public.profiles` row exists for an authenticated user without
 * ever overwriting or modifying existing profiles or roles (`admin`, `coach`, `parent`, etc.).
 * New users always receive the server-enforced default role `'parent'`.
 */
export async function ensureUserProfileExists(
  adminClient: SupabaseClient,
  user: AuthUserLike | null | undefined
): Promise<ProfileBootstrapResult> {
  if (!user || typeof user.id !== "string" || user.id.trim() === "") {
    return { profile: null, created: false, error: "Invalid authenticated user" };
  }

  const userId = user.id.trim();

  // 1. Read existing profile first — never update or overwrite an existing profile or role
  const existing = await adminClient
    .from("profiles")
    .select("id,role,display_name")
    .eq("id", userId)
    .maybeSingle();

  if (existing.data) {
    return {
      profile: existing.data as BootstrappedProfileRow,
      created: false,
      error: null
    };
  }

  if (existing.error) {
    return {
      profile: null,
      created: false,
      error: existing.error.message
    };
  }

  // 2. Insert strictly with server-hardcoded role `'parent'` (no upsert overwrite risk)
  const displayName = deriveSafeProfileDisplayName(user);
  const inserted = await adminClient
    .from("profiles")
    .insert({
      id: userId,
      display_name: displayName,
      role: "parent"
    })
    .select("id,role,display_name")
    .maybeSingle();

  if (inserted.data && !inserted.error) {
    return {
      profile: inserted.data as BootstrappedProfileRow,
      created: true,
      error: null
    };
  }

  // 3. Concurrent OAuth callback / simultaneous login race condition (23505): re-read existing row
  if (isDuplicateKeyError(inserted.error)) {
    const raced = await adminClient
      .from("profiles")
      .select("id,role,display_name")
      .eq("id", userId)
      .maybeSingle();

    return {
      profile: (raced.data as BootstrappedProfileRow) ?? null,
      created: false,
      error: raced.error?.message || null
    };
  }

  return {
    profile: null,
    created: false,
    error: inserted.error?.message || "Failed to create missing user profile"
  };
}
