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

  // Statystyki rzadkości
  const infernoCount = playerAchievements.filter(a => a.definition.rarity === "inferno" && a.isUnlocked).length;
  const infernoTotal = playerAchievements.filter(a => a.definition.rarity === "inferno").length;

  const legendaryCount = playerAchievements.filter(a => a.definition.rarity === "legendary" && a.isUnlocked).length;
  const legendaryTotal = playerAchievements.filter(a => a.definition.rarity === "legendary").length;

  const epicCount = playerAchievements.filter(a => a.definition.rarity === "epic" && a.isUnlocked).length;
  const epicTotal = playerAchievements.filter(a => a.definition.rarity === "epic").length;

  const rareCount = playerAchievements.filter(a => a.definition.rarity === "rare" && a.isUnlocked).length;
  const rareTotal = playerAchievements.filter(a => a.definition.rarity === "rare").length;

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
      {/* 1. GŁÓWNY BANER STATYSTYK OSIĄGNIĘĆ Z GRAFIKĄ STADIONOWĄ I TROFEUM */}
      <header className="v200-ach-banner">
        <div className="v200-ach-banner-bg" aria-hidden="true" />
        <div className="v200-ach-banner-overlay" aria-hidden="true" />
        <div className="v200-ach-banner-glow" aria-hidden="true" />

        <div className="v200-ach-banner-topbar">
          <div className="v200-ach-banner-brand">
            <span className="v200-ach-pill-brand">DELTA 2018 GM</span>
            <span className="v200-ach-pill-sub">GABINETY PRESTIŻU & REKORDÓW</span>
          </div>
          <div className="v200-ach-banner-season">
            <Sparkles size={13} className="text-gold" />
            <span>SEZON LIGOWY 2026/27</span>
          </div>
        </div>

        <div className="v200-ach-banner-main">
          {/* LEWA STRONA - INFO, TYTUŁ I MINI-STATYSTYKI */}
          <div className="v200-ach-banner-info">
            <div className="v200-ach-eyebrow">
              <Trophy size={14} className="v200-ach-eyebrow-icon" />
              <span>CENTRUM OSIĄGNIĘĆ DELTA • GABLOTA MISTRZÓW</span>
            </div>
            <h2>
              GABLOTA TROFEÓW <em>{playerName.toUpperCase()}</em>
            </h2>
            <p className="v200-ach-desc">
              Każdy trening, bramka i rozegrany mecz buduje Twoją legendę w DELTA 2018 GM.
            </p>

            {/* Pigułki ze statystykami rzadkości */}
            <div className="v200-ach-pills-row">
              <div className="v200-ach-stat-chip chip-total">
                <Medal size={13} />
                <span>Zdobyte: <strong>{unlockedCount} / {totalCount}</strong></span>
              </div>
              {infernoTotal > 0 && (
                <div className="v200-ach-stat-chip chip-inferno">
                  <Flame size={13} />
                  <span>Inferno: <strong>{infernoCount}/{infernoTotal}</strong></span>
                </div>
              )}
              {legendaryTotal > 0 && (
                <div className="v200-ach-stat-chip chip-legendary">
                  <Crown size={13} />
                  <span>Legendy: <strong>{legendaryCount}/{legendaryTotal}</strong></span>
                </div>
              )}
              {epicTotal > 0 && (
                <div className="v200-ach-stat-chip chip-epic">
                  <Sparkles size={13} />
                  <span>Epickie: <strong>{epicCount}/{epicTotal}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* PRAWA STRONA - TROPHY SHOWCASE & HUD GAUGE */}
          <div className="v200-ach-score-stage">
            <div className="v200-ach-trophy-display">
              <div className="v200-ach-trophy-glow" />
              <div className="v200-ach-trophy-icon-wrapper">
                <Trophy size={42} className="v200-ach-hero-cup" />
              </div>
              <div className="v200-ach-score-hud">
                <span className="v200-ach-score-val">{overallPercent}%</span>
                <span className="v200-ach-score-lbl">KOMPLETNOŚĆ GABLOTY</span>
              </div>
            </div>

            <div className="v200-ach-rank-tag">
              {overallPercent >= 100 ? "👑 KOMPLETNA LEGENDA" : overallPercent >= 50 ? "⭐ MISTRZ DELTA" : "🔥 W DRODZE NA SZCZYT"}
            </div>
          </div>
        </div>

        {/* Pasek ogólnego postępu z etapami */}
        <div className="v200-ach-progress-section">
          <div className="v200-ach-progress-meta">
            <span>OGÓLNY POSTĘP KLUBOWY</span>
            <strong>{unlockedCount} z {totalCount} trofeów odblokowanych ({overallPercent}%)</strong>
          </div>
          <div className="v200-ach-global-bar">
            <div 
              className="v200-ach-global-fill" 
              style={{ width: `${overallPercent}%` }}
            >
              <div className="v200-ach-fill-spark" />
            </div>
          </div>
          <div className="v200-ach-milestones">
            <span className={overallPercent >= 25 ? "active" : ""}>25% Debiut</span>
            <span className={overallPercent >= 50 ? "active" : ""}>50% Ekspert</span>
            <span className={overallPercent >= 75 ? "active" : ""}>75% Weteran</span>
            <span className={overallPercent >= 100 ? "active" : ""}>100% Galeria Sław</span>
          </div>
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
