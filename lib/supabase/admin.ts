import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must only be executed in a server environment");
  }

  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
