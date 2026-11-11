import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_SPIN_SEGMENTS, selectRandomSpinSegment, type SpinSegment } from "@/lib/economy/security";
import { claimDailySpinServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

export { DAILY_SPIN_SEGMENTS, selectRandomSpinSegment, type SpinSegment };

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          canSpin: false,
          error: "Wymagane logowanie",
          streak: 1,
          secondsRemaining: 0
        },
        { status: 401 }
      );
    }

    const { data: spinRecord, error } = await supabase
      .from("user_daily_spins")
      .select("last_spin_at, streak_count, last_streak_date, total_spins")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("user_daily_spins query note:", error.message);
    }

    const todayStr = getTodayDateStr();
    let canSpin = true;
    let secondsRemaining = 0;
    let nextAvailableAt: string | null = null;
    let streak = 1;

    if (spinRecord?.last_spin_at) {
      const lastSpinDate = new Date(spinRecord.last_spin_at);
      const lastSpinStr = lastSpinDate.toISOString().slice(0, 10);

      const msPerDay = 24 * 60 * 60 * 1000;
      const todayDate = new Date(todayStr);
      const prevDate = new Date(lastSpinStr);
      const dayDiff = Math.floor((todayDate.getTime() - prevDate.getTime()) / msPerDay);

      if (lastSpinStr === todayStr) {
        canSpin = false;
        const nextDate = getNextMidnight();
        nextAvailableAt = nextDate.toISOString();
        secondsRemaining = Math.max(0, Math.floor((nextDate.getTime() - Date.now()) / 1000));
        streak = spinRecord.streak_count || 1;
      } else if (dayDiff === 1) {
        canSpin = true;
        const prevStreak = spinRecord.streak_count || 1;
        streak = prevStreak >= 7 ? 1 : prevStreak + 1;
      } else {
        canSpin = true;
        streak = 1;
      }
    }

    return NextResponse.json({
      canSpin,
      streak,
      secondsRemaining,
      nextAvailableAt,
      lastSpinAt: spinRecord?.last_spin_at || null,
      totalSpins: spinRecord?.total_spins || 0
    });
  } catch (error) {
    console.error("Błąd w GET daily-spin:", error);
    return NextResponse.json({
      canSpin: true,
      streak: 1,
      secondsRemaining: 0
    });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        {
          error: "Serwis Koła Fortuny jest tymczasowo niedostępny (brak konfiguracji serwisowej).",
          code: "RPC_UNAVAILABLE"
        },
        { status: 503 }
      );
    }

    const result = await claimDailySpinServerSide({
      adminClient,
      userId: user.id
    });

    return NextResponse.json(result);
  } catch (error) {
    const serialized = serializeEconomyError(error, "Błąd w API Daily Spin");
    if (serialized.status === 429) {
      const nextDate = getNextMidnight();
      const secondsRemaining = Math.max(0, Math.floor((nextDate.getTime() - Date.now()) / 1000));
      return NextResponse.json(
        {
          ...serialized.body,
          canSpin: false,
          secondsRemaining,
          nextAvailableAt: nextDate.toISOString()
        },
        { status: 429 }
      );
    }
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
