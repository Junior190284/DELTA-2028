import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";
import { emitSystemEvent } from "@/lib/events/emitter";
import { isEventVisibleForUser } from "@/lib/events/notifications";
import type { DeltaSystemEvent } from "@/lib/events/types";

export const dynamic = "force-dynamic";

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "guest_user";
    const importance = searchParams.get("importance");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const admin = createAdminClient();

    // Query system events
    let query = admin
      .from("delta_system_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (importance) {
      query = query.eq("importance", importance);
    }
    if (type) {
      query = query.eq("type", type);
    }

    const { data: events, error: eventsError } = await query;
    if (eventsError) throw eventsError;

    // Resolve user context (role and assigned player IDs for audience filtering)
    let userRole = "parent";
    let userPlayerIds: string[] = [];

    if (userId && isUUID(userId)) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id,role")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role) {
        userRole = profile.role;
      }

      const { data: parentPlayers } = await admin
        .from("parent_players")
        .select("player_id")
        .eq("parent_id", userId);

      if (parentPlayers) {
        userPlayerIds = parentPlayers.map((p) => p.player_id);
      }
    }

    // Fetch user read states
    const readMap: Record<string, boolean> = {};
    if (userId && isUUID(userId)) {
      const { data: reads } = await admin
        .from("user_event_reads")
        .select("event_id,read_at,seen_at")
        .eq("user_id", userId);

      if (reads) {
        reads.forEach((r) => {
          if (r.read_at) readMap[r.event_id] = true;
        });
      }
    }

    // Filter events by audience visibility
    const visibleEvents = ((events || []) as DeltaSystemEvent[]).filter((e) =>
      isEventVisibleForUser(e, {
        userId,
        role: userRole,
        playerIds: userPlayerIds,
      })
    );

    const merged = visibleEvents.map((e) => ({
      ...e,
      is_read: !!readMap[e.id],
      is_seen: true,
    }));

    return NextResponse.json({
      success: true,
      events: merged,
      unreadCount: merged.filter((e) => !e.is_read).length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile } = await getCurrentProfile();
    if (profile?.role !== "admin" && profile?.role !== "coach") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await emitSystemEvent(body);

    return NextResponse.json({ success: true, event: result.event, created: result.created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
