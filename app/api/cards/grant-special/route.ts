import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    // Check staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "coach")) {
      return NextResponse.json({ error: "Wymagane uprawnienia administratora lub trenera." }, { status: 403 });
    }

    const { targetUserId, cardId, reason = "Wyróżnienie Administratora" } = await req.json();
    if (!targetUserId || !cardId) {
      return NextResponse.json({ error: "Brak targetUserId lub cardId" }, { status: 400 });
    }

    // Check existing card definition
    const { data: cardDef, error: cErr } = await supabase
      .from("card_definitions")
      .select("*")
      .eq("id", cardId)
      .single();

    if (cErr || !cardDef) {
      return NextResponse.json({ error: "Karta nie istnieje" }, { status: 404 });
    }

    // Check if user already owns card
    const { data: existingUserCard } = await supabase
      .from("user_cards")
      .select("id, duplicates_count")
      .eq("user_id", targetUserId)
      .eq("card_id", cardId)
      .maybeSingle();

    if (existingUserCard) {
      await supabase
        .from("user_cards")
        .update({
          duplicates_count: existingUserCard.duplicates_count + 1,
          acquisition_source: "admin"
        })
        .eq("id", existingUserCard.id);
    } else {
      await supabase
        .from("user_cards")
        .insert({
          user_id: targetUserId,
          card_id: cardId,
          duplicates_count: 0,
          acquisition_source: "admin"
        });
    }

    // Audit log
    await supabase
      .from("admin_card_grants")
      .insert({
        admin_id: user.id,
        user_id: targetUserId,
        card_id: cardId,
        reason
      });

    return NextResponse.json({
      success: true,
      message: `Przyznano kartę "${cardDef.card_name}" użytkownikowi.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
