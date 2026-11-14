'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Check } from 'lucide-react';

export const DeltaPWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Sprawdź czy aplikacja działa już jako zainstalowane PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('delta_pwa_installed') === 'true';

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      try {
        (window as any).__delta_deferred_prompt = e;
      } catch {}

      // Sprawdź czy użytkownik zamknął w bieżącej sesji lub powiadomienie było już pokazane w tej sesji
      if (
        sessionStorage.getItem('delta_pwa_dismissed_session') === 'true' ||
        sessionStorage.getItem('delta_pwa_shown_session') === 'true'
      ) {
        return;
      }

      // Sprawdź czy użytkownik poprosił o późniejsze przypomnienie (7 dni)
      const dismissedUntil = localStorage.getItem('delta_pwa_dismissed_until');
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }

      setIsVisible(true);
      try {
        sessionStorage.setItem('delta_pwa_shown_session', 'true');
      } catch {}
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsInstalled(true);
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

  // Obsługa ręcznego wywołania instalacji z menu aplikacji
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onManualTrigger = () => {
      const promptToUse = deferredPrompt || (window as any).__delta_deferred_prompt;
      if (promptToUse && typeof promptToUse.prompt === 'function') {
        promptToUse.prompt();
      } else {
        // Jeśli przeglądarka nie pozwala na prompt lub jest na iOS Safari, pokazujemy baner z instrukcją
        setIsVisible(true);
      }
    };

    window.addEventListener('delta_trigger_pwa_install', onManualTrigger);
    return () => window.removeEventListener('delta_trigger_pwa_install', onManualTrigger);
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).__delta_deferred_prompt;
    if (promptToUse && typeof promptToUse.prompt === 'function') {
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        setIsInstalled(true);
        try {
          localStorage.setItem('delta_pwa_installed', 'true');
        } catch {}
      }
      setDeferredPrompt(null);
    } else {
      // Instrukcja dla iOS lub przeglądarek bez natywnego promptu
      alert('Aby zainstalować aplikację DELTA INFERNO:\n\n• Na iOS (Safari): kliknij ikonę Udostępnij (kwadrat ze strzałką) i wybierz "Do ekranu początkowego".\n• Na Androidzie (Chrome): wybierz menu ⋮ i "Zainstaluj aplikację".');
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('delta_pwa_dismissed_session', 'true');
      // Przypomnij za 7 dni, nie blokując kolejnych sesji
      localStorage.setItem(
        'delta_pwa_dismissed_until',
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    } catch {}
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div
      className="fixed bottom-[84px] sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-950/95 to-red-950/90 border border-amber-500/35 shadow-2xl backdrop-blur-md animate-fadeIn flex items-center gap-3 pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
        <Smartphone size={16} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-black text-white text-xs uppercase tracking-wider m-0">
            Zainstaluj DELTA GM
          </h4>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            PWA
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5 leading-tight truncate sm:whitespace-normal">
          Dodaj do ekranu — szybki dostęp offline i mecze.
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md transition-all cursor-pointer min-h-[36px]"
        >
          <Download size={12} />
          <span>Dodaj</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Zamknij powiadomienie instalacji"
          title="Zamknij"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
