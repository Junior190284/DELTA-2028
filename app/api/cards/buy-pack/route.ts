import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PACK_PRICES } from "@/lib/economy/security";
import { purchasePackServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

export { PACK_PRICES };

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
          error: "Serwis zakupu paczek jest tymczasowo niedostępny (brak konfiguracji serwisowej).",
          code: "RPC_UNAVAILABLE"
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const packTypeId = body.pack_type_id || body.packTypeId;
    const rawIdem =
      body.idempotency_key ||
      body.idempotencyKey ||
      req.headers.get("idempotency-key") ||
      req.headers.get("Idempotency-Key");

    // SECURITY: userId pochodzi wyłącznie z serwerowej sesji (ignorujemy user_id z body)
    const result = await purchasePackServerSide({
      adminClient,
      userId: user.id,
      packTypeId,
      idempotencyKey: typeof rawIdem === "string" ? rawIdem : null
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const serialized = serializeEconomyError(e, "Błąd zakupu paczki");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
