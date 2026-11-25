import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adminManageEconomyServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

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
        { error: "Brak konfiguracji serwisowej administratora.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await adminManageEconomyServerSide({
      adminClient,
      adminUserId: user.id,
      body
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[AdminCardsManage] Error:", err);
    const serialized = serializeEconomyError(err, "Błąd operacji");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
