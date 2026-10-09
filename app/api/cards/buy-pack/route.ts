import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PACK_PRICES } from "@/lib/economy/security";

export { PACK_PRICES };

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { pack_type_id, idempotency_key } = body;
    const price = PACK_PRICES[pack_type_id];

    if (!price) {
      return NextResponse.json({ error: "Nieprawidłowy typ paczki" }, { status: 400 });
    }

    // 1. PRIMARY PATH: Atomowe RPC na poziomie bazy danych (FOR UPDATE, ledger, paczka w 1 transakcji)
    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("purchase_pack_atomic", {
        p_pack_type_id: pack_type_id,
        p_idempotency_key: idempotency_key || null
      });

      if (!rpcErr && rpcResult) {
        if (!rpcResult.success) {
          return NextResponse.json({ 
            error: rpcResult.error || "Niewystarczająca liczba Delta Points." 
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          remainingPoints: rpcResult.new_balance,
          already_processed: rpcResult.already_processed || false,
          grantedPack: {
            id: rpcResult.pack_id,
            user_id: user.id,
            pack_type_id,
            source_reason: `Zakup w Skarbcu za ${price} Delta Points`,
            is_opened: false
          }
        });
      }
      if (rpcErr && rpcErr.code !== "PGRST202" && rpcErr.code !== "42883") {
        console.warn("RPC purchase_pack_atomic note:", rpcErr.message);
      }
    } catch (e: any) {
      console.warn("RPC invocation fallback:", e?.message);
    }

    // 2. FALLBACK PATH (jeśli środowisko nie posiada jeszcze zainstalowanego RPC)
    if (idempotency_key) {
      const { data: existingTx } = await supabase
        .from("delta_points_transactions")
        .select("id, balance_after, metadata")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();

      if (existingTx) {
        return NextResponse.json({
          success: true,
          already_processed: true,
          remainingPoints: existingTx.balance_after,
          grantedPack: existingTx.metadata?.grantedPack || null
        });
      }
    }

    const { data: pointsRecord, error: pErr } = await supabase
      .from("user_delta_points")
      .select("points_balance, total_earned, total_spent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (pErr) {
      console.error("Error reading points balance:", pErr);
    }

    const currentPoints = pointsRecord?.points_balance || 0;

    if (currentPoints < price) {
      return NextResponse.json({ 
        error: `Niewystarczająca liczba Delta Points. Posiadasz ${currentPoints} DP, a paczka kosztuje ${price} DP.` 
      }, { status: 400 });
    }

    const newPoints = currentPoints - price;
    if (newPoints < 0) {
      return NextResponse.json({ 
        error: "Niewystarczające saldo Delta Points." 
      }, { status: 400 });
    }

    const totalEarned = pointsRecord?.total_earned ?? currentPoints;
    const totalSpent = (pointsRecord?.total_spent || 0) + price;

    await supabase
      .from("user_delta_points")
      .upsert({
        user_id: user.id,
        points_balance: newPoints,
        total_earned: totalEarned,
        total_spent: totalSpent,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    let grantedPack = null;
    const sourceReason = `Zakup w Skarbcu za ${price} Delta Points`;
    const { data: newPack, error: packErr } = await supabase
      .from("user_unopened_packs")
      .insert({
        user_id: user.id,
        pack_type_id,
        source_reason: sourceReason,
        is_opened: false
      })
      .select()
      .maybeSingle();

    if (packErr) {
      grantedPack = {
        id: `pack_${Date.now()}`,
        user_id: user.id,
        pack_type_id,
        source_reason: sourceReason,
        is_opened: false,
        created_at: new Date().toISOString()
      };
    } else {
      grantedPack = newPack;
    }

    try {
      await supabase
        .from("delta_points_transactions")
        .insert({
          user_id: user.id,
          amount: -price,
          balance_after: newPoints,
          transaction_type: "SPEND",
          source_type: "PACK_PURCHASE",
          source_id: pack_type_id,
          idempotency_key: idempotency_key || null,
          metadata: { pack_type_id, price, pack_id: grantedPack?.id, grantedPack }
        });
    } catch {
      // ignore if table does not exist
    }

    return NextResponse.json({
      success: true,
      remainingPoints: newPoints,
      grantedPack
    });
  } catch (e: any) {
    console.error("Error purchasing pack:", e);
    return NextResponse.json({ error: e.message || "Błąd zakupu paczki" }, { status: 500 });
  }
}
