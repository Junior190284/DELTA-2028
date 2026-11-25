import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRewardsServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

export async function POST() {
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

    const result = await syncRewardsServerSide({
      adminClient,
      userId: user.id
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Błąd synchronizacji nagród:", error);
    const serialized = serializeEconomyError(error, "Błąd przyznawania nagród");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
