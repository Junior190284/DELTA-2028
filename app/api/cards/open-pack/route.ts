import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openPackServerSide } from "@/lib/cards/engine";
import { determine3DWalkoutAccess } from "@/lib/cards/pilot-access";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const packTypeId = body.pack_type_id || body.packTypeId || "standard_pack";
    const userUnopenedPackId = body.user_unopened_pack_id || body.userUnopenedPackId;

    const result = await openPackServerSide(
      supabase,
      user.id,
      userUnopenedPackId,
      packTypeId
    );

    // Presentation field only (evaluated server-side, 0 impact on economy or pack draw)
    let enable_3d_walkout = false;
    try {
      enable_3d_walkout = await determine3DWalkoutAccess(supabase, user.id);
    } catch (pilotErr) {
      console.warn("[OpenPack] Non-blocking pilot access evaluation error:", pilotErr);
      enable_3d_walkout = false;
    }

    return NextResponse.json({
      ...result,
      enable_3d_walkout
    });
  } catch (error: any) {
    console.error("Błąd otwierania paczki:", error);
    return NextResponse.json({ error: error?.message || "Nie udało się otworzyć paczki" }, { status: 400 });
  }
}
