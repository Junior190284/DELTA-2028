import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserProfileExists } from "@/lib/auth/profile-bootstrap";
import { cookies, headers } from "next/headers";

export async function getCurrentProfile(req?: Request) {
  // Support Authorization: Bearer <token> for API callers and automated tests
  try {
    let authHeader: string | null = null;
    if (req) {
      authHeader = req.headers.get("authorization");
    } else {
      const headerStore = await headers();
      authHeader = headerStore.get("authorization");
    }

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const admin = createAdminClient();
      const { data: { user }, error: userError } = await admin.auth.getUser(token);
      if (user && !userError) {
        const { data: profile } = await admin
          .from("profiles")
          .select("id,role,display_name")
          .eq("id", user.id)
          .maybeSingle();

        return { user, profile, error: null };
      }
    }
  } catch {}

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Development / Localhost fallback if dev user cookie is set (strictly loopback only, never on Vercel)
    try {
      const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
      const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
      const headerStore = await headers();
      const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
      const isLoopback = host.startsWith("localhost") || host.startsWith("127.0.0.1");

      if (!isProduction && !isVercel && isLoopback) {
        const cookieStore = await cookies();
        const rawRole = cookieStore.get("delta_dev_user")?.value;
        const devRole = (rawRole === "admin" || rawRole === "coach" || rawRole === "parent") ? rawRole : null;
        if (devRole) {
          // In dev fallback mode, NEVER impersonate real profiles or real user IDs from the database
          return {
            user: { id: `dev_user_${devRole}`, email: `${devRole}@delta.local` } as any,
            profile: {
              id: `dev_user_${devRole}`,
              role: devRole,
              display_name: devRole === "admin" ? "Administrator (Dev Mock)" : devRole === "coach" ? "Trener (Dev Mock)" : "Rodzic (Dev Mock)"
            },
            error: null
          };
        }
      }
    } catch {}

    return { user: null, profile: null, error: userError?.message || "Not authenticated" };
  }

  // First try the normal authenticated/RLS path.
  const normal = await supabase
    .from("profiles")
    .select("id,role,display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (normal.data && !normal.error) {
    return { user, profile: normal.data, error: null };
  }

  // Server-only fallback. The secret key never reaches the browser.
  const admin = createAdminClient();
  const elevated = await admin
    .from("profiles")
    .select("id,role,display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (elevated.data || elevated.error) {
    return {
      user,
      profile: elevated.data,
      error: elevated.error?.message || normal.error?.message || null
    };
  }

  // Idempotent server-side bootstrap ONLY when authenticated user has no row in public.profiles
  const bootstrapped = await ensureUserProfileExists(admin, user);
  return {
    user,
    profile: bootstrapped.profile,
    error: bootstrapped.error || normal.error?.message || null
  };
}
