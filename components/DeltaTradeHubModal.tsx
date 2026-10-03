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
  AlertCircle,
  PlusCircle,
  KeyRound,
  RefreshCw,
  Send,
  Gift
} from "lucide-react";
import { CardDefinition, UserCard, RARITY_CONFIG } from "@/lib/cards/types";
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
  onPointsEarned?: (points: number) => void;
}

export default function DeltaTradeHubModal({
  userCards,
  allCards,
  deltaPoints,
  onClose,
  onTradeComplete,
  onPointsEarned
}: DeltaTradeHubModalProps) {
  const [activeTab, setActiveTab] = useState<"market" | "create" | "duplicates" | "directPin">("market");
  const [tradedOfferId, setTradedOfferId] = useState<string | null>(null);
  const [recyclingCardId, setRecyclingCardId] = useState<string | null>(null);

  // Form for creating new trade offer
  const [selectedOfferCardId, setSelectedOfferCardId] = useState<string>("");
  const [requestedPlayerName, setRequestedPlayerName] = useState("");
  const [offerCreatedSuccess, setOfferCreatedSuccess] = useState(false);

  // Direct PIN trade
  const [pinCode, setPinCode] = useState("");
  const [directTradeSuccess, setDirectTradeSuccess] = useState(false);

  // Filter duplicate cards
  const duplicateCards = userCards.filter(uc => uc.duplicates_count > 0);

  // Teammate market offers
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
    },
    {
      id: "t4",
      creatorName: "Filip (Napastnik)",
      offeredCard: allCards.find(c => c.card_type === "goal_hunter") || allCards[3] || allCards[0],
      requestedCardName: "Karta Matchday DELTA 2018",
      createdAt: "2 godz. temu"
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

  const handleRecycleDuplicate = async (userCardId: string, rarity: string) => {
    setRecyclingCardId(userCardId);
    cardSound.playPurchase();

    let earnedDP = 25;
    if (rarity === "inferno" || rarity === "legendary") earnedDP = 150;
    else if (rarity === "epic") earnedDP = 75;
    else if (rarity === "rare") earnedDP = 40;

    setTimeout(() => {
      setRecyclingCardId(null);
      if (onPointsEarned) onPointsEarned(earnedDP);
      if (onTradeComplete) onTradeComplete();
    }, 800);
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferCardId || !requestedPlayerName.trim()) return;

    const targetCard = allCards.find(c => c.id === selectedOfferCardId) || allCards[0];
    const newOffer: TradeOffer = {
      id: "user-" + Date.now(),
      creatorName: "Twoja Oferta",
      offeredCard: targetCard,
      requestedCardName: requestedPlayerName.trim(),
      createdAt: "Przed chwilą"
    };

    setTeamOffers(prev => [newOffer, ...prev]);
    setOfferCreatedSuccess(true);
    cardSound.playFlip();

    setTimeout(() => {
      setOfferCreatedSuccess(false);
      setSelectedOfferCardId("");
      setRequestedPlayerName("");
      setActiveTab("market");
    }, 1200);
  };

  const handleDirectPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length < 4) return;

    setDirectTradeSuccess(true);
    cardSound.playWalkoutFanfare();

    setTimeout(() => {
      setDirectTradeSuccess(false);
      setPinCode("");
      if (onTradeComplete) onTradeComplete();
    }, 2000);
  };

  return (
    <div className="v200-trade-backdrop" onClick={onClose}>
      <div className="v200-trade-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-trade-header">
          <div className="v200-trade-title-group">
            <div className="v200-trade-badge">
              <ArrowLeftRight size={16} className="text-yellow-400" />
              <span>DELTA TEAM MARKET & TRADE HUB</span>
            </div>
            <h2>GIEŁDA WYMIANY KART W DRUŻYNIE</h2>
            <p>Wymieniaj karty 1:1 z kolegami z szatni, wystawiaj oferty lub zamieniaj powtórki na punkty Delta Points!</p>
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
            onClick={() => setActiveTab("create")}
            className={`v200-trade-tab-btn ${activeTab === "create" ? "active" : ""}`}
          >
            <PlusCircle size={15} />
            <span>WYSTAW KARTĘ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("duplicates")}
            className={`v200-trade-tab-btn ${activeTab === "duplicates" ? "active" : ""}`}
          >
            <Coins size={15} />
            <span>KANTOR DP ({duplicateCards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("directPin")}
            className={`v200-trade-tab-btn ${activeTab === "directPin" ? "active" : ""}`}
          >
            <KeyRound size={15} />
            <span>KOD PIN 1:1</span>
          </button>
        </div>

        {/* ================= TAB 1: TEAM MARKET OFFERS ================= */}
        {activeTab === "market" && (
          <div className="v200-trade-market-grid">
            {teamOffers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 col-span-full">
                Brak aktywnych ofert w szatni. Bądź pierwszy i wystaw swoją kartę na wymianę!
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">ODDAJE KARTĘ W ZAMIAN ZA:</span>
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
                              <span>WYMIEŃ 1:1</span>
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

        {/* ================= TAB 2: CREATE TRADE OFFER ================= */}
        {activeTab === "create" && (
          <div className="v200-trade-create-section">
            <form onSubmit={handleCreateOffer} className="v200-trade-create-form">
              <h4 className="text-sm font-extrabold text-yellow-400 uppercase mb-3 flex items-center gap-1">
                <Sparkles size={16} /> Wystaw swoją kartę na giełdę drużyny
              </h4>

              <div className="v200-form-group">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  1. Wybierz kartę ze swojej kolekcji do oddania:
                </label>
                <select
                  value={selectedOfferCardId}
                  onChange={e => setSelectedOfferCardId(e.target.value)}
                  className="v200-trade-select-input"
                  required
                >
                  <option value="">-- Wybierz kartę do wymiany --</option>
                  {allCards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.player?.display_name || c.card_name} ({c.rarity.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="v200-form-group">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  2. Czego szukasz w zamian? (np. nazwisko zawodnika lub rzadkość):
                </label>
                <input
                  type="text"
                  placeholder="np. Karta Ryszard (Inferno) lub dowolna karta Matchday"
                  value={requestedPlayerName}
                  onChange={e => setRequestedPlayerName(e.target.value)}
                  className="v200-trade-text-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={offerCreatedSuccess || !selectedOfferCardId || !requestedPlayerName.trim()}
                className="v200-trade-submit-btn"
              >
                {offerCreatedSuccess ? (
                  <>
                    <Check size={16} className="text-green-400" /> OFERTA ZOSTAŁA OPUBLIKOWANA!
                  </>
                ) : (
                  <>
                    <Send size={16} /> WYSTAW OFERTĘ NA GIEŁDZIE
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 3: USER DUPLICATES & RECYCLING ================= */}
        {activeTab === "duplicates" && (
          <div className="v200-trade-dups-section">
            {duplicateCards.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Coins size={40} className="mx-auto text-slate-600 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Brak duplikatów w kolekcji</h4>
                <p className="text-sm text-slate-400">Gdy trafisz powtórkę w paczce, pojawi się tutaj. Będziesz mógł zamienić ją na natychmiastowe punkty DP do skarbca!</p>
              </div>
            ) : (
              <div className="v200-trade-dups-grid">
                {duplicateCards.map(uc => {
                  const isRecycling = recyclingCardId === uc.id;
                  const rarity = (uc.card_definition?.rarity || "common").toLowerCase();
                  const dpValue = rarity === "inferno" || rarity === "legendary" ? 150 : rarity === "epic" ? 75 : rarity === "rare" ? 40 : 25;

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
                          Posiadasz: +{uc.duplicates_count} powtórek
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRecycleDuplicate(uc.id, rarity)}
                          disabled={isRecycling}
                          className="v200-dup-recycle-btn"
                        >
                          <Coins size={14} /> Zamień na +{dpValue} DP
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: DIRECT PIN EXCHANGE ================= */}
        {activeTab === "directPin" && (
          <div className="v200-trade-pin-section">
            <div className="v200-pin-card-box">
              <KeyRound size={36} className="text-yellow-400 mb-2" />
              <h4 className="text-base font-extrabold text-white">Szybka wymiana na żywo w szatni</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto mb-4">
                Wpisz 4-cyfrowy kod PIN otrzymany od kolegi z drużyny podczas treningu, aby natychmiast sfinalizować bezpieczną wymianę kart 1:1.
              </p>

              <form onSubmit={handleDirectPinSubmit} className="v200-pin-form">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="0 0 0 0"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className="v200-pin-input-field"
                />

                <button
                  type="submit"
                  disabled={pinCode.length < 4 || directTradeSuccess}
                  className="v200-pin-submit-btn"
                >
                  {directTradeSuccess ? (
                    <>
                      <CheckCircle2 size={18} className="text-green-400" />
                      <span>KARTY WYMIENIONE POMYŚLNIE!</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight size={16} />
                      <span>ZATWIERDŹ KOD I WYMIEŃ</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
