"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  Bookmark, 
  Layers, 
  ArrowLeftRight, 
  Gift, 
  Eye, 
  Flame, 
  Crown, 
  Star, 
  Maximize2,
  Grid,
  BookOpen
} from "lucide-react";
import { CardDefinition, UserCard, CardLayoutConfig } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

export interface PlayerAlbumData {
  player: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
    photo_path?: string | null;
  };
  cards: CardDefinition[];
  ownedCount: number;
  topOwnedCard: CardDefinition | null;
  completionRate: number;
}

interface Panini3DAlbumBinderProps {
  playerAlbums: PlayerAlbumData[];
  ownedCardsMap: Map<string, UserCard>;
  allCards: CardDefinition[];
  deltaPoints: number;
  paniniRewardClaimed: boolean;
  onInspectCard: (card: CardDefinition, userCard: UserCard | null) => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenPacks?: () => void;
  onOpenSBC?: () => void;
  onOpenTradeHub?: () => void;
  onClaimPaniniReward?: () => void;
  getLayoutForCard?: (card?: CardDefinition) => Partial<CardLayoutConfig> | undefined;
}

type BinderTab = "all" | "defense" | "midfield" | "attack" | "specials";

export default function Panini3DAlbumBinder({
  playerAlbums,
  ownedCardsMap,
  allCards,
  deltaPoints,
  paniniRewardClaimed,
  onInspectCard,
  onSelectPlayer,
  onOpenPacks,
  onOpenSBC,
  onOpenTradeHub,
  onClaimPaniniReward,
  getLayoutForCard
}: Panini3DAlbumBinderProps) {
  const [currentPageSpread, setCurrentPageSpread] = useState(0); // 0 = spread 1-2, 1 = spread 3-4, etc.
  const [activeTab, setActiveTab] = useState<BinderTab>("all");
  const [isFlipping, setIsFlipping] = useState<"next" | "prev" | null>(null);
  const [viewMode, setViewMode] = useState<"book3d" | "grid">("book3d");
  const [recentlyStuckPlayerId, setRecentlyStuckPlayerId] = useState<string | null>(null);

  // Group players by position / category for authentic Panini spreads
  const categorizedSpreads = useMemo(() => {
    // 4 cards per page -> 8 cards per double spread
    const goalkeepersAndDefenders = playerAlbums.filter(a => {
      const pos = (a.player.position || "").toUpperCase();
      return pos.includes("BR") || pos.includes("BRAMK") || pos.includes("OBR") || pos.includes("DEF") || pos.includes("BOK");
    });

    const midfielders = playerAlbums.filter(a => {
      const pos = (a.player.position || "").toUpperCase();
      return (pos.includes("POM") || pos.includes("MID") || pos.includes("ŚR") || pos.includes("SKR")) && !goalkeepersAndDefenders.includes(a);
    });

    const attackers = playerAlbums.filter(a => {
      const pos = (a.player.position || "").toUpperCase();
      return (pos.includes("NAP") || pos.includes("ATT") || pos.includes("ATK") || pos.includes("SNAJP")) || 
        (!goalkeepersAndDefenders.includes(a) && !midfielders.includes(a));
    });

    // Fallback if empty
    const allOrdered = [...goalkeepersAndDefenders, ...midfielders, ...attackers];
    const leftOvers = playerAlbums.filter(a => !allOrdered.includes(a));
    const fullTeam = [...allOrdered, ...leftOvers];

    // Split into 4 cards per page (8 cards per double spread)
    const CARDS_PER_SPREAD = 8;
    const spreads: {
      id: number;
      titleLeft: string;
      titleRight: string;
      leftPagePlayers: PlayerAlbumData[];
      rightPagePlayers: PlayerAlbumData[];
    }[] = [];

    const totalSpreads = Math.max(1, Math.ceil(fullTeam.length / CARDS_PER_SPREAD));

    for (let i = 0; i < totalSpreads; i++) {
      const start = i * CARDS_PER_SPREAD;
      const spreadPlayers = fullTeam.slice(start, start + CARDS_PER_SPREAD);
      const leftPage = spreadPlayers.slice(0, 4);
      const rightPage = spreadPlayers.slice(4, 8);

      let titleL = `KADRA 2018 GM · CZĘŚĆ ${i * 2 + 1}`;
      let titleR = `KADRA 2018 GM · CZĘŚĆ ${i * 2 + 2}`;

      if (i === 0) {
        titleL = "BRAMKARZE & DEFENSYWA";
        titleR = "FORMACJA OBRONNA & BOKI";
      } else if (i === 1) {
        titleL = "ŚRODEK POLA & ROZEGRANIE";
        titleR = "SKRZYDŁA & MOTOR OFENSYWY";
      } else if (i === 2) {
        titleL = "LINIA ATAKU & STRZELCY";
        titleR = "MŁODE TALENTY DELTA";
      }

      spreads.push({
        id: i,
        titleLeft: titleL,
        titleRight: titleR,
        leftPagePlayers: leftPage,
        rightPagePlayers: rightPage
      });
    }

    return spreads;
  }, [playerAlbums]);

  const currentSpread = categorizedSpreads[currentPageSpread] || categorizedSpreads[0];

  const totalCollectedCount = playerAlbums.filter(a => a.ownedCount > 0).length;
  const totalRosterCount = playerAlbums.length;
  const completionPct = totalRosterCount > 0 ? Math.round((totalCollectedCount / totalRosterCount) * 100) : 0;

  const handleNextSpread = () => {
    if (currentPageSpread < categorizedSpreads.length - 1 && !isFlipping) {
      setIsFlipping("next");
      cardSound.playPageTurn();
      setTimeout(() => {
        setCurrentPageSpread(p => p + 1);
        setIsFlipping(null);
      }, 240);
    }
  };

  const handlePrevSpread = () => {
    if (currentPageSpread > 0 && !isFlipping) {
      setIsFlipping("prev");
      cardSound.playPageTurn();
      setTimeout(() => {
        setCurrentPageSpread(p => p - 1);
        setIsFlipping(null);
      }, 240);
    }
  };

  const handleStickCard = (album: PlayerAlbumData) => {
    cardSound.playStickerPeel();
    setRecentlyStuckPlayerId(album.player.id);
    setTimeout(() => setRecentlyStuckPlayerId(null), 1800);
  };

  return (
    <div className="v200-panini-binder-container">
      {/* 1. TOP HEADER & BINDER STATS BAR */}
      <div className="v200-binder-top-strip devil-card">
        <div className="v200-binder-brand">
          <div className="v200-binder-badge-crest">
            <img src="/teamlogos/gm.png" alt="DELTA" />
          </div>
          <div>
            <div className="v200-binder-edition-tag">
              <Sparkles size={12} className="text-yellow-400" /> OFICJALNY KLASER PANINI · ROCZNIK 2018 GM
            </div>
            <h2 className="v200-binder-main-title">KOLEKCJA NAKLEJEK & KART MISTRZÓW</h2>
          </div>
        </div>

        {/* Action Controls & View Mode */}
        <div className="v200-binder-top-actions">
          <div className="v200-binder-view-toggles">
            <button
              type="button"
              onClick={() => setViewMode("book3d")}
              className={`v200-binder-mode-btn ${viewMode === "book3d" ? "active" : ""}`}
              title="Widok segregatora 3D"
            >
              <BookOpen size={15} />
              <span>Klaser 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`v200-binder-mode-btn ${viewMode === "grid" ? "active" : ""}`}
              title="Widok pełnej siatki"
            >
              <Grid size={15} />
              <span>Siatka 16</span>
            </button>
          </div>

          {/* Quick Hub buttons */}
          {onOpenPacks && (
            <button
              type="button"
              onClick={onOpenPacks}
              className="v200-binder-quick-action gold"
            >
              <Gift size={14} />
              <span>Otwórz Paczki</span>
            </button>
          )}

          {onOpenTradeHub && (
            <button
              type="button"
              onClick={onOpenTradeHub}
              className="v200-binder-quick-action"
            >
              <ArrowLeftRight size={14} />
              <span>Wymiana</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PROGRESS BANNER & REWARDS */}
      <div className="v200-binder-progress-banner">
        <div className="v200-binder-kpi-item">
          <span className="kpi-label">ZEBRANE NAKLEJKI</span>
          <div className="kpi-value">
            <strong className="text-yellow-400">{totalCollectedCount}</strong>
            <span className="text-slate-400">/ {totalRosterCount}</span>
          </div>
        </div>

        <div className="v200-binder-progress-center">
          <div className="v200-binder-bar-header">
            <span>Uzupełnienie klasera</span>
            <strong className="text-yellow-400 font-mono">{completionPct}%</strong>
          </div>
          <div className="v200-binder-bar-track">
            <div 
              className="v200-binder-bar-fill"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="v200-binder-milestones">
            <span className={totalCollectedCount >= 5 ? "passed" : ""}>★ 5 zawodników (+150 DP)</span>
            <span className={totalCollectedCount >= 10 ? "passed" : ""}>★★ 10 zawodników (+300 DP)</span>
            <span className={totalCollectedCount >= 16 ? "passed" : ""}>★★★ Mistrz Całego Rocznika (+1000 DP)</span>
          </div>
        </div>

        <div className="v200-binder-claim-box">
          {!paniniRewardClaimed ? (
            <button
              type="button"
              onClick={() => {
                if (totalCollectedCount >= 10 && onClaimPaniniReward) {
                  onClaimPaniniReward();
                } else {
                  alert(`Brakuje jeszcze ${Math.max(0, 10 - totalCollectedCount)} zawodników do odebrania nagrody mistrzowskiej!`);
                }
              }}
              className={`v200-binder-claim-btn ${totalCollectedCount >= 10 ? "ready" : "locked"}`}
            >
              <Trophy size={16} />
              <div>
                <strong>{totalCollectedCount >= 10 ? "ODBIERZ NAGRODĘ" : "NAGRODA ZA KLASER"}</strong>
                <small>+500 DP + Złota Odznaka</small>
              </div>
            </button>
          ) : (
            <div className="v200-binder-claimed-box">
              <CheckCircle2 size={18} className="text-green-400" />
              <div>
                <strong>NAGRODA ODEBRANA</strong>
                <small className="text-green-300">+500 DP naliczone</small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOOKMARK TABS RIBBON */}
      {viewMode === "book3d" && (
        <div className="v200-binder-ribbon-tabs">
          {categorizedSpreads.map((spread, idx) => (
            <button
              key={spread.id}
              type="button"
              onClick={() => {
                if (idx !== currentPageSpread) {
                  cardSound.playPageTurn();
                  setCurrentPageSpread(idx);
                }
              }}
              className={`v200-binder-ribbon-tab ${currentPageSpread === idx ? "active" : ""}`}
            >
              <Bookmark size={13} />
              <span>Strona {idx * 2 + 1}–{idx * 2 + 2}</span>
              <small>({spread.leftPagePlayers.filter(p => p.ownedCount > 0).length + spread.rightPagePlayers.filter(p => p.ownedCount > 0).length}/{spread.leftPagePlayers.length + spread.rightPagePlayers.length})</small>
            </button>
          ))}
        </div>
      )}

      {/* 4. 3D DOUBLE SPREAD PHYSICAL BINDER */}
      {viewMode === "book3d" ? (
        <div className="v200-binder-book-stage">
          {/* Navigation Prev Button */}
          <button
            type="button"
            onClick={handlePrevSpread}
            disabled={currentPageSpread === 0}
            className={`v200-binder-nav-btn prev ${currentPageSpread === 0 ? "disabled" : ""}`}
            aria-label="Poprzednia strona albumu"
          >
            <ChevronLeft size={28} />
          </button>

          {/* PHYSICAL BOOK SPREAD CONTAINER */}
          <div className={`v200-binder-double-page ${isFlipping ? `is-flipping-${isFlipping}` : ""}`}>
            {/* Binder Metallic Spine Rings */}
            <div className="v200-binder-spine-rings" aria-hidden="true">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="binder-ring">
                  <div className="ring-metal" />
                  <div className="ring-shadow" />
                </div>
              ))}
            </div>

            {/* LEFT PAGE */}
            <div className="v200-binder-page left-page">
              <div className="v200-binder-page-header">
                <div className="page-header-title">
                  <span className="page-cat-badge">SEKCJA A</span>
                  <h3>{currentSpread.titleLeft}</h3>
                </div>
                <div className="page-number-tag">
                  STRONA {currentPageSpread * 2 + 1}
                </div>
              </div>

              {/* 4-Card Grid on Left Page */}
              <div className="v200-binder-page-grid">
                {currentSpread.leftPagePlayers.map(album => (
                  <StickerSlot
                    key={album.player.id}
                    album={album}
                    ownedCard={ownedCardsMap.get(album.topOwnedCard?.id || "") || null}
                    isRecentlyStuck={recentlyStuckPlayerId === album.player.id}
                    getLayoutForCard={getLayoutForCard}
                    onInspect={() => {
                      if (album.topOwnedCard) {
                        onInspectCard(album.topOwnedCard, ownedCardsMap.get(album.topOwnedCard.id) || null);
                      } else {
                        onSelectPlayer(album.player.id);
                      }
                    }}
                    onStick={() => handleStickCard(album)}
                    onGetCard={() => onSelectPlayer(album.player.id)}
                  />
                ))}
              </div>

              <div className="v200-binder-page-footer">
                <span>DELTA WARSZAWA 2018 GM · OFICJALNA LICENCJA</span>
                <img src="/teamlogos/gm.png" alt="Crest" className="page-footer-crest" />
              </div>
            </div>

            {/* RIGHT PAGE */}
            <div className="v200-binder-page right-page">
              <div className="v200-binder-page-header">
                <div className="page-header-title">
                  <span className="page-cat-badge">SEKCJA B</span>
                  <h3>{currentSpread.titleRight}</h3>
                </div>
                <div className="page-number-tag">
                  STRONA {currentPageSpread * 2 + 2}
                </div>
              </div>

              {/* 4-Card Grid on Right Page */}
              <div className="v200-binder-page-grid">
                {currentSpread.rightPagePlayers.map(album => (
                  <StickerSlot
                    key={album.player.id}
                    album={album}
                    ownedCard={ownedCardsMap.get(album.topOwnedCard?.id || "") || null}
                    isRecentlyStuck={recentlyStuckPlayerId === album.player.id}
                    getLayoutForCard={getLayoutForCard}
                    onInspect={() => {
                      if (album.topOwnedCard) {
                        onInspectCard(album.topOwnedCard, ownedCardsMap.get(album.topOwnedCard.id) || null);
                      } else {
                        onSelectPlayer(album.player.id);
                      }
                    }}
                    onStick={() => handleStickCard(album)}
                    onGetCard={() => onSelectPlayer(album.player.id)}
                  />
                ))}
              </div>

              <div className="v200-binder-page-footer">
                <span>KOLEKCJA KART I NAKLEJEK PANINI 2026</span>
                <span className="page-footer-auth">★ EDYCJA LIMITOWANA</span>
              </div>
            </div>
          </div>

          {/* Navigation Next Button */}
          <button
            type="button"
            onClick={handleNextSpread}
            disabled={currentPageSpread >= categorizedSpreads.length - 1}
            className={`v200-binder-nav-btn next ${currentPageSpread >= categorizedSpreads.length - 1 ? "disabled" : ""}`}
            aria-label="Następna strona albumu"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      ) : (
        /* 5. FULL 16-PLAYER STICKER GRID VIEW */
        <div className="v200-binder-full-grid-view">
          <div className="v200-binder-grid-header">
            <h3>Pełny Przegląd Naklejek Składu ({totalCollectedCount}/{totalRosterCount})</h3>
            <p>Kliknij w dowolną kartę, aby obejrzeć model 3D ze statystykami lub dowiedzieć się jak odblokować brakujące wydania.</p>
          </div>
          <div className="v200-binder-page-grid all-roster">
            {playerAlbums.map(album => (
              <StickerSlot
                key={album.player.id}
                album={album}
                ownedCard={ownedCardsMap.get(album.topOwnedCard?.id || "") || null}
                isRecentlyStuck={recentlyStuckPlayerId === album.player.id}
                getLayoutForCard={getLayoutForCard}
                onInspect={() => {
                  if (album.topOwnedCard) {
                    onInspectCard(album.topOwnedCard, ownedCardsMap.get(album.topOwnedCard.id) || null);
                  } else {
                    onSelectPlayer(album.player.id);
                  }
                }}
                onStick={() => handleStickCard(album)}
                onGetCard={() => onSelectPlayer(album.player.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 6. BOTTOM BINDER CONTROLS & PAGE FLIP HELPER */}
      <div className="v200-binder-bottom-bar">
        <div className="v200-binder-page-indicator">
          <span>Strona {currentPageSpread * 2 + 1}–{currentPageSpread * 2 + 2} z {categorizedSpreads.length * 2}</span>
        </div>

        <div className="v200-binder-pager-dots">
          {categorizedSpreads.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (i !== currentPageSpread) {
                  cardSound.playPageTurn();
                  setCurrentPageSpread(i);
                }
              }}
              className={`v200-binder-dot ${currentPageSpread === i ? "active" : ""}`}
              aria-label={`Przejdź do rozkładówki ${i + 1}`}
            />
          ))}
        </div>

        <div className="v200-binder-footer-hint">
          <Sparkles size={13} className="text-yellow-400" />
          <span>Najedź na kartę, aby zobaczyć <strong>błysk folii holograficznej Panini</strong></span>
        </div>
      </div>
    </div>
  );
}

// Sub-component for each Panini Sticker Slot
function StickerSlot({
  album,
  ownedCard,
  isRecentlyStuck,
  getLayoutForCard,
  onInspect,
  onStick,
  onGetCard
}: {
  album: PlayerAlbumData;
  ownedCard: UserCard | null;
  isRecentlyStuck: boolean;
  getLayoutForCard?: (card?: CardDefinition) => Partial<CardLayoutConfig> | undefined;
  onInspect: () => void;
  onStick: () => void;
  onGetCard: () => void;
}) {
  const isCollected = album.ownedCount > 0;
  const topCard = album.topOwnedCard || album.cards[0];
  const duplicates = ownedCard?.duplicates_count || 0;

  const [mouseOffset, setMouseOffset] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMouseOffset({ x, y });
  };

  return (
    <div 
      className={`v200-panini-sticker-box ${isCollected ? "is-collected" : "is-missing"} ${isRecentlyStuck ? "just-stuck" : ""}`}
      onClick={onInspect}
      onMouseMove={handleMouseMove}
    >
      {/* Metallic/Foil Border Stamp */}
      <div className="v200-sticker-frame">
        {isCollected && topCard ? (
          <div className="v200-sticker-collected-content">
            {/* 3D Card Thumbnail with Holographic Sheen */}
            <div className="v200-sticker-card-scaler">
              <CollectibleCard3D
                card={topCard}
                userCard={ownedCard}
                isLocked={false}
                size="sm"
                interactive={false}
                showFlip={false}
                layoutOverride={getLayoutForCard ? getLayoutForCard(topCard) : undefined}
              />

              {/* Holographic Rainbow Foil Reflection Overlay */}
              <div 
                className="v200-panini-holo-foil-sheen"
                style={{
                  background: `radial-gradient(circle at ${mouseOffset.x}% ${mouseOffset.y}%, rgba(255,255,255,0.45) 0%, rgba(255,215,0,0.2) 25%, rgba(0,255,255,0.15) 50%, rgba(255,0,255,0.1) 75%, transparent 100%)`
                }}
              />
            </div>

            {/* Official Panini Gold Foil Stamp */}
            <div className="v200-panini-gold-stamp">
              <Sparkles size={10} />
              <span>OFFICIAL STICKER</span>
            </div>

            {/* Duplicates Badge */}
            {duplicates > 0 && (
              <div className="v200-panini-duplicates-badge" title={`${duplicates} duplikatów do wymiany w SBC`}>
                +{duplicates} DUBEL
              </div>
            )}

            {/* Sticker Footer Info */}
            <div className="v200-sticker-card-info">
              <span className="v200-sticker-num">#{album.player.shirt_number || "10"}</span>
              <strong className="v200-sticker-name">{album.player.display_name}</strong>
              <small className="v200-sticker-sub">{album.ownedCount}/{album.cards.length} edycji</small>
            </div>
          </div>
        ) : (
          /* Missing Silhouette Placeholder with Authentic Peel Dotted Border */
          <div className="v200-sticker-missing-content">
            <div className="v200-sticker-silhouette-bg">
              <div className="v200-sticker-dotted-box">
                <span className="v200-sticker-pos-tag">{album.player.position || "ZAWODNIK"}</span>
                <div className="v200-sticker-shirt-ghost">
                  #{album.player.shirt_number || "18"}
                </div>
                <img src="/teamlogos/gm.png" alt="Crest Ghost" className="v200-sticker-crest-ghost" />
              </div>
            </div>

            <div className="v200-sticker-missing-meta">
              <strong className="v200-sticker-missing-name">{album.player.display_name}</strong>
              <span className="v200-sticker-missing-status">
                <Lock size={10} /> MIEJSCE NA NAKLEJKĘ
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGetCard();
                }}
                className="v200-sticker-find-btn"
              >
                <Sparkles size={10} /> JAK ZDOBYĆ?
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
