import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PACK_PRICES: Record<string, number> = {
  standard_pack: 50,
  matchday_booster: 80,
  gold_booster: 120,
  inferno_booster: 250,
  legend_pack: 350,
  legend_booster: 350
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const { pack_type_id } = await req.json();
    const price = PACK_PRICES[pack_type_id];

    if (!price) {
      return NextResponse.json({ error: "Nieprawidłowy typ paczki" }, { status: 400 });
    }

    // Sprawdzamy saldo Delta Points z tabeli user_delta_points (zarówno points_balance jak i points)
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points_balance, total_earned, points")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPoints = pointsRecord?.points_balance ?? pointsRecord?.points ?? 0;

    if (currentPoints < price) {
      return NextResponse.json({ 
        error: `Niewystarczająca liczba Delta Points. Posiadasz ${currentPoints} DP, a paczka kosztuje ${price} DP.` 
      }, { status: 400 });
    }

    // Odejmujemy punkty
    const newPoints = currentPoints - price;
    await supabase
      .from("user_delta_points")
      .upsert({
        user_id: user.id,
        points_balance: newPoints,
        points: newPoints,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    // Przyznajemy paczkę do nieotwartych
    let grantedPack = null;
    const { data: newPack, error: packErr } = await supabase
      .from("user_unopened_packs")
      .insert({
        user_id: user.id,
        pack_type_id,
        source_reason: `Zakup w Skarbcu za ${price} Delta Points`,
        is_opened: false
      })
      .select()
      .maybeSingle();

    if (packErr) {
      console.warn("Błąd zapisu do user_unopened_packs:", packErr);
      grantedPack = {
        id: `pack_${Date.now()}`,
        user_id: user.id,
        pack_type_id,
        source_reason: `Zakup w Skarbcu za ${price} Delta Points`,
        is_opened: false,
        created_at: new Date().toISOString()
      };
    } else {
      grantedPack = newPack;
    }

    return NextResponse.json({
      success: true,
      remainingPoints: newPoints,
      grantedPack
    });
  } catch (e: any) {
    console.error("Error purchasing pack:", e);
    return NextResponse.json({ error: e.message || "Błąd zakupu paczki" }, { status: 500 });
  }
}
