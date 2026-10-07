// lib/game/battles.ts
// 1v1 Card Duel & 3v3 Squad Battle Simulation Engine

export interface BattleCard {
  id: string;
  name: string;
  position: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  image?: string;
  rarity?: string;
}

export interface RoundResult {
  roundNumber: number;
  statCategory: string;
  statName: string;
  playerStatValue: number;
  cpuStatValue: number;
  winner: 'player' | 'cpu' | 'draw';
  commentary: string;
}

export interface BattleSummary {
  mode: '1v1' | '3v3';
  difficulty: 'easy' | 'medium' | 'hard';
  rounds: RoundResult[];
  playerScore: number;
  cpuScore: number;
  matchResult: 'win' | 'loss' | 'draw';
  xpAwarded: number;
  playerCard: BattleCard;
  cpuCard: BattleCard;
}

// Generate realistic CPU opponent card scaled to player level / card rating
export function generateCpuOpponent(playerCard: BattleCard, difficulty: 'easy' | 'medium' | 'hard'): BattleCard {
  const diffOffset = difficulty === 'easy' ? -4 : difficulty === 'medium' ? 0 : 4;
  const oppNames = [
    'Rywale Mokotów AI',
    'Akademia Ursynów Bot',
    'Legia Młodziki AI',
    'Polonia Junior CPU',
    'Varsovia 2018 Bot',
    'SEMP Ursynów AI'
  ];
  const name = oppNames[Math.floor(Math.random() * oppNames.length)];
  
  const clamp = (val: number) => Math.min(99, Math.max(50, val));
  const randVariance = () => Math.floor(Math.random() * 7) - 3; // -3 to +3

  return {
    id: `cpu_${Date.now()}`,
    name,
    position: playerCard.position || 'CM',
    overall: clamp(playerCard.overall + diffOffset + randVariance()),
    pace: clamp(playerCard.pace + diffOffset + randVariance()),
    shooting: clamp(playerCard.shooting + diffOffset + randVariance()),
    passing: clamp(playerCard.passing + diffOffset + randVariance()),
    dribbling: clamp(playerCard.dribbling + diffOffset + randVariance()),
    defending: clamp(playerCard.defending + diffOffset + randVariance()),
    physical: clamp(playerCard.physical + diffOffset + randVariance()),
    rarity: difficulty === 'hard' ? 'inferno' : difficulty === 'medium' ? 'rare' : 'common'
  };
}

// 1v1 Card Duel Engine: 3 Tactical Stat Rounds
export function simulate1v1Duel(
  playerCard: BattleCard,
  difficulty: 'easy' | 'medium' | 'hard',
  chosenStats?: string[] // e.g. ['pace', 'shooting', 'overall']
): BattleSummary {
  const cpuCard = generateCpuOpponent(playerCard, difficulty);
  
  const defaultRounds = [
    { key: 'pace', name: 'Szybkość i Przyspieszenie (PAC)' },
    { key: 'shooting', name: 'Siła Strzału i Celność (SHO)' },
    { key: 'overall', name: 'Ogólna Klasa Zawodnika (OVR)' }
  ];

  const rounds: RoundResult[] = [];
  let playerScore = 0;
  let cpuScore = 0;

  defaultRounds.forEach((roundDef, idx) => {
    let pVal = (playerCard as any)[roundDef.key] || playerCard.overall || 70;
    let cVal = (cpuCard as any)[roundDef.key] || cpuCard.overall || 70;

    let winner: 'player' | 'cpu' | 'draw' = 'draw';
    let commentary = '';

    if (pVal > cVal) {
      winner = 'player';
      playerScore++;
      commentary = `${playerCard.name} wygrywa pojedynek w kategorii ${roundDef.name}! (${pVal} vs ${cVal})`;
    } else if (cVal > pVal) {
      winner = 'cpu';
      cpuScore++;
      commentary = `${cpuCard.name} okazuje się lepszy w starciu ${roundDef.name}. (${cVal} vs ${pVal})`;
    } else {
      winner = 'draw';
      commentary = `Remis w starciu na ${roundDef.name}! Idealna równowaga obu kart (${pVal} vs ${cVal}).`;
    }

    rounds.push({
      roundNumber: idx + 1,
      statCategory: roundDef.key,
      statName: roundDef.name,
      playerStatValue: pVal,
      cpuStatValue: cVal,
      winner,
      commentary
    });
  });

  let matchResult: 'win' | 'loss' | 'draw' = 'draw';
  if (playerScore > cpuScore) matchResult = 'win';
  else if (cpuScore > playerScore) matchResult = 'loss';

  // XP Rewards
  const xpMap = {
    win: { easy: 45, medium: 75, hard: 110 },
    draw: { easy: 20, medium: 30, hard: 45 },
    loss: { easy: 10, medium: 15, hard: 20 }
  };

  const xpAwarded = xpMap[matchResult][difficulty];

  return {
    mode: '1v1',
    difficulty,
    rounds,
    playerScore,
    cpuScore,
    matchResult,
    xpAwarded,
    playerCard,
    cpuCard
  };
}

// 3v3 Squad Battle Simulation (Attack, Midfield, Defense)
export function simulate3v3Battle(
  playerSquad: BattleCard[],
  difficulty: 'easy' | 'medium' | 'hard'
): {
  playerScore: number;
  cpuScore: number;
  matchResult: 'win' | 'loss' | 'draw';
  xpAwarded: number;
  duels: Array<{ sector: string; playerCardName: string; cpuCardName: string; winner: string; commentary: string }>;
} {
  const diffOffset = difficulty === 'easy' ? -5 : difficulty === 'medium' ? 0 : 5;
  const sectors = ['Atak (Wykończenie)', 'Pomoc (Rozegranie & Drybling)', 'Obrona & Walka Fizyczna'];
  
  let playerScore = 0;
  let cpuScore = 0;
  const duels: Array<{ sector: string; playerCardName: string; cpuCardName: string; winner: string; commentary: string }> = [];

  const defaultCards = playerSquad.slice(0, 3);
  while (defaultCards.length < 3) {
    defaultCards.push({
      id: `filler_${defaultCards.length}`,
      name: `Zawodnik DELTA ${defaultCards.length + 1}`,
      position: 'CM',
      overall: 70,
      pace: 70,
      shooting: 65,
      passing: 70,
      dribbling: 68,
      defending: 65,
      physical: 68
    });
  }

  sectors.forEach((sec, idx) => {
    const pCard = defaultCards[idx];
    const cpuCard = generateCpuOpponent(pCard, difficulty);

    let pStat = 0;
    let cStat = 0;

    if (idx === 0) {
      // Attack: Shooting + Pace
      pStat = Math.round((pCard.shooting + pCard.pace) / 2);
      cStat = Math.round((cpuCard.shooting + cpuCard.pace) / 2);
    } else if (idx === 1) {
      // Midfield: Passing + Dribbling
      pStat = Math.round((pCard.passing + pCard.dribbling) / 2);
      cStat = Math.round((cpuCard.passing + cpuCard.dribbling) / 2);
    } else {
      // Defense: Defending + Physical
      pStat = Math.round((pCard.defending + pCard.physical) / 2);
      cStat = Math.round((cpuCard.defending + cpuCard.physical) / 2);
    }

    let winner = 'draw';
    let commentary = '';

    if (pStat > cStat) {
      winner = 'player';
      playerScore++;
      commentary = `${pCard.name} wygrywa sektor ${sec}! (${pStat} vs ${cStat})`;
    } else if (cStat > pStat) {
      winner = 'cpu';
      cpuScore++;
      commentary = `${cpuCard.name} dominuje sektor ${sec}! (${cStat} vs ${pStat})`;
    } else {
      winner = 'draw';
      commentary = `Remis w sektorze ${sec}! (${pStat} vs ${cStat})`;
    }

    duels.push({
      sector: sec,
      playerCardName: pCard.name,
      cpuCardName: cpuCard.name,
      winner,
      commentary
    });
  });

  let matchResult: 'win' | 'loss' | 'draw' = 'draw';
  if (playerScore > cpuScore) matchResult = 'win';
  else if (cpuScore > playerScore) matchResult = 'loss';

  const xpMap = {
    win: { easy: 70, medium: 110, hard: 160 },
    draw: { easy: 30, medium: 45, hard: 65 },
    loss: { easy: 15, medium: 25, hard: 35 }
  };

  const xpAwarded = xpMap[matchResult][difficulty];

  return {
    playerScore,
    cpuScore,
    matchResult,
    xpAwarded,
    duels
  };
}
