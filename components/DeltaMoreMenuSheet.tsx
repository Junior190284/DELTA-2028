"use client";

import React from "react";
import { 
  X, 
  Users, 
  Crown, 
  Target, 
  Sparkles, 
  Trophy, 
  Camera, 
  Tv, 
  History, 
  Flame, 
  Settings, 
  ChevronRight,
  Shield,
  Layers,
  Award,
  Gamepad2,
  CalendarDays,
  ExternalLink,
  BookOpen,
  Newspaper,
  Bell
} from "lucide-react";

interface DeltaMoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: string, extra?: any) => void;
  unreadCount?: number;
  collectionCount?: { owned: number; total: number };
  achievementsCount?: { unlocked: number; total: number };
  hasNewGalleryPhoto?: boolean;
  tvTransmissionsCount?: number;
  playersCount?: number;
  canOpenAdmin?: boolean;
  adminRoleLabel?: string;
}

export default function DeltaMoreMenuSheet({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  unreadCount = 0,
  collectionCount = { owned: 18, total: 66 },
  achievementsCount = { unlocked: 14, total: 22 },
  hasNewGalleryPhoto = true,
  tvTransmissionsCount = 2,
  playersCount = 16,
  canOpenAdmin = false,
  adminRoleLabel = "ADMIN"
}: DeltaMoreMenuSheetProps) {
  if (!isOpen) return null;

  const handleTileClick = (tabOrAction: string, extra?: any) => {
    onClose();
    onNavigate(tabOrAction, extra);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="delta-more-backdrop animate-fadeIn" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Main Sheet Container */}
      <div 
        className="delta-more-sheet animate-slideUp"
        id="delta-mobile-more-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Więcej opcji DELTA 2018 GM"
      >
        {/* Header */}
        <div className="delta-more-header">
          <div className="delta-more-title-wrap">
            <img src="/teamlogos/gm.png" alt="DELTA" className="delta-more-logo" />
            <div>
              <span className="delta-more-kicker">CENTRUM FUNKCJI & MODUŁÓW</span>
              <h3 className="delta-more-heading">WIĘCEJ W DELTA GM</h3>
            </div>
          </div>

          <button 
            type="button" 
            className="delta-more-close-btn" 
            onClick={onClose}
            aria-label="Zamknij menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* 11 Głównych Kafelków Treści i Funkcji */}
        <div className="delta-more-content">
          <div className="delta-more-grid">
            {/* 1. WIADOMOŚCI I POWIADOMIENIA */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "news" ? "active" : ""}`}
              onClick={() => handleTileClick("news")}
            >
              <div className="delta-tile-icon-box icon-news" style={{ background: "rgba(185, 28, 28, 0.18)", color: "#ef4444", border: "1px solid rgba(185, 28, 28, 0.35)" }}>
                <Newspaper size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">WIADOMOŚCI I POWIADOMIENIA</strong>
                <small className="delta-tile-subtitle">Komunikaty, aktualności i alerty</small>
              </div>
              {unreadCount > 0 ? (
                <span className="delta-tile-status-chip new">
                  {unreadCount > 99 ? "99+" : `${unreadCount} nowych`}
                </span>
              ) : (
                <span className="delta-tile-status-chip">
                  CENTRUM
                </span>
              )}
            </button>

            {/* 2. DRUŻYNA */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "players" || activeTab === "teamcenter" ? "active" : ""}`}
              onClick={() => handleTileClick("players")}
            >
              <div className="delta-tile-icon-box icon-team">
                <Users size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">DRUŻYNA</strong>
                <small className="delta-tile-subtitle">Kadra rocznika 2018</small>
              </div>
              <span className="delta-tile-status-chip">
                {playersCount} zawodników
              </span>
            </button>

            {/* 3. KĄCIK WIEDZY */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "knowledge" ? "active" : ""}`}
              onClick={() => handleTileClick("knowledge")}
            >
              <div className="delta-tile-icon-box icon-knowledge">
                <BookOpen size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">KĄCIK WIEDZY</strong>
                <small className="delta-tile-subtitle">Porady, dieta i rozwój</small>
              </div>
              <span className="delta-tile-status-chip gold">
                DIETA & EDU
              </span>
            </button>

            {/* 4. FANTASY & TYPER */}
            <button
              type="button"
              className="delta-more-tile"
              onClick={() => handleTileClick("typer")}
            >
              <div className="delta-tile-icon-box icon-fantasy">
                <Crown size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">FANTASY & TYPER</strong>
                <small className="delta-tile-subtitle">Typuj wyniki & liga DP</small>
              </div>
              <span className="delta-tile-status-chip live">
                LIVE
              </span>
            </button>

            {/* 5. DELTA GAME */}
            <button
              type="button"
              className="delta-more-tile"
              onClick={() => handleTileClick("game")}
            >
              <div className="delta-tile-icon-box icon-game">
                <Gamepad2 size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">DELTA GAME</strong>
                <small className="delta-tile-subtitle">Rzuty wolne & refleks 3D</small>
              </div>
              <span className="delta-tile-status-chip gold">
                +DP
              </span>
            </button>

            {/* 6. DELTA COLLECTION */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "collection" ? "active" : ""}`}
              onClick={() => handleTileClick("collection")}
            >
              <div className="delta-tile-icon-box icon-collection">
                <Layers size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">DELTA COLLECTION</strong>
                <small className="delta-tile-subtitle">Klaser 3D & boostery</small>
              </div>
              <span className="delta-tile-status-chip gold">
                {collectionCount.owned} / {collectionCount.total}
              </span>
            </button>

            {/* 7. OSIĄGNIĘCIA 2.0 */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "achievements" ? "active" : ""}`}
              onClick={() => handleTileClick("achievements")}
            >
              <div className="delta-tile-icon-box icon-ach">
                <Trophy size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">OSIĄGNIĘCIA</strong>
                <small className="delta-tile-subtitle">Wyzwania, odznaki & karty</small>
              </div>
              <span className="delta-tile-status-chip">
                {achievementsCount.unlocked} / {achievementsCount.total}
              </span>
            </button>

            {/* 8. GALERIA & FOTO-BUDKA */}
            <button
              type="button"
              className="delta-more-tile"
              onClick={() => handleTileClick("gallery")}
            >
              <div className="delta-tile-icon-box icon-gallery">
                <Camera size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">GALERIA</strong>
                <small className="delta-tile-subtitle">Zdjęcia z meczów & budka</small>
              </div>
              {hasNewGalleryPhoto && (
                <span className="delta-tile-status-chip new">
                  NEW
                </span>
              )}
            </button>

            {/* 9. DELTA TV */}
            <button
              type="button"
              className="delta-more-tile"
              onClick={() => handleTileClick("tv")}
            >
              <div className="delta-tile-icon-box icon-tv">
                <Tv size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">DELTA TV</strong>
                <small className="delta-tile-subtitle">Belki transmisyjne & wideo</small>
              </div>
              <span className="delta-tile-status-chip">
                {tvTransmissionsCount} nowe
              </span>
            </button>

            {/* 10. HISTORIA & KRONIKA */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "chronicle" ? "active" : ""}`}
              onClick={() => handleTileClick("chronicle")}
            >
              <div className="delta-tile-icon-box icon-history">
                <History size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">HISTORIA</strong>
                <small className="delta-tile-subtitle">Kronika ligowa 2026/27</small>
              </div>
            </button>

            {/* 11. HALL OF FAME */}
            <button
              type="button"
              className={`delta-more-tile ${activeTab === "hall" ? "active" : ""}`}
              onClick={() => handleTileClick("hall")}
            >
              <div className="delta-tile-icon-box icon-hall">
                <Flame size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">HALL OF FAME</strong>
                <small className="delta-tile-subtitle">Królowie strzelców & MVP</small>
              </div>
              <span className="delta-tile-status-chip gold">
                TOP GM
              </span>
            </button>
          </div>

          {/* Dolna Sekcja Pozioma (Ustawienia / System / Admin) */}
          <div className="delta-more-footer-links">
            {/* 1. POWIADOMIENIA WEB PUSH */}
            <button 
              type="button" 
              onClick={() => handleTileClick("settings")} 
              className={`delta-more-sublink ${activeTab === "settings" ? "active" : ""}`}
            >
              <div className="delta-sublink-icon-box">
                <Settings size={18} />
              </div>
              <div className="delta-sublink-text">
                <strong className="delta-sublink-title">POWIADOMIENIA WEB PUSH</strong>
                <small className="delta-sublink-subtitle">Włącz / wyłącz na tym urządzeniu</small>
              </div>
              <ChevronRight size={16} className="delta-sublink-arrow" />
            </button>

            {/* 2. PANEL ADMINA (jeśli uprawniony) */}
            {canOpenAdmin && (
              <button
                type="button"
                onClick={() => handleTileClick("admin")}
                className="delta-more-sublink admin-sublink"
                aria-label="Panel administratora"
              >
                <div className="delta-sublink-icon-box admin-icon">
                  <Shield size={18} />
                </div>
                <div className="delta-sublink-text">
                  <strong className="delta-sublink-title">PANEL ADMINA</strong>
                  <small className="delta-sublink-subtitle">Zarządzanie aplikacją</small>
                </div>
                <span className="delta-sublink-badge gold">
                  {adminRoleLabel}
                </span>
                <ChevronRight size={16} className="delta-sublink-arrow" />
              </button>
            )}

            {/* 3. STRONA PUBLICZNA KLUBU */}
            <a href="/" className="delta-more-sublink external">
              <div className="delta-sublink-icon-box">
                <ExternalLink size={18} />
              </div>
              <div className="delta-sublink-text">
                <strong className="delta-sublink-title">STRONA PUBLICZNA KLUBU</strong>
                <small className="delta-sublink-subtitle">Oficjalny serwis K.S. Delta Warszawa</small>
              </div>
              <ChevronRight size={16} className="delta-sublink-arrow" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
