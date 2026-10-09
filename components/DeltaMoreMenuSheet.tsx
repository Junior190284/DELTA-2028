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
  BookOpen
} from "lucide-react";

interface DeltaMoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: string, extra?: any) => void;
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

        {/* 10 Głównych Kafelków Premium */}
        <div className="delta-more-content">
          <div className="delta-more-grid">
            {/* 1. DRUŻYNA */}
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

            {/* 2. FANTASY & TYPER */}
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

            {/* 3. DELTA GAME */}
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

            {/* 4. DELTA COLLECTION */}
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

            {/* 5. OSIĄGNIĘCIA 2.0 */}
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

            {/* 6. GALERIA & FOTO-BUDKA */}
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

            {/* 7. DELTA TV */}
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

            {/* 8. HISTORIA & KRONIKA */}
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

            {/* 9. HALL OF FAME */}
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

            {/* 10. POWIADOMIENIA WEB PUSH */}
            <button
              type="button"
              className="delta-more-tile"
              onClick={() => handleTileClick("settings")}
            >
              <div className="delta-tile-icon-box icon-settings">
                <Settings size={22} />
              </div>
              <div className="delta-tile-text">
                <strong className="delta-tile-title">POWIADOMIENIA WEB PUSH</strong>
                <small className="delta-tile-subtitle">Włącz powiadomienia na telefonie</small>
              </div>
              <span className="delta-tile-status-chip gold">
                PUSH
              </span>
            </button>

            {/* 11. PANEL ADMINISTRATORA (tylko dla admin / coach / pomocnik) */}
            {canOpenAdmin && (
              <button
                type="button"
                className="delta-more-tile delta-more-admin-tile"
                onClick={() => handleTileClick("admin")}
                aria-label="Panel administratora"
              >
                <div className="delta-tile-icon-box icon-admin">
                  <Shield size={22} />
                </div>
                <div className="delta-tile-text">
                  <strong className="delta-tile-title">PANEL ADMINA</strong>
                  <small className="delta-tile-subtitle">Zarządzanie kadrą & meczami</small>
                </div>
                <span className="delta-tile-status-chip gold">
                  {adminRoleLabel}
                </span>
              </button>
            )}
          </div>

          {/* Szybkie linki pomocnicze */}
          <div className="delta-more-footer-links">
            <button 
              type="button" 
              onClick={() => handleTileClick("settings")} 
              className="delta-more-sublink"
            >
              <Settings size={15} />
              <span>Powiadomienia Web Push (Włącz / Wyłącz)</span>
            </button>

            {canOpenAdmin && (
              <a href="/admin" className="delta-more-sublink admin-sublink" aria-label="Panel administratora">
                <Shield size={15} />
                <span>Panel Administratora ({adminRoleLabel})</span>
              </a>
            )}

            <button 
              type="button" 
              onClick={() => handleTileClick("knowledge")} 
              className="delta-more-sublink"
            >
              <BookOpen size={15} />
              <span>Kącik Wiedzy & Dieta</span>
            </button>

            <a href="/" className="delta-more-sublink external">
              <ExternalLink size={15} />
              <span>Strona Publiczna Klubu</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
