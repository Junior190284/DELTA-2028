'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const DeltaOfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white text-xs font-black py-2 px-4 shadow-xl flex items-center justify-center gap-2 animate-fadeIn">
      <WifiOff size={15} />
      <span>Brak połączenia z internetem — aplikacja działa w trybie offline.</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-2 px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 text-white font-bold flex items-center gap-1 transition-all"
      >
        <RefreshCw size={11} /> Odśwież
      </button>
    </div>
  );
};
