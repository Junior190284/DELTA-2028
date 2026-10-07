'use client';

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, ArrowRightLeft, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface DeltaSafeTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  playerCards?: any[];
  onTradeCompleted?: () => void;
}

export const DeltaSafeTradingModal: React.FC<DeltaSafeTradingModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  userName = 'Zawodnik DELTA',
  playerCards = [],
  onTradeCompleted
}) => {
  const [selectedCardToGive, setSelectedCardToGive] = useState<any>(playerCards[0] || null);
  const [selectedPartnerName, setSelectedPartnerName] = useState('Kuba Pomocnik');
  const [requestedCardName, setRequestedCardName] = useState('Snajper DELTA');
  const [tradeStep, setTradeStep] = useState<'create' | 'confirm' | 'success'>('create');

  useEffect(() => {
    if (playerCards.length > 0 && !selectedCardToGive) {
      setSelectedCardToGive(playerCards[0]);
    }
  }, [playerCards, selectedCardToGive]);

  if (!isOpen) return null;

  const handleProposeTrade = () => {
    setTradeStep('confirm');
  };

  const handleConfirmTrade = async () => {
    try {
      const res = await fetch('/api/social/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          senderUserId: userId,
          senderUserName: userName,
          receiverUserId: 'partner_id',
          receiverUserName: selectedPartnerName,
          offeredCard: selectedCardToGive,
          requestedCard: { name: requestedCardName, overall: 80, position: 'FW' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setTradeStep('success');
        if (onTradeCompleted) onTradeCompleted();
      }
    } catch (e) {
      console.error('Trade error:', e);
    }
  };

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-lg animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base uppercase tracking-wider m-0">
                  Bezpieczna Giełda Wymian
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  1-to-1 FAIR
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0 mt-0.5">Wymieniaj duplikaty kart bez użycia pieniędzy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="v200-modal-close"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {tradeStep === 'create' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/10 text-xs text-slate-300 flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-amber-400 shrink-0" />
                <p>
                  Wymiana jest w 100% bezpieczna i wymaga akceptacji obu zawodników. Karty aktywne w Twoim składzie meczowym są chronione.
                </p>
              </div>

              {/* 1. Wybierz kartę, którą oddajesz */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Wybierz Kartę do Wymiany (Twój Duplikat):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-white/5">
                  {playerCards.map((c, i) => (
                    <button
                      key={c.id || i}
                      onClick={() => setSelectedCardToGive(c)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                        selectedCardToGive?.id === c.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900 border-white/5 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{c.title || c.name || `Karta ${i + 1}`}</span>
                      <span className="text-[10px] font-black text-amber-400">OVR {c.overall || 78}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Wybierz partnera i pożądaną kartę */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Partner Wymiany:
                  </label>
                  <select
                    value={selectedPartnerName}
                    onChange={(e) => setSelectedPartnerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-amber-500 outline-none"
                  >
                    <option value="Kuba Pomocnik">Kuba Pomocnik</option>
                    <option value="Ryszard Rybacki">Ryszard Rybacki</option>
                    <option value="Tomek Napastnik">Tomek Napastnik</option>
                    <option value="Janek Obrońca">Janek Obrońca</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Szukana Karta:
                  </label>
                  <input
                    type="text"
                    value={requestedCardName}
                    onChange={(e) => setRequestedCardName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-amber-500 outline-none"
                    placeholder="np. Skrzydłowy DELTA"
                  />
                </div>
              </div>

              <button
                onClick={handleProposeTrade}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                <ArrowRightLeft size={15} /> Przejdź do Podsumowania Wymiany
              </button>
            </div>
          )}

          {tradeStep === 'confirm' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 text-center">
                <h4 className="font-black text-white text-sm uppercase">Podwójne Potwierdzenie Transakcji</h4>
                
                <div className="grid grid-cols-3 items-center gap-2 py-2">
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs">
                    <span className="text-[10px] text-red-400 font-bold uppercase block">ODDAJESZ:</span>
                    <p className="font-black text-white truncate mt-1">
                      {selectedCardToGive?.title || selectedCardToGive?.name || 'Twoja Karta'}
                    </p>
                  </div>

                  <ArrowRightLeft size={20} className="mx-auto text-amber-400" />

                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block">OTRZYMUJESZ:</span>
                    <p className="font-black text-white truncate mt-1">{requestedCardName}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Oferta zostanie przesłana do: <strong>{selectedPartnerName}</strong>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTradeStep('create')}
                  className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs uppercase"
                >
                  Wróć
                </button>
                <button
                  onClick={handleConfirmTrade}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check size={16} /> Zatwierdź i Wyślij Ofertę
                </button>
              </div>
            </div>
          )}

          {tradeStep === 'success' && (
            <div className="py-8 text-center space-y-3 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl">
                ✓
              </div>
              <h4 className="text-base font-black text-white uppercase">Oferta Wymiany Została Złożona!</h4>
              <p className="text-xs text-slate-300">
                Powiadomienie zostało wysłane do drugiego zawodnika. Wymiana sfinalizuje się natychmiast po jego zatwierdzeniu.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => { setTradeStep('create'); onClose(); }}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase"
                >
                  Zamknij Giełdę
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
