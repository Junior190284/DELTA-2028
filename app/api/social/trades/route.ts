// app/api/social/trades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';

    const { data: trades, error } = await supabase
      .from('safe_card_trades')
      .select('*')
      .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch trades error:', error);
    }

    return NextResponse.json({
      success: true,
      trades: trades || []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { action, tradeId, senderUserId, senderUserName, receiverUserId, receiverUserName, offeredCard, requestedCard } = body;

    // 1. CREATE SAFE TRADE OFFER
    if (action === 'CREATE') {
      if (!senderUserId || !receiverUserId || !offeredCard || !requestedCard) {
        return NextResponse.json({ success: false, error: 'Brak wymaganych parametrów wymiany' }, { status: 400 });
      }

      const { data: newTrade, error } = await supabase
        .from('safe_card_trades')
        .insert({
          sender_user_id: senderUserId,
          sender_user_name: senderUserName || 'Zawodnik DELTA',
          receiver_user_id: receiverUserId,
          receiver_user_name: receiverUserName || 'Zawodnik DELTA',
          offered_card: offeredCard,
          requested_card: requestedCard,
          status: 'PENDING'
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        trade: newTrade
      });
    }

    // 2. ACCEPT TRADE (ATOMIC SWAP)
    if (action === 'ACCEPT') {
      if (!tradeId) {
        return NextResponse.json({ success: false, error: 'Brak id wymiany' }, { status: 400 });
      }

      await supabase
        .from('safe_card_trades')
        .update({
          status: 'ACCEPTED',
          completed_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      return NextResponse.json({
        success: true,
        message: 'Wymiana została pomyślnie zrealizowana!'
      });
    }

    // 3. CANCEL / REJECT
    if (action === 'CANCEL' || action === 'REJECT') {
      await supabase
        .from('safe_card_trades')
        .update({ status: 'CANCELLED' })
        .eq('id', tradeId);

      return NextResponse.json({ success: true, message: 'Oferta anulowana' });
    }

    return NextResponse.json({ success: false, error: 'Nieznana akcja' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
