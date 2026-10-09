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

    const { userCardId, cardId, isFavorite } = await req.json();
    if (!userCardId && !cardId) {
      return NextResponse.json({ error: "Missing userCardId or cardId" }, { status: 400 });
    }

    let query = supabase.from("user_cards").update({ is_favorite: !!isFavorite }).eq("user_id", user.id);
    if (userCardId) {
      query = query.eq("id", userCardId);
    } else if (cardId) {
      query = query.eq("card_id", cardId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, card: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
