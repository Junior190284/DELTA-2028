"use client";

import React from "react";
import { createPortal } from "react-dom";
import { 
  Coins, 
  Trophy, 
  Flame, 
  Star, 
  Goal, 
  Crown, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Gift, 
  Package, 
  X,
  Zap,
  Target,
  Medal,
  Award
} from "lucide-react";

interface DeltaPointsRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeltaPointsRulesModal({ isOpen, onClose }: DeltaPointsRulesModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="v200-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Zasady systemu Delta Points">
      <div className="v200-modal-card v200-dp-rules-card" onClick={e => e.stopPropagation()}>
        <header className="v200-modal-header">
          <div className="v200-modal-header-icon gold">
            <Coins size={26} />
          </div>
          <div className="v200-modal-title-group">
            <span className="v200-modal-badge gold">OFICJALNY PRZEWODNIK</span>
            <h2>System Delta Points (DP) & Nagrody</h2>
            <p>Dowiedz się, jak zdobywać punkty i wymieniać je na nagrody, paczki oraz unikalne karty!</p>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij okno">
            <X size={20} />
          </button>
        </header>

        <div className="v200-dp-rules-body">
          {/* Czym są DP */}
          <section className="v200-dp-hero-box">
            <div className="v200-dp-hero-content">
              <span className="v200-dp-chip">🪙 WALUTA KLUBU DELTA</span>
              <h3>Graj, trenuj, zbieraj i odblokowuj nagrody!</h3>
              <p>
                <strong>Delta Points (DP)</strong> to oficjalny system punktacji doceniający zaangażowanie, 
                frekwencję na treningach, postawę w meczach ligowych oraz aktywność w aplikacji klubowej.
              </p>
            </div>
          </section>

          {/* Za co zdobywasz DP */}
          <section className="v200-dp-section">
            <h4 className="v200-dp-section-title">
              <Zap size={18} className="icon-gold" />
              <span>Jak zdobywać punkty DP?</span>
            </h4>

            <div className="v200-dp-grid">
              <div className="v200-dp-item">
                <div className="v200-dp-item-icon flame">
                  <Flame size={20} />
                </div>
                <div className="v200-dp-item-info">
                  <strong>Treningi & Frekwencja</strong>
                  <p>Obecność na treningu: <b>+50 DP</b></p>
                  <p>Żelazna seria (3+ obecności z rzędu): <b>+100 DP</b> bonusu</p>
                </div>
              </div>

              <div className="v200-dp-item">
                <div className="v200-dp-item-icon trophy">
                  <Trophy size={20} />
                </div>
                <div className="v200-dp-item-info">
                  <strong>Występy w Meczach</strong>
                  <p>Powołanie i udział w meczu: <b>+70 DP</b></p>
                  <p>Rola Kapitana w spotkaniu: <b>+50 DP</b></p>
                </div>
              </div>

              <div className="v200-dp-item">
                <div className="v200-dp-item-icon goal">
                  <Goal size={20} />
                </div>
                <div className="v200-dp-item-info">
                  <strong>Bramki & Asysty</strong>
                  <p>Każdy strzelony gol: <b>+30 DP</b></p>
                  <p>Każda asysta przy bramce: <b>+20 DP</b></p>
                </div>
              </div>

              <div className="v200-dp-item">
                <div className="v200-dp-item-icon star">
                  <Star size={20} />
                </div>
                <div className="v200-dp-item-info">
                  <strong>Wyróżnienia Meczowe</strong>
                  <p>Zawodnik Meczu (MVP Trenera): <b>+100 DP</b></p>
                  <p>Serduszko Trybun (Głos Kibiców): <b>+50 DP</b></p>
                </div>
              </div>

              <div className="v200-dp-item">
                <div className="v200-dp-item-icon quest">
                  <Target size={20} />
                </div>
                <div className="v200-dp-item-info">
                  <strong>Misje Tygodniowe (Quests)</strong>
                  <p>Wykonanie zadań w klubie: <b>+50 do +150 DP</b></p>
                  <p>Głosowanie na MVP kibiców: <b>+30 DP</b></p>
                </div>
              </div>

              <div className="v200-dp-item">
                <div className="v200-dp-item-icon quiz">
                  <HelpCircle size={20} />
                </div>
                <div className="v200-dp-item-info">
                  <strong>Quizy Wiedzy & Typer</strong>
                  <p>Poprawny quiz wiedzy piłkarskiej: <b>+50 DP</b></p>
                  <p>Trafny typ w Typerze meczowym: <b>+100 do +300 DP</b></p>
                </div>
              </div>
            </div>
          </section>

          {/* Na co wymienić DP */}
          <section className="v200-dp-section">
            <h4 className="v200-dp-section-title">
              <Gift size={18} className="icon-red" />
              <span>Na co możesz wydać punkty DP?</span>
            </h4>

            <div className="v200-dp-rewards-grid">
              <div className="v200-dp-reward-card">
                <div className="v200-dp-reward-badge bronze">PAKIETY STANDARD</div>
                <Package size={36} className="reward-icon" />
                <h5>Paczki Kart Piłkarskich</h5>
                <p>Otwieraj oficjalne paczki kart kolekcjonerskich DELTA FUT z animacją walkout!</p>
                <strong>Koszt: od 100 DP</strong>
              </div>

              <div className="v200-dp-reward-card premium">
                <div className="v200-dp-reward-badge gold">INFERNO & LEGEND</div>
                <Sparkles size={36} className="reward-icon gold-glow" />
                <h5>Karty Specjalne & Walkout</h5>
                <p>Odblokuj epickie karty INFERNO z dynamicznymi efektami wideo i 3D!</p>
                <strong>Koszt: od 250 DP</strong>
              </div>

              <div className="v200-dp-reward-card pass">
                <div className="v200-dp-reward-badge red">DELTA SEASON PASS</div>
                <Medal size={36} className="reward-icon" />
                <h5>Karnet Sezonowy</h5>
                <p>Awansuj na kolejne poziomy karnetu i odbieraj unikalne nagrody klubowe!</p>
                <strong>Etapy: 1 – 20 poziom</strong>
              </div>
            </div>
          </section>
        </div>

        <footer className="v200-modal-footer">
          <button type="button" className="v200-btn-primary" onClick={onClose}>
            Rozumiem, wracam do aplikacji
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
