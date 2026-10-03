import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SpinReward {
  type: "points" | "pack";
  amount?: number;
  packTypeId?: string;
  name: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const { reward }: { reward: SpinReward } = await req.json();

    if (!reward || !reward.type) {
      return NextResponse.json({ error: "Nieprawidłowa nagroda" }, { status: 400 });
    }

    let updatedPoints = 0;
    let grantedPackId: string | null = null;

    if (reward.type === "points" && reward.amount) {
      // Pobieramy aktualne punkty
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
      // Przyznajemy paczkę
      const { data: newPack, error: packErr } = await supabase
        .from("user_unopened_packs")
        .insert({
          user_id: user.id,
          pack_type_id: reward.packTypeId,
          source_reason: `Nagroda z Koła Fortuny DELTA: ${reward.name}`,
          is_opened: false
        })
        .select()
        .maybeSingle();

      if (packErr) {
        console.error("Błąd dodawania paczki z koła fortuny:", packErr);
      } else {
        grantedPackId = newPack?.id || null;
      }

      // Pobieramy saldo punktów
      const { data: pointsRecord } = await supabase
        .from("user_delta_points")
        .select("points_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      updatedPoints = pointsRecord?.points_balance || 0;
    }

    return NextResponse.json({
      success: true,
      reward,
      newPointsBalance: updatedPoints,
      grantedPackId
    });
  } catch (error: any) {
    console.error("Błąd w API Daily Spin:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera" }, { status: 500 });
  }
}
