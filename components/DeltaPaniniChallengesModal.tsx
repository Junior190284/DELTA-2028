"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  X, Trophy, Sparkles, CheckCircle2, Gift, Lock, Flame, 
  Shield, Users, Crown, Star, Award, Clock, ArrowRight, Zap, Check
} from "lucide-react";
import { UserCard } from "@/lib/cards/types";
import { PANINI_CHALLENGES, evaluateUserChallenges, PaniniChallengeDef, ChallengeEvaluationResult } from "@/lib/cards/challenges";

interface DeltaPaniniChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCards: UserCard[];
  onRewardClaimed?: () => void;
}

export default function DeltaPaniniChallengesModal({
  isOpen,
  onClose,
  userCards,
  onRewardClaimed
}: DeltaPaniniChallengesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [loadingClaim, setLoadingClaim] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load claimed challenges
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/cards/challenges")
      .then(res => res.json())
      .then(data => {
        if (data?.claimed) {
          setClaimedIds(data.claimed.map((c: any) => c.challenge_id));
        }
      })
      .catch(err => console.error("Error loading challenge claims:", err));
  }, [isOpen]);

  const challenges = useMemo(() => {
    return evaluateUserChallenges(userCards, claimedIds);
  }, [userCards, claimedIds]);

  const completedCount = challenges.filter(c => c.isCompleted).length;
  const claimedCount = challenges.filter(c => c.isClaimed).length;
  const readyCount = challenges.filter(c => c.isCompleted && !c.isClaimed).length;
  const overallProgressPct = challenges.length > 0 ? Math.round((completedCount / challenges.length) * 100) : 0;

  const filtered = useMemo(() => {
    return challenges.filter(c => {
      if (filterCategory === "all") return true;
      if (filterCategory === "ready") return c.isCompleted && !c.isClaimed;
      if (filterCategory === "in_progress") return !c.isCompleted;
      if (filterCategory === "claimed") return c.isClaimed;
      return c.category === filterCategory;
    });
  }, [challenges, filterCategory]);

  if (!isOpen || !mounted) return null;

  const handleClaimReward = async (challengeId: string) => {
    setLoadingClaim(challengeId);
    setClaimSuccessMessage(null);
    try {
      const res = await fetch("/api/cards/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClaimedIds(prev => [...prev, challengeId]);
        setClaimSuccessMessage(data.message || "Nagroda została pomyślnie odebrana!");
        if (onRewardClaimed) onRewardClaimed();
        setTimeout(() => setClaimSuccessMessage(null), 4000);
      } else {
        alert(data.error || "Nie udało się odebrać nagrody.");
      }
    } catch (err: any) {
      alert("Błąd połączenia: " + err.message);
    } finally {
      setLoadingClaim(null);
    }
  };

  const modalContent = (
    <div className="v200-panini-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-panini-sheet" onClick={e => e.stopPropagation()}>
        {/* ================= HEADER ================= */}
        <div className="v200-panini-header">
          <div className="panini-header-brand">
            <div className="panini-trophy-icon">
              <Trophy size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="panini-eyebrow-tag">KLASER PANINI 2.0 • EDYCJA PRO</div>
              <h2 className="panini-modal-title">WYZWANIA KOLEKCJONERSKIE</h2>
            </div>
          </div>

          <button type="button" className="panini-close-btn" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* ================= HERO PROGRESS BANNER ================= */}
        <div className="v200-panini-hero-banner">
          <div className="hero-progress-main">
            <div className="hero-progress-labels">
              <span className="hero-label-top">POSTĘP W KLASERZE DELTA</span>
              <div className="hero-count-row">
                <strong className="hero-completed-num">{completedCount}</strong>
                <span className="hero-total-num">/ {challenges.length} wyzwań ukończonych</span>
                <span className="hero-percent-badge">{overallProgressPct}%</span>
              </div>
            </div>

            {/* Neon Multi-Track Progress Bar */}
            <div className="hero-progress-bar-track">
              <div
                className="hero-progress-bar-fill"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
          </div>

          <div className="hero-stats-badges">
            <div className="hero-stat-card">
              <span className="stat-card-label">GOTOWE DO ODBIORU</span>
              <strong className={`stat-card-val ${readyCount > 0 ? "ready-pulse" : ""}`}>
                {readyCount}
              </strong>
            </div>
            <div className="hero-stat-card">
              <span className="stat-card-label">ODEBRANE NAGRODY</span>
              <strong className="stat-card-val text-amber-400">
                {claimedCount} / {challenges.length}
              </strong>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {claimSuccessMessage && (
          <div className="panini-alert success">
            <CheckCircle2 size={18} />
            <span>{claimSuccessMessage}</span>
          </div>
        )}

        {/* ================= FILTER PILLS ================= */}
        <div className="v200-panini-filter-bar">
          {[
            { id: "all", label: `Wszystkie (${challenges.length})` },
            { id: "ready", label: `Gotowe do odbioru (${readyCount})`, highlight: readyCount > 0 },
            { id: "in_progress", label: `W trakcie (${challenges.length - completedCount})` },
            { id: "claimed", label: `Odebrane (${claimedCount})` },
            { id: "rarity", label: "Rzadkości" },
            { id: "squad", label: "Skład" },
            { id: "special", label: "Specjalne" }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`panini-filter-pill ${filterCategory === f.id ? "active" : ""} ${f.highlight ? "has-ready" : ""}`}
              onClick={() => setFilterCategory(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ================= CHALLENGES LIST ================= */}
        <div className="v200-panini-list-container">
          {filtered.map(ch => {
            const isReady = ch.isCompleted && !ch.isClaimed;
            const isClaimed = ch.isClaimed;

            return (
              <div
                key={ch.id}
                className={`panini-challenge-card ${isClaimed ? "claimed" : isReady ? "ready" : "in-progress"}`}
              >
                <div className="challenge-card-body">
                  {/* Icon Box */}
                  <div className="challenge-icon-box">
                    <span>{ch.icon || "🏆"}</span>
                  </div>

                  {/* Info Details */}
                  <div className="challenge-info">
                    <div className="challenge-title-row">
                      <h4 className="challenge-title">{ch.title}</h4>
                      {isClaimed && (
                        <span className="claimed-chip">
                          <Check size={12} /> ODEBRANE
                        </span>
                      )}
                      {isReady && (
                        <span className="ready-chip animate-pulse">
                          <Sparkles size={12} /> GOTOWE!
                        </span>
                      )}
                    </div>

                    <p className="challenge-desc">{ch.description}</p>

                    <div className="challenge-req-tag">
                      <span className="req-icon">🎯</span>
                      <span className="req-text">Warunek: <b>{ch.requirementDesc}</b></span>
                    </div>
                  </div>

                  {/* Reward & Action */}
                  <div className="challenge-action-column">
                    <div className="reward-info-box">
                      <span className="reward-label">Nagroda:</span>
                      <strong className="reward-val">{ch.reward.description}</strong>
                    </div>

                    {isReady ? (
                      <button
                        type="button"
                        className="panini-claim-btn animate-pulse"
                        disabled={loadingClaim === ch.id}
                        onClick={() => handleClaimReward(ch.id)}
                      >
                        {loadingClaim === ch.id ? (
                          <div className="btn-spinner" />
                        ) : (
                          <>
                            <Gift size={15} />
                            <span>ODBIERZ NAGRODĘ</span>
                          </>
                        )}
                      </button>
                    ) : isClaimed ? (
                      <div className="claimed-status-pill">
                        <CheckCircle2 size={15} />
                        <span>Nagroda Odebrana</span>
                      </div>
                    ) : (
                      <div className="in-progress-pill">
                        <Lock size={13} />
                        <span>W trakcie realizacji</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Track */}
                <div className="challenge-progress-bar-wrap">
                  <div className="progress-labels">
                    <span className="progress-title">
                      {isClaimed ? "Zadanie zrealizowane:" : isReady ? "Wymóg spełniony:" : "Postęp zadania:"}
                    </span>
                    <strong className="progress-numbers">
                      {ch.currentCount} / {ch.targetCount} ({ch.progressPercent}%)
                    </strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${isClaimed ? "claimed" : isReady ? "ready" : "active"}`}
                      style={{ width: `${Math.min(100, ch.progressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="panini-empty-list">
              <Trophy size={36} className="text-slate-600 mb-2" />
              <p>Brak wyzwań w wybranej kategorii.</p>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="v200-panini-footer">
          <div className="footer-tip">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span>Wszystkie zdobyte odznaki trafiają do Twojego profilu i klasera Panini DELTA.</span>
          </div>
          <button type="button" className="panini-footer-close" onClick={onClose}>
            ZAMKNIJ
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
