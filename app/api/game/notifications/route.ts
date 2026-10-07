// app/api/game/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';

    const { data: notifications, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Fetch notifications error:', error);
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || []
    });
  } catch (err: any) {
    console.error('Notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, notificationId, markAllRead } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Brak userId' }, { status: 400 });
    }

    if (markAllRead) {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      return NextResponse.json({ success: true, message: 'Wszystkie powiadomienia oznaczone jako przeczytane' });
    }

    if (notificationId) {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
      return NextResponse.json({ success: true, message: 'Powiadomienie przeczytane' });
    }

    return NextResponse.json({ success: false, error: 'Brak akcji' }, { status: 400 });
  } catch (err: any) {
    console.error('Update notification error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
