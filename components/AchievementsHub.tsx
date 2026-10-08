"use client";

import React, { useState, useMemo } from "react";
import { 
  Trophy, 
  Zap, 
  CalendarDays, 
  Goal, 
  Crown, 
  Flame, 
  Sparkles, 
  Check, 
  Lock, 
  ChevronRight,
  Filter,
  Medal,
  Award
} from "lucide-react";
import { 
  AchievementCategory, 
  AchievementDefinition, 
  PlayerAchievementStatus, 
  ACHIEVEMENTS_CATALOG 
} from "@/lib/achievements/engine";
import AchievementUnlock from "./AchievementUnlock";

interface AchievementsHubProps {
  playerAchievements: PlayerAchievementStatus[];
  playerName?: string;
  onOpenCard?: (cardId: string) => void;
}

export default function AchievementsHub({
  playerAchievements,
  playerName = "Zawodnik DELTA",
  onOpenCard
}: AchievementsHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unlocked" | "in_progress">("all");
  const [selectedAchievement, setSelectedAchievement] = useState<PlayerAchievementStatus | null>(null);

  // Podsumowanie
  const totalCount = playerAchievements.length;
  const unlockedCount = playerAchievements.filter(a => a.isUnlocked).length;
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filteredList = useMemo(() => {
    return playerAchievements.filter(item => {
      // Filtr kategorii
      if (selectedCategory !== "all" && item.definition.category !== selectedCategory) {
        return false;
      }
      // Filtr statusu
      if (statusFilter === "unlocked" && !item.isUnlocked) return false;
      if (statusFilter === "in_progress" && item.isUnlocked) return false;
      return true;
    });
  }, [playerAchievements, selectedCategory, statusFilter]);

  const getCategoryIcon = (category: AchievementCategory) => {
    switch (category) {
      case "attendance": return <Zap size={14} />;
      case "matches": return <CalendarDays size={14} />;
      case "goals": return <Goal size={14} />;
      case "team": return <Crown size={14} />;
      case "inferno": return <Flame size={14} />;
    }
  };

  const getRarityBadgeClass = (rarity: string) => {
    switch (rarity) {
      case "inferno": return "rarity-inferno";
      case "legendary": return "rarity-legendary";
      case "epic": return "rarity-epic";
      case "rare": return "rarity-rare";
      default: return "rarity-common";
    }
  };

  return (
    <div className="v200-achievements-hub">
      {/* 1. GŁÓWNY BANER STATYSTYK OSIĄGNIĘĆ */}
      <header className="v200-ach-banner devil-card">
        <div className="v200-ach-banner-glow" aria-hidden="true" />
        <div className="v200-ach-banner-top">
          <div>
            <span className="v200-ach-eyebrow">
              <Trophy size={14} /> CENTRUM OSIĄGNIĘĆ 2.0
            </span>
            <h2>GABLOTA TROFEÓW <em>{playerName.toUpperCase()}</em></h2>
            <p>Każdy trening i każdy mecz buduje Twoją legendę w DELTA 2018 GM.</p>
          </div>
          <div className="v200-ach-score-box">
            <strong>{unlockedCount} <span>/ {totalCount}</span></strong>
            <small>ZDOBYTE TROFEA ({overallPercent}%)</small>
          </div>
        </div>

        {/* Pasek ogólnego postępu */}
        <div className="v200-ach-global-bar">
          <div 
            className="v200-ach-global-fill" 
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </header>

      {/* 2. FILTRY KATEGORII I STATUSU */}
      <div className="v200-ach-controls">
        <nav className="v200-ach-tabs" aria-label="Filtry kategorii osiągnięć">
          <button 
            type="button" 
            className={selectedCategory === "all" ? "active" : ""}
            onClick={() => setSelectedCategory("all")}
          >
            Wszystkie ({totalCount})
          </button>
          <button 
            type="button" 
            className={selectedCategory === "attendance" ? "active" : ""}
            onClick={() => setSelectedCategory("attendance")}
          >
            <Zap size={13} /> Frekwencja
          </button>
          <button 
            type="button" 
            className={selectedCategory === "matches" ? "active" : ""}
            onClick={() => setSelectedCategory("matches")}
          >
            <CalendarDays size={13} /> Mecze
          </button>
          <button 
            type="button" 
            className={selectedCategory === "goals" ? "active" : ""}
            onClick={() => setSelectedCategory("goals")}
          >
            <Goal size={13} /> Bramki & Asysty
          </button>
          <button 
            type="button" 
            className={selectedCategory === "team" ? "active" : ""}
            onClick={() => setSelectedCategory("team")}
          >
            <Crown size={13} /> Drużyna
          </button>
          <button 
            type="button" 
            className={`inferno-tab ${selectedCategory === "inferno" ? "active" : ""}`}
            onClick={() => setSelectedCategory("inferno")}
          >
            <Flame size={13} /> Inferno 🔥
          </button>
        </nav>

        {/* Filtr Zdobyte / W toku */}
        <div className="v200-ach-subfilter">
          <button 
            type="button" 
            className={statusFilter === "all" ? "active" : ""}
            onClick={() => setStatusFilter("all")}
          >
            Wszystkie
          </button>
          <button 
            type="button" 
            className={statusFilter === "unlocked" ? "active" : ""}
            onClick={() => setStatusFilter("unlocked")}
          >
            Zdobyte ({unlockedCount})
          </button>
          <button 
            type="button" 
            className={statusFilter === "in_progress" ? "active" : ""}
            onClick={() => setStatusFilter("in_progress")}
          >
            W toku ({totalCount - unlockedCount})
          </button>
        </div>
      </div>

      {/* 3. SIATKA KART OSIĄGNIĘĆ */}
      <div className="v200-ach-grid">
        {filteredList.map((item) => (
          <article 
            key={item.definition.id} 
            className={`v200-ach-card ${item.isUnlocked ? "unlocked" : "locked"} ${item.definition.category === "inferno" ? "is-inferno" : ""}`}
            onClick={() => setSelectedAchievement(item)}
            role="button"
            tabIndex={0}
          >
            <div className="v200-ach-card-top">
              <span className={`v200-rarity-pill ${getRarityBadgeClass(item.definition.rarity)}`}>
                {item.definition.rarity.toUpperCase()}
              </span>
              <span className={`v200-status-badge ${item.isUnlocked ? "status-earned" : "status-progress"}`}>
                {item.isUnlocked ? <><Check size={11} /> ZDOBYTE</> : <><Lock size={11} /> W TOKU</>}
              </span>
            </div>

            <div className="v200-ach-body">
              <div className="v200-ach-icon-circle">
                {getCategoryIcon(item.definition.category)}
              </div>
              <div className="v200-ach-details">
                <h4>{item.definition.name}</h4>
                <p>{item.definition.description}</p>
              </div>
            </div>

            {/* Pasek postępu */}
            <div className="v200-ach-progress-wrap">
              <div className="v200-ach-progress-labels">
                <small>Postęp wyzwania</small>
                <strong>{item.current} / {item.target}</strong>
              </div>
              <div className="v200-ach-progress-track">
                <div 
                  className={`v200-ach-progress-bar ${item.isUnlocked ? "full" : ""}`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>

            {/* Nagroda */}
            {item.definition.rewardLabel && (
              <div className="v200-ach-reward">
                <Sparkles size={12} />
                <span>Nagroda: <b>{item.definition.rewardLabel}</b></span>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* 4. MODAL SZCZEGÓŁÓW OSIĄGNIĘCIA / ANIMACJA ODBLOKOWANIA */}
      {selectedAchievement && selectedAchievement.isUnlocked ? (
        <AchievementUnlock
          grantId={selectedAchievement.definition.id}
          title={selectedAchievement.definition.name}
          description={selectedAchievement.definition.description}
          variant={selectedAchievement.definition.rarity === 'inferno' ? 'inferno' : 'gold'}
          eyebrow={selectedAchievement.definition.rarity === 'inferno' ? 'LEGENDARNE OSIĄGNIĘCIE INFERNO' : 'ODBLOKOWANA ODZNAKA DELTA'}
          progress={selectedAchievement.target > 1 ? {
            current: selectedAchievement.current,
            max: selectedAchievement.target,
            label: 'Zrealizowany cel:'
          } : undefined}
          playerName={playerName}
          onClose={() => setSelectedAchievement(null)}
        />
      ) : selectedAchievement && (
        <div className="v200-ach-modal-backdrop" onClick={() => setSelectedAchievement(null)}>
          <div className="v200-ach-modal-dialog" onClick={e => e.stopPropagation()}>
            <header className="v200-ach-modal-header">
              <span className={`v200-rarity-pill ${getRarityBadgeClass(selectedAchievement.definition.rarity)}`}>
                {selectedAchievement.definition.rarity.toUpperCase()}
              </span>
              <button 
                type="button" 
                className="v200-ach-modal-close" 
                onClick={() => setSelectedAchievement(null)}
              >
                ✕
              </button>
            </header>

            <div className="v200-ach-modal-body">
              <div className="v200-ach-modal-icon-big">
                {getCategoryIcon(selectedAchievement.definition.category)}
              </div>
              <h3>{selectedAchievement.definition.name}</h3>
              <p>{selectedAchievement.definition.description}</p>

              <div className="v200-ach-modal-stat-box">
                <div>
                  <small>STAN</small>
                  <b>{selectedAchievement.isUnlocked ? "ZDOBYTE 🎉" : "W TRAKCIE"}</b>
                </div>
                <div>
                  <small>POSTĘP</small>
                  <b>{selectedAchievement.current} / {selectedAchievement.target} ({selectedAchievement.percent}%)</b>
                </div>
              </div>

              {selectedAchievement.definition.rewardLabel && (
                <div className="v200-ach-modal-reward-card">
                  <Sparkles size={16} />
                  <div>
                    <small>ODBLOKOWYWANA NAGRODA</small>
                    <strong>{selectedAchievement.definition.rewardLabel}</strong>
                  </div>
                </div>
              )}
            </div>

            <footer className="v200-ach-modal-footer">
              <button 
                type="button" 
                className="btn gold-btn"
                onClick={() => setSelectedAchievement(null)}
              >
                Zamknij
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
