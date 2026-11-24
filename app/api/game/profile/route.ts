// app/api/game/profile/route.ts
// SECURED LEGACY ENDPOINT (DELTA-037)
// POST is permanently disabled (405 Method Not Allowed) to prevent unauthorized XP manipulation.
// GET strictly requires an authenticated Supabase session and enforces owner-scoped access.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateLevelFromXP } from "@/lib/game/economy";
import { CURRENT_SEASON } from "@/lib/game/seasons";

export const dynamic = "force-dynamic";

const ALLOW_HEADER_VALUE = "GET, HEAD, OPTIONS";

async function handleGetProfile(
  _req: NextRequest,
  supabaseOverride?: any
) {
  try {
    const supabase = supabaseOverride || (await createClient());
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    // 1. Enforce authenticated session
    if (!user || authError) {
      return NextResponse.json(
        { success: false, error: "Wymagana autoryzacja sesji (Unauthorized)" },
        { status: 401 }
      );
    }

    // 2. Identity isolation: Never trust searchParams.get('userId').
    // Only fetch data for the authenticated session owner.
    const userId = user.id;

    // 3. Fetch user game profile via owner-scoped authenticated client (never service_role)
    let isTableAvailable = true;
    const { data: profile, error: profileErr } = await supabase
      .from("user_game_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) {
      // PGRST205 / 42P01: Table does not exist in schema cache
      if (profileErr.code === "PGRST205" || profileErr.code === "42P01") {
        isTableAvailable = false;
      } else if (profileErr.code !== "PGRST116") {
        console.warn("Game profile read warning (non-fatal):", profileErr.message);
      }
    }

    // If table is not available in schema, return controlled unavailable state with null profile
    // to ensure no substitute/synthetic XP is ever presented as real points.
    if (!isTableAvailable) {
      return NextResponse.json({
        success: true,
        status: "unavailable",
        profile: null
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let currentXP = profile?.current_xp || 0;
    let seasonXP = profile?.season_xp || 0;
    let streak = profile?.activity_streak || 1;
    let maxStreak = profile?.max_streak || 1;
    let wheelStreakDay = profile?.wheel_streak_day || 1;
    let lastWheelSpin = profile?.last_wheel_spin_date || null;

    // Check daily activity streak update if profile row exists
    if (profile && profile.last_activity_date) {
      const lastDate = new Date(profile.last_activity_date);
      const todayDate = new Date(todayStr);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        streak += 1;
        if (streak > maxStreak) maxStreak = streak;
      } else if (diffDays > 1) {
        // Guilt-free resumption: reset streak to 1 gently
        streak = 1;
      }
    }

    const levelInfo = calculateLevelFromXP(currentXP);

    // Safely query unread notifications count if table exists
    let unreadNotifs = 0;
    try {
      const { count, error: notifErr } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (!notifErr && typeof count === "number") {
        unreadNotifs = count;
      }
    } catch {
      // Table may not exist; gracefully fallback to 0
    }

    return NextResponse.json({
      success: true,
      status: "available",
      profile: {
        userId,
        currentXP,
        seasonXP,
        levelInfo,
        activityStreak: streak,
        maxStreak,
        wheelStreakDay,
        lastWheelSpinDate: lastWheelSpin,
        canSpinWheelToday: lastWheelSpin !== todayStr,
        unreadNotifications: unreadNotifs,
        currentSeason: CURRENT_SEASON
      }
    });
  } catch (err: any) {
    // Return controlled error without leaking database or internal details
    return NextResponse.json(
      { success: false, error: "Błąd serwera podczas odczytu profilu gry" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleGetProfile(req, (req as any).supabaseOverride);
}

// SECURITY HARDENING: POST is permanently disabled.
// XP cannot be granted or manipulated via client POST requests.
export async function POST() {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: "Metoda POST została wyłączona ze względów bezpieczeństwa (Method Not Allowed). Naliczanie punktów XP odbywa się wyłącznie na serwerze."
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: ALLOW_HEADER_VALUE
      }
    }
  );
}

export async function PUT() {
  return new NextResponse(
    JSON.stringify({ success: false, error: "Method Not Allowed" }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: ALLOW_HEADER_VALUE
      }
    }
  );
}

export async function DELETE() {
  return new NextResponse(
    JSON.stringify({ success: false, error: "Method Not Allowed" }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: ALLOW_HEADER_VALUE
      }
    }
  );
}

export async function PATCH() {
  return new NextResponse(
    JSON.stringify({ success: false, error: "Method Not Allowed" }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: ALLOW_HEADER_VALUE
      }
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: ALLOW_HEADER_VALUE
    }
  });
}
