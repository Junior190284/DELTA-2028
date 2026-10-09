import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "guest_user";

    const admin = createAdminClient();
    const { data: reads, error } = await admin
      .from("user_event_reads")
      .select("event_id,read_at,seen_at")
      .eq("user_id", userId);

    if (error) throw error;

    const readIds = (reads || []).filter(r => !!r.read_at).map(r => r.event_id);

    return NextResponse.json({
      success: true,
      userId,
      readIds
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || "guest_user";
    const eventIds: string[] = Array.isArray(body.eventIds)
      ? body.eventIds
      : body.eventId
      ? [body.eventId]
      : [];

    if (!eventIds.length) {
      return NextResponse.json({ success: false, message: "No event IDs provided" }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const rows = eventIds.map(eventId => ({
      user_id: userId,
      event_id: eventId,
      read_at: now,
      seen_at: now
    }));

    const { error } = await admin
      .from("user_event_reads")
      .upsert(rows, { onConflict: "user_id,event_id" });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      userId,
      markedReadCount: rows.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
