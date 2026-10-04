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

    if (user) {
      // Award reward pack if specified
      if (reward_pack_id) {
        await supabase.from("user_unopened_packs").insert({
          user_id: user.id,
          pack_type_id: reward_pack_id,
          source: "sbc_challenge"
        });
      }

      // Award points if specified
      if (reward_points > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("delta_points")
          .eq("id", user.id)
          .single();

        const curPoints = (profile as any)?.delta_points || 0;
        await supabase
          .from("profiles")
          .update({ delta_points: curPoints + reward_points })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({
      success: true,
      challenge_id,
      reward_pack_id,
      reward_points
    });
  } catch (error: any) {
    console.error("Błąd realizacji SBC:", error);
    return NextResponse.json({ error: error?.message || "Błąd SBC" }, { status: 500 });
  }
}
