"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, Sparkles, Shield, Zap, Info, Award, HelpCircle, 
  Trophy, Target, Crown, Flame, Star, Compass, CheckCircle2, ChevronRight
} from "lucide-react";
import { CENTRAL_CARD_TYPES, POLISH_CARD_STATS, CentralCardTypeKey } from "@/lib/cards/central-types";
import { RARITY_CONFIG, CardRarity } from "@/lib/cards/types";

interface DeltaCardLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeltaCardLegendModal({ isOpen, onClose }: DeltaCardLegendModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "rarity" | "types" | "ovr">("stats");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="v200-guide-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-guide-sheet" onClick={e => e.stopPropagation()}>
        {/* ================= HEADER ================= */}
        <div className="v200-guide-header">
          <div className="guide-header-brand">
            <div className="guide-icon-badge">
              <HelpCircle size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="guide-eyebrow-tag">PRZEWODNIK KOLEKCJONERA • PORADNIK PRO</div>
              <h2 className="guide-modal-title">JAK CZYTAĆ KARTĘ DELTA?</h2>
            </div>
          </div>

          <button type="button" className="guide-close-btn" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="v200-guide-nav-bar">
          {[
            { id: "stats", label: "Współczynniki (Stats)", icon: Zap },
            { id: "rarity", label: "Rzadkość (Rarity)", icon: Sparkles },
            { id: "types", label: "10 Typów Kart", icon: Award },
            { id: "ovr", label: "Ocena Ogólna (OVR)", icon: Crown }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`guide-nav-pill ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="v200-guide-body-scroll">
          {/* TAB 1: POLSKIE STATYSTYKI */}
          {activeTab === "stats" && (
            <div className="guide-tab-content">
              <div className="guide-intro-callout">
                <div className="callout-header">
                  <Zap size={18} className="text-amber-400" />
                  <h4>Polskie Oznaczenia Statystyk Piłkarskich</h4>
                </div>
                <p>
                  Każda oficjalna karta zawodnika klubu DELTA posiada 6 kluczowych współczynników piłkarskich 
                  odzwierciedlających formę z meczów ligowych i zaangażowanie na treningach.
                </p>
              </div>

              <div className="guide-stats-grid">
                {Object.values(POLISH_CARD_STATS).map(st => (
                  <div key={st.key} className="guide-stat-card">
                    <div className="stat-card-icon-box">
                      <span>{st.icon}</span>
                    </div>
                    <div className="stat-card-details">
                      <div className="stat-card-header">
                        <span className="stat-code-pill">{st.codePL}</span>
                        <strong className="stat-name-title">{st.fullNamePL}</strong>
                      </div>
                      <p className="stat-description-text">{st.descriptionPL}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: RZADKOŚĆ KART */}
          {activeTab === "rarity" && (
            <div className="guide-tab-content">
              <div className="guide-intro-callout">
                <div className="callout-header">
                  <Sparkles size={18} className="text-amber-400" />
                  <h4>Poziomy Rzadkości i Efekty Holograficzne</h4>
                </div>
                <p>
                  Rzadkość decyduje o unikalności karty w paczkach, wyglądzie folii oraz zapewnia 
                  bonus do Oceny Ogólnej (OVR) we Własnej Drużynie (Squad Builder).
                </p>
              </div>

              <div className="guide-rarity-cards-stack">
                {(["common", "rare", "epic", "legendary", "inferno"] as CardRarity[]).map(r => {
                  const cfg = RARITY_CONFIG[r];
                  return (
                    <div
                      key={r}
                      className="guide-rarity-row-card"
                      style={{
                        background: cfg.bgGradient,
                        borderColor: cfg.borderGlow
                      }}
                    >
                      <div className="rarity-row-left">
                        <div
                          className="rarity-badge-chip"
                          style={{ background: cfg.color }}
                        >
                          {cfg.label}
                        </div>
                        <div className="rarity-text-info">
                          <strong className="rarity-card-name">
                            {r === "inferno" ? "Najwyższa Rzadkość DELTA INFERNO" : `Karta ${cfg.label}`}
                          </strong>
                          <span className="rarity-points-val">
                            Wartość na Giełdzie / Duplikat: <b>{cfg.duplicatePoints} DP</b>
                          </span>
                        </div>
                      </div>

                      <div className="rarity-row-right">
                        <span className="rarity-ovr-boost-badge">
                          {r === "inferno" 
                            ? "+9 OVR Bonus" 
                            : r === "legendary" 
                            ? "+6 OVR Bonus" 
                            : r === "epic" 
                            ? "+4 OVR Bonus" 
                            : r === "rare" 
                            ? "+2 OVR Bonus" 
                            : "Standard (+0)"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: 10 TYPÓW KART */}
          {activeTab === "types" && (
            <div className="guide-tab-content">
              <div className="guide-intro-callout">
                <div className="callout-header">
                  <Award size={18} className="text-amber-400" />
                  <h4>10 Dedykowanych Edycji Kart w Sezonie 2026/27</h4>
                </div>
                <p>
                  Każda edycja karty odblokowuje specjalne cechy taktyczne i bonusy do zgrania drużyny.
                </p>
              </div>

              <div className="guide-types-list">
                {Object.values(CENTRAL_CARD_TYPES).map(t => (
                  <div key={t.type} className="guide-type-card-item">
                    <div className="type-icon-box">
                      <span>{t.icon}</span>
                    </div>

                    <div className="type-content-box">
                      <div className="type-header-row">
                        <strong className="type-title-text">{t.displayName}</strong>
                        <span className="type-badge-pill">{t.badgeLabel}</span>
                      </div>
                      <p className="type-desc-text">{t.description}</p>
                    </div>

                    <div className="type-bonuses-box">
                      {t.ratingBonus > 0 && (
                        <div className="type-rating-bonus-chip">
                          +{t.ratingBonus} OVR
                        </div>
                      )}
                      {t.squadBonusDescription && (
                        <span className="type-squad-desc-text">{t.squadBonusDescription}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM OCENY OVR */}
          {activeTab === "ovr" && (
            <div className="guide-tab-content">
              {/* 3 Pillars Callout */}
              <div className="guide-ovr-pillars-box">
                <div className="pillars-header">
                  <Crown size={20} className="text-amber-400" />
                  <h3>3 Filary Oceny Ogólnej (OVR)</h3>
                </div>
                <p className="pillars-subtitle">
                  Ocena karty (OVR) w DELTA 2018 GM powstaje na bazie rzetelnych, przejrzystych reguł:
                </p>

                <div className="pillars-grid">
                  <div className="pillar-item">
                    <div className="pillar-num-badge">1</div>
                    <strong className="pillar-title">Baza Zawodnika (70 OVR)</strong>
                    <p className="pillar-desc">
                      Wyjściowy poziom każdego młodego adepta piłki nożnej w akademii DELTA.
                    </p>
                  </div>

                  <div className="pillar-item">
                    <div className="pillar-num-badge">2</div>
                    <strong className="pillar-title">Realne Statystyki z Meczy</strong>
                    <p className="pillar-desc">
                      Gole, asysty, czyste konta bramkarza, frekwencja treningowa oraz tytuły MVP bezpośrednio windują OVR.
                    </p>
                  </div>

                  <div className="pillar-item">
                    <div className="pillar-num-badge">3</div>
                    <strong className="pillar-title">Rzadkość & Edycja Karty</strong>
                    <p className="pillar-desc">
                      Karty Matchday (+5), Gold Master (+8), Delta Icon (+12) i INFERNO (+16) zapewniają potężne wzmocnienie!
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Tips Box */}
              <div className="guide-tips-card">
                <div className="tips-card-head">
                  <Sparkles size={16} className="text-amber-400" />
                  <strong>Wskazówki dla Trenerów i Zawodników</strong>
                </div>
                <p>
                  We Własnej Drużynie (Squad Builder) zyskasz dodatkowe premie: 
                  <b> +2 OVR</b> za wyznaczenie Kapitana drużyny, 
                  <b> +2 Zgranie</b> za Kartę Trenera oraz 
                  <b> +1 OVR Gospodarza</b> za Kartę Twierdzy Jordanek.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="v200-guide-footer">
          <div className="footer-left-info">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Karty są automatycznie synchronizowane z oficjalnym systemem DELTA 2018 GM</span>
          </div>
          <button type="button" className="guide-primary-close-btn" onClick={onClose}>
            ROZUMIEM, DZIĘKUJĘ!
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
