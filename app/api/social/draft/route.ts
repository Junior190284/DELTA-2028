// app/api/social/draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BattleCard, simulate3v3Battle } from '@/lib/game/battles';

export const dynamic = 'force-dynamic';

// System card pool definition for fair draft (equal chances for all players)
const DRAFT_POOL: BattleCard[] = [
  { id: 'd_1', name: 'Snajper Mokotowa', position: 'FW', overall: 86, pace: 88, shooting: 89, passing: 78, dribbling: 84, defending: 45, physical: 78, rarity: 'inferno' },
  { id: 'd_2', name: 'Skrzydłowy Błyskawica', position: 'FW', overall: 84, pace: 92, shooting: 81, passing: 80, dribbling: 87, defending: 50, physical: 70, rarity: 'gold' },
  { id: 'd_3', name: 'Mózg Środka Pola', position: 'MF', overall: 85, pace: 78, shooting: 80, passing: 91, dribbling: 86, defending: 74, physical: 76, rarity: 'icon' },
  { id: 'd_4', name: 'Waleczny Pomocnik', position: 'MF', overall: 82, pace: 80, shooting: 76, passing: 83, dribbling: 81, defending: 80, physical: 84, rarity: 'gold' },
  { id: 'd_5', name: 'Filar Defensywy', position: 'DF', overall: 86, pace: 82, shooting: 50, passing: 76, dribbling: 72, defending: 90, physical: 89, rarity: 'inferno' },
  { id: 'd_6', name: 'Boczny Obrońca Pro', position: 'DF', overall: 83, pace: 87, shooting: 65, passing: 80, dribbling: 79, defending: 83, physical: 79, rarity: 'gold' },
  { id: 'd_7', name: 'Bramkarz Ściana', position: 'GK', overall: 87, pace: 70, shooting: 30, passing: 75, dribbling: 65, defending: 92, physical: 88, rarity: 'icon' },
  { id: 'd_8', name: 'Młody Drybler', position: 'MF', overall: 81, pace: 85, shooting: 74, passing: 82, dribbling: 89, defending: 60, physical: 68, rarity: 'standard' }
];

export async function GET() {
  try {
    // Generate 3 random cards for each of the 3 draft picks
    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
    
    const round1 = shuffle(DRAFT_POOL).slice(0, 3);
    const round2 = shuffle(DRAFT_POOL).slice(0, 3);
    const round3 = shuffle(DRAFT_POOL).slice(0, 3);

    return NextResponse.json({
      success: true,
      draftRounds: [round1, round2, round3]
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickedCards, difficulty = 'medium' } = body;

    if (!pickedCards || pickedCards.length < 3) {
      return NextResponse.json({ success: false, error: 'Wybierz 3 karty do składu draftu' }, { status: 400 });
    }

    const matchResult = simulate3v3Battle(pickedCards, difficulty);

    return NextResponse.json({
      success: true,
      matchResult
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
