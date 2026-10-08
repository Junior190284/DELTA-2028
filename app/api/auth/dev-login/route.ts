import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { role = "admin" } = await req.json().catch(() => ({ role: "admin" }));
    const cookieStore = await cookies();

    // Set dev user cookie for localhost testing (1 day expiry)
    cookieStore.set("delta_dev_user", role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
