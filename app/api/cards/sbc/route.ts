import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // SBC SECURITY GUARD:
    // Klient nie może przesyłać dowolnych kart do zniszczenia ani żądać punktów/paczek
    // bez pełnego serwerowego silnika walidacji reguł wyzwań SBC.
    return NextResponse.json({
      error: "Moduł Squad Building Challenges (SBC) jest tymczasowo zablokowany do czasu wdrożenia autorytatywnego silnika walidacji składu na serwerze.",
      code: "SBC_FEATURE_LOCKED"
    }, { status: 501 });
  } catch (error: any) {
    console.error("Błąd realizacji SBC:", error);
    return NextResponse.json({ error: error?.message || "Błąd serwera podczas realizacji SBC" }, { status: 500 });
  }
}
