// app/api/game/battle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { simulate1v1Duel, simulate3v3Battle, BattleCard } from '@/lib/game/battles';
import { calculateLevelFromXP, GameMission } from '@/lib/game/economy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, mode, difficulty, playerCard, playerSquad } = body;

    if (!userId || !mode) {
      return NextResponse.json({ success: false, error: 'Brak wymaganych parametrów' }, { status: 400 });
    }

    const diff: 'easy' | 'medium' | 'hard' = difficulty || 'medium';

    let resultPayload: any = null;

    if (mode === '1v1') {
      const card: BattleCard = playerCard || {
        id: 'default_card',
        name: 'Zawodnik DELTA',
        position: 'CM',
        overall: 78,
        pace: 75,
        shooting: 72,
        passing: 79,
        dribbling: 76,
        defending: 70,
        physical: 74
      };

      const duelResult = simulate1v1Duel(card, diff);
      resultPayload = duelResult;

      // Log battle to DB
      await supabase.from('card_battles_history').insert({
        user_id: userId,
        battle_mode: '1v1',
        difficulty: diff,
        result: duelResult.matchResult,
        player_score: duelResult.playerScore,
        cpu_score: duelResult.cpuScore,
        xp_awarded: duelResult.xpAwarded,
        details: { rounds: duelResult.rounds, cpuCard: duelResult.cpuCard }
      });

      // Update XP in game profile
      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + duelResult.xpAwarded;
      const newSeasonXP = (profile?.season_xp || 0) + duelResult.xpAwarded;
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

      // Update Daily Mission progress for battle
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: dailyRow } = await supabase
        .from('user_daily_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('mission_date', todayStr)
        .maybeSingle();

      if (dailyRow && dailyRow.missions) {
        const missions: GameMission[] = dailyRow.missions;
        const battleMission = missions.find(m => m.id.includes('daily_battle'));
        if (battleMission && !battleMission.completed) {
          battleMission.currentCount = Math.min(battleMission.targetCount, battleMission.currentCount + 1);
          if (battleMission.currentCount >= battleMission.targetCount) {
            battleMission.completed = true;
          }
          await supabase
            .from('user_daily_missions')
            .update({ missions, updated_at: new Date().toISOString() })
            .eq('id', dailyRow.id);
        }
      }

      return NextResponse.json({
        success: true,
        battleResult: duelResult,
        newLevelInfo: levelInfo
      });
    } else {
      // 3v3 Squad Battle
      const squad: BattleCard[] = playerSquad && playerSquad.length >= 3 ? playerSquad : [
        { id: '1', name: 'Napastnik DELTA', position: 'FW', overall: 80, pace: 84, shooting: 82, passing: 74, dribbling: 79, defending: 50, physical: 72 },
        { id: '2', name: 'Pomocnik DELTA', position: 'MF', overall: 78, pace: 76, shooting: 74, passing: 81, dribbling: 78, defending: 70, physical: 73 },
        { id: '3', name: 'Obrońca DELTA', position: 'DF', overall: 79, pace: 74, shooting: 55, passing: 72, dribbling: 68, defending: 83, physical: 84 }
      ];

      const battle3v3 = simulate3v3Battle(squad, diff);

      await supabase.from('card_battles_history').insert({
        user_id: userId,
        battle_mode: '3v3',
        difficulty: diff,
        result: battle3v3.matchResult,
        player_score: battle3v3.playerScore,
        cpu_score: battle3v3.cpuScore,
        xp_awarded: battle3v3.xpAwarded,
        details: { duels: battle3v3.duels }
      });

      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + battle3v3.xpAwarded;
      const newSeasonXP = (profile?.season_xp || 0) + battle3v3.xpAwarded;
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

      return NextResponse.json({
        success: true,
        battleResult: battle3v3,
        newLevelInfo: levelInfo
      });
    }
  } catch (err: any) {
    console.error('Battle error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
