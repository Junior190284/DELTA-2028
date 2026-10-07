// app/api/game/minigames/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMinigameXPAward, calculateLevelFromXP, GameMission } from '@/lib/game/economy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, gameId, score } = body;

    if (!userId || !gameId || typeof score !== 'number') {
      return NextResponse.json({ success: false, error: 'Nieprawidłowe dane minigry' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch existing score row
    const { data: scoreRow } = await supabase
      .from('minigame_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .maybeSingle();

    let dailyPlays = 1;
    let bestScore = score;
    let totalPlays = 1;

    if (scoreRow) {
      bestScore = Math.max(scoreRow.best_score || 0, score);
      totalPlays = (scoreRow.total_plays || 0) + 1;
      
      if (scoreRow.last_daily_play_date === todayStr) {
        dailyPlays = (scoreRow.daily_plays_count || 0) + 1;
      } else {
        dailyPlays = 1;
      }
    }

    // Anti-farming XP calculation
    const xpResult = calculateMinigameXPAward(score, dailyPlays, 0);

    // Update minigame scores
    await supabase
      .from('minigame_scores')
      .upsert({
        user_id: userId,
        game_id: gameId,
        best_score: bestScore,
        total_plays: totalPlays,
        daily_plays_count: dailyPlays,
        last_daily_play_date: todayStr,
        last_played_at: new Date().toISOString()
      }, { onConflict: 'user_id,game_id' });

    // Update user game profile XP if any
    let levelInfo = null;
    if (xpResult.awardedXP > 0) {
      const { data: profile } = await supabase
        .from('user_game_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const newXP = (profile?.current_xp || 0) + xpResult.awardedXP;
      const newSeasonXP = (profile?.season_xp || 0) + xpResult.awardedXP;
      levelInfo = calculateLevelFromXP(newXP);

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
        reward_value: { xp: xpResult.awardedXP, gameId, score },
        source_type: 'MINIGAME',
        source_id: gameId
      });
    }

    // Update Daily Mission progress for minigames
    const { data: dailyRow } = await supabase
      .from('user_daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_date', todayStr)
      .maybeSingle();

    if (dailyRow && dailyRow.missions) {
      const missions: GameMission[] = dailyRow.missions;
      const minigameMission = missions.find(m => m.id.includes('daily_minigame'));
      if (minigameMission && !minigameMission.completed) {
        minigameMission.currentCount = Math.min(minigameMission.targetCount, minigameMission.currentCount + 1);
        if (minigameMission.currentCount >= minigameMission.targetCount) {
          minigameMission.completed = true;
        }
        await supabase
          .from('user_daily_missions')
          .update({ missions, updated_at: new Date().toISOString() })
          .eq('id', dailyRow.id);
      }
    }

    return NextResponse.json({
      success: true,
      awardedXP: xpResult.awardedXP,
      reachedDailyCap: xpResult.reachedCap,
      dailyPlays,
      bestScore,
      levelInfo
    });
  } catch (err: any) {
    console.error('Submit minigame score error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
