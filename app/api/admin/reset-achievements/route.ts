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

    // Require admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Wymagane uprawnienia głównego administratora." }, { status: 403 });
    }

    const { confirmationPhrase, targetPlayerId = "all" } = await req.json();
    if (confirmationPhrase !== "RESET-ODZNAKI-2026") {
      return NextResponse.json({
        error: "Niepoprawne hasło potwierdzające. Wpisz dokładnie: RESET-ODZNAKI-2026"
      }, { status: 400 });
    }

    let query = supabase.from("player_achievements").delete();
    if (targetPlayerId && targetPlayerId !== "all") {
      query = query.eq("player_id", targetPlayerId);
    } else {
      query = query.neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: targetPlayerId === "all"
        ? "Wszystkie osiągnięcia i odznaki klubowe zostały zresetowane."
        : "Osiągnięcia wybranego zawodnika zostały zresetowane."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
