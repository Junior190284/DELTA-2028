'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, Crown, Star, Check, Sparkles, ShieldCheck } from 'lucide-react';

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
  userName = 'Zawodnik DELTA',
  onProfileUpdated
}) => {
  const [activeTitle, setActiveTitle] = useState('Młody Wilczek');
  const [activeBadge, setActiveBadge] = useState('badge_starter');
  const [trophies, setTrophies] = useState<any[]>([]);
  const [savedToast, setSavedToast] = useState(false);

  const availableTitles = [
    'Młody Talent',
    'Młody Wilczek',
    'Snajper Mokotowa',
    'Wojownik Treningu',
    'Mistrz Asyst',
    'Żelazny Obrońca',
    'Gwiazda INFERNO',
    'Legenda DELTA'
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
      setTimeout(() => setSavedToast(false), 2000);
    } catch (e) {
      console.error('Save title error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/60 via-slate-900 to-red-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
              🏆
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wider">
                Gablota Trofeów & Wizytówka
              </h3>
              <p className="text-xs text-slate-400">Zdobyte medale, puchary i wybór tytułu profilowego</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Player Card Showcase Preview */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/30 flex items-center gap-4 shadow-inner">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20">
              👤
            </div>
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {activeTitle}
              </span>
              <h4 className="text-base font-black text-white uppercase mt-1">{userName}</h4>
              <p className="text-xs text-slate-400">K.S. Delta Warszawa 2018 · Górny Mokotów</p>
            </div>
          </div>

          {/* Titles Picker */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Wybierz Aktywny Tytuł Profilu:
              </label>
              {savedToast && (
                <span className="text-xs font-bold text-emerald-400 animate-fadeIn">✓ Zapisano</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableTitles.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSaveTitle(t)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                    activeTitle === t
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{t}</span>
                  {activeTitle === t && <Check size={14} className="text-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Trophy Cabinet Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Zdobyte Trofea i Osiągnięcia Sezonowe:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { title: 'Mistrz Jesieni 2026', icon: '🏆', date: 'Październik 2026' },
                { title: '100% Frekwencji', icon: '⭐', date: 'Wrzesień 2026' },
                { title: 'Puchar INFERNO', icon: '🔥', date: 'Sezon 1' },
                { title: 'Król Strzelców Minigier', icon: '🎯', date: 'Październik 2026' },
                { title: 'Wojownik Areny 3v3', icon: '⚔️', date: 'Liga Kartowa' },
                { title: 'Pierwsza Karta RARE', icon: '🥇', date: 'Kolekcja' },
              ].map((trophy, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-800/50 border border-white/10 flex flex-col items-center text-center space-y-1 shadow-md hover:border-amber-500/40 transition-colors"
                >
                  <div className="text-3xl my-1">{trophy.icon}</div>
                  <h5 className="font-bold text-white text-xs leading-snug">{trophy.title}</h5>
                  <span className="text-[9px] text-slate-400">{trophy.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
