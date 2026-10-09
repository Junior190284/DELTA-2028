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
  Award,
  Layers,
  CheckCircle2,
  Shield
} from "lucide-react";
import { 
  AchievementCategory, 
  AchievementDefinition, 
  PlayerAchievementStatus, 
  ACHIEVEMENTS_CATALOG 
} from "@/lib/achievements/engine";

interface AchievementsHubProps {
  playerAchievements: PlayerAchievementStatus[];
  playerName?: string;
  onOpenCard?: (cardType?: string) => void;
  onOpenAchievementDetail?: (ach: PlayerAchievementStatus) => void;
}

export default function AchievementsHub({
  playerAchievements,
  playerName = "Zawodnik DELTA",
  onOpenCard,
  onOpenAchievementDetail
}: AchievementsHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unlocked" | "in_progress" | "locked">("all");

  // Summary counts
  const totalCount = playerAchievements.length || ACHIEVEMENTS_CATALOG.length;
  const unlockedCount = playerAchievements.filter(a => a.isUnlocked).length;
  const inProgressCount = playerAchievements.filter(a => a.status === "IN_PROGRESS").length;
  const lockedCount = playerAchievements.filter(a => a.status === "LOCKED").length;
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Filtered Achievements
  const filteredList = useMemo(() => {
    return playerAchievements.filter(item => {
      // Category Filter
      if (selectedCategory !== "all" && item.definition.category !== selectedCategory) {
        return false;
      }
      // Status Filter
      if (statusFilter === "unlocked" && !item.isUnlocked) return false;
      if (statusFilter === "in_progress" && item.status !== "IN_PROGRESS") return false;
      if (statusFilter === "locked" && item.status !== "LOCKED") return false;
      return true;
    });
  }, [playerAchievements, selectedCategory, statusFilter]);

  const getCategoryIcon = (category: AchievementCategory) => {
    switch (category) {
      case "attendance": return <Zap size={14} className="text-emerald-400" />;
      case "matches": return <CalendarDays size={14} className="text-sky-400" />;
      case "goals": return <Goal size={14} className="text-amber-400" />;
      case "team": return <Crown size={14} className="text-yellow-400" />;
      case "inferno": return <Flame size={14} className="text-red-400" />;
      default: return <Trophy size={14} className="text-yellow-400" />;
    }
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case "inferno": return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" };
      case "legend": return { color: "#c084fc", bg: "rgba(192, 132, 252, 0.15)", border: "rgba(192, 132, 252, 0.4)" };
      case "gold": return { color: "#f1c95c", bg: "rgba(241, 201, 92, 0.15)", border: "rgba(241, 201, 92, 0.4)" };
      case "matchday": return { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.4)" };
      case "rare": return { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.15)", border: "rgba(96, 165, 250, 0.4)" };
      default: return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.4)" };
    }
  };

  return (
    <div className="v200-achievements-hub">
      {/* 1. Header Banner & Stats */}
      <div className="v200-ach-banner">
        <div className="v200-ach-banner-bg" aria-hidden="true" />
        <div className="v200-ach-banner-overlay" aria-hidden="true" />

        <div className="v200-ach-banner-topbar">
          <div className="v200-ach-banner-brand">
            <span className="v200-ach-pill-brand">DELTA 2018 GM</span>
            <span className="v200-ach-pill-sub">SYSTEM OSIĄGNIĘĆ 2.0</span>
          </div>
          <div className="v200-ach-banner-season">
            <Sparkles size={13} className="text-gold" />
            <span>SEZON 2026/27</span>
          </div>
        </div>

        <div className="v200-ach-banner-main">
          <div className="v200-ach-banner-info">
            <div className="v200-ach-eyebrow">
              <Trophy size={14} className="text-yellow-400" />
              <span>OFICJALNE OSIĄGNIĘCIA ZAWODNIKA</span>
            </div>
            <h2>
              GABLOTA OSIĄGNIĘĆ <em>{playerName.toUpperCase()}</em>
            </h2>
            <p>
              Zdobywaj odznaki za potwierdzoną frekwencję, występy meczowe, bramki i rolę lidera. Odblokowuj unikalne karty w DELTA Collection!
            </p>

            {/* Completion Progress Bar */}
            <div className="v200-ach-progress-wrap mt-4">
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-300">CAŁKOWITY PROGRES:</span>
                <strong className="text-yellow-400">{unlockedCount} / {totalCount} ODBLOKOWANYCH ({overallPercent}%)</strong>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Rarity KPI Summary Cards */}
          <div className="v200-ach-rarity-grid">
            <div className="v200-ach-stat-card border-green-500/40 bg-green-950/20">
              <span className="text-xs font-bold text-green-400">ZDOBYTE</span>
              <strong className="text-2xl font-black text-white">{unlockedCount}</strong>
              <small className="text-slate-400 text-xs">Ukończone</small>
            </div>

            <div className="v200-ach-stat-card border-amber-500/40 bg-amber-950/20">
              <span className="text-xs font-bold text-amber-400">W TRAKCIE</span>
              <strong className="text-2xl font-black text-white">{inProgressCount}</strong>
              <small className="text-slate-400 text-xs">Aktywne wyzwania</small>
            </div>

            <div className="v200-ach-stat-card border-slate-600/40 bg-slate-900/30">
              <span className="text-xs font-bold text-slate-400">ZABLOKOWANE</span>
              <strong className="text-2xl font-black text-white">{lockedCount}</strong>
              <small className="text-slate-400 text-xs">Do rozpoczęcia</small>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category & Status Filter Tabs */}
      <div className="v200-ach-filters-container">
        {/* Categories (5 Głównych Kategorii) */}
        <div className="v200-ach-category-tabs">
          {[
            { id: "all", label: `Wszystkie (${totalCount})`, icon: Trophy },
            { id: "attendance", label: "🏃 Frekwencja", icon: Zap },
            { id: "matches", label: "⚽ Mecze", icon: CalendarDays },
            { id: "goals", label: "🎯 Bramki", icon: Goal },
            { id: "team", label: "👑 Drużyna & Kapitan", icon: Crown },
            { id: "inferno", label: "🔥 Inferno Premium", icon: Flame }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`v200-ach-tab-btn ${selectedCategory === cat.id ? "active" : ""}`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="v200-ach-status-filters">
          {[
            { id: "all", label: "Wszystkie" },
            { id: "unlocked", label: `Zdobyte (${unlockedCount})` },
            { id: "in_progress", label: `W trakcie (${inProgressCount})` },
            { id: "locked", label: "Zablokowane" }
          ].map(status => (
            <button
              key={status.id}
              type="button"
              onClick={() => setStatusFilter(status.id as any)}
              className={`v200-ach-status-btn ${statusFilter === status.id ? "active" : ""}`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Achievements Grid */}
      <div className="v200-ach-cards-grid">
        {filteredList.map(item => {
          const { definition, current, target, percent, isUnlocked, status } = item;
          const rStyle = getRarityBadgeStyle(definition.rarity);
          const isSecretLocked = definition.isSecret && !isUnlocked;

          return (
            <article 
              key={definition.id}
              className={`v200-ach-card ${isUnlocked ? "is-unlocked" : status === "IN_PROGRESS" ? "is-in-progress" : "is-locked"}`}
              onClick={() => onOpenAchievementDetail && onOpenAchievementDetail(item)}
            >
              <div className="v200-ach-card-header">
                <div className="v200-ach-cat-icon">
                  {getCategoryIcon(definition.category)}
                </div>

                <div className="flex items-center gap-1.5">
                  <span 
                    className="v200-ach-rarity-badge"
                    style={{ color: rStyle.color, background: rStyle.bg, borderColor: rStyle.border }}
                  >
                    {definition.rarity.toUpperCase()}
                  </span>

                  {isUnlocked ? (
                    <span className="v200-ach-status-badge unlocked">
                      <CheckCircle2 size={12} className="inline mr-1 text-green-400" />
                      ZDOBYTE
                    </span>
                  ) : (
                    <span className="v200-ach-status-badge locked">
                      <Lock size={11} className="inline mr-1 text-slate-400" />
                      {status === "IN_PROGRESS" ? "W TRAKCIE" : "ZABLOKOWANE"}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="v200-ach-card-body">
                <h4 className="v200-ach-card-title">
                  {isSecretLocked ? "??? (Tajne Osiągnięcie)" : definition.name}
                </h4>
                <p className="v200-ach-card-desc">
                  {isSecretLocked ? "Warunek odblokowania ukryty. Zdobądź wybitne osiągnięcie na boisku!" : definition.description}
                </p>
              </div>

              {/* Progress Section */}
              <div className="v200-ach-progress-box">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400 font-bold">POSTĘP:</span>
                  <strong className="text-white font-black">
                    {isUnlocked ? `${target} / ${target}` : `${current} / ${target}`}
                  </strong>
                </div>

                <div className="v200-ach-track">
                  <div 
                    className={`v200-ach-fill ${isUnlocked ? "bg-green-500" : "bg-amber-400"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Reward Row if Card / DP is attached */}
              {definition.rewardLabel && (
                <div className="v200-ach-reward-row">
                  <div className="flex items-center gap-1.5">
                    {definition.rewardCardType ? <Layers size={13} className="text-yellow-400" /> : <Sparkles size={13} className="text-green-400" />}
                    <span className="text-xs font-black text-yellow-300">
                      NAGRODA: {definition.rewardLabel}
                    </span>
                  </div>

                  {definition.rewardCardType && isUnlocked && onOpenCard && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCard(definition.rewardCardType);
                      }}
                      className="v200-ach-view-card-btn"
                    >
                      <span>ZOBACZ KARTĘ</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
