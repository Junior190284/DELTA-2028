"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Shirt, 
  Scissors, 
  Footprints, 
  Sparkles, 
  CircleDot, 
  Shield, 
  Lock, 
  Check, 
  RotateCcw,
  Info,
  Trophy,
  Award,
  Flame,
  CheckCircle2
} from "lucide-react";
import type { Player } from "./PlayerExperience3D";
import { 
  LOCKER_CATEGORIES, 
  DEMO_EQUIPMENT_ITEMS, 
  getInitialEquippedMap, 
  type LockerCategory, 
  type EquipmentItem,
  type EquipmentState
} from "@/lib/locker-room/equipment-catalog";
import { PlayerAvatarRenderer } from "./PlayerAvatarRenderer";
import "./player-locker-room.css";

export interface PlayerLockerRoomProps {
  player: Player;
  level?: number;
  xp?: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function PlayerLockerRoom({
  player,
  level = 1,
  xp = 0,
  isOpen,
  onClose,
  className = ""
}: PlayerLockerRoomProps) {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<LockerCategory>("jerseys");
  const [equipped, setEquipped] = useState<Record<LockerCategory, EquipmentItem>>(() => getInitialEquippedMap());
  const [preview, setPreview] = useState<Record<LockerCategory, EquipmentItem>>(() => getInitialEquippedMap());
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Bezpieczny mounting portalu na kliencie
  useEffect(() => {
    setMounted(true);
  }, []);

  // Izolacja stanu przy zmianie zawodnika (activeChild)
  useEffect(() => {
    const fresh = getInitialEquippedMap();
    setEquipped(fresh);
    setPreview(fresh);
    setSelectedItem(null);
    setRotationAngle(0);
  }, [player?.id]);

  // Obsługa klawisza Escape do zamykania szatni
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Czy są niezapisane zmiany przymierzania?
  const hasChanges = useMemo(() => {
    for (const cat of LOCKER_CATEGORIES) {
      if (equipped[cat.id]?.id !== preview[cat.id]?.id) {
        return true;
      }
    }
    return false;
  }, [equipped, preview]);

  // Liczba zmodyfikowanych elementów
  const changedCount = useMemo(() => {
    let count = 0;
    for (const cat of LOCKER_CATEGORIES) {
      if (equipped[cat.id]?.id !== preview[cat.id]?.id) {
        count++;
      }
    }
    return count;
  }, [equipped, preview]);

  // Przedmioty w aktualnie wybranej kategorii
  const categoryItems = useMemo(() => {
    return DEMO_EQUIPMENT_ITEMS.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  // Wyświetlanie powiadomienia toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Wybór przedmiotu (przymierzenie lub inspekcja)
  const handleSelectItem = useCallback((item: EquipmentItem) => {
    setSelectedItem(item);

    if (item.defaultState === "LOCKED") {
      showToast(`Przedmiot zablokowany: ${item.unlockCondition || "Wymaga awansu sportowego"}`);
      return;
    }

    // Przymierz przedmiot w stanie lokalnym preview
    setPreview(prev => ({
      ...prev,
      [item.category]: item
    }));
  }, [showToast]);

  // Zatwierdzenie zestawu (Apply)
  const handleApply = useCallback(() => {
    setEquipped({ ...preview });
    showToast("Zestaw meczowy pomyślnie zaaprobowany w szatni (Demo)!");
  }, [preview, showToast]);

  // Anulowanie przymierzania (Cancel)
  const handleCancel = useCallback(() => {
    setPreview({ ...equipped });
    showToast("Anulowano przymierzanie. Przywrócono założony zestaw.");
  }, [equipped, showToast]);

  if (!mounted || !isOpen) return null;

  const rawShirtNumber = player?.shirt_number 
    ? String(player.shirt_number).replace(/[^0-9]/g, "") 
    : "10";

  const getCategoryIcon = (id: LockerCategory) => {
    switch (id) {
      case "jerseys": return <Shirt size={14} />;
      case "shorts": return <Scissors size={14} />;
      case "socks": return <Footprints size={14} />;
      case "boots": return <Sparkles size={14} />;
      case "balls": return <CircleDot size={14} />;
      case "accessories": return <Shield size={14} />;
      default: return <Shirt size={14} />;
    }
  };

  const portalContent = (
    <div 
      className={`v7g-locker-overlay ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label="Szatnia 3D zawodnika DELTA PLAYER 5.0"
      data-testid="player-locker-room-modal"
    >
      {/* 1. PASEK NAGŁÓWKA SZATNI */}
      <header className="v7g-locker-header">
        <div className="v7g-locker-brand">
          <img src="/teamlogos/gm.png" alt="DELTA" className="v7g-locker-crest" />
          <div className="v7g-locker-title-wrap">
            <span className="v7g-locker-title-kicker">AKADEMIA K.S. DELTA WARSZAWA</span>
            <h1 className="v7g-locker-title">SZATNIA ZAWODNIKA • {player?.display_name?.toUpperCase() || "ZAWODNIK"}</h1>
          </div>
        </div>

        <div className="v7g-locker-header-actions">
          <div className="v7g-locker-demo-badge" title="Tryb demonstracyjny — zmiany nie modyfikują bazy danych">
            <Sparkles size={12} />
            <span>TRYB DEMO (LOKALNY)</span>
          </div>

          <button
            type="button"
            className="v7g-locker-btn-close"
            onClick={onClose}
            aria-label="Wróć do profilu zawodnika"
            title="Wróć do profilu (Esc)"
            data-testid="locker-room-close-btn"
          >
            <X size={16} />
            <span>Wróć do profilu</span>
          </button>
        </div>
      </header>

      {/* 2. GŁÓWNA PRZESTRZEŃ: SCENA SZATNI + PANEL WYPOSAŻENIA */}
      <div className="v7g-locker-viewport">
        {/* LEWA / CENTRALNA STRONA: SCENA SZATNI Z PODŚWIETLONĄ SZAFKĄ I ZAWODNIKIEM */}
        <section className="v7g-locker-scene" aria-label="Wizualizacja szatni klubowej">
          {/* Konstrukcja szafki klubowej w tle */}
          <div className="v7g-locker-structure">
            <div className="v7g-locker-led-top" />
            <div className="v7g-locker-nameplate">
              <div className="v7g-nameplate-left">
                <img src="/teamlogos/gm.png" alt="DELTA" className="v7g-nameplate-crest" />
                <span className="v7g-nameplate-name">{player?.display_name || "ZAWODNIK"}</span>
              </div>
              <span className="v7g-nameplate-number">#{rawShirtNumber}</span>
            </div>
            <div className="v7g-locker-bench" />
          </div>

          {/* Centralny interaktywny renderer zawodnika */}
          <PlayerAvatarRenderer
            player={player}
            equipped={equipped}
            preview={preview}
            rotationAngle={rotationAngle}
            onRotationChange={setRotationAngle}
            interactive={true}
          />
        </section>

        {/* PRAWA STRONA: KATALOG WYPOSAŻENIA (6 KATEGORII) */}
        <aside className="v7g-locker-catalog-panel" aria-label="Katalog wyposażenia zawodnika">
          {/* Zakładki kategorii */}
          <div className="v7g-locker-cat-tabs" role="tablist" aria-label="Kategorie wyposażenia">
            {LOCKER_CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              const isModified = equipped[cat.id]?.id !== preview[cat.id]?.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`v7g-cat-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedItem(null);
                  }}
                  data-testid={`cat-tab-${cat.id}`}
                >
                  {getCategoryIcon(cat.id)}
                  <span>{cat.label}</span>
                  {isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Lista przedmiotów w wybranej kategorii */}
          <div className="v7g-locker-items-container">
            <div className="v7g-items-grid" role="list" aria-label={`Przedmioty w kategorii: ${activeCategory}`}>
              {categoryItems.map(item => {
                const isEquipped = equipped[item.category]?.id === item.id;
                const isPreviewing = preview[item.category]?.id === item.id;
                const isLocked = item.defaultState === "LOCKED";
                const isSelected = selectedItem?.id === item.id;

                let cardClass = "";
                let stateLabel = "";
                let stateLabelClass = "";

                if (isPreviewing) {
                  cardClass = "is-previewing";
                  stateLabel = "PRZYMIERZASZ";
                  stateLabelClass = "preview";
                } else if (isEquipped) {
                  cardClass = "is-equipped";
                  stateLabel = "W UŻYCIU";
                  stateLabelClass = "equipped";
                } else if (isLocked) {
                  cardClass = "is-locked";
                  stateLabel = "ZABLOKOWANY";
                  stateLabelClass = "locked";
                } else {
                  stateLabel = "DOSTĘPNY";
                  stateLabelClass = "available";
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`v7g-item-card ${cardClass} ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectItem(item)}
                    title={isLocked ? `Zablokowany: ${item.unlockCondition}` : `Przymierz ${item.name}`}
                    data-testid={`equipment-item-${item.id}`}
                  >
                    <div className="v7g-item-card-header">
                      <span className={`v7g-item-badge-pill ${item.rarity.toLowerCase()}`}>
                        {item.rarity}
                      </span>
                      <div className="v7g-item-status-icon">
                        {isLocked ? (
                          <Lock size={12} className="text-red-400" />
                        ) : isPreviewing ? (
                          <Sparkles size={12} className="text-amber-400" />
                        ) : isEquipped ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : null}
                      </div>
                    </div>

                    <div className="v7g-item-icon-wrap" style={{ borderColor: item.accentColor }}>
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${item.accentColor}25`, color: item.accentColor }}
                      >
                        {getCategoryIcon(item.category)}
                      </div>
                    </div>

                    <div className="v7g-item-name" title={item.name}>
                      {item.name}
                    </div>

                    <div className={`v7g-item-state-label ${stateLabelClass}`}>
                      {stateLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Szereg inspekcji wybranego przedmiotu */}
            {selectedItem && (
              <div className="v7g-item-inspect-drawer" data-testid="item-inspection-drawer">
                <div className="v7g-inspect-title-row">
                  <span className="v7g-inspect-title">{selectedItem.name}</span>
                  <span className={`v7g-item-badge-pill ${selectedItem.rarity.toLowerCase()}`}>
                    {selectedItem.rarity}
                  </span>
                </div>
                <p className="v7g-inspect-desc">{selectedItem.description}</p>

                {selectedItem.defaultState === "LOCKED" ? (
                  <div className="v7g-inspect-locked-box">
                    <Lock size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <b>WARUNEK ODBLOKOWANIA:</b>
                      <p className="mt-0.5 text-red-200">{selectedItem.unlockCondition}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 size={13} />
                    <span>Przedmiot gotowy do ubrania na mecz i trening.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 3. DOLNA BELKA AKCJI (ZASTOSUJ / ANULUJ) */}
      <footer className="v7g-locker-actions-bar">
        <div className="v7g-actions-status-text">
          {hasChanges ? (
            <>
              <Sparkles size={14} className="text-amber-400" />
              <span>Przymierzasz zestaw (<b>{changedCount}</b> {changedCount === 1 ? "zmiana" : "zmiany"}). Kliknij Zastosuj, aby zatwierdzić.</span>
            </>
          ) : (
            <>
              <Check size={14} className="text-emerald-400" />
              <span>Wszystkie założone elementy są aktualne. Wybierz inny przedmiot, aby przymierzyć.</span>
            </>
          )}
        </div>

        <div className="v7g-actions-btns-group">
          <button
            type="button"
            className="v7g-btn-cancel-preview"
            onClick={handleCancel}
            disabled={!hasChanges}
            title="Cofnij przymierzane zmiany"
            data-testid="btn-cancel-equipment"
          >
            <RotateCcw size={13} />
            <span>ANULUJ</span>
          </button>

          <button
            type="button"
            className="v7g-btn-apply-equipment"
            onClick={handleApply}
            disabled={!hasChanges}
            title="Zastosuj przymierzany zestaw w szatni"
            data-testid="btn-apply-equipment"
          >
            <Check size={14} />
            <span>ZASTOSUJ ZESTAW</span>
          </button>
        </div>
      </footer>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100000] bg-neutral-900/95 border border-amber-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs backdrop-blur-md animate-fade-in"
          role="status"
        >
          <Info size={14} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );

  return createPortal(portalContent, document.body);
}

export default PlayerLockerRoom;
