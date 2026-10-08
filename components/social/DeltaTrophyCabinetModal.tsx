'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Trophy, Medal, Crown, Star, Check, Sparkles, 
  ShieldCheck, User, CheckCircle2, Award, Flame, Target, Swords 
} from 'lucide-react';

interface DeltaTrophyCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  onProfileUpdated?: () => void;
}

export const DeltaTrophyCabinetModal: React.FC<DeltaTrophyCabinetModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  userName = 'Zawodnik DELTA 2018',
  onProfileUpdated
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeTitle, setActiveTitle] = useState('Młody Wilczek');
  const [activeBadge, setActiveBadge] = useState('badge_starter');
  const [trophies, setTrophies] = useState<any[]>([]);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const availableTitles = [
    { title: 'Młody Talent', icon: '⭐', desc: 'Debiut w akademii' },
    { title: 'Młody Wilczek', icon: '🐺', desc: 'Waleczność i charakter' },
    { title: 'Snajper Mokotowa', icon: '🎯', desc: 'Instynkt strzelecki' },
    { title: 'Wojownik Treningu', icon: '🏃', desc: '100% zaangażowania' },
    { title: 'Mistrz Asyst', icon: '🪄', desc: 'Przegląd pola i podania' },
    { title: 'Żelazny Obrońca', icon: '🛡️', desc: 'Nie do przejścia' },
    { title: 'Gwiazda INFERNO', icon: '🔥', desc: 'Najrzadsze karty' },
    { title: 'Legenda DELTA', icon: '👑', desc: 'Mistrzowski status' }
  ];

  const showcaseTrophies = [
    { title: 'Mistrz Jesieni 2026', icon: '🏆', date: 'Październik 2026', tier: 'gold' },
    { title: '100% Frekwencji', icon: '⭐', date: 'Wrzesień 2026', tier: 'gold' },
    { title: 'Puchar INFERNO', icon: '🔥', date: 'Sezon 1', tier: 'inferno' },
    { title: 'Król Strzelców Minigier', icon: '🎯', date: 'Październik 2026', tier: 'gold' },
    { title: 'Wojownik Areny 3v3', icon: '⚔️', date: 'Liga Kartowa', tier: 'silver' },
    { title: 'Pierwsza Karta RARE', icon: '🥇', date: 'Kolekcja Panini', tier: 'silver' },
  ];

  const fetchProfileCustomization = async () => {
    try {
      const res = await fetch(`/api/social/profile?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.customization) {
        setActiveTitle(data.customization.active_title || 'Młody Wilczek');
        setActiveBadge(data.customization.active_badge_id || 'badge_starter');
        setTrophies(data.customization.trophies || []);
      }
    } catch (e) {
      console.error('Fetch profile custom error:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfileCustomization();
    }
  }, [isOpen, userId]);

  const handleSaveTitle = async (title: string) => {
    setActiveTitle(title);
    try {
      await fetch('/api/social/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          activeTitle: title,
          activeBadgeId: activeBadge
        })
      });
      setSavedToast(true);
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setSavedToast(false), 2500);
    } catch (e) {
      console.error('Save title error:', e);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="v200-cabinet-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-cabinet-sheet" onClick={(e) => e.stopPropagation()}>
        {/* ================= HEADER ================= */}
        <div className="v200-cabinet-header">
          <div className="cabinet-header-brand">
            <div className="cabinet-trophy-icon">
              <Trophy size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="cabinet-eyebrow-tag">PROFIL ZAWODNIKA • GABANIT PRESTIŻU</div>
              <h2 className="cabinet-modal-title">GABLOTA TROFEÓW & WIZYTÓWKA</h2>
              <p className="cabinet-modal-subtitle">Zdobyte medale, puchary i wybór aktywnego tytułu profilowego</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cabinet-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= BODY SCROLL ================= */}
        <div className="v200-cabinet-body-scroll">
          {/* VIP Player Business Card Preview */}
          <div className="cabinet-player-showcase-card">
            <div className="showcase-avatar-box">
              <div className="showcase-avatar-circle">
                <User size={30} className="text-amber-400" />
              </div>
              <div className="showcase-crown-tag">👑</div>
            </div>

            <div className="showcase-player-details">
              <div className="showcase-title-chip">
                <Sparkles size={12} className="text-amber-400" />
                <span>{activeTitle}</span>
              </div>
              <h3 className="showcase-player-name">{userName}</h3>
              <p className="showcase-club-line">K.S. Delta Warszawa 2018 • Górny Mokotów</p>
            </div>

            <div className="showcase-verified-badge">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>AKTYWNY W PROFILU</span>
            </div>
          </div>

          {/* Titles Picker Section */}
          <div className="cabinet-section-box">
            <div className="cabinet-section-header">
              <div className="section-title-wrap">
                <Award size={16} className="text-amber-400" />
                <h4 className="section-title">Wybierz Aktywny Tytuł Profilu</h4>
              </div>
              {savedToast && (
                <div className="saved-indicator-chip animate-fadeIn">
                  <CheckCircle2 size={13} />
                  <span>Zapisano nowy tytuł!</span>
                </div>
              )}
            </div>

            <div className="cabinet-titles-grid">
              {availableTitles.map((item) => {
                const isSelected = activeTitle === item.title;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleSaveTitle(item.title)}
                    className={`cabinet-title-btn ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="title-btn-left">
                      <span className="title-btn-emoji">{item.icon}</span>
                      <div className="title-btn-text-wrap">
                        <strong className="title-btn-name">{item.title}</strong>
                        <span className="title-btn-desc">{item.desc}</span>
                      </div>
                    </div>

                    <div className={`title-btn-check ${isSelected ? 'active' : ''}`}>
                      {isSelected ? <Check size={14} /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trophy Cabinet Grid */}
          <div className="cabinet-section-box">
            <div className="cabinet-section-header">
              <div className="section-title-wrap">
                <Trophy size={16} className="text-amber-400" />
                <h4 className="section-title">Zdobyte Trofea i Osiągnięcia Sezonowe</h4>
              </div>
              <span className="trophies-count-tag">{showcaseTrophies.length} odblokowanych</span>
            </div>

            <div className="cabinet-trophies-grid">
              {showcaseTrophies.map((trophy, idx) => (
                <div key={idx} className={`cabinet-trophy-pedestal ${trophy.tier}`}>
                  <div className="trophy-shelf-glow" />
                  <div className="trophy-3d-icon">{trophy.icon}</div>
                  <h5 className="trophy-name">{trophy.title}</h5>
                  <span className="trophy-date-tag">{trophy.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="v200-cabinet-footer">
          <div className="cabinet-footer-info">
            <Sparkles size={16} className="text-amber-400" />
            <span>Tytuł profilu jest widoczny we Własnej Drużynie, Pojedynkach 3v3 i na Giełdzie Kart</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cabinet-footer-close-btn"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeltaTrophyCabinetModal;
