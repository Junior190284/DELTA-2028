import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PANINI_CHALLENGES } from "@/lib/cards/challenges";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: claimed } = await supabase
      .from("user_claimed_challenges")
      .select("challenge_id, claimed_at")
      .eq("user_id", user.id);

    return NextResponse.json({ claimed: claimed || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await req.json();
    if (!challengeId) {
      return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });
    }

    const challengeDef = PANINI_CHALLENGES.find(c => c.id === challengeId);
    if (!challengeDef) {
      return NextResponse.json({ error: "Nieznane wyzwanie" }, { status: 404 });
    }

    // Check if already claimed
    const { data: existing } = await supabase
      .from("user_claimed_challenges")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Nagroda za to wyzwanie została już wcześniej odebrana!" }, { status: 400 });
    }

    // Record claim
    const { error: claimErr } = await supabase
      .from("user_claimed_challenges")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        reward_summary: challengeDef.reward
      });

    if (claimErr) {
      return NextResponse.json({ error: claimErr.message }, { status: 500 });
    }

    // Award Delta Points
    if (challengeDef.reward.deltaPoints > 0) {
      const { data: pt } = await supabase
        .from("user_delta_points")
        .select("points_balance, total_earned")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentBalance = pt?.points_balance || 0;
      const currentTotal = pt?.total_earned || 0;

      await supabase
        .from("user_delta_points")
        .upsert({
          user_id: user.id,
          points_balance: currentBalance + challengeDef.reward.deltaPoints,
          total_earned: currentTotal + challengeDef.reward.deltaPoints,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
    }

    // Award Pack if defined
    if (challengeDef.reward.packTypeId) {
      await supabase
        .from("user_unopened_packs")
        .insert({
          user_id: user.id,
          pack_type_id: challengeDef.reward.packTypeId,
          source_reason: `Nagroda: ${challengeDef.title}`,
          is_opened: false
        });
    }

    return NextResponse.json({
      success: true,
      message: `Odebrano nagrodę: ${challengeDef.reward.description}`,
      reward: challengeDef.reward
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
