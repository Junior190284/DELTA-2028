// app/api/admin/health-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: 'OK' | 'ERROR'; latencyMs?: number; message?: string }> = {};

  try {
    const supabase = await createClient();

    // 1. Database Connection Check
    const dbStart = Date.now();
    const { data: dbData, error: dbErr } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true });
    
    if (dbErr) {
      checks.database = { status: 'ERROR', message: dbErr.message };
    } else {
      checks.database = { status: 'OK', latencyMs: Date.now() - dbStart };
    }

    // 2. Auth Service Check
    const authStart = Date.now();
    const { data: authData, error: authErr } = await supabase.auth.getSession();
    if (authErr) {
      checks.auth = { status: 'ERROR', message: authErr.message };
    } else {
      checks.auth = { status: 'OK', latencyMs: Date.now() - authStart };
    }

    // 3. App Settings / Feature Flags Check
    const settingsStart = Date.now();
    const { data: settingsData, error: settingsErr } = await supabase
      .from('app_settings')
      .select('key')
      .limit(5);
    
    if (settingsErr && settingsErr.code !== 'PGRST116') {
      checks.settings = { status: 'ERROR', message: settingsErr.message };
    } else {
      checks.settings = { status: 'OK', latencyMs: Date.now() - settingsStart };
    }

    // 4. Sync System Status Check
    const syncStart = Date.now();
    const { data: syncData } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    checks.sync = { 
      status: 'OK', 
      latencyMs: Date.now() - syncStart,
      message: syncData ? `Ostatnia synchronizacja: ${syncData.synced_at}` : 'Gotowy do pierwszej synchronizacji'
    };

    const overallStatus = Object.values(checks).every(c => c.status === 'OK') ? 'HEALTHY' : 'DEGRADED';
    const totalLatency = Date.now() - startTime;

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalLatencyMs: totalLatency,
      environment: process.env.NODE_ENV || 'production',
      version: '1.8.0-prod',
      checks
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: err.message
    }, { status: 500 });
  }
}
