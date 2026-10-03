"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Heart, 
  Sparkles, 
  Crown, 
  Star, 
  X, 
  Check, 
  MessageSquare, 
  Award,
  Users,
  Send,
  Flame
} from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path: string | null;
}

interface Match {
  id: string;
  round_no: number | null;
  match_date: string;
  home_team: string;
  away_team: string;
}

interface DeltaFanVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  players: Player[];
  onVoteCast?: (playerId: string) => void;
}

export default function DeltaFanVotingModal({
  isOpen,
  onClose,
  match,
  players,
  onVoteCast
}: DeltaFanVotingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [votedPlayerId, setVotedPlayerId] = useState<string | null>(null);
  const [cheerMessage, setCheerMessage] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [votesMap, setVotesMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setMounted(true);
    // Wczytaj głosy dla tego meczu
    try {
      const savedVotes = localStorage.getItem(`delta_fan_votes_${match.id}`);
      if (savedVotes) {
        setVotesMap(JSON.parse(savedVotes));
      } else {
        // Początkowe realistyczne głosy kibiców
        const initMap: Record<string, number> = {};
        players.slice(0, 6).forEach((p, idx) => {
          initMap[p.id] = (6 - idx) * 2;
        });
        setVotesMap(initMap);
      }

      const myVote = localStorage.getItem(`delta_my_fan_vote_${match.id}`);
      if (myVote) {
        setVotedPlayerId(myVote);
        setSubmitted(true);
      }
    } catch {}
  }, [match.id, players]);

  // Klawisz Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const totalVotes = useMemo(() => {
    return Object.values(votesMap).reduce((a, b) => a + b, 0);
  }, [votesMap]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => (votesMap[b.id] || 0) - (votesMap[a.id] || 0));
  }, [players, votesMap]);

  const leadingPlayer = sortedPlayers[0];

  const handleVote = (playerId: string) => {
    if (submitted) return;
    setVotedPlayerId(playerId);
  };

  const handleConfirmVote = () => {
    if (!votedPlayerId || submitted) return;
    const newVotes = {
      ...votesMap,
      [votedPlayerId]: (votesMap[votedPlayerId] || 0) + 1
    };
    setVotesMap(newVotes);
    setSubmitted(true);

    try {
      localStorage.setItem(`delta_fan_votes_${match.id}`, JSON.stringify(newVotes));
      localStorage.setItem(`delta_my_fan_vote_${match.id}`, votedPlayerId);

      // Zapisz quest ukończenia głosowania kibica
      const savedQuests = localStorage.getItem("delta_weekly_quests_state");
      const parsed = savedQuests ? JSON.parse(savedQuests) : { quests: {} };
      parsed.quests["q-fanvote"] = { completed: true, claimed: parsed.quests["q-fanvote"]?.claimed || false };
      localStorage.setItem("delta_weekly_quests_state", JSON.stringify(parsed));
    } catch {}

    if (onVoteCast) onVoteCast(votedPlayerId);
  };

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
            <div className="v200-knowledge-icon-shield red-shield">
              <Heart size={24} />
            </div>
            <div>
              <div className="v200-badge-academy red-badge">
                <Heart size={13} />
                <span>GŁOSOWANIE RODZICÓW I KIBICÓW</span>
              </div>
              <h2>Serduszko Trybun (Fans' MVP)</h2>
              <p>Wybierz zawodnika, który pokazał największe serce do walki w meczu</p>
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

        {/* LIDER GŁOSOWANIA */}
        {leadingPlayer && (
          <div className="v200-fan-leader-card">
            <div className="v200-fan-leader-badge">
              <Crown size={16} />
              <span>ULUBIENIEC TRYBUN MECZU</span>
            </div>
            <div className="v200-fan-leader-body">
              <div className="v200-fan-avatar">
                <span>{leadingPlayer.shirt_number ? `#${leadingPlayer.shirt_number}` : "❤️"}</span>
              </div>
              <div className="v200-fan-info">
                <h3>{leadingPlayer.display_name}</h3>
                <p>
                  ❤️ <b>{votesMap[leadingPlayer.id] || 0} głosów</b> od rodziców i kibiców (
                  {totalVotes > 0 ? Math.round(((votesMap[leadingPlayer.id] || 0) / totalVotes) * 100) : 0}% wszystkich głosów)
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="v200-knowledge-content">
          <div className="v200-fan-voting-grid">
            {sortedPlayers.map(p => {
              const voteCount = votesMap[p.id] || 0;
              const isSelected = votedPlayerId === p.id;
              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

              return (
                <div 
                  key={p.id}
                  className={`v200-fan-player-tile ${isSelected ? "selected" : ""} ${submitted ? "is-voted" : ""}`}
                  onClick={() => !submitted && handleVote(p.id)}
                >
                  <div className="v200-tile-top">
                    <span className="v200-fan-num">#{p.shirt_number || "-"}</span>
                    <div className="v200-heart-count">
                      <Heart size={14} className="heart-fill" />
                      <span>{voteCount}</span>
                    </div>
                  </div>

                  <h4>{p.display_name}</h4>
                  <small>{p.position || "Zawodnik DELTY"}</small>

                  <div className="v200-vote-prog-bar">
                    <div className="v200-vote-fill" style={{ width: `${pct}%` }} />
                  </div>

                  {!submitted && (
                    <button 
                      type="button" 
                      className={`v200-btn-vote-tile ${isSelected ? "chosen" : ""}`}
                    >
                      <Heart size={14} />
                      <span>{isSelected ? "WYBRANY" : "ODDAJ GŁOS"}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* DÓŁ MODALU: POTWIERDZENIE GŁOSU */}
          {!submitted ? (
            <div className="v200-fan-confirm-bar">
              <div className="v200-fan-confirm-info">
                <span>Wybrany gracz: <b>{players.find(p => p.id === votedPlayerId)?.display_name || "Wybierz z listy powyżej"}</b></span>
              </div>
              <button
                type="button"
                disabled={!votedPlayerId}
                className="v200-btn-confirm-fan-vote"
                onClick={handleConfirmVote}
              >
                <Heart size={18} />
                <span>POTWIERDŹ SWÓJ GŁOS ❤️</span>
              </button>
            </div>
          ) : (
            <div className="v200-fan-voted-banner">
              <Check size={20} />
              <span>Twój głos na <b>{players.find(p => p.id === votedPlayerId)?.display_name}</b> został zapisany! Dziękujemy za doping!</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
