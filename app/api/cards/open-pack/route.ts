import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openPackServerSide } from "@/lib/cards/engine";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { userUnopenedPackId, packTypeId = "matchday" } = body;

    const result = await openPackServerSide(
      supabase,
      user.id,
      userUnopenedPackId,
      packTypeId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Błąd otwierania paczki:", error);
    return NextResponse.json({ error: error?.message || "Nie udało się otworzyć paczki" }, { status: 400 });
  }
}
