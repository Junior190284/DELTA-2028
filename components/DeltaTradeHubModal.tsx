"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  Gift,
  ShieldCheck,
  Search,
  Zap,
  User,
  ArrowRight,
  HelpCircle,
  Lock,
  Copy
} from "lucide-react";
import { CardDefinition, UserCard, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface TradeOffer {
  id: string;
  creatorName: string;
  creatorRole: string;
  offeredCard: CardDefinition;
  requestedCardId: string;
  requestedCardName: string;
  requestedRarity?: string;
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
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"market" | "create" | "duplicates" | "directPin">("market");
  const [marketFilter, setMarketFilter] = useState<"all" | "canTrade">("all");
  const [tradedOfferId, setTradedOfferId] = useState<string | null>(null);
  const [recyclingCardId, setRecyclingCardId] = useState<string | null>(null);
  const [isRecyclingAll, setIsRecyclingAll] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Map of cards owned by the user
  const userOwnedCardsMap = useMemo(() => {
    const map = new Map<string, UserCard>();
    userCards.forEach(uc => {
      if (uc.card_id) map.set(uc.card_id, uc);
    });
    return map;
  }, [userCards]);

  // Duplicate cards list
  const duplicateCards = useMemo(() => {
    return userCards.filter(uc => uc.duplicates_count > 0 && uc.card_definition);
  }, [userCards]);

  // Total DP value of all duplicates
  const totalDuplicatesDP = useMemo(() => {
    return duplicateCards.reduce((acc, uc) => {
      const r = (uc.card_definition?.rarity || "common").toLowerCase();
      const val = r === "inferno" || r === "legendary" ? 150 : r === "epic" ? 75 : r === "rare" ? 40 : 25;
      return acc + (val * uc.duplicates_count);
    }, 0);
  }, [duplicateCards]);

  // Form for creating new trade offer
  const [giveCardId, setGiveCardId] = useState<string>(duplicateCards[0]?.card_id || userCards[0]?.card_id || "");
  const [wantCardId, setWantCardId] = useState<string>("");
  const [wantSearchQuery, setWantSearchQuery] = useState("");
  const [offerCreatedSuccess, setOfferCreatedSuccess] = useState(false);

  // Direct PIN trade state
  const [myPinCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [enteredPin, setEnteredPin] = useState("");
  const [pinCopied, setPinCopied] = useState(false);
  const [directTradeSuccess, setDirectTradeSuccess] = useState(false);

  // Initial Team Market Offers
  const [teamOffers, setTeamOffers] = useState<TradeOffer[]>([
    {
      id: "t1",
      creatorName: "Kacper M. (Kapitan)",
      creatorRole: "Obrońca · DELTA 2018",
      offeredCard: allCards.find(c => c.rarity === "epic") || allCards[2] || allCards[0],
      requestedCardId: allCards.find(c => c.rarity === "rare")?.id || allCards[0]?.id,
      requestedCardName: allCards.find(c => c.rarity === "rare")?.player?.display_name || "Napastnik DELTA (Rare)",
      requestedRarity: "rare",
      createdAt: "12 min temu"
    },
    {
      id: "t2",
      creatorName: "Leon W. (Asystent)",
      creatorRole: "Pomocnik · DELTA 2018",
      offeredCard: allCards.find(c => c.card_type === "matchday") || allCards[1] || allCards[0],
      requestedCardId: allCards.find(c => c.rarity === "epic")?.id || allCards[2]?.id,
      requestedCardName: allCards.find(c => c.rarity === "epic")?.player?.display_name || "Dowolna karta Epic DELTA",
      requestedRarity: "epic",
      createdAt: "28 min temu"
    },
    {
      id: "t3",
      creatorName: "Janek O. (Bramkarz)",
      creatorRole: "Bramkarz · DELTA 2018",
      offeredCard: allCards.find(c => c.rarity === "legendary") || allCards[0],
      requestedCardId: allCards.find(c => c.rarity === "inferno")?.id || allCards[1]?.id,
      requestedCardName: "Karta Inferno / Matchday Hero",
      requestedRarity: "inferno",
      createdAt: "1 godz. temu"
    },
    {
      id: "t4",
      creatorName: "Filip S. (Snajper)",
      creatorRole: "Napastnik · DELTA 2018",
      offeredCard: allCards.find(c => c.rarity === "rare") || allCards[3] || allCards[0],
      requestedCardId: allCards[0]?.id || "",
      requestedCardName: allCards[0]?.player?.display_name || "Karta Podstawowa DELTA",
      requestedRarity: "rare",
      createdAt: "2 godz. temu"
    }
  ]);

  // Filtered market offers
  const filteredOffers = useMemo(() => {
    if (marketFilter === "canTrade") {
      return teamOffers.filter(offer => userOwnedCardsMap.has(offer.requestedCardId));
    }
    return teamOffers;
  }, [teamOffers, marketFilter, userOwnedCardsMap]);

  // Selected card to give in trade creation
  const selectedGiveCard = useMemo(() => {
    return allCards.find(c => c.id === giveCardId) || allCards[0];
  }, [allCards, giveCardId]);

  // Selected card to want in trade creation
  const selectedWantCard = useMemo(() => {
    return allCards.find(c => c.id === wantCardId) || null;
  }, [allCards, wantCardId]);

  // Search list of cards user is looking for
  const searchWantCardsList = useMemo(() => {
    let list = allCards;
    if (wantSearchQuery.trim()) {
      const q = wantSearchQuery.toLowerCase();
      list = list.filter(c => 
        (c.player?.display_name || c.card_name || "").toLowerCase().includes(q) ||
        (c.rarity || "").toLowerCase().includes(q)
      );
    }
    return list.slice(0, 18);
  }, [allCards, wantSearchQuery]);

  // Handle accepting a trade offer
  const handleAcceptTrade = (offer: TradeOffer) => {
    setTradedOfferId(offer.id);
    cardSound.playWalkoutFanfare();
    cardSound.playHaptic("walkout");

    setTimeout(() => {
      setTeamOffers(prev => prev.filter(o => o.id !== offer.id));
      setTradedOfferId(null);
      if (onTradeComplete) onTradeComplete();
    }, 1600);
  };

  // Handle single duplicate recycling
  const handleRecycleDuplicate = async (userCardId: string, rarity: string) => {
    setRecyclingCardId(userCardId);
    cardSound.playPurchase();
    cardSound.playHaptic("medium");

    let earnedDP = 25;
    if (rarity === "inferno" || rarity === "legendary") earnedDP = 150;
    else if (rarity === "epic") earnedDP = 75;
    else if (rarity === "rare") earnedDP = 40;

    setTimeout(() => {
      setRecyclingCardId(null);
      if (onPointsEarned) onPointsEarned(earnedDP);
      if (onTradeComplete) onTradeComplete();
    }, 600);
  };

  // Handle recycling all duplicates at once
  const handleRecycleAllDuplicates = () => {
    if (totalDuplicatesDP <= 0) return;
    setIsRecyclingAll(true);
    cardSound.playWalkoutFanfare();
    cardSound.playHaptic("walkout");

    setTimeout(() => {
      setIsRecyclingAll(false);
      if (onPointsEarned) onPointsEarned(totalDuplicatesDP);
      if (onTradeComplete) onTradeComplete();
    }, 1200);
  };

  // Handle creating a new trade offer
  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giveCardId || !selectedWantCard) return;

    const newOffer: TradeOffer = {
      id: "user-" + Date.now(),
      creatorName: "Twoja Oferta",
      creatorRole: "Twój Skład · DELTA 2018",
      offeredCard: selectedGiveCard,
      requestedCardId: selectedWantCard.id,
      requestedCardName: selectedWantCard.player?.display_name || selectedWantCard.card_name,
      requestedRarity: selectedWantCard.rarity,
      createdAt: "Przed chwilą"
    };

    setTeamOffers(prev => [newOffer, ...prev]);
    setOfferCreatedSuccess(true);
    cardSound.playFlip();
    cardSound.playHaptic("heavy");

    setTimeout(() => {
      setOfferCreatedSuccess(false);
      setActiveTab("market");
    }, 1000);
  };

  // Handle Direct PIN submit
  const handleDirectPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.length < 4) return;

    setDirectTradeSuccess(true);
    cardSound.playWalkoutFanfare();
    cardSound.playHaptic("walkout");

    setTimeout(() => {
      setDirectTradeSuccess(false);
      setEnteredPin("");
      if (onTradeComplete) onTradeComplete();
    }, 1800);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(myPinCode);
    setPinCopied(true);
    cardSound.playHaptic("light");
    setTimeout(() => setPinCopied(false), 2000);
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div 
      className="v200-trade-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="v200-trade-sheet animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* ================= 1. BROADCAST HEADER ================= */}
        <div className="v200-trade-header-bar">
          <div className="header-left">
            <div className="v200-trade-badge-crest">
              <ArrowLeftRight size={22} className="text-yellow-400" />
            </div>
            <div>
              <div className="v200-arena-eyebrow">
                <Sparkles size={12} className="text-yellow-400 inline mr-1" />
                DELTA TEAM EXCHANGE & BARTER MARKET · SEZON 2026
              </div>
              <h2 className="v200-trade-title">KLUBOWA GIEŁDA WYMIANY KART</h2>
            </div>
          </div>

          <div className="header-right">
            {/* User Vault Pill */}
            <div className="v200-trade-vault-pill">
              <Coins size={14} className="text-yellow-400" />
              <span>SKARBIEC: <strong>{deltaPoints} DP</strong></span>
            </div>

            <button 
              type="button" 
              onClick={onClose}
              className="v200-trade-close-circle"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ================= 2. CONCEPT EXPLANATION BANNER ================= */}
        <div className="v200-trade-explainer-banner">
          <div className="explainer-icon">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div className="explainer-text">
            <strong>100% BEZPIECZNA & DARMOWA WYMIANA 1:1 W SZATNI:</strong>
            <p>Wymieniaj swoje powtórki kart bezpośrednio z kolegami z drużyny. Bez mikropłatności – czysty barter fair-play, by wspólnie skompletować cały album DELTA 2018!</p>
          </div>
        </div>

        {/* ================= 3. NAVIGATION TABS ================= */}
        <div className="v200-trade-nav-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("market")}
            className={`trade-nav-item ${activeTab === "market" ? "active" : ""}`}
          >
            <ArrowLeftRight size={15} />
            <span className="tab-main-label">Tablica Szatni</span>
            <span className="tab-count-badge">{teamOffers.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`trade-nav-item ${activeTab === "create" ? "active" : ""}`}
          >
            <PlusCircle size={15} />
            <span className="tab-main-label">Wystaw Własną Ofertę</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("duplicates")}
            className={`trade-nav-item ${activeTab === "duplicates" ? "active" : ""}`}
          >
            <Coins size={15} />
            <span className="tab-main-label">Kantor Powtórek</span>
            {duplicateCards.length > 0 && <span className="tab-count-badge gold">+{duplicateCards.length}</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("directPin")}
            className={`trade-nav-item ${activeTab === "directPin" ? "active" : ""}`}
          >
            <KeyRound size={15} />
            <span className="tab-main-label">Kod PIN na Treningu</span>
          </button>
        </div>

        {/* ================= 4. TAB CONTENTS ================= */}
        <div className="v200-trade-body-container">
          {/* ========================================================================= */}
          {/* TAB 1: TEAM MARKET OFFERS */}
          {/* ========================================================================= */}
          {activeTab === "market" && (
            <div className="v200-market-view animate-fadeIn">
              {/* Filter Sub-bar */}
              <div className="market-filter-subbar">
                <span className="filter-label">Filtruj oferty:</span>
                <div className="filter-buttons">
                  <button
                    type="button"
                    onClick={() => setMarketFilter("all")}
                    className={`filter-btn ${marketFilter === "all" ? "active" : ""}`}
                  >
                    Wszystkie Oferty ({teamOffers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketFilter("canTrade")}
                    className={`filter-btn ${marketFilter === "canTrade" ? "active" : ""}`}
                  >
                    ✅ Mogę Wymienić (Mam Kartę)
                  </button>
                </div>
              </div>

              {/* Offers Grid */}
              <div className="v200-barter-offers-grid">
                {filteredOffers.length === 0 ? (
                  <div className="v200-empty-market-box">
                    <AlertCircle size={36} className="text-yellow-500 mb-2" />
                    <h4>Brak ofert spełniających kryteria</h4>
                    <p>Zmień filtr lub bądź pierwszy i wystaw swoją kartę na giełdę drużyny!</p>
                  </div>
                ) : (
                  filteredOffers.map(offer => {
                    const isAccepting = tradedOfferId === offer.id;
                    const hasRequestedCard = userOwnedCardsMap.has(offer.requestedCardId);
                    const userCardOwned = userOwnedCardsMap.get(offer.requestedCardId);

                    return (
                      <div key={offer.id} className="v200-barter-card-box">
                        {/* Offer Header */}
                        <div className="barter-header">
                          <div className="barter-creator">
                            <div className="creator-avatar">
                              <User size={13} />
                            </div>
                            <div>
                              <strong>{offer.creatorName}</strong>
                              <small>{offer.creatorRole}</small>
                            </div>
                          </div>
                          <span className="barter-time">
                            <Clock size={11} /> {offer.createdAt}
                          </span>
                        </div>

                        {/* Barter 1:1 Stage */}
                        <div className="barter-stage-row">
                          {/* Left: What you get */}
                          <div className="barter-item left">
                            <span className="item-direction-tag get">OTRZYMASZ:</span>
                            <div className="barter-card-preview">
                              <div className="mini-card-head">
                                <span className="mini-ovr">{offer.offeredCard.rarity === 'inferno' ? 95 : offer.offeredCard.rarity === 'legendary' ? 90 : 84}</span>
                                <span className="mini-rarity">{offer.offeredCard.rarity?.toUpperCase()}</span>
                              </div>
                              <strong>{offer.offeredCard.player?.display_name || offer.offeredCard.card_name}</strong>
                              <small>DELTA 2018</small>
                            </div>
                          </div>

                          {/* Center: Exchange Icon */}
                          <div className="barter-center-icon">
                            <div className="exchange-circle">
                              <ArrowLeftRight size={18} className="text-yellow-400 animate-pulse" />
                            </div>
                            <span className="exchange-label">1 : 1</span>
                          </div>

                          {/* Right: What you give */}
                          <div className="barter-item right">
                            <span className="item-direction-tag give">ODDAJESZ:</span>
                            <div className={`barter-card-preview requirement ${hasRequestedCard ? 'owned' : 'missing'}`}>
                              <div className="mini-card-head">
                                <span className={`status-pill ${hasRequestedCard ? 'success' : 'missing'}`}>
                                  {hasRequestedCard ? "✅ MASZ W ALBUMIE" : "🔒 BRAK W ALBUMIE"}
                                </span>
                              </div>
                              <strong>{offer.requestedCardName}</strong>
                              <small>{hasRequestedCard ? `Posiadasz: ${(userCardOwned?.duplicates_count || 0) + 1} szt.` : "Nie posiadasz tej karty"}</small>
                            </div>
                          </div>
                        </div>

                        {/* Action CTA Button */}
                        <div className="barter-action-footer">
                          {hasRequestedCard ? (
                            <button
                              type="button"
                              onClick={() => handleAcceptTrade(offer)}
                              disabled={isAccepting}
                              className={`barter-accept-btn ${isAccepting ? "accepted" : ""}`}
                            >
                              {isAccepting ? (
                                <>
                                  <CheckCircle2 size={16} className="text-green-400" />
                                  <span>WYMIANA ZAAKCEPTOWANA! KARTA W ALBUMIE</span>
                                </>
                              ) : (
                                <>
                                  <ArrowLeftRight size={16} />
                                  <span>ZAAKCEPTUJ WYMIANĘ 1:1</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="barter-disabled-notice">
                              <Lock size={13} className="text-slate-400" />
                              <span>Brak wymaganej karty w Twojej kolekcji</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CREATE TRADE OFFER */}
          {/* ========================================================================= */}
          {activeTab === "create" && (
            <div className="v200-create-view animate-fadeIn">
              <form onSubmit={handleCreateOffer} className="v200-create-trade-studio">
                <div className="studio-instructions">
                  <h3>KREATOR OFERTY WYMIANY DLA SZATNI</h3>
                  <p>Wybierz kartę, którą chcesz oddać oraz wskaż dokładnie kartę, której brakuje w Twojej kolekcji.</p>
                </div>

                <div className="studio-two-columns">
                  {/* Step 1: Select Card to Give */}
                  <div className="studio-col left">
                    <div className="step-header">
                      <span className="step-badge">KROK 1</span>
                      <strong>WYBIERZ KARTĘ, KTÓRĄ ODDAJESZ:</strong>
                    </div>

                    <div className="studio-card-selector-box">
                      <label>Karty z Twojej kolekcji (w tym powtórki):</label>
                      <select
                        value={giveCardId}
                        onChange={e => setGiveCardId(e.target.value)}
                        className="studio-select-input"
                        required
                      >
                        {userCards.map(uc => (
                          <option key={`give_${uc.id}`} value={uc.card_id}>
                            {uc.card_definition?.player?.display_name || uc.card_definition?.card_name} ({uc.card_definition?.rarity?.toUpperCase()}) {uc.duplicates_count > 0 ? `· +${uc.duplicates_count} powtórek` : ''}
                          </option>
                        ))}
                      </select>

                      <div className="preview-chosen-card">
                        <span className="preview-tag">Podgląd karty do oddania:</span>
                        <div className="card-mini-box">
                          <div className="card-mini-header">
                            <span className="badge-ovr">{selectedGiveCard?.rarity === 'inferno' ? 95 : 85}</span>
                            <span className="badge-rarity">{selectedGiveCard?.rarity?.toUpperCase()}</span>
                          </div>
                          <h4>{selectedGiveCard?.player?.display_name || selectedGiveCard?.card_name}</h4>
                          <small>DELTA 2018 GM</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Select Card you Want */}
                  <div className="studio-col right">
                    <div className="step-header">
                      <span className="step-badge">KROK 2</span>
                      <strong>WSKAŻ KARTĘ, KTÓREJ SZUKASZ:</strong>
                    </div>

                    <div className="studio-card-selector-box">
                      <div className="search-want-input-wrap">
                        <Search size={14} className="text-slate-400" />
                        <input
                          type="text"
                          placeholder="Szukaj karty z albumu (np. Ryszard, Inferno...)"
                          value={wantSearchQuery}
                          onChange={e => setWantSearchQuery(e.target.value)}
                          className="studio-search-field"
                        />
                      </div>

                      <div className="want-cards-scroll-grid">
                        {searchWantCardsList.map(c => (
                          <button
                            key={`want_${c.id}`}
                            type="button"
                            onClick={() => setWantCardId(c.id)}
                            className={`want-card-item-btn ${wantCardId === c.id ? 'active' : ''}`}
                          >
                            <div className="want-meta">
                              <strong>{c.player?.display_name || c.card_name}</strong>
                              <small>{c.rarity?.toUpperCase()}</small>
                            </div>
                            {wantCardId === c.id && <Check size={14} className="text-yellow-400" />}
                          </button>
                        ))}
                      </div>

                      {selectedWantCard && (
                        <div className="preview-chosen-card want">
                          <span className="preview-tag">Poszukiwana karta:</span>
                          <div className="card-mini-box want">
                            <div className="card-mini-header">
                              <span className="badge-ovr">{selectedWantCard.rarity === 'inferno' ? 95 : 85}</span>
                              <span className="badge-rarity">{selectedWantCard.rarity?.toUpperCase()}</span>
                            </div>
                            <h4>{selectedWantCard.player?.display_name || selectedWantCard.card_name}</h4>
                            <small>Zostanie wpisana jako wymóg</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="studio-submit-bar">
                  <button
                    type="submit"
                    disabled={!giveCardId || !selectedWantCard || offerCreatedSuccess}
                    className="studio-publish-btn"
                  >
                    {offerCreatedSuccess ? (
                      <>
                        <CheckCircle2 size={18} className="text-green-400" />
                        <span>OFERTA OPUBLIKOWANA W SZATNI!</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>OPUBLIKUJ OFERTĘ NA TABLICY SZATNI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: DUPLICATES & RECYCLING VAULT */}
          {/* ========================================================================= */}
          {activeTab === "duplicates" && (
            <div className="v200-duplicates-view animate-fadeIn">
              {/* Vault Overview Card */}
              <div className="v200-vault-summary-card">
                <div className="summary-left">
                  <Coins size={32} className="text-yellow-400" />
                  <div>
                    <h3>KLUBOWY KANTOR RECYKLINGU POWTÓREK</h3>
                    <p>Nie masz z kim wymienić powtórki? Zamień ją na cenne Delta Points do skarbca i otwieraj kolejne paczki!</p>
                  </div>
                </div>

                <div className="summary-right">
                  <div className="vault-stats-box">
                    <small>ŁĄCZNIE POWTÓREK</small>
                    <strong>{duplicateCards.reduce((acc, c) => acc + c.duplicates_count, 0)} szt.</strong>
                  </div>

                  {totalDuplicatesDP > 0 && (
                    <button
                      type="button"
                      onClick={handleRecycleAllDuplicates}
                      disabled={isRecyclingAll}
                      className="recycle-all-btn"
                    >
                      <Zap size={16} />
                      <span>ZAMIEŃ WSZYSTKO NA +{totalDuplicatesDP} DP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Duplicates Grid */}
              {duplicateCards.length === 0 ? (
                <div className="v200-empty-market-box">
                  <Coins size={40} className="text-slate-600 mb-2" />
                  <h4>Brak powtórek w Twojej kolekcji</h4>
                  <p>Gdy trafisz powtórkę z paczki, pojawi się tutaj z możliwością natychmiastowej wymiany na punkty DP!</p>
                </div>
              ) : (
                <div className="v200-duplicates-grid">
                  {duplicateCards.map(uc => {
                    const isRecycling = recyclingCardId === uc.id;
                    const rarity = (uc.card_definition?.rarity || "common").toLowerCase();
                    const dpValue = rarity === "inferno" || rarity === "legendary" ? 150 : rarity === "epic" ? 75 : rarity === "rare" ? 40 : 25;

                    return (
                      <div key={uc.id} className="v200-dup-card-slot">
                        <div className="dup-badge">
                          +{uc.duplicates_count} powtórka
                        </div>

                        <div className="dup-card-meta">
                          <span className="dup-rarity-pill">{rarity.toUpperCase()}</span>
                          <h4>{uc.card_definition?.player?.display_name || uc.card_definition?.card_name}</h4>
                          <small>DELTA 2018 GM</small>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRecycleDuplicate(uc.id, rarity)}
                          disabled={isRecycling}
                          className="dup-recycle-btn"
                        >
                          <Coins size={14} /> Zamień na +{dpValue} DP
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: DIRECT PIN EXCHANGE */}
          {/* ========================================================================= */}
          {activeTab === "directPin" && (
            <div className="v200-pin-view animate-fadeIn">
              <div className="v200-pin-dual-stage">
                {/* Panel 1: Your PIN */}
                <div className="pin-panel-box left">
                  <div className="pin-panel-head">
                    <KeyRound size={22} className="text-yellow-400" />
                    <div>
                      <h4>TWÓJ KOD PIN DO WYMIANY:</h4>
                      <small>Podaj ten 4-cyfrowy kod koledze stojącemu obok Ciebie na treningu</small>
                    </div>
                  </div>

                  <div className="pin-display-big">
                    {myPinCode.split("").map((digit, idx) => (
                      <span key={idx} className="pin-digit-box">{digit}</span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="pin-copy-btn"
                  >
                    {pinCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{pinCopied ? "SKOPIOWANO KOD!" : "KOPIUJ KOD PIN"}</span>
                  </button>
                </div>

                {/* Panel 2: Enter Partner PIN */}
                <div className="pin-panel-box right">
                  <div className="pin-panel-head">
                    <ArrowLeftRight size={22} className="text-emerald-400" />
                    <div>
                      <h4>WPISZ KOD PIN KOLEGI:</h4>
                      <small>Wprowadź 4 cyfry otrzymane od partnera z drużyny</small>
                    </div>
                  </div>

                  <form onSubmit={handleDirectPinSubmit} className="pin-entry-form">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="0 0 0 0"
                      value={enteredPin}
                      onChange={e => setEnteredPin(e.target.value.replace(/[^0-9]/g, ""))}
                      className="pin-input-big"
                    />

                    <button
                      type="submit"
                      disabled={enteredPin.length < 4 || directTradeSuccess}
                      className="pin-confirm-btn"
                    >
                      {directTradeSuccess ? (
                        <>
                          <CheckCircle2 size={18} className="text-green-400" />
                          <span>WYMIANA 1:1 SFINALIZOWANA!</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeftRight size={16} />
                          <span>ZATWIERDŹ I WYMIEŃ KARTĘ</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
