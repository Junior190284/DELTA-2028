// app/api/social/hub/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest_user';

    // 1. Fetch Active League Standings
    const { data: standings } = await supabase
      .from('card_league_standings')
      .select('*')
      .order('points', { ascending: false })
      .limit(20);

    // 2. Fetch Team Goals
    const { data: teamGoals } = await supabase
      .from('team_goals')
      .select('*')
      .order('created_at', { ascending: false });

    // 3. Fetch User's Claimed Team Goals
    const { data: goalClaims } = await supabase
      .from('team_goals_claims')
      .select('goal_id')
      .eq('user_id', userId);

    const claimedGoalIds = (goalClaims || []).map(c => c.goal_id);

    // 4. Fetch Player of the Week
    const { data: potw } = await supabase
      .from('player_of_the_week')
      .select('*')
      .order('awarded_at', { ascending: false })
      .limit(5);

    // 5. Fetch Active Tournaments
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4);

    // 6. Fetch User Profile Customization
    const { data: customProfile } = await supabase
      .from('user_profile_customization')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Default mock data if table freshly created
    const fallbackStandings = standings && standings.length > 0 ? standings : [
      { id: '1', user_id: 'u1', display_name: 'Ryszard R. (C)', played: 12, won: 10, drawn: 1, lost: 1, points: 31, form: ['W', 'W', 'W', 'D', 'W'] },
      { id: '2', user_id: 'u2', display_name: 'Tomek N.', played: 12, won: 9, drawn: 2, lost: 1, points: 29, form: ['W', 'W', 'W', 'W', 'D'] },
      { id: '3', user_id: 'u3', display_name: 'Kuba P.', played: 11, won: 8, drawn: 1, lost: 2, points: 25, form: ['W', 'L', 'W', 'W', 'W'] },
      { id: '4', user_id: userId, display_name: 'Twój Zespół', played: 10, won: 7, drawn: 2, lost: 1, points: 23, form: ['W', 'W', 'D', 'W', 'L'] },
      { id: '5', user_id: 'u5', display_name: 'Janek O.', played: 11, won: 6, drawn: 2, lost: 3, points: 20, form: ['D', 'W', 'L', 'W', 'W'] }
    ];

    const fallbackGoals = teamGoals && teamGoals.length > 0 ? teamGoals : [
      {
        id: 'team_goal_attendance_100',
        title: 'Wspólna Frekwencja Treningowa',
        description: 'Łącznie 100 potwierdzonych obecności na treningach w tym miesiącu.',
        target_value: 100,
        current_value: 78,
        metric: 'ATTENDANCE',
        reward_value: { xp: 150, pack: 'GOLD_PACK' },
        completed: false
      },
      {
        id: 'team_goal_minigames_300',
        title: 'Drużynowy Trening Celności',
        description: 'Wykonajcie łącznie 300 prób w minigrach treningowych.',
        target_value: 300,
        current_value: 300,
        metric: 'MINIGAMES',
        reward_value: { xp: 120, badge: 'badge_sniper_team' },
        completed: true
      }
    ];

    const fallbackPotw = potw && potw.length > 0 ? potw : [
      {
        id: 'potw_1',
        week_label: 'Tydzień 40 (Październik 2026)',
        player_name: 'Ryszard Rybacki',
        category: 'PLAYER_OF_THE_WEEK',
        reason: 'Kapitalna postawa w meczu ligowym, 3 bramki i wzorowe wsparcie kolegów z defensywy.',
        awarded_by: 'Trener DELTA',
        awarded_at: new Date().toISOString()
      },
      {
        id: 'potw_2',
        week_label: 'Tydzień 39 (Wrzesień 2026)',
        player_name: 'Oliwier Bramkarz',
        category: 'GOALKEEPER_OF_WEEK',
        reason: 'Niesamowita seria czystych kont na treningach i obrona rzutu karnego w końcówce spotkania.',
        awarded_by: 'Trener Bramkarzy',
        awarded_at: new Date(Date.now() - 7 * 86400000).toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      standings: fallbackStandings,
      teamGoals: fallbackGoals,
      claimedGoalIds,
      playerOfTheWeek: fallbackPotw,
      tournaments: tournaments || [],
      customProfile: customProfile || {
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
    console.error('Social hub error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
