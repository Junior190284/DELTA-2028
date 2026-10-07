import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const { challenge_id, card_ids = [], reward_pack_id, reward_points = 0 } = body;

    if (!challenge_id || !Array.isArray(card_ids) || card_ids.length === 0) {
      return NextResponse.json({ error: "Nieprawidłowe dane wyzwania SBC" }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // 1. Konsumujemy (przepalamy) wybrane egzemplarze kart w user_cards
    for (const cardId of card_ids) {
      const { data: userCardRow, error: fetchErr } = await supabase
        .from("user_cards")
        .select("id, duplicates_count")
        .eq("user_id", user.id)
        .eq("card_id", cardId)
        .maybeSingle();

      if (userCardRow) {
        if ((userCardRow.duplicates_count || 0) > 0) {
          // Zmniejszamy liczbę powtórek o 1
          await supabase
            .from("user_cards")
            .update({ duplicates_count: userCardRow.duplicates_count - 1 })
            .eq("id", userCardRow.id);
        } else {
          // Przepalono ostatni/jedyny egzemplarz - usuwamy wpis z kolekcji
          await supabase
            .from("user_cards")
            .delete()
            .eq("id", userCardRow.id);
        }
      }
    }

    // 2. Przyznajemy paczkę nagrody w user_unopened_packs
    let grantedPackId: string | null = null;
    if (reward_pack_id) {
      const { data: newPack, error: packErr } = await supabase
        .from("user_unopened_packs")
        .insert({
          user_id: user.id,
          pack_type_id: reward_pack_id,
          source_reason: `Nagroda za ukończenie wyzwania SBC (${challenge_id})`,
          is_opened: false
        })
        .select()
        .maybeSingle();

      if (!packErr && newPack) {
        grantedPackId = newPack.id;
      }
    }

    // 3. Przyznajemy punkty w user_delta_points
    let updatedPoints = 0;
    if (reward_points > 0) {
      const { data: pointsRecord } = await supabase
        .from("user_delta_points")
        .select("points_balance, total_earned")
        .eq("user_id", user.id)
        .maybeSingle();

      const curPoints = pointsRecord?.points_balance || 0;
      const curTotal = pointsRecord?.total_earned ?? curPoints;
      updatedPoints = curPoints + reward_points;

      await supabase
        .from("user_delta_points")
        .upsert({
          user_id: user.id,
          points_balance: updatedPoints,
          total_earned: curTotal + reward_points,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
    }

    return NextResponse.json({
      success: true,
      challenge_id,
      consumed_card_ids: card_ids,
      reward_pack_id,
      grantedPackId,
      reward_points,
      newPointsBalance: updatedPoints
    });
  } catch (error: any) {
    console.error("Błąd realizacji SBC:", error);
    return NextResponse.json({ error: error?.message || "Błąd serwera podczas realizacji SBC" }, { status: 500 });
  }
}
