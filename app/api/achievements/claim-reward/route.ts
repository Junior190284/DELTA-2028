import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const { achievementId, playerId } = await req.json();

    if (!achievementId) {
      return NextResponse.json({ error: "Brak ID osiągnięcia" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Pobierz definicję osiągnięcia
    const { data: def, error: defErr } = await admin
      .from("achievement_definitions")
      .select("*")
      .eq("id", achievementId)
      .single();

    if (defErr || !def) {
      return NextResponse.json({ error: "Nie znaleziono osiągnięcia" }, { status: 404 });
    }

    // 2. Sprawdź rekord user_achievements
    const query = admin
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id)
      .eq("achievement_id", achievementId);

    if (playerId) {
      query.eq("player_id", playerId);
    }

    const { data: userAch } = await query.maybeSingle();

    if (!userAch || !userAch.is_unlocked) {
      return NextResponse.json({ error: "To osiągnięcie nie zostało jeszcze odblokowane!" }, { status: 400 });
    }

    if (userAch.claimed_reward) {
      return NextResponse.json({ error: "Nagroda za to osiągnięcie została już odebrana!" }, { status: 400 });
    }

    // 3. Przyznaj punkty Delta Points
    const rewardDp = def.reward_dp || 0;
    if (rewardDp > 0) {
      const { data: currentPoints } = await admin
        .from("user_delta_points")
        .select("points_balance, total_earned")
        .eq("user_id", user.id)
        .maybeSingle();

      const newBalance = (currentPoints?.points_balance || 0) + rewardDp;
      const newTotal = (currentPoints?.total_earned || 0) + rewardDp;

      await admin
        .from("user_delta_points")
        .upsert({
          user_id: user.id,
          points_balance: newBalance,
          total_earned: newTotal,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
    }

    // 4. Jeśli osiągnięcie daje paczkę kart, dodaj ją do nieotwartych
    let grantedPack = null;
    if (def.reward_pack_type) {
      const { data: newPack, error: packErr } = await admin
        .from("user_unopened_packs")
        .insert({
          user_id: user.id,
          pack_type_id: def.reward_pack_type,
          source_reason: `Nagroda za osiągnięcie: ${def.title}`,
          is_opened: false
        })
        .select()
        .single();

      if (!packErr && newPack) {
        grantedPack = newPack;
      }
    }

    // 5. Oznacz jako odebrane
    await admin
      .from("user_achievements")
      .update({
        claimed_reward: true,
        claimed_at: new Date().toISOString()
      })
      .eq("id", userAch.id);

    return NextResponse.json({
      success: true,
      achievementId,
      title: def.title,
      rewardDp,
      grantedPack,
      message: `Odebrano nagrodę: +${rewardDp} DP${grantedPack ? ` oraz darmową paczkę!` : '!'}`
    });

  } catch (err: any) {
    console.error("Błąd odbierania nagrody:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
