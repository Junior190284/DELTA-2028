import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SpinReward {
  type: "points" | "pack";
  amount?: number;
  packTypeId?: string;
  name: string;
}

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        canSpin: false, 
        error: "Wymagane logowanie",
        streak: 1,
        secondsRemaining: 0
      }, { status: 401 });
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
        // Już zakręcono dzisiaj
        canSpin = false;
        const nextDate = getNextMidnight();
        nextAvailableAt = nextDate.toISOString();
        secondsRemaining = Math.max(0, Math.floor((nextDate.getTime() - Date.now()) / 1000));
        streak = spinRecord.streak_count || 1;
      } else if (dayDiff === 1) {
        // Kontynuacja streak z wczoraj
        canSpin = true;
        const prevStreak = spinRecord.streak_count || 1;
        streak = prevStreak >= 7 ? 1 : prevStreak + 1;
      } else {
        // Przerwa dłuższa niż 1 dzień - reset streak do 1
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
  } catch (error: any) {
    console.error("Błąd w GET daily-spin:", error);
    return NextResponse.json({ 
      canSpin: true, 
      streak: 1, 
      secondsRemaining: 0 
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // 1. Sprawdzamy stan koła w bazie przed przyznaniem nagrody
    const { data: spinRecord } = await supabase
      .from("user_daily_spins")
      .select("last_spin_at, streak_count, total_spins")
      .eq("user_id", user.id)
      .maybeSingle();

    const todayStr = getTodayDateStr();

    if (spinRecord?.last_spin_at) {
      const lastSpinStr = new Date(spinRecord.last_spin_at).toISOString().slice(0, 10);
      if (lastSpinStr === todayStr) {
        const nextDate = getNextMidnight();
        const secondsRemaining = Math.max(0, Math.floor((nextDate.getTime() - Date.now()) / 1000));
        return NextResponse.json({
          error: "Dzienny limit wykorzystany. Kolejny obrót dostępny po północy!",
          canSpin: false,
          secondsRemaining,
          nextAvailableAt: nextDate.toISOString()
        }, { status: 429 });
      }
    }

    const { reward }: { reward: SpinReward } = await req.json();

    if (!reward || !reward.type) {
      return NextResponse.json({ error: "Nieprawidłowa nagroda" }, { status: 400 });
    }

    // 2. Wyliczamy nowy streak
    let newStreak = 1;
    if (spinRecord?.last_spin_at) {
      const lastSpinStr = new Date(spinRecord.last_spin_at).toISOString().slice(0, 10);
      const msPerDay = 24 * 60 * 60 * 1000;
      const dayDiff = Math.floor((new Date(todayStr).getTime() - new Date(lastSpinStr).getTime()) / msPerDay);

      if (dayDiff === 1) {
        const prev = spinRecord.streak_count || 1;
        newStreak = prev >= 7 ? 1 : prev + 1;
      } else {
        newStreak = 1;
      }
    }

    let updatedPoints = 0;
    let grantedPackId: string | null = null;

    if (reward.type === "points" && reward.amount) {
      const { data: pointsRecord } = await supabase
        .from("user_delta_points")
        .select("points_balance, total_earned")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentPoints = pointsRecord?.points_balance || 0;
      const currentTotal = pointsRecord?.total_earned ?? currentPoints;
      updatedPoints = currentPoints + reward.amount;

      await supabase
        .from("user_delta_points")
        .upsert({
          user_id: user.id,
          points_balance: updatedPoints,
          total_earned: currentTotal + reward.amount,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
    } else if (reward.type === "pack" && reward.packTypeId) {
      const { data: newPack, error: packErr } = await supabase
        .from("user_unopened_packs")
        .insert({
          user_id: user.id,
          pack_type_id: reward.packTypeId,
          source_reason: `Nagroda z Koła Fortuny DELTA: ${reward.name} (Dzień ${newStreak}/7)`,
          is_opened: false
        })
        .select()
        .maybeSingle();

      if (packErr) {
        console.error("Błąd dodawania paczki z koła fortuny:", packErr);
      } else {
        grantedPackId = newPack?.id || null;
      }

      const { data: pointsRecord } = await supabase
        .from("user_delta_points")
        .select("points_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      updatedPoints = pointsRecord?.points_balance || 0;
    }

    // 3. Zapisujemy obrót w user_daily_spins
    const totalSpinsCount = (spinRecord?.total_spins || 0) + 1;
    await supabase
      .from("user_daily_spins")
      .upsert({
        user_id: user.id,
        last_spin_at: new Date().toISOString(),
        last_streak_date: todayStr,
        streak_count: newStreak,
        total_spins: totalSpinsCount,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    const nextMidnight = getNextMidnight();
    const secondsRemaining = Math.max(0, Math.floor((nextMidnight.getTime() - Date.now()) / 1000));

    return NextResponse.json({
      success: true,
      reward,
      newPointsBalance: updatedPoints,
      grantedPackId,
      streak: newStreak,
      canSpin: false,
      secondsRemaining,
      nextAvailableAt: nextMidnight.toISOString()
    });
  } catch (error: any) {
    console.error("Błąd w API Daily Spin:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera" }, { status: 500 });
  }
}
