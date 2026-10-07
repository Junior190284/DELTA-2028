'use client';

import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Flame, 
  Shield, 
  Star, 
  Sparkles, 
  MapPin, 
  Clock, 
  Users, 
  Award,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { getTeamLogo, formatTeamName } from '@/lib/teams';

interface DeltaMatchdayBroadcastProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    id: string;
    home_team: string;
    away_team: string;
    match_date: string;
    match_time?: string | null;
    venue?: string | null;
    home_score?: number | null;
    away_score?: number | null;
    status: string;
  };
  mvpPlayerName?: string;
  onRewardClaimed?: () => void;
}

export const DeltaMatchdayBroadcast: React.FC<DeltaMatchdayBroadcastProps> = ({
  isOpen,
  onClose,
  match,
  mvpPlayerName = 'Zawodnik DELTA',
  onRewardClaimed
}) => {
  const [activeTab, setActiveTab] = useState<'PRE_MATCH' | 'POST_MATCH'>(
    match.status === 'played' ? 'POST_MATCH' : 'PRE_MATCH'
  );

  if (!isOpen || !match) return null;

  const isHome = match.home_team.toLowerCase().includes('delta');
  const opponent = isHome ? match.away_team : match.home_team;
  const isWinner = match.status === 'played' && (
    (isHome && (match.home_score || 0) > (match.away_score || 0)) ||
    (!isHome && (match.away_score || 0) > (match.home_score || 0))
  );

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Stadium Broadcast Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-xl shadow-lg shadow-red-600/30 shrink-0">
              🏟️
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                DELTA MATCHDAY BROADCAST
              </span>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider mt-0.5 m-0">
                Studio Meczowe DELTA 2018
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="v200-modal-close"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 bg-slate-950/80 border-b border-white/5 gap-2">
          <button
            onClick={() => setActiveTab('PRE_MATCH')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'PRE_MATCH'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pre-Match Studio (Zapowiedź)
          </button>
          <button
            onClick={() => setActiveTab('POST_MATCH')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'POST_MATCH'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Post-Match Review (Wynik & MVP)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Matchup Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 text-center relative overflow-hidden shadow-inner">
            <div className="grid grid-cols-3 items-center gap-2">
              {/* DELTA GM */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-lg">
                  <img src="/teamlogos/gm.png" alt="DELTA" className="w-full h-full object-contain" />
                </div>
                <span className="font-black text-white text-xs sm:text-sm uppercase">DELTA GM</span>
              </div>

              {/* Score / VS Badge */}
              <div className="flex flex-col items-center">
                {match.status === 'played' ? (
                  <div className="px-4 py-2 rounded-2xl bg-slate-800/90 border border-amber-500/40 text-2xl sm:text-3xl font-black text-amber-400 shadow-xl">
                    {match.home_score} : {match.away_score}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-black text-white text-sm shadow-xl shadow-red-600/30 animate-pulse">
                    VS
                  </div>
                )}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  {match.status === 'played' ? 'MECZ ZAKOŃCZONY' : 'LIGA MZPN 2018'}
                </span>
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-lg">
                  <img 
                    src={getTeamLogo(opponent)} 
                    alt={opponent} 
                    className="w-full h-full object-contain"
                    onError={(e: any) => { e.target.src = '/teamlogos/gm.png'; }}
                  />
                </div>
                <span className="font-black text-white text-xs sm:text-sm uppercase">
                  {formatTeamName(opponent)}
                </span>
              </div>
            </div>
          </div>

          {activeTab === 'PRE_MATCH' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Clock size={14} /> Data i Godzina
                  </div>
                  <p className="text-white font-black">{match.match_date} · {match.match_time || '10:00'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <MapPin size={14} /> Lokalizacja
                  </div>
                  <p className="text-white font-black truncate">{match.venue || 'Boisko Mokotów'}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-500/20 text-xs text-slate-300 space-y-2">
                <h4 className="font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Flame size={15} className="text-red-500" /> Wskazówki Przedmeczowe Trenera:
                </h4>
                <p>
                  Pełna koncentracja od pierwszej minuty, gra wysokim pressingiem i odważne pojedynki 1v1 na skrzydłach!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'POST_MATCH' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Match Result Banner */}
              <div className={`p-4 rounded-xl border text-center ${
                isWinner 
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/60 border-white/10 text-slate-300'
              }`}>
                <h4 className="font-black text-base uppercase tracking-wider">
                  {isWinner ? '🏆 ZWYCIĘSTWO DELTA WARSZAWA!' : '⚔️ ZAKOŃCZONO SPOTKANIE'}
                </h4>
                <p className="text-xs mt-0.5">Dziękujemy zawodnikom i rodzicom za gorący doping!</p>
              </div>

              {/* MVP Player Spotlight */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl">
                    ⭐
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                      BOHATER SPOTKANIA (MVP)
                    </span>
                    <h4 className="font-black text-white text-sm sm:text-base">{mvpPlayerName}</h4>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  +150 XP
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            Zamknij Studio
          </button>
        </div>
      </div>
    </div>
  );
};
