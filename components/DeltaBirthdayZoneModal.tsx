"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Cake, 
  Gift, 
  Sparkles, 
  X, 
  Crown, 
  Flame, 
  Trophy, 
  Send, 
  Heart, 
  Share2, 
  Download, 
  CheckCircle2, 
  Calendar,
  Smile,
  PartyPopper
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";

export interface BirthdayPlayer {
  id: string;
  display_name: string;
  shirt_number: string | null;
  photo_path?: string | null;
  birth_date?: string; // MM-DD or YYYY-MM-DD
  daysUntil: number;
  ageTurning: number;
}

interface WishMessage {
  id: string;
  senderName: string;
  text: string;
  emoji: string;
  timestamp: string;
}

interface DeltaBirthdayZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: { id: string; display_name: string; shirt_number: string | null; photo_path?: string | null }[];
  currentUserName?: string;
  onClaimBirthdayPack?: (playerId: string) => void;
}

const DEFAULT_WISHES: WishMessage[] = [
  { id: "w1", senderName: "Trener Mateusz", text: "Sto lat mistrzu! Samych zwycięstw, pięknych bramek i uśmiechu na każdym treningu!", emoji: "🏆", timestamp: "Dzisiaj, 08:30" },
  { id: "w2", senderName: "Staś K.", text: "Najlepszego ziomek! Żeby każda piłka wpadała w samo okienko!", emoji: "⚽", timestamp: "Dzisiaj, 09:15" },
  { id: "w3", senderName: "Janek M.", text: "Wszystkiego dobrego i mnóstwa wygranych pojedynków na boisku!", emoji: "🔥", timestamp: "Dzisiaj, 10:05" },
  { id: "w4", senderName: "Tymek W.", text: "Dużo zdrowia, siły i super prezentów od całej DELTY!", emoji: "🎂", timestamp: "Dzisiaj, 11:20" }
];

const PRESET_WISH_TEMPLATES = [
  { text: "Samych bramek w samo okienko i wygranych meczów! ⚽", emoji: "⚽" },
  { text: "Mistrzowskiej formy, zdrowia i uśmiechu na treningach! 🏆", emoji: "🏆" },
  { text: "Ognistych rajdów skrzydłem i asyst nie do obrony! 🔥", emoji: "🔥" },
  { text: "Super prezentów, pysznego tortu i sto lat w barwach DELTY! 🎂", emoji: "🎂" }
];

export default function DeltaBirthdayZoneModal({
  isOpen,
  onClose,
  players = [],
  currentUserName = "Kibic DELTY",
  onClaimBirthdayPack
}: DeltaBirthdayZoneModalProps) {
  const [mounted, setMounted] = useState(false);
  const [celebrating, setCelebrating] = useState(true);
  const [wishes, setWishes] = useState<WishMessage[]>(DEFAULT_WISHES);
  const [customWishText, setCustomWishText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("⚽");
  const [claimedPack, setClaimedPack] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Compute upcoming birthdays
  const birthdayList: BirthdayPlayer[] = useMemo(() => {
    if (!players || players.length === 0) {
      return [
        { id: "p1", display_name: "Staś Kowalski", shirt_number: "10", daysUntil: 0, ageTurning: 8 },
        { id: "p2", display_name: "Jan Nowak", shirt_number: "7", daysUntil: 4, ageTurning: 8 },
        { id: "p3", display_name: "Tymon Wiśniewski", shirt_number: "9", daysUntil: 11, ageTurning: 8 },
        { id: "p4", display_name: "Oliwier Wójcik", shirt_number: "1", daysUntil: 19, ageTurning: 8 }
      ];
    }

    // Hash player name to generate fixed birthday dates for demo if not present
    return players.map((p, idx) => {
      const days = (idx * 6) % 30;
      return {
        id: p.id,
        display_name: p.display_name,
        shirt_number: p.shirt_number,
        photo_path: p.photo_path,
        daysUntil: days,
        ageTurning: 8
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [players]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    birthdayList.length > 0 ? birthdayList[0].id : ""
  );

  const selectedPlayer = birthdayList.find(p => p.id === selectedPlayerId) || birthdayList[0];

  // Send a wish
  const handleSendWish = (textToSend?: string, emojiToSend?: string) => {
    const txt = textToSend || customWishText;
    if (!txt.trim()) return;

    cardSound.playWalkoutFanfare();
    const newWish: WishMessage = {
      id: `w-${Date.now()}`,
      senderName: currentUserName,
      text: txt.trim(),
      emoji: emojiToSend || selectedEmoji,
      timestamp: "Przed chwilą"
    };

    setWishes(prev => [newWish, ...prev]);
    setCustomWishText("");
  };

  // Claim birthday booster pack gift
  const handleClaimGift = async () => {
    if (claimedPack || claiming) return;
    setClaiming(true);
    cardSound.playPurchase();
    setCelebrating(true);

    try {
      // Award DP + birthday pack
      await fetch("/api/quests/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: `birthday-${selectedPlayer.id}`,
          rewardPoints: 150,
          rewardType: "mega_chest"
        })
      }).catch(() => {});

      setClaimedPack(true);
      if (onClaimBirthdayPack) onClaimBirthdayPack(selectedPlayer.id);
    } catch (e) {
      console.error("Błąd odbioru prezentu:", e);
    } finally {
      setClaiming(false);
    }
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = `🎂🎉 Dzisiaj urodziny obchodzi nasz zawodnik ${selectedPlayer.display_name}! Cała drużyna DELTA Warszawa 2018 GM życzy sto lat i mnóstwa bramek! 🔴⚫ #Delta2018`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="v200-modal-overlay animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {celebrating && <CanvasParticles theme="gold" active={true} />}

      <div className="v200-birthday-modal animate-scaleUp">
        {/* Header */}
        <div className="v200-bday-header">
          <div className="v200-bday-header-left">
            <div className="v200-bday-badge">
              <Cake size={14} className="text-yellow-400 animate-bounce" />
              <span>KLUBOWA STREFA URODZIN</span>
            </div>
            <h2>URODZINY W DRUŻYNIE DELTA 🎉</h2>
            <p>Świętujemy urodziny zawodników rocznika 2018! Składaj życzenia i odbieraj prezenty!</p>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="v200-bday-close-btn"
            aria-label="Zamknij"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Main Grid */}
        <div className="v200-bday-grid">
          {/* Left: Upcoming Birthdays List */}
          <div className="v200-bday-sidebar custom-scrollbar">
            <div className="v200-bday-sidebar-title">
              <Calendar size={14} className="text-yellow-400" />
              <span>NADCHODZĄCE URODZINY</span>
            </div>

            <div className="v200-bday-player-list">
              {birthdayList.map(p => {
                const isSelected = p.id === selectedPlayerId;
                const isToday = p.daysUntil === 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      setClaimedPack(false);
                      cardSound.playHover();
                    }}
                    className={`v200-bday-player-btn ${isSelected ? "active" : ""} ${isToday ? "today" : ""}`}
                  >
                    <div className="v200-bday-player-avatar">
                      {p.photo_path ? (
                        <img src={p.photo_path} alt={p.display_name} />
                      ) : (
                        <span>{p.display_name.charAt(0)}</span>
                      )}
                      {isToday && <span className="v200-bday-crown-pin">👑</span>}
                    </div>

                    <div className="v200-bday-player-info">
                      <span className="v200-bday-pname">{p.display_name}</span>
                      <span className="v200-bday-pnum">#{p.shirt_number || "DELTA"} • {p.ageTurning}. urodziny</span>
                    </div>

                    <div className="v200-bday-pdays">
                      {isToday ? (
                        <span className="v200-bday-today-tag">DZIŚ! 🎂</span>
                      ) : (
                        <span className="v200-bday-soon-tag">za {p.daysUntil} dni</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center/Right: 3D Birthday Celebration Stage & Wishes Board */}
          <div className="v200-bday-stage custom-scrollbar">
            {/* VIP 3D Celebration Hero Card */}
            <div className="v200-bday-hero-card">
              <div className="v200-bday-hero-glow" />

              <div className="v200-bday-avatar-huge">
                {selectedPlayer.photo_path ? (
                  <img src={selectedPlayer.photo_path} alt={selectedPlayer.display_name} />
                ) : (
                  <div className="v200-bday-huge-initials">
                    {selectedPlayer.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="v200-bday-huge-crown">👑</div>
              </div>

              <div className="v200-bday-hero-text">
                <span className="v200-bday-kicker">
                  <PartyPopper size={14} className="inline mr-1 text-yellow-400" />
                  STO LAT OD CAŁEJ DRUŻYNY DELTA WARSZAWA!
                </span>
                <h3 className="v200-bday-hero-name">
                  {selectedPlayer.display_name} <span className="v200-gold-text">#{selectedPlayer.shirt_number || "10"}</span>
                </h3>
                <p className="v200-bday-hero-wish">
                  Życzymy Ci wspaniałych bramek, niesamowitych zwodów, wielkiej radości z każdego meczu oraz pięknych przygód w barwach DELTY! 🔴⚫
                </p>
              </div>

              {/* Birthday Gift Box CTA */}
              <div className="v200-bday-gift-box">
                <div className="v200-bday-gift-left">
                  <div className="v200-bday-gift-icon">
                    <Gift size={28} className="text-yellow-300 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="v200-bday-gift-title">🎂 PREZENT URODZINOWY DLA JUBILATA</h4>
                    <p className="v200-bday-gift-sub">Paczka Birthday Booster + 150 Delta Points do Klaseru Kart!</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClaimGift}
                  disabled={claimedPack || claiming}
                  className={`v200-bday-claim-btn ${claimedPack ? "claimed" : ""}`}
                >
                  <Sparkles size={16} />
                  <span>
                    {claimedPack ? "ODEBRANO PREZENT! ✓" : claiming ? "OTWIERANIE..." : "ODBIERZ PREZENT (150 DP)"}
                  </span>
                </button>
              </div>

              {/* Quick WhatsApp Share */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="v200-bday-wa-btn"
              >
                <Share2 size={16} />
                <span>Prześlij życzenia na grupę WhatsApp rodziców</span>
              </button>
            </div>

            {/* Wishes Board (Tablica Życzeń Drużyny) */}
            <div className="v200-wishes-board">
              <div className="v200-wishes-header">
                <div className="v200-wishes-title">
                  <Heart size={16} className="text-red-500 fill-red-500" />
                  <span>TABLICA ŻYCZEŃ OD KOLEGÓW Z DRUŻYNY ({wishes.length})</span>
                </div>
                <span className="v200-wishes-sub">Kliknij, aby wysłać szybkie życzenia:</span>
              </div>

              {/* 1-Click Preset Wish Pills */}
              <div className="v200-preset-wishes-grid">
                {PRESET_WISH_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendWish(tmpl.text, tmpl.emoji)}
                    className="v200-preset-wish-btn"
                  >
                    <span>{tmpl.emoji}</span>
                    <span>{tmpl.text}</span>
                  </button>
                ))}
              </div>

              {/* Custom Wish Input */}
              <div className="v200-custom-wish-row">
                <input
                  type="text"
                  value={customWishText}
                  onChange={(e) => setCustomWishText(e.target.value)}
                  placeholder="Napisz własne życzenia dla kolegi..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendWish();
                  }}
                  className="v200-custom-wish-input"
                />
                <button
                  type="button"
                  onClick={() => handleSendWish()}
                  className="v200-send-wish-btn"
                >
                  <Send size={16} />
                  <span>DODAJ ŻYCZENIA</span>
                </button>
              </div>

              {/* Stream of Wishes */}
              <div className="v200-wishes-list">
                {wishes.map((w) => (
                  <div key={w.id} className="v200-wish-bubble animate-fadeIn">
                    <div className="v200-wish-emoji">{w.emoji}</div>
                    <div className="v200-wish-body">
                      <div className="v200-wish-top">
                        <strong className="v200-wish-sender">{w.senderName}</strong>
                        <span className="v200-wish-time">{w.timestamp}</span>
                      </div>
                      <p className="v200-wish-text">{w.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
