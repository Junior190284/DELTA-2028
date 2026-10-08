import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Development / Localhost fallback if dev user cookie is set
    try {
      const cookieStore = await cookies();
      const devRole = cookieStore.get("delta_dev_user")?.value;
      if (devRole) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("id,role,display_name")
          .eq("role", devRole)
          .limit(1)
          .maybeSingle();

        if (profile) {
          return {
            user: { id: profile.id, email: `${devRole}@delta.local` } as any,
            profile,
            error: null
          };
        } else {
          // If no profile exists for this role, return a generic dev profile
          return {
            user: { id: "dev_admin_user", email: "admin@delta.local" } as any,
            profile: { id: "dev_admin_user", role: devRole, display_name: devRole === "admin" ? "Trener / Administrator (Dev)" : "Rodzic (Dev)" },
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

  return {
    user,
    profile: elevated.data,
    error: elevated.error?.message || normal.error?.message || null
  };
}
