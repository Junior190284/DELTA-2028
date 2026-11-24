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
    const supabase = (req as any).supabaseClient || (await createClient());
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId') || 'guest_user';
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStartDate();

    // Session verification
    const { data: { user } } = await supabase.auth.getUser();

    // Guest mode or unauthenticated visitor: return in-memory without polluting DB
    if (!user || requestedUserId === 'guest_user') {
      return NextResponse.json({
        success: true,
        dailyMissions: generateDailyMissions(),
        weeklyMissions: generateWeeklyMissions(weekStartStr),
        today: todayStr,
        weekStart: weekStartStr
      });
    }

    // Authenticated user: always enforce session user ID to prevent IDOR
    const effectiveUserId = user.id;

    // 1. Fetch or generate Daily Missions
    let dailyMissions: GameMission[] = [];
    const { data: dailyRow } = await supabase
      .from('user_daily_missions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('mission_date', todayStr)
      .maybeSingle();

    if (dailyRow && dailyRow.missions && dailyRow.missions.length > 0) {
      dailyMissions = dailyRow.missions;
    } else {
      dailyMissions = generateDailyMissions();
      await supabase
        .from('user_daily_missions')
        .upsert({
          user_id: effectiveUserId,
          mission_date: todayStr,
          missions: dailyMissions
        }, { onConflict: 'user_id,mission_date' });
    }

    // 2. Fetch or generate Weekly Missions
    let weeklyMissions: GameMission[] = [];
    const { data: weeklyRow } = await supabase
      .from('user_weekly_missions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('week_start_date', weekStartStr)
      .maybeSingle();

    if (weeklyRow && weeklyRow.missions && weeklyRow.missions.length > 0) {
      weeklyMissions = weeklyRow.missions;
    } else {
      weeklyMissions = generateWeeklyMissions(weekStartStr);
      await supabase
        .from('user_weekly_missions')
        .upsert({
          user_id: effectiveUserId,
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
    const supabase = (req as any).supabaseClient || (await createClient());

    // 1. SECURITY GATE: Require verified session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Wymagane logowanie' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, missionId, category } = body;

    if (!missionId || !category || (category !== 'DAILY' && category !== 'WEEKLY')) {
      return NextResponse.json({ success: false, error: 'Nieprawidłowe dane żądania' }, { status: 400 });
    }

    // 2. SECURITY GATE: IDOR Protection
    if (userId && userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Brak uprawnień do konta innego użytkownika' }, { status: 403 });
    }
    const effectiveUserId = user.id;

    const todayStr = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStartDate();

    // 3. SECURITY GATE: Concurrency check against reward_logs (idempotency guard)
    const { data: existingRewardLog } = await supabase
      .from('reward_logs')
      .select('id')
      .eq('user_id', effectiveUserId)
      .eq('source_type', 'MISSION')
      .eq('source_id', missionId)
      .maybeSingle();

    if (existingRewardLog) {
      return NextResponse.json({ success: false, error: 'Nagroda została już odebrana' }, { status: 409 });
    }

    if (category === 'DAILY') {
      const { data: dailyRow } = await supabase
        .from('user_daily_missions')
        .select('*')
        .eq('user_id', effectiveUserId)
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
        return NextResponse.json({ success: false, error: 'Nagroda została już odebrana' }, { status: 409 });
      }

      // 4. SECURITY GATE: Verify genuine mission completion
      let isCompleted = Boolean(
        mission.completed === true ||
        (typeof mission.currentCount === 'number' &&
         typeof mission.targetCount === 'number' &&
         mission.currentCount >= mission.targetCount)
      );

      // Special verification for daily spin: check authoritative user_daily_spins table
      if (!isCompleted && (mission.id.startsWith('daily_spin') || mission.id.includes('spin'))) {
        const { data: spinRow } = await supabase
          .from('user_daily_spins')
          .select('last_spin_at')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (spinRow?.last_spin_at && spinRow.last_spin_at.slice(0, 10) === todayStr) {
          isCompleted = true;
          mission.currentCount = 1;
        }
      }

      if (!isCompleted) {
        return NextResponse.json({ success: false, error: 'Misja nie została jeszcze ukończona' }, { status: 400 });
      }

      // Mark completed & claimed
      mission.completed = true;
      mission.claimed = true;

      await supabase
        .from('user_daily_missions')
        .update({ missions, updated_at: new Date().toISOString() })
        .eq('id', dailyRow.id);

      // Record reward log
      await supabase.from('reward_logs').insert({
        user_id: effectiveUserId,
        reward_type: 'XP',
        reward_value: { xp: mission.xpReward, missionTitle: mission.title },
        source_type: 'MISSION',
        source_id: missionId
      });

      // Award XP
      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + mission.xpReward;
      const newSeasonXP = (profile?.season_xp || 0) + mission.xpReward;
      const levelInfo = calculateLevelFromXP(newXP);

      await supabase
        .from('user_game_profile')
        .upsert({
          user_id: effectiveUserId,
          current_level: levelInfo.level,
          current_xp: newXP,
          season_xp: newSeasonXP,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

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
        .eq('user_id', effectiveUserId)
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
        return NextResponse.json({ success: false, error: 'Nagroda została już odebrana' }, { status: 409 });
      }

      // 4. SECURITY GATE: Verify genuine mission completion
      const isCompleted = Boolean(
        mission.completed === true ||
        (typeof mission.currentCount === 'number' &&
         typeof mission.targetCount === 'number' &&
         mission.currentCount >= mission.targetCount)
      );

      if (!isCompleted) {
        return NextResponse.json({ success: false, error: 'Misja nie została jeszcze ukończona' }, { status: 400 });
      }

      mission.completed = true;
      mission.claimed = true;

      await supabase
        .from('user_weekly_missions')
        .update({ missions, updated_at: new Date().toISOString() })
        .eq('id', weeklyRow.id);

      await supabase.from('reward_logs').insert({
        user_id: effectiveUserId,
        reward_type: 'XP',
        reward_value: { xp: mission.xpReward, missionTitle: mission.title, packReward: mission.packReward },
        source_type: 'MISSION',
        source_id: missionId
      });

      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + mission.xpReward;
      const newSeasonXP = (profile?.season_xp || 0) + mission.xpReward;
      const levelInfo = calculateLevelFromXP(newXP);

      await supabase
        .from('user_game_profile')
        .upsert({
          user_id: effectiveUserId,
          current_level: levelInfo.level,
          current_xp: newXP,
          season_xp: newSeasonXP,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

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
