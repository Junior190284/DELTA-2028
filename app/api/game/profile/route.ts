// app/api/game/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateLevelFromXP } from '@/lib/game/economy';
import { CURRENT_SEASON } from '@/lib/game/seasons';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';

    // 1. Fetch user game profile
    const { data: profile, error } = await supabase
      .from('user_game_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching game profile:', error);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let currentXP = profile?.current_xp || 0;
    let seasonXP = profile?.season_xp || 0;
    let streak = profile?.activity_streak || 1;
    let maxStreak = profile?.max_streak || 1;
    let lastActivity = profile?.last_activity_date || todayStr;
    let wheelStreakDay = profile?.wheel_streak_day || 1;
    let lastWheelSpin = profile?.last_wheel_spin_date || null;

    // Check daily activity streak update
    if (profile && profile.last_activity_date) {
      const lastDate = new Date(profile.last_activity_date);
      const todayDate = new Date(todayStr);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak += 1;
        if (streak > maxStreak) maxStreak = streak;
      } else if (diffDays > 1) {
        // Guilt-free resumption: reset streak to 1 gently
        streak = 1;
      }
    }

    const levelInfo = calculateLevelFromXP(currentXP);

    // Fetch unread notifications count
    const { count: unreadNotifs } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      profile: {
        userId,
        currentXP,
        seasonXP,
        levelInfo,
        activityStreak: streak,
        maxStreak,
        wheelStreakDay,
        lastWheelSpinDate: lastWheelSpin,
        canSpinWheelToday: lastWheelSpin !== todayStr,
        unreadNotifications: unreadNotifs || 0,
        currentSeason: CURRENT_SEASON
      }
    });
  } catch (err: any) {
    console.error('Game profile error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, addXP, reason, sourceType } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Brak userId' }, { status: 400 });
    }

    const xpToAdd = Number(addXP) || 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch existing
    const { data: existing } = await supabase
      .from('user_game_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const newCurrentXP = (existing?.current_xp || 0) + xpToAdd;
    const newSeasonXP = (existing?.season_xp || 0) + xpToAdd;
    const levelInfo = calculateLevelFromXP(newCurrentXP);

    const upsertData = {
      user_id: userId,
      current_level: levelInfo.level,
      current_xp: newCurrentXP,
      season_xp: newSeasonXP,
      activity_streak: existing?.activity_streak || 1,
      max_streak: Math.max(existing?.max_streak || 1, existing?.activity_streak || 1),
      last_activity_date: todayStr,
      updated_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabase
      .from('user_game_profile')
      .upsert(upsertData, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('Error updating game profile:', upsertErr);
    }

    // Log reward if XP was added
    if (xpToAdd > 0) {
      await supabase.from('reward_logs').insert({
        user_id: userId,
        reward_type: 'XP',
        reward_value: { xp: xpToAdd, reason: reason || 'Aktywność w grze' },
        source_type: sourceType || 'SYSTEM'
      });
    }

    return NextResponse.json({
      success: true,
      newXP: newCurrentXP,
      levelInfo
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
