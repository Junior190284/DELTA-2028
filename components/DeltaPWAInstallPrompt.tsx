'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const DeltaPWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Sprawdź czy aplikacja działa już jako zainstalowane PWA
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        localStorage.getItem('delta_pwa_installed') === 'true';

      if (isStandalone) {
        return;
      }

      // 2. Sprawdź czy użytkownik poprosił o późniejsze przypomnienie
      const dismissedUntil = localStorage.getItem('delta_pwa_dismissed_until');
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('delta_pwa_installed', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      try {
        localStorage.setItem('delta_pwa_installed', 'true');
      } catch {}
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      // Przypomnij za 7 dni, nie blokując kolejnych sesji
      localStorage.setItem(
        'delta_pwa_dismissed_until',
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-[84px] sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-red-950/80 border border-amber-500/35 shadow-2xl backdrop-blur-md animate-fadeIn flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
        <Smartphone size={18} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-black text-white text-xs sm:text-sm uppercase tracking-wider m-0">
            Zainstaluj DELTA GM
          </h4>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            PWA
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
          Dodaj do ekranu telefonu — szybki dostęp do obecności, meczów i kart offline.
        </p>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer min-h-[36px]"
          >
            <Download size={13} />
            <span>Zainstaluj</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer min-h-[36px]"
          >
            Później
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        aria-label="Zamknij powiadomienie instalacji"
      >
        <X size={15} />
      </button>
    </div>
  );
};
