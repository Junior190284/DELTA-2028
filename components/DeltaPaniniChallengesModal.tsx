"use client";

import React, { useState, useEffect } from "react";
import { X, Trophy, Sparkles, CheckCircle2, Gift, Lock, Flame, Shield, Users, Crown, Star } from "lucide-react";
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
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [loadingClaim, setLoadingClaim] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const challenges = evaluateUserChallenges(userCards, claimedIds);
  const completedCount = challenges.filter(c => c.isCompleted).length;
  const claimedCount = challenges.filter(c => c.isClaimed).length;

  const filtered = challenges.filter(c => {
    if (filterCategory === "all") return true;
    if (filterCategory === "completed") return c.isCompleted && !c.isClaimed;
    if (filterCategory === "claimed") return c.isClaimed;
    return c.category === filterCategory;
  });

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
      } else {
        alert(data.error || "Nie udało się odebrać nagrody.");
      }
    } catch (err: any) {
      alert("Błąd połączenia: " + err.message);
    } finally {
      setLoadingClaim(null);
    }
  };

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-3xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy size={24} />
            </div>
            <div>
              <span className="eyebrow gold">KLASER PANINI 2.0</span>
              <h2 className="text-xl font-black text-white m-0">WYZWANIA KOLEKCJONERSKIE</h2>
            </div>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* Hero Progress Banner */}
        <div className="p-4 bg-gradient-to-r from-amber-950/40 via-red-950/30 to-black border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Twój Postęp w Klaserze
            </span>
            <strong className="text-lg text-white">
              {completedCount} z {challenges.length} ukończonych wyzwań
            </strong>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-amber-500/30 text-center">
              <small className="text-[10px] text-slate-400 block">ODEBRANE</small>
              <b className="text-amber-400 text-sm font-black">{claimedCount}/{challenges.length}</b>
            </div>
          </div>
        </div>

        {claimSuccessMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{claimSuccessMessage}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-3 bg-black/40 border-b border-white/10 overflow-x-auto">
          {[
            { id: "all", label: "Wszystkie" },
            { id: "completed", label: `Gotowe do odbioru (${challenges.filter(c => c.isCompleted && !c.isClaimed).length})` },
            { id: "claimed", label: "Odebrane" },
            { id: "rarity", label: "Rzadkości" },
            { id: "squad", label: "Skład" },
            { id: "special", label: "Specjalne" }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === f.id
                  ? "bg-amber-500 text-black shadow-md"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
              onClick={() => setFilterCategory(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Challenges List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {filtered.map(ch => {
            const canClaim = ch.isCompleted && !ch.isClaimed;
            return (
              <div
                key={ch.id}
                className={`p-4 rounded-xl border transition-all ${
                  ch.isClaimed
                    ? "bg-black/40 border-white/5 opacity-70"
                    : ch.isCompleted
                    ? "bg-gradient-to-r from-amber-950/30 to-black/80 border-amber-500/40 shadow-lg shadow-amber-950/20"
                    : "bg-slate-900/70 border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-xl shrink-0">
                      {ch.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white m-0">{ch.title}</h4>
                        {ch.isClaimed && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            ✓ ODEBRANE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug">{ch.description}</p>
                      <small className="text-[11px] text-amber-400/90 font-medium block mt-1">
                        🎯 Warunek: {ch.requirementDesc}
                      </small>
                    </div>
                  </div>

                  {/* Reward Action */}
                  <div className="shrink-0 text-right">
                    <span className="text-[11px] text-slate-400 block font-bold">Nagroda:</span>
                    <strong className="text-xs text-amber-300 block mb-2">{ch.reward.description}</strong>

                    {canClaim ? (
                      <button
                        type="button"
                        className="v200-tc-action-btn gold"
                        disabled={loadingClaim === ch.id}
                        onClick={() => handleClaimReward(ch.id)}
                      >
                        <Gift size={13} /> {loadingClaim === ch.id ? "Odbieranie…" : "ODBIERZ NAGRODĘ"}
                      </button>
                    ) : ch.isClaimed ? (
                      <span className="text-xs text-slate-500 font-bold">Odebrano</span>
                    ) : (
                      <span className="text-xs text-slate-500 flex items-center gap-1 justify-end font-medium">
                        <Lock size={12} /> W trakcie
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        ch.isCompleted ? "bg-gradient-to-r from-amber-500 to-emerald-400" : "bg-gradient-to-r from-red-500 to-amber-500"
                      }`}
                      style={{ width: `${ch.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-300 shrink-0">
                    {ch.currentCount} / {ch.targetCount} ({ch.progressPercent}%)
                  </span>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Brak wyzwań w wybranej kategorii.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex justify-end">
          <button type="button" className="v200-tc-action-btn" onClick={onClose}>
            ZAMKNIJ
          </button>
        </div>
      </div>
    </div>
  );
}
