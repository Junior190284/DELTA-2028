import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie", guest: true }, { status: 401 });
    }

    const { questId, rewardPoints, rewardType } = await req.json();

    const amount = Number(rewardPoints) || 50;

    // Pobierz stan punktów
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPoints = pointsRecord?.points || 0;
    const updatedPoints = currentPoints + amount;

    await supabase
      .from("user_delta_points")
      .upsert({
        user_id: user.id,
        points: updatedPoints,
        updated_at: new Date().toISOString()
      });

    let grantedPackId: string | null = null;
    if (rewardType === "mega_chest") {
      const { data: newPack } = await supabase
        .from("user_unopened_packs")
        .insert({
          user_id: user.id,
          source_reason: "Złota Skrzynia Tygodnia DELTA 2018"
        })
        .select()
        .maybeSingle();
      grantedPackId = newPack?.id || null;
    }

    return NextResponse.json({
      success: true,
      questId,
      pointsAwarded: amount,
      newPointsBalance: updatedPoints,
      grantedPackId,
      message: `Gratulacje! Odebrano nagrodę: +${amount} Punktów DELTA!`
    });
  } catch (error: any) {
    console.error("Błąd odbierania nagrody misji:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera" }, { status: 500 });
  }
}
