// app/api/game/missions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDailyMissions, generateWeeklyMissions, GameMission, calculateLevelFromXP } from '@/lib/game/economy';

export const dynamic = 'force-dynamic';

function getWeekStartDate(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStartDate();

    // 1. Fetch or generate Daily Missions
    let dailyMissions: GameMission[] = [];
    const { data: dailyRow } = await supabase
      .from('user_daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_date', todayStr)
      .maybeSingle();

    if (dailyRow && dailyRow.missions && dailyRow.missions.length > 0) {
      dailyMissions = dailyRow.missions;
    } else {
      dailyMissions = generateDailyMissions();
      await supabase
        .from('user_daily_missions')
        .upsert({
          user_id: userId,
          mission_date: todayStr,
          missions: dailyMissions
        }, { onConflict: 'user_id,mission_date' });
    }

    // 2. Fetch or generate Weekly Missions
    let weeklyMissions: GameMission[] = [];
    const { data: weeklyRow } = await supabase
      .from('user_weekly_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartStr)
      .maybeSingle();

    if (weeklyRow && weeklyRow.missions && weeklyRow.missions.length > 0) {
      weeklyMissions = weeklyRow.missions;
    } else {
      weeklyMissions = generateWeeklyMissions(weekStartStr);
      await supabase
        .from('user_weekly_missions')
        .upsert({
          user_id: userId,
          week_start_date: weekStartStr,
          missions: weeklyMissions
        }, { onConflict: 'user_id,week_start_date' });
    }

    return NextResponse.json({
      success: true,
      dailyMissions,
      weeklyMissions,
      today: todayStr,
      weekStart: weekStartStr
    });
  } catch (err: any) {
    console.error('Fetch missions error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, missionId, category } = body;

    if (!userId || !missionId || !category) {
      return NextResponse.json({ success: false, error: 'Nieprawidłowe dane żądania' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStartDate();

    if (category === 'DAILY') {
      const { data: dailyRow } = await supabase
        .from('user_daily_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('mission_date', todayStr)
        .maybeSingle();

      if (!dailyRow) {
        return NextResponse.json({ success: false, error: 'Nie znaleziono misji dziennych' }, { status: 404 });
      }

      const missions: GameMission[] = dailyRow.missions || [];
      const mission = missions.find(m => m.id === missionId);

      if (!mission) {
        return NextResponse.json({ success: false, error: 'Nie znaleziono misji' }, { status: 404 });
      }

      if (mission.claimed) {
        return NextResponse.json({ success: false, error: 'Nagroda została już odebrana' }, { status: 400 });
      }

      // Mark claimed
      mission.completed = true;
      mission.claimed = true;

      await supabase
        .from('user_daily_missions')
        .update({ missions, updated_at: new Date().toISOString() })
        .eq('id', dailyRow.id);

      // Award XP
      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + mission.xpReward;
      const newSeasonXP = (profile?.season_xp || 0) + mission.xpReward;
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
        reward_value: { xp: mission.xpReward, missionTitle: mission.title },
        source_type: 'MISSION',
        source_id: missionId
      });

      return NextResponse.json({
        success: true,
        xpAwarded: mission.xpReward,
        newLevelInfo: levelInfo
      });
    } else {
      // Weekly mission claim
      const { data: weeklyRow } = await supabase
        .from('user_weekly_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();

      if (!weeklyRow) {
        return NextResponse.json({ success: false, error: 'Nie znaleziono misji tygodniowych' }, { status: 404 });
      }

      const missions: GameMission[] = weeklyRow.missions || [];
      const mission = missions.find(m => m.id === missionId);

      if (!mission) {
        return NextResponse.json({ success: false, error: 'Nie znaleziono misji' }, { status: 404 });
      }

      if (mission.claimed) {
        return NextResponse.json({ success: false, error: 'Nagroda została już odebrana' }, { status: 400 });
      }

      mission.completed = true;
      mission.claimed = true;

      await supabase
        .from('user_weekly_missions')
        .update({ missions, updated_at: new Date().toISOString() })
        .eq('id', weeklyRow.id);

      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + mission.xpReward;
      const newSeasonXP = (profile?.season_xp || 0) + mission.xpReward;
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

      await supabase.from('reward_logs').insert({
        user_id: userId,
        reward_type: 'XP',
        reward_value: { xp: mission.xpReward, missionTitle: mission.title, packReward: mission.packReward },
        source_type: 'MISSION',
        source_id: missionId
      });

      return NextResponse.json({
        success: true,
        xpAwarded: mission.xpReward,
        packReward: mission.packReward,
        newLevelInfo: levelInfo
      });
    }
  } catch (err: any) {
    console.error('Claim mission error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
