"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Target, 
  Sparkles, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Gift, 
  X, 
  Flame, 
  BookOpen, 
  Crown, 
  UserCheck, 
  Layers, 
  Heart,
  ChevronRight,
  ArrowRight
} from "lucide-react";

export interface QuestItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  rewardPoints: number;
  completed: boolean;
  claimed: boolean;
  actionKey: "knowledge" | "typer" | "attendance" | "cards" | "fanvote";
  actionLabel: string;
}

interface DeltaWeeklyQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateAction?: (actionKey: string) => void;
  onPointsUpdated?: (newPoints: number) => void;
}

export default function DeltaWeeklyQuestsModal({
  isOpen,
  onClose,
  onNavigateAction,
  onPointsUpdated
}: DeltaWeeklyQuestsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [questsState, setQuestsState] = useState<Record<string, { completed: boolean; claimed: boolean }>>({});
  const [megaChestClaimed, setMegaChestClaimed] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Sprawdź stan zadań z localStorage i aktywności
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("delta_weekly_quests_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        setQuestsState(parsed.quests || {});
        setMegaChestClaimed(parsed.megaChestClaimed || false);
      } else {
        // Sprawdź czy użytkownik ma ukończoną jakąś lekcję lub oddany typ
        const knowledge = localStorage.getItem("delta_knowledge_progress");
        const hasKnowledge = knowledge && Object.keys(JSON.parse(knowledge)).length > 0;
        const typer = localStorage.getItem("delta_typer_bets");
        const hasTyper = typer && Object.keys(JSON.parse(typer)).length > 0;
        const fanVotes = localStorage.getItem("delta_fan_votes");
        const hasFanVotes = fanVotes && Object.keys(JSON.parse(fanVotes)).length > 0;

        const initial: Record<string, { completed: boolean; claimed: boolean }> = {
          "q-knowledge": { completed: !!hasKnowledge, claimed: false },
          "q-typer": { completed: !!hasTyper, claimed: false },
          "q-attendance": { completed: true, claimed: false },
          "q-cards": { completed: true, claimed: false },
          "q-fanvote": { completed: !!hasFanVotes, claimed: false }
        };
        setQuestsState(initial);
      }
    } catch {}
  }, []);

  // Klawisz Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const QUESTS_CONFIG: QuestItem[] = useMemo(() => [
    {
      id: "q-knowledge",
      title: "Młody Erudyta DELTY",
      desc: "Zalicz min. 1 quiz z wynikiem ≥75% w Kąciku Wiedzy",
      icon: "📚",
      rewardPoints: 30,
      completed: questsState["q-knowledge"]?.completed ?? false,
      claimed: questsState["q-knowledge"]?.claimed ?? false,
      actionKey: "knowledge",
      actionLabel: "DO KĄCIKA WIEDZY"
    },
    {
      id: "q-typer",
      title: "Klubowy Ekspert Wyników",
      desc: "Zatypuj dokładny wynik najbliższego meczu w Typerze",
      icon: "🔮",
      rewardPoints: 30,
      completed: questsState["q-typer"]?.completed ?? false,
      claimed: questsState["q-typer"]?.claimed ?? false,
      actionKey: "typer",
      actionLabel: "ZATYPUJ MECZ"
    },
    {
      id: "q-attendance",
      title: "Gotowy do Boju",
      desc: "Zgłoś status obecności na najbliższy trening lub mecz zespołu",
      icon: "🏃",
      rewardPoints: 30,
      completed: questsState["q-attendance"]?.completed ?? true,
      claimed: questsState["q-attendance"]?.claimed ?? false,
      actionKey: "attendance",
      actionLabel: "STREFA DRUŻYNY"
    },
    {
      id: "q-cards",
      title: "Kolekcjoner Gwiazd DELTY",
      desc: "Otwórz paczkę kart lub zakręć codziennym Kołem Fortuny",
      icon: "🎴",
      rewardPoints: 30,
      completed: questsState["q-cards"]?.completed ?? true,
      claimed: questsState["q-cards"]?.claimed ?? false,
      actionKey: "cards",
      actionLabel: "OTWÓRZ KARTY"
    },
    {
      id: "q-fanvote",
      title: "Serduszko Trybun",
      desc: "Oddaj głos na Zawodnika Meczu w głosowaniu rodziców",
      icon: "❤️",
      rewardPoints: 30,
      completed: questsState["q-fanvote"]?.completed ?? false,
      claimed: questsState["q-fanvote"]?.claimed ?? false,
      actionKey: "fanvote",
      actionLabel: "GŁOSUJ"
    }
  ], [questsState]);

  const completedCount = QUESTS_CONFIG.filter(q => q.completed).length;
  const totalCount = QUESTS_CONFIG.length;
  const megaChestUnlocked = completedCount >= 4; // min 4 misje
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const saveState = (newQuests: Record<string, { completed: boolean; claimed: boolean }>, chestClaimed: boolean) => {
    try {
      localStorage.setItem("delta_weekly_quests_state", JSON.stringify({
        quests: newQuests,
        megaChestClaimed: chestClaimed
      }));
    } catch {}
  };

  const handleClaimQuest = async (quest: QuestItem) => {
    if (!quest.completed || quest.claimed || claimingId) return;
    setClaimingId(quest.id);

    try {
      const res = await fetch("/api/quests/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: quest.id,
          rewardPoints: quest.rewardPoints,
          rewardType: "quest"
        })
      });
      const data = await res.json();
      if (data.newPointsBalance !== undefined && onPointsUpdated) {
        onPointsUpdated(data.newPointsBalance);
      }

      const updated = {
        ...questsState,
        [quest.id]: { completed: true, claimed: true }
      };
      setQuestsState(updated);
      saveState(updated, megaChestClaimed);
    } catch {
      const updated = {
        ...questsState,
        [quest.id]: { completed: true, claimed: true }
      };
      setQuestsState(updated);
      saveState(updated, megaChestClaimed);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimMegaChest = async () => {
    if (!megaChestUnlocked || megaChestClaimed || claimingId) return;
    setClaimingId("mega_chest");

    try {
      const res = await fetch("/api/quests/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: "weekly_mega_chest",
          rewardPoints: 100,
          rewardType: "mega_chest"
        })
      });
      const data = await res.json();
      if (data.newPointsBalance !== undefined && onPointsUpdated) {
        onPointsUpdated(data.newPointsBalance);
      }
      setMegaChestClaimed(true);
      saveState(questsState, true);
    } catch {
      setMegaChestClaimed(true);
      saveState(questsState, true);
    } finally {
      setClaimingId(null);
    }
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
            <div className="v200-knowledge-icon-shield gold-shield">
              <Target size={24} />
            </div>
            <div>
              <div className="v200-badge-academy gold-badge">
                <Flame size={13} />
                <span>KLUBOWE WYZWANIA TYGODNIA</span>
              </div>
              <h2>Misje Tygodnia & Złota Skrzynia</h2>
              <p>Wykonuj zadania, zdobywaj punkty DELTA i odbierz Złotą Skrzynię Mistrzów</p>
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

        {/* BANER POSTĘPU TYGODNIA */}
        <div className="v200-knowledge-progress-banner">
          <div className="v200-knowledge-prog-info">
            <div className="v200-prog-text">
              <Trophy size={18} className="gold-icon" />
              <span>Postęp Wyzwań: <b>{completedCount} z {totalCount}</b> misji ukończonych</span>
            </div>
            <div className="v200-prog-percent">{progressPercent}%</div>
          </div>
          <div className="v200-prog-track">
            <div 
              className="v200-prog-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="v200-knowledge-content">
          {/* BANER GŁÓWNY: ZŁOTA SKRZYNIA TYGODNIA */}
          <div className={`v200-mega-chest-card ${megaChestUnlocked ? "unlocked" : ""}`}>
            <div className="v200-chest-avatar">
              <Gift size={42} />
            </div>

            <div className="v200-chest-info">
              <div className="v200-chest-badge">
                <Sparkles size={13} />
                <span>NAGRODA GŁÓWNA TYGODNIA</span>
              </div>
              <h3>Złota Skrzynia Mistrzów DELTY</h3>
              <p>
                {megaChestUnlocked 
                  ? "Wszystkie warunki spełnione! Twoja Złota Skrzynia czeka na otwarcie!"
                  : `Ukończ min. 4 wyzwania w tym tygodniu (zrobiono ${completedCount}/4), aby odblokować +100 DP i Złotą Paczkę Kart!`}
              </p>
            </div>

            <div className="v200-chest-action">
              {megaChestUnlocked ? (
                !megaChestClaimed ? (
                  <button 
                    type="button" 
                    className="v200-btn-claim-chest"
                    disabled={claimingId === "mega_chest"}
                    onClick={handleClaimMegaChest}
                  >
                    <Sparkles size={18} />
                    <span>{claimingId === "mega_chest" ? "OTWIERANIE..." : "OTWÓRZ SKRZYNIĘ (+100 DP)"}</span>
                  </button>
                ) : (
                  <div className="v200-chest-claimed-tag">
                    <CheckCircle2 size={18} />
                    <span>ODEBRANO W TYM TYGODNIU</span>
                  </div>
                )
              ) : (
                <div className="v200-chest-locked-tag">
                  <Clock size={16} />
                  <span>ZABLOKOWANA ({completedCount}/4)</span>
                </div>
              )}
            </div>
          </div>

          {/* LISTA MISJI */}
          <div className="v200-quests-list">
            {QUESTS_CONFIG.map((quest, idx) => (
              <div 
                key={quest.id} 
                className={`v200-quest-row ${quest.completed ? "is-complete" : ""} ${quest.claimed ? "is-claimed" : ""}`}
              >
                <div className="v200-quest-icon-box">
                  <span className="quest-emoji">{quest.icon}</span>
                </div>

                <div className="v200-quest-body">
                  <div className="v200-quest-top">
                    <span className="v200-quest-num">MISJA 0{idx + 1}</span>
                    <span className="v200-quest-reward">+{quest.rewardPoints} DP</span>
                  </div>
                  <h4>{quest.title}</h4>
                  <p>{quest.desc}</p>
                </div>

                <div className="v200-quest-action">
                  {quest.completed ? (
                    quest.claimed ? (
                      <div className="v200-quest-done-tag">
                        <CheckCircle2 size={16} />
                        <span>ODEBRANO</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="v200-btn-claim-quest"
                        disabled={claimingId === quest.id}
                        onClick={() => handleClaimQuest(quest)}
                      >
                        <Sparkles size={15} />
                        <span>{claimingId === quest.id ? "ODBIERANIE..." : `ODBIERZ +${quest.rewardPoints} DP`}</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="v200-btn-quest-go"
                      onClick={() => {
                        onClose();
                        if (onNavigateAction) onNavigateAction(quest.actionKey);
                      }}
                    >
                      <span>{quest.actionLabel}</span>
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
