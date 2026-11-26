import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimMinigameLevelRewardServerSide,
  serializeEconomyError
} from "@/lib/economy/server-rpc";

export const dynamic = "force-dynamic";

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
        { error: "Brak konfiguracji serwisowej bazy danych.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    // SECURITY: rewardPoints od klienta są całkowicie ignorowane. Serwer autorytatywnie pobiera kwotę z poziomu.
    const result = await claimMinigameLevelRewardServerSide({
      adminClient,
      userId: user.id,
      gameId: body?.gameId || body?.game_id || "free_kicks",
      level: Number(body?.level) || 1
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Błąd w API claim-reward minigier:", error);
    const serialized = serializeEconomyError(error, "Błąd odbioru nagrody minigry");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
