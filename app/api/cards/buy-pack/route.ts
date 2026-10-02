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

    // Sprawdzamy saldo Delta Points
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points")
      .eq("user_id", user.id)
      .single();

    const currentPoints = pointsRecord?.points || 0;

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
        points: newPoints,
        updated_at: new Date().toISOString()
      });

    // Przyznajemy paczkę
    const { data: newPack, error: packErr } = await supabase
      .from("user_unopened_packs")
      .insert({
        user_id: user.id,
        pack_type_id,
        source_reason: `Zakup w Skarbcu za ${price} Delta Points`
      })
      .select()
      .single();

    if (packErr) throw packErr;

    return NextResponse.json({
      success: true,
      remainingPoints: newPoints,
      grantedPack: newPack
    });
  } catch (e: any) {
    console.error("Error purchasing pack:", e);
    return NextResponse.json({ error: e.message || "Błąd zakupu paczki" }, { status: 500 });
  }
}
