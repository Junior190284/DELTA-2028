"use client";

import React, { useState } from "react";
import { 
  ArrowLeftRight, 
  Sparkles, 
  Coins, 
  Check, 
  X, 
  Flame, 
  Crown, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { CardDefinition, UserCard } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface TradeOffer {
  id: string;
  creatorName: string;
  offeredCard: CardDefinition;
  requestedCardName: string;
  createdAt: string;
}

interface DeltaTradeHubModalProps {
  userCards: UserCard[];
  allCards: CardDefinition[];
  deltaPoints: number;
  onClose: () => void;
  onTradeComplete?: () => void;
}

export default function DeltaTradeHubModal({
  userCards,
  allCards,
  deltaPoints,
  onClose,
  onTradeComplete
}: DeltaTradeHubModalProps) {
  const [activeTab, setActiveTab] = useState<"market" | "duplicates">("market");
  const [tradedOfferId, setTradedOfferId] = useState<string | null>(null);
  const [recyclingCardId, setRecyclingCardId] = useState<string | null>(null);

  // Filter duplicate cards
  const duplicateCards = userCards.filter(uc => uc.duplicates_count > 0);

  // Mock club trade market offers from teammates
  const [teamOffers, setTeamOffers] = useState<TradeOffer[]>([
    {
      id: "t1",
      creatorName: "Kacper (Obrońca)",
      offeredCard: allCards.find(c => c.rarity === "rare") || allCards[0],
      requestedCardName: "Ryszard (Gold / Inferno)",
      createdAt: "10 min temu"
    },
    {
      id: "t2",
      creatorName: "Leon (Pomocnik)",
      offeredCard: allCards.find(c => c.card_type === "matchday") || allCards[1] || allCards[0],
      requestedCardName: "Dowolna karta Epic / Gold",
      createdAt: "25 min temu"
    },
    {
      id: "t3",
      creatorName: "Janek (Bramkarz)",
      offeredCard: allCards.find(c => c.rarity === "epic") || allCards[2] || allCards[0],
      requestedCardName: "Karta Obrońcy DELTA",
      createdAt: "1 godz. temu"
    }
  ]);

  const handleAcceptTrade = (offerId: string) => {
    setTradedOfferId(offerId);
    cardSound.playWalkoutFanfare();
    setTimeout(() => {
      setTeamOffers(prev => prev.filter(o => o.id !== offerId));
      setTradedOfferId(null);
      if (onTradeComplete) onTradeComplete();
    }, 1800);
  };

  const handleRecycleDuplicate = async (userCardId: string) => {
    setRecyclingCardId(userCardId);
    cardSound.playFlip();
    setTimeout(() => {
      setRecyclingCardId(null);
      if (onTradeComplete) onTradeComplete();
    }, 1000);
  };

  return (
    <div className="v200-trade-backdrop" onClick={onClose}>
      <div className="v200-trade-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-trade-header">
          <div className="v200-trade-title-group">
            <div className="v200-trade-badge">
              <ArrowLeftRight size={16} className="text-yellow-400" />
              <span>DELTA TEAM MARKET</span>
            </div>
            <h2>GIEŁDA WYMIANY KART W DRUŻYNIE</h2>
            <p>Wymieniaj karty z kolegami z szatni lub zamieniaj duplikaty na punkty Delta Points!</p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="v200-trade-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="v200-trade-tabs-row">
          <button
            type="button"
            onClick={() => setActiveTab("market")}
            className={`v200-trade-tab-btn ${activeTab === "market" ? "active" : ""}`}
          >
            <ArrowLeftRight size={15} />
            <span>OFERTY W SZATNI ({teamOffers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("duplicates")}
            className={`v200-trade-tab-btn ${activeTab === "duplicates" ? "active" : ""}`}
          >
            <Coins size={15} />
            <span>TWOJE DUPLIKATY ({duplicateCards.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: TEAM MARKET OFFERS ================= */}
        {activeTab === "market" && (
          <div className="v200-trade-market-grid">
            {teamOffers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 col-span-full">
                Brak aktywnych ofert w szatni. Wróć za chwilę lub wystaw swój duplikat!
              </div>
            ) : (
              teamOffers.map(offer => {
                const isAccepting = tradedOfferId === offer.id;

                return (
                  <div key={offer.id} className="v200-trade-offer-card">
                    {/* Teammate Header */}
                    <div className="v200-trade-offer-top">
                      <span className="v200-trade-creator font-black text-white text-sm">
                        {offer.creatorName}
                      </span>
                      <span className="v200-trade-time text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={11} /> {offer.createdAt}
                      </span>
                    </div>

                    {/* Trade Card Preview */}
                    <div className="v200-trade-offer-body">
                      <div className="v200-trade-card-wrap">
                        <CollectibleCard3D
                          card={offer.offeredCard}
                          isLocked={false}
                          size="sm"
                          interactive={false}
                          showFlip={false}
                        />
                      </div>

                      <div className="v200-trade-req-info">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">ODDAJE POWYŻSZĄ KARTĘ ZA:</span>
                        <span className="text-sm font-extrabold text-yellow-400 block mt-1">
                          {offer.requestedCardName}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAcceptTrade(offer.id)}
                          disabled={isAccepting}
                          className={`v200-trade-accept-btn ${isAccepting ? "accepted" : ""}`}
                        >
                          {isAccepting ? (
                            <>
                              <CheckCircle2 size={16} className="text-green-400" />
                              <span>WYMIANA ZAAKCEPTOWANA!</span>
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight size={15} />
                              <span>WYMIEŃ KARTĘ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= TAB 2: USER DUPLICATES & RECYCLING ================= */}
        {activeTab === "duplicates" && (
          <div className="v200-trade-dups-section">
            {duplicateCards.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Coins size={40} className="mx-auto text-slate-600 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Brak duplikatów w kolekcji</h4>
                <p className="text-sm text-slate-400">Gdy trafisz powtórkę w paczce, pojawi się tutaj. Będziesz mógł wymienić ją na giełdzie lub zamienić na punkty DP!</p>
              </div>
            ) : (
              <div className="v200-trade-dups-grid">
                {duplicateCards.map(uc => {
                  const isRecycling = recyclingCardId === uc.id;

                  return (
                    <div key={uc.id} className="v200-dup-item-card">
                      <CollectibleCard3D
                        card={uc.card_definition}
                        userCard={uc}
                        isLocked={false}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                      />

                      <div className="v200-dup-actions">
                        <span className="text-xs text-green-400 font-bold">
                          Posiadasz: +{uc.duplicates_count} duplikatów
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRecycleDuplicate(uc.id)}
                          disabled={isRecycling}
                          className="v200-dup-recycle-btn"
                        >
                          <Coins size={14} /> Zamień duplikat na +50 DP
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
