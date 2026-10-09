import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PUSH_PREFERENCES } from "@/lib/events/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, enabled, preferences, last_used_at, created_at")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mask endpoints for client security (first 30 chars + hash suffix)
    const sanitizedSubs = (subs || []).map(s => ({
      id: s.id,
      enabled: s.enabled,
      preferences: s.preferences || DEFAULT_PUSH_PREFERENCES,
      last_used_at: s.last_used_at,
      created_at: s.created_at,
      endpoint_preview: s.endpoint.slice(0, 35) + "..."
    }));

    return NextResponse.json({
      ok: true,
      subscriptions: sanitizedSubs,
      count: sanitizedSubs.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Sesja wygasła. Zaloguj się ponownie." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;
    const customPreferences = body?.preferences || DEFAULT_PUSH_PREFERENCES;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Invalid subscription", message: "Przekazano niepełne dane subskrypcji push." },
        { status: 400 }
      );
    }

    // Validate endpoint format
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      return NextResponse.json(
        { error: "Invalid endpoint", message: "Endpoint subskrypcji musi być bezpiecznym adresem HTTPS." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { error } = await admin.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      enabled: true,
      preferences: customPreferences,
      user_agent: req.headers.get("user-agent")
    }, { onConflict: "endpoint" });

    if (error) {
      return NextResponse.json({
        error: "Database write failed",
        detail: error.message,
        message: `Supabase nie zapisał telefonu: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Telefon został pomyślnie zapisany do powiadomień push."
    });
  } catch (e: any) {
    return NextResponse.json({
      error: "Push setup failed",
      detail: String(e?.message || e),
      message: `Błąd serwera podczas zapisywania telefonu: ${String(e?.message || e)}`
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Sesja wygasła. Zaloguj się ponownie." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { endpoint, preferences, enabled } = body;

    const admin = createAdminClient();
    let query = admin.from("push_subscriptions").update({
      ...(preferences !== undefined ? { preferences } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      last_used_at: new Date().toISOString()
    }).eq("user_id", user.id);

    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Preferencje powiadomień zostały zaktualizowane."
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint;

    const admin = createAdminClient();
    let query = admin.from("push_subscriptions").delete().eq("user_id", user.id);
    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Subskrypcja usunięta." });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
