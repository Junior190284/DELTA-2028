import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantSpecialCardServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

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
        { error: "Brak konfiguracji serwisowej.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await grantSpecialCardServerSide({
      adminClient,
      adminUserId: user.id,
      targetUserId: body.targetUserId,
      cardId: body.cardId,
      reason: body.reason
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const serialized = serializeEconomyError(err);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
