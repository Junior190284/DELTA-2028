import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimChallengeRewardServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: claimed, error } = await supabase
      .from("user_claimed_challenges")
      .select("challenge_id, claimed_at")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ claimed: claimed || [] });
  } catch (err: unknown) {
    const serialized = serializeEconomyError(err);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: "Brak konfiguracji serwisowej dla wyzwań.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await claimChallengeRewardServerSide({
      adminClient,
      userId: user.id,
      challengeId: body?.challengeId
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const serialized = serializeEconomyError(err);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
