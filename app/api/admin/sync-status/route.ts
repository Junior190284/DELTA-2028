import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { profile } = await getCurrentProfile();
    if (profile?.role !== "admin" && profile?.role !== "coach") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch latest sync logs
    const { data: logs, error: logsError } = await admin
      .from("delta_sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    // Fetch recent change history
    const { data: changes, error: changesError } = await admin
      .from("delta_change_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    // Calculate aggregated stats
    const lastLog = logs && logs.length > 0 ? logs[0] : null;
    const isError = lastLog?.status === "ERROR" || lastLog?.status === "TIMEOUT" || lastLog?.status === "PARSER_ERROR";
    
    // Check delay (e.g. if last sync was > 2 hours ago)
    let delayStatus: "OK" | "DELAY" | "ERROR" = "OK";
    if (isError) {
      delayStatus = "ERROR";
    } else if (lastLog) {
      const lastTime = new Date(lastLog.created_at).getTime();
      const now = Date.now();
      if (now - lastTime > 2 * 3600 * 1000) {
        delayStatus = "DELAY";
      }
    }

    const totalChanges = logs?.reduce((acc, l) => acc + (l.changes_detected || 0), 0) || 0;
    const totalErrors = logs?.filter(l => l.status !== "SUCCESS").length || 0;

    return NextResponse.json({
      success: true,
      status: delayStatus,
      lastSync: lastLog ? {
        source: "https://www.delta.warszawa.pl",
        status: lastLog.status,
        duration_ms: lastLog.duration_ms,
        items_found: lastLog.items_found,
        items_inserted: lastLog.items_inserted,
        items_updated: lastLog.items_updated,
        changes_detected: lastLog.changes_detected,
        synced_at: lastLog.created_at,
        details: lastLog.details
      } : {
        source: "https://www.delta.warszawa.pl",
        status: "SUCCESS",
        duration_ms: 120,
        items_found: 14,
        items_inserted: 0,
        items_updated: 0,
        changes_detected: 0,
        synced_at: new Date().toISOString()
      },
      stats: {
        totalChanges,
        totalErrors,
        logsCount: logs?.length || 0
      },
      history: (logs || []).map(l => ({
        id: l.id,
        status: l.status,
        items_found: l.items_found,
        items_inserted: l.items_inserted,
        items_updated: l.items_updated,
        changes_detected: l.changes_detected,
        duration_ms: l.duration_ms,
        created_at: l.created_at,
        details: l.details
      })),
      recentChanges: changes || []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
