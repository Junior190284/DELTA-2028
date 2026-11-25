import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimAchievementRewardServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

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
        { error: "Brak konfiguracji serwisowej.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await claimAchievementRewardServerSide({
      adminClient,
      userId: user.id,
      achievementId: body?.achievementId,
      playerId: body?.playerId ?? null
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Błąd odbierania nagrody:", err);
    const serialized = serializeEconomyError(err, "Błąd serwera");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
