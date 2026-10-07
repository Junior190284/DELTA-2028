// app/api/social/team-goals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateLevelFromXP } from '@/lib/game/economy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, goalId } = body;

    if (!userId || !goalId) {
      return NextResponse.json({ success: false, error: 'Brak userId lub goalId' }, { status: 400 });
    }

    // Check if goal is completed
    const { data: goal } = await supabase
      .from('team_goals')
      .select('*')
      .eq('id', goalId)
      .maybeSingle();

    if (!goal || !goal.completed) {
      return NextResponse.json({ success: false, error: 'Cel drużyny nie został jeszcze ukończony' }, { status: 400 });
    }

    // Insert claim (prevent duplicate via unique constraint)
    const { error: claimErr } = await supabase
      .from('team_goals_claims')
      .insert({ goal_id: goalId, user_id: userId });

    if (claimErr) {
      return NextResponse.json({ success: false, error: 'Nagroda za ten cel została już odebrana' }, { status: 400 });
    }

    // Award XP
    const xpReward = goal.reward_value?.xp || 100;
    const { data: profile } = await supabase
      .from('user_game_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const newXP = (profile?.current_xp || 0) + xpReward;
    const newSeasonXP = (profile?.season_xp || 0) + xpReward;
    const levelInfo = calculateLevelFromXP(newXP);

    await supabase
      .from('user_game_profile')
      .upsert({
        user_id: userId,
        current_level: levelInfo.level,
        current_xp: newXP,
        season_xp: newSeasonXP,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    // Reward Log
    await supabase.from('reward_logs').insert({
      user_id: userId,
      reward_type: 'XP',
      reward_value: { xp: xpReward, goalTitle: goal.title },
      source_type: 'CHALLENGE',
      source_id: goalId
    });

    return NextResponse.json({
      success: true,
      xpAwarded: xpReward,
      levelInfo
    });
  } catch (err: any) {
    console.error('Claim team goal error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
