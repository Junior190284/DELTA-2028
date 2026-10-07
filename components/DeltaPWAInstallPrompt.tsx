'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const DeltaPWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('delta_pwa_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('delta_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[90] p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-red-950/80 border border-amber-500/40 shadow-2xl backdrop-blur-md animate-fadeIn flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-amber-500/20">
        <Smartphone size={20} className="text-white" />
      </div>

      <div className="flex-1">
        <h4 className="font-black text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
          Zainstaluj DELTA GM <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">PWA</span>
        </h4>
        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
          Dodaj aplikację do ekranu telefonu, aby mieć natychmiastowy dostęp do meczów i kart offline.
        </p>

        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md hover:from-amber-400 hover:to-red-500 transition-all"
          >
            <Download size={13} /> Zainstaluj
          </button>
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all"
          >
            Później
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={15} />
      </button>
    </div>
  );
};
