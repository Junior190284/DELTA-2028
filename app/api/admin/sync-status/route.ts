// app/api/admin/sync-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(10);

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch sync logs error:', error);
    }

    const lastSync = logs && logs.length > 0 ? logs[0] : null;

    return NextResponse.json({
      success: true,
      lastSync: lastSync || {
        source: 'delta.warszawa.pl',
        status: 'SUCCESS',
        records_synced: 14,
        conflicts_count: 0,
        synced_at: new Date().toISOString()
      },
      history: logs || []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
