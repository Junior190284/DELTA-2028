import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/current-profile";
import { runDeltaSync } from "@/lib/delta-sync/engine";
import crypto from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validSecret(expected: string, sent: string | null) {
  if (!sent) return false;
  try {
    const expectedBuffer = Buffer.from(expected);
    const sentBuffer = Buffer.from(sent);
    return expectedBuffer.length === sentBuffer.length && crypto.timingSafeEqual(expectedBuffer, sentBuffer);
  } catch {
    return false;
  }
}

async function authorize(request: NextRequest): Promise<boolean> {
  const headerSecret = request.headers.get("x-delta-sync-secret");

  // 1. Check secret header against environment variable if configured
  const envSecret = process.env.DELTA_SYNC_SECRET;
  if (envSecret && headerSecret && validSecret(envSecret, headerSecret)) {
    return true;
  }

  // 2. Check secret header dynamically against Supabase Vault
  if (headerSecret) {
    try {
      const admin = createAdminClient();
      const { data: isValid, error } = await admin.rpc("verify_cron_secret", { p_secret: headerSecret });
      if (!error && isValid === true) {
        return true;
      }
    } catch {}
  }

  // 3. Check current logged in user session
  try {
    const { profile } = await getCurrentProfile();
    return profile?.role === "admin" || profile?.role === "coach";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const isAuthorized = await authorize(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized", message: "Wymagane uprawnienia administratora lub poprawny token." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await runDeltaSync({
      triggeredBy: body?.triggeredBy || "manual_api"
    });

    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: String(err?.message || err)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const isAuthorized = await authorize(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If GET with ?run=true, trigger sync
  const { searchParams } = new URL(request.url);
  if (searchParams.get("run") === "true") {
    const result = await runDeltaSync({ triggeredBy: "admin_get" });
    return NextResponse.json(result);
  }

  return NextResponse.json({
    status: "READY",
    endpoint: "/api/delta-sync",
    methods: ["GET", "POST"],
    info: "DELTA Sync 2.0 Engine"
  });
}
