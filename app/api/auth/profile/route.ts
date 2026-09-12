import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/current-profile";

export async function GET() {
  const { user, profile, error } = await getCurrentProfile();
  return NextResponse.json({
    authenticated: !!user,
    email: user?.email ?? null,
    user_id: user?.id ?? null,
    profile,
    error
  });
}
