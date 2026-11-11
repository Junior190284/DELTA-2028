import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimQuestRewardServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie", guest: true }, { status: 401 });
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: "Brak konfiguracji serwisowej.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    // SECURITY: rewardPoints i rewardType od klienta są całkowicie ignorowane.
    const result = await claimQuestRewardServerSide({
      adminClient,
      userId: user.id,
      questId: body?.questId
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Błąd odbierania nagrody misji:", error);
    const serialized = serializeEconomyError(error, "Błąd serwera");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
