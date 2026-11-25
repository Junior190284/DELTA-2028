import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { openPackWithIdempotency, PackOpeningError } from "@/lib/cards/engine";
import { determine3DWalkoutAccess } from "@/lib/cards/pilot-access";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        {
          error: "Serwis otwierania paczek jest tymczasowo niedostępny (brak konfiguracji serwisowej).",
          code: "RPC_UNAVAILABLE"
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const packTypeId = body.pack_type_id || body.packTypeId || "standard_pack";
    const userUnopenedPackId = body.user_unopened_pack_id || body.userUnopenedPackId;
    const rawIdempotencyKey =
      body.idempotency_key ||
      body.idempotencyKey ||
      req.headers.get("idempotency-key") ||
      req.headers.get("Idempotency-Key");
    const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey : null;

    const result = await openPackWithIdempotency({
      supabase: adminClient,
      userId: user.id,
      userUnopenedPackId,
      packTypeId,
      idempotencyKey
    });

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

    if (error instanceof PackOpeningError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Nie udało się otworzyć paczki" },
      { status: 400 }
    );
  }
}
