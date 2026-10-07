// app/api/admin/feature-flags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*');

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch feature flags error:', error);
    }

    const flagsMap: Record<string, any> = {};
    (settings || []).forEach(s => {
      flagsMap[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      maintenanceMode: flagsMap.maintenance_mode || { enabled: false, message: '' },
      featureFlags: flagsMap.feature_flags || {
        card_battles: true,
        cinematic_walkouts: true,
        typer: true,
        daily_missions: true,
        knowledge_corner: true,
        photo_booth: true
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { key, value, userId } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Brak klucza lub wartości' }, { status: 400 });
    }

    // Fetch old value for audit log
    const { data: existing } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: userId || 'admin'
      }, { onConflict: 'key' });

    if (error) {
      console.error('Update setting error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Log admin audit
    await logAuditAction({
      userId: userId || 'admin',
      userRole: 'admin',
      action: 'SETTINGS_CHANGE',
      resourceType: 'settings',
      resourceId: key,
      oldData: existing?.value,
      newData: value
    });

    return NextResponse.json({
      success: true,
      message: 'Ustawienia zaktualizowane pomyślnie'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
