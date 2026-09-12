import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
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
