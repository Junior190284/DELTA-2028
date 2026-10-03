import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SEASON_REWARDS } from "@/components/DeltaSeasonPassModal";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie", guest: true }, { status: 401 });
    }

    const { level } = await req.json();
    const reward = SEASON_REWARDS.find(r => r.level === Number(level));

    if (!reward) {
      return NextResponse.json({ error: "Nieprawidłowy poziom nagrody" }, { status: 400 });
    }

    let pointsAwarded = 0;
    if (reward.amount) {
      pointsAwarded = reward.amount;
      const { data: pointsRecord } = await supabase
        .from("user_delta_points")
        .select("points")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentPoints = pointsRecord?.points || 0;
      const updatedPoints = currentPoints + pointsAwarded;

      await supabase
        .from("user_delta_points")
        .upsert({
          user_id: user.id,
          points: updatedPoints,
          updated_at: new Date().toISOString()
        });
    }

    let grantedPack = false;
    if (reward.packTypeId || reward.type === "pack" || reward.type === "chest") {
      try {
        await supabase
          .from("user_unopened_packs")
          .insert({
            user_id: user.id,
            pack_type_id: reward.packTypeId || "standard_pack",
            source_reason: `Nagroda Battle Pass: Poziom ${reward.level}`
          });
        grantedPack = true;
      } catch (e) {
        console.error("Pack grant error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      level: reward.level,
      rewardTitle: reward.title,
      pointsAwarded,
      grantedPack,
      message: `Odebrano nagrodę poziomu ${reward.level}: ${reward.title}!`
    });
  } catch (error: any) {
    console.error("Błąd zapisu nagrody Season Pass:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera" }, { status: 500 });
  }
}
