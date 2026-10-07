// app/api/social/challenge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { simulate1v1Duel, simulate3v3Battle, BattleCard } from '@/lib/game/battles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';

    const { data: challenges, error } = await supabase
      .from('friendly_challenges')
      .select('*')
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch challenges error:', error);
    }

    return NextResponse.json({
      success: true,
      challenges: challenges || []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { action, challengeId, challengerId, challengerName, challengedId, challengedName, mode, playerCards } = body;

    // 1. CREATE CHALLENGE
    if (action === 'CREATE') {
      if (!challengerId || !challengedId || !mode) {
        return NextResponse.json({ success: false, error: 'Brak wymaganych danych' }, { status: 400 });
      }

      const { data: newChallenge, error } = await supabase
        .from('friendly_challenges')
        .insert({
          challenger_id: challengerId,
          challenger_name: challengerName || 'Zawodnik DELTA',
          challenged_id: challengedId,
          challenged_name: challengedName || 'Zawodnik DELTA',
          mode: mode || '1v1',
          status: 'PENDING',
          challenger_cards: playerCards || []
        })
        .select()
        .single();

      if (error) {
        console.error('Create challenge error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      // Add Notification to challenged user
      await supabase.from('user_notifications').insert({
        user_id: challengedId,
        title: `Nowe Wyzwanie ${mode} od ${challengerName}!`,
        message: `${challengerName} zaprasza Cię na koleżeński pojedynek kart w trybie ${mode}.`,
        type: 'BATTLE'
      });

      return NextResponse.json({
        success: true,
        challenge: newChallenge
      });
    }

    // 2. ACCEPT AND PLAY CHALLENGE
    if (action === 'ACCEPT_AND_PLAY') {
      if (!challengeId || !playerCards) {
        return NextResponse.json({ success: false, error: 'Brak id wyzwania lub kart' }, { status: 400 });
      }

      const { data: challenge } = await supabase
        .from('friendly_challenges')
        .select('*')
        .eq('id', challengeId)
        .maybeSingle();

      if (!challenge) {
        return NextResponse.json({ success: false, error: 'Wyzwanie nie istnieje' }, { status: 404 });
      }

      // Simulate match between challenger_cards and challenged_cards
      let duelResult: any = null;
      let winnerId = null;

      if (challenge.mode === '1v1') {
        const cardA: BattleCard = challenge.challenger_cards[0] || { id: 'a', name: challenge.challenger_name, overall: 80, pace: 80, shooting: 75, passing: 80, dribbling: 78, defending: 72, physical: 75, position: 'CM' };
        const cardB: BattleCard = playerCards[0] || { id: 'b', name: challenge.challenged_name, overall: 80, pace: 80, shooting: 75, passing: 80, dribbling: 78, defending: 72, physical: 75, position: 'CM' };

        duelResult = simulate1v1Duel(cardB, 'medium');
        winnerId = duelResult.matchResult === 'win' ? challenge.challenged_id : duelResult.matchResult === 'loss' ? challenge.challenger_id : null;
      } else {
        const squadB: BattleCard[] = playerCards;
        duelResult = simulate3v3Battle(squadB, 'medium');
        winnerId = duelResult.matchResult === 'win' ? challenge.challenged_id : duelResult.matchResult === 'loss' ? challenge.challenger_id : null;
      }

      await supabase
        .from('friendly_challenges')
        .update({
          status: 'COMPLETED',
          challenged_cards: playerCards,
          result_details: duelResult,
          winner_id: winnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId);

      return NextResponse.json({
        success: true,
        duelResult,
        winnerId
      });
    }

    // 3. REJECT CHALLENGE
    if (action === 'REJECT') {
      await supabase
        .from('friendly_challenges')
        .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
        .eq('id', challengeId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Nieznana akcja' }, { status: 400 });
  } catch (err: any) {
    console.error('Challenge error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
