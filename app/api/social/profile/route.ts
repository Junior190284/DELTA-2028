// app/api/social/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';

    const { data: profile } = await supabase
      .from('user_profile_customization')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      customization: profile || {
        active_title: 'Młody Wilczek',
        active_badge_id: 'badge_starter',
        profile_frame: 'inferno_red',
        trophies: [
          { id: 't1', title: 'Mistrz Jesieni 2026', icon: '🏆', date: '2026-10-01' },
          { id: 't2', title: '100% Frekwencji Wrzesień', icon: '⭐', date: '2026-09-30' }
        ]
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
    const { userId, activeTitle, activeBadgeId, activeMainCardId, profileFrame } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Brak userId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_profile_customization')
      .upsert({
        user_id: userId,
        active_title: activeTitle,
        active_badge_id: activeBadgeId,
        active_main_card_id: activeMainCardId,
        profile_frame: profileFrame || 'inferno_red',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profil pomyślnie zaktualizowany!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
