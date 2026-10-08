'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShieldCheck, Zap, Flame, Trophy, Award, 
  Sparkles, Layers, ArrowRight, CheckCircle2, TrendingUp 
} from 'lucide-react';

interface DeltaWeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays?: number;
  xpGained?: number;
  trainingsAttended?: number;
  cardsUnlocked?: number;
}

export const DeltaWeeklySummaryModal: React.FC<DeltaWeeklySummaryModalProps> = ({
  isOpen,
  onClose,
  streakDays = 5,
  xpGained = 480,
  trainingsAttended = 3,
  cardsUnlocked = 6
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="v200-summary-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-summary-sheet" onClick={(e) => e.stopPropagation()}>
        {/* ================= HEADER ================= */}
        <div className="v200-summary-header">
          <div className="summary-header-brand">
            <div className="summary-icon-box">
              <TrendingUp size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="summary-eyebrow-tag">RAPORT AKADEMII • OSTATNIE 7 DNI</div>
              <h2 className="summary-modal-title">PODSUMOWANIE TYGODNIA DELTA</h2>
              <p className="summary-modal-subtitle">Świetna robota! Sprawdź swoje postępy i osiągnięcia z tego tygodnia</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="summary-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= 2x2 STATS GRID ================= */}
        <div className="v200-summary-body">
          <div className="v200-summary-kpis-grid">
            {/* Box 1: XP */}
            <div className="summary-kpi-card xp">
              <div className="kpi-icon-wrap">
                <Zap size={22} />
              </div>
              <span className="kpi-label">ZDOBYTE PUNKTY XP</span>
              <strong className="kpi-value">+{xpGained} XP</strong>
              <span className="kpi-subtext">Awans w Season Pass</span>
            </div>

            {/* Box 2: Streak */}
            <div className="summary-kpi-card streak">
              <div className="kpi-icon-wrap">
                <Flame size={22} />
              </div>
              <span className="kpi-label">STREAK LOGOWANIA</span>
              <strong className="kpi-value">{streakDays} Dni</strong>
              <span className="kpi-subtext">Maksymalna seria ognia</span>
            </div>

            {/* Box 3: Trainings */}
            <div className="summary-kpi-card training">
              <div className="kpi-icon-wrap">
                <Trophy size={22} />
              </div>
              <span className="kpi-label">OBECNOŚĆ NA TRENINGACH</span>
              <strong className="kpi-value">{trainingsAttended} / 3</strong>
              <span className="kpi-subtext">100% frekwencji na boisku</span>
            </div>

            {/* Box 4: Cards */}
            <div className="summary-kpi-card cards">
              <div className="kpi-icon-wrap">
                <Layers size={22} />
              </div>
              <span className="kpi-label">NOWE KARTY W KLASERZE</span>
              <strong className="kpi-value">+{cardsUnlocked}</strong>
              <span className="kpi-subtext">Rozbudowa kolekcji</span>
            </div>
          </div>

          {/* Motivation / Tip Banner */}
          <div className="summary-pro-tip-card">
            <div className="tip-shield-icon">
              <ShieldCheck size={22} className="text-amber-400" />
            </div>
            <div className="tip-content">
              <strong className="tip-title">Ciągły Rozwój Zawodnika DELTA</strong>
              <p className="tip-desc">
                Regularne treningi na boisku i aktywność w aplikacji automatycznie podnoszą rating Twojej karty i pozycję w rankingu ligowym!
              </p>
            </div>
          </div>

          {/* Big CTA Action Button */}
          <button
            type="button"
            onClick={onClose}
            className="summary-cta-btn"
          >
            <Sparkles size={18} />
            <span>KONTYNUUJ GRĘ (ODBIERZ BONUS TYGODNIA)</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeltaWeeklySummaryModal;
