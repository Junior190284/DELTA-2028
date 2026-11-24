// app/api/game/missions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDailyMissions, generateWeeklyMissions, GameMission } from '@/lib/game/economy';

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

    // 1. Session verification
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

    // 2. Fetch or generate Daily Missions
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

    // 3. Fetch or generate Weekly Missions
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

    // 2. SECURITY GATE: Validate basic request structure
    if (!missionId || !category || (category !== 'DAILY' && category !== 'WEEKLY')) {
      return NextResponse.json({ success: false, error: 'Nieprawidłowe dane żądania' }, { status: 400 });
    }

    // 3. SECURITY GATE: IDOR Protection
    if (userId && userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Brak uprawnień do konta innego użytkownika' }, { status: 403 });
    }

    // 4. SECURITY GATE: Atomicity & Untrusted State Safe Refusal (DELTA-043SEC.1)
    // Tabela user_daily_missions przechowuje misje jako surowy JSONB bez blokad wierszy ani atomowości,
    // a reward_logs nie posiada ograniczenia UNIQUE(user_id, source_type, source_id).
    // Bez migracji bazy danych atomowy odbiór bez wyścigu nie jest możliwy.
    // Zgodnie z zaleceniem bezpieczeństwa, mutacja claim zostaje bezpiecznie zablokowana.
    return NextResponse.json({
      success: false,
      code: 'LEGACY_CLAIM_DISABLED',
      error: 'Odbieranie nagród przez starszy endpoint /api/game/missions zostało wyłączone ze względów bezpieczeństwa (brak atomowości legacy bazy). Nagrody są przyznawane autorytatywnie przez dedykowane moduły.'
    }, { status: 410 });
  } catch (err: any) {
    console.error('Legacy claim error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
