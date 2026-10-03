"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Crown, 
  Medal, 
  Flame, 
  TrendingUp, 
  Users, 
  Target, 
  X, 
  Calendar, 
  Award, 
  ChevronRight,
  Sparkles,
  Zap,
  Activity
} from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path: string | null;
}

interface TrainingSession {
  id: string;
  training_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  title: string;
  notes: string | null;
}

interface TrainingAttendance {
  training_id: string;
  player_id: string;
  status: string;
}

interface TrainingGame {
  id: string;
  training_id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  created_at: string;
}

interface TrainingGamePlayer {
  game_id: string;
  player_id: string;
  team: "A" | "B" | string;
}

interface DeltaTrainingKingModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  trainingSessions: TrainingSession[];
  trainingAttendance: TrainingAttendance[];
  trainingGames: TrainingGame[];
  trainingGamePlayers: TrainingGamePlayer[];
}

export default function DeltaTrainingKingModal({
  isOpen,
  onClose,
  players,
  trainingSessions,
  trainingAttendance,
  trainingGames,
  trainingGamePlayers
}: DeltaTrainingKingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"games" | "attendance" | "recent">("games");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Obliczenia rankingu gierek treningowych
  const trainingStats = useMemo(() => {
    const map: Record<string, {
      player: Player;
      gamesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      trainingsAttended: number;
      winRate: number;
      scorePoints: number;
    }> = {};

    players.forEach(p => {
      const attended = trainingAttendance.filter(a => a.player_id === p.id && a.status === "present").length;
      map[p.id] = {
        player: p,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        trainingsAttended: attended,
        winRate: 0,
        scorePoints: 0
      };
    });

    // Przelicz wyniki gierek treningowych
    trainingGames.forEach(game => {
      const playersInGame = trainingGamePlayers.filter(tgp => tgp.game_id === game.id);
      const aWon = game.team_a_score > game.team_b_score;
      const bWon = game.team_b_score > game.team_a_score;
      const draw = game.team_a_score === game.team_b_score;

      playersInGame.forEach(tgp => {
        const stat = map[tgp.player_id];
        if (!stat) return;
        stat.gamesPlayed += 1;
        const isTeamA = tgp.team === "A";

        if (isTeamA) {
          stat.goalsFor += game.team_a_score;
          stat.goalsAgainst += game.team_b_score;
          if (aWon) stat.wins += 1;
          else if (draw) stat.draws += 1;
          else stat.losses += 1;
        } else {
          stat.goalsFor += game.team_b_score;
          stat.goalsAgainst += game.team_a_score;
          if (bWon) stat.wins += 1;
          else if (draw) stat.draws += 1;
          else stat.losses += 1;
        }
      });
    });

    Object.values(map).forEach(s => {
      s.winRate = s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0;
      s.scorePoints = (s.wins * 3) + (s.draws * 1) + (s.trainingsAttended * 2);
    });

    return Object.values(map);
  }, [players, trainingAttendance, trainingGames, trainingGamePlayers]);

  // Ranking gierek
  const sortedByGames = useMemo(() => {
    return [...trainingStats].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.trainingsAttended - a.trainingsAttended;
    });
  }, [trainingStats]);

  // Ranking frekwencji
  const sortedByAttendance = useMemo(() => {
    return [...trainingStats].sort((a, b) => b.trainingsAttended - a.trainingsAttended);
  }, [trainingStats]);

  const topKing = sortedByGames[0];

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="v200-knowledge-modal-backdrop" onClick={onClose}>
      <div 
        className="v200-knowledge-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* NAGŁÓWEK */}
        <header className="v200-knowledge-header">
          <div className="v200-knowledge-header-left">
            <div className="v200-knowledge-icon-shield gold-shield">
              <Trophy size={24} />
            </div>
            <div>
              <div className="v200-badge-academy gold-badge">
                <Crown size={13} />
                <span>MINILIGA I RANKING FORMY</span>
              </div>
              <h2>Król Treningu & Formy DELTA 2018</h2>
              <p>Wyniki gierek treningowych, frekwencja oraz forma zespołowa małych mistrzów</p>
            </div>
          </div>

          <button 
            type="button" 
            className="v200-btn-close-knowledge"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </header>

        {/* TOP BANER: AKTUALNY LIDER TRENINGU */}
        {topKing && (
          <div className="v200-training-king-hero">
            <div className="v200-king-badge">
              <Crown size={22} className="crown-icon" />
              <span>KRÓL TRENINGU DELTY</span>
            </div>
            <div className="v200-king-body">
              <div className="v200-king-avatar">
                <span>{topKing.player.shirt_number ? `#${topKing.player.shirt_number}` : "👑"}</span>
              </div>
              <div className="v200-king-info">
                <h3>{topKing.player.display_name}</h3>
                <p>
                  🏆 <b>{topKing.wins}</b> wygranych gierek • <b>{topKing.trainingsAttended}</b> obecności na treningach ({topKing.winRate}% skuteczności)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PRZEŁĄCZNIK ZAKŁADEK */}
        <div className="v200-training-tabs-bar">
          <button 
            type="button"
            className={`v200-tr-tab-btn ${activeTab === "games" ? "active" : ""}`}
            onClick={() => setActiveTab("games")}
          >
            <Zap size={16} />
            <span>ZWYCIĘZCY GIEREK ({trainingGames.length})</span>
          </button>

          <button 
            type="button"
            className={`v200-tr-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            <Flame size={16} />
            <span>ŻELAZNA FREKWENCJA</span>
          </button>

          <button 
            type="button"
            className={`v200-tr-tab-btn ${activeTab === "recent" ? "active" : ""}`}
            onClick={() => setActiveTab("recent")}
          >
            <Activity size={16} />
            <span>OSTATNIE GIERKI ({trainingGames.length})</span>
          </button>
        </div>

        <div className="v200-knowledge-content">
          {activeTab === "games" ? (
            /* TABELA GIEREK TRENINGOWYCH */
            <div className="v200-training-table-wrap">
              <table className="v200-training-table">
                <thead>
                  <tr>
                    <th>Msc</th>
                    <th>Zawodnik</th>
                    <th>Gierki</th>
                    <th>Wygrane (W-R-P)</th>
                    <th>Win Rate %</th>
                    <th>Bramki (+/-)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByGames.map((stat, idx) => (
                    <tr key={stat.player.id} className={idx < 3 ? `top-${idx + 1}` : ""}>
                      <td className="rank-cell">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                      </td>
                      <td className="player-cell">
                        <strong>{stat.player.display_name}</strong>
                        <small>#{stat.player.shirt_number || "-"}</small>
                      </td>
                      <td><b>{stat.gamesPlayed}</b></td>
                      <td className="record-cell">
                        <span className="w">{stat.wins}W</span>
                        <span className="d">{stat.draws}R</span>
                        <span className="l">{stat.losses}P</span>
                      </td>
                      <td>
                        <div className="v200-rate-pill">
                          <span>{stat.winRate}%</span>
                        </div>
                      </td>
                      <td className="diff-cell">
                        {stat.goalsFor}:{stat.goalsAgainst}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === "attendance" ? (
            /* TABELA FREKWENCJI */
            <div className="v200-training-table-wrap">
              <table className="v200-training-table">
                <thead>
                  <tr>
                    <th>Msc</th>
                    <th>Zawodnik</th>
                    <th>Obecności</th>
                    <th>Sesji w Sezonie</th>
                    <th>Status Formy</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByAttendance.map((stat, idx) => (
                    <tr key={stat.player.id} className={idx < 3 ? `top-${idx + 1}` : ""}>
                      <td className="rank-cell">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                      </td>
                      <td className="player-cell">
                        <strong>{stat.player.display_name}</strong>
                        <small>#{stat.player.shirt_number || "-"}</small>
                      </td>
                      <td>
                        <b className="gold-val">{stat.trainingsAttended}</b> treningów
                      </td>
                      <td>{trainingSessions.length} sesji</td>
                      <td>
                        {stat.trainingsAttended >= 5 ? (
                          <span className="v200-badge-form high">🔥 Wzorowa</span>
                        ) : (
                          <span className="v200-badge-form mid">⚡ Regularna</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* LISTA OSTATNICH GIEREK */
            <div className="v200-recent-games-grid">
              {trainingGames.length > 0 ? (
                trainingGames.map((g, idx) => {
                  const playersInGame = trainingGamePlayers.filter(tgp => tgp.game_id === g.id);
                  const teamAPlayers = playersInGame.filter(p => p.team === "A");
                  const teamBPlayers = playersInGame.filter(p => p.team === "B");

                  return (
                    <div key={g.id} className="v200-training-game-card">
                      <div className="v200-game-header">
                        <span>GIERKA 0{idx + 1}</span>
                        <small>{new Date(g.created_at).toLocaleDateString("pl-PL")}</small>
                      </div>

                      <div className="v200-game-score-row">
                        <div className="game-team team-a">
                          <b>{g.team_a_name || "Drużyna Czerwonych"}</b>
                        </div>
                        <div className="game-score">
                          {g.team_a_score} : {g.team_b_score}
                        </div>
                        <div className="game-team team-b">
                          <b>{g.team_b_name || "Drużyna Czarnych"}</b>
                        </div>
                      </div>

                      <div className="v200-game-rosters">
                        <div className="roster-col">
                          {teamAPlayers.map(tp => {
                            const pl = players.find(p => p.id === tp.player_id);
                            return <span key={tp.player_id}>{pl?.display_name.split(" ")[0]}</span>;
                          })}
                        </div>
                        <div className="roster-col">
                          {teamBPlayers.map(tp => {
                            const pl = players.find(p => p.id === tp.player_id);
                            return <span key={tp.player_id}>{pl?.display_name.split(" ")[0]}</span>;
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="v200-no-games-box">
                  <Activity size={32} />
                  <b>Brak wpisanych gierek treningowych</b>
                  <span>Trener może rejestrować składy i wyniki gierek w panelu treningowym.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
