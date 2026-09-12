import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    authenticated: !!user,
    email: user?.email ?? null,
    user_id: user?.id ?? null,
    error: error?.message ?? null
  });
}
