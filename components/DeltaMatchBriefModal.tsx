"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Bell, 
  MapPin, 
  Clock, 
  Shirt, 
  Copy, 
  Check, 
  Share2, 
  X, 
  Send, 
  Info, 
  ShieldAlert, 
  Calendar,
  Sparkles
} from "lucide-react";

interface Match {
  id: string;
  round_no: number | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  home_team: string;
  away_team: string;
  status: string;
}

interface DeltaMatchBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
}

export default function DeltaMatchBriefModal({
  isOpen,
  onClose,
  matches
}: DeltaMatchBriefModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [gatheringTime, setGatheringTime] = useState<string>("45 min przed meczem");
  const [kitColor, setKitColor] = useState<string>("Czerwono-czarny (meczowy domowy)");
  const [socksColor, setSocksColor] = useState<string>("Czarne getry DELTA");
  const [additionalNotes, setAdditionalNotes] = useState<string>("Obowiązkowe ochraniacze, podpisany bidon z wodą i sucha koszulka na zmianę po meczu.");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const upcoming = matches.find(m => m.status === "scheduled" || m.status === "upcoming") || matches[0];
    if (upcoming) {
      setSelectedMatchId(upcoming.id);
    }
  }, [matches]);

  // Obsługa klawisza Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const selectedMatch = matches.find(m => m.id === selectedMatchId) || matches[0];

  const generateBriefText = () => {
    if (!selectedMatch) return "";
    const dateFormatted = new Date(selectedMatch.match_date).toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    return `📢 OFICJALNY KOMUNIKAT MECZOWY — DELTA WARSZAWA 2018 GM ⚽

📅 Data meczu: ${dateFormatted}
⏰ Godzina meczu: ${selectedMatch.match_time ? selectedMatch.match_time.slice(0, 5) : "Do ustalenia"}
📍 Miejsce / Stadion: ${selectedMatch.venue || "Boisko ligowe"}
⚔️ Mecz: ${selectedMatch.home_team} vs ${selectedMatch.away_team}

⏰ ZBIÓRKA ZAWODNIKÓW: ${gatheringTime}
👕 Zestaw strojów: ${kitColor}
🧦 Getry: ${socksColor}

📌 WAŻNE WYTYCZNE DLA RODZICÓW I PIŁKARZY:
• ${additionalNotes}
• Pamiętamy o pozytywnym dopingu i wspieraniu całej drużyny!
• W razie nieobecności prosimy o natychmiastową informację w aplikacji.

DO BOJU DELTA! 🔴⚫`;
  };

  const handleCopy = async () => {
    const text = generateBriefText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Błąd kopiowania komunikatu:", err);
    }
  };

  const handleShare = async () => {
    const text = generateBriefText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Komunikat Meczowy DELTA 2018",
          text: text
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="v200-knowledge-modal-backdrop" onClick={onClose}>
      <div 
        className="v200-knowledge-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="v200-knowledge-header">
          <div className="v200-knowledge-header-left">
            <div className="v200-knowledge-icon-shield red-shield">
              <Bell size={24} />
            </div>
            <div>
              <div className="v200-badge-academy red-badge">
                <Send size={13} />
                <span>INFORMATOR MECZOWY DLA RODZICÓW</span>
              </div>
              <h2>Komunikat Zbiórki i Odprawy Meczowej</h2>
              <p>Generuj gotowe wiadomości SMS/WhatsApp z godziną zbiórki, strojami i adresem</p>
            </div>
          </div>

          <button 
            type="button" 
            className="v200-btn-close-knowledge"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </header>

        <div className="v200-brief-grid">
          {/* LEWA KOLUMNA: FORMULARZ */}
          <div className="v200-brief-form">
            <div className="v200-form-group">
              <label><Calendar size={15} /> Wybierz Mecz:</label>
              <select 
                value={selectedMatchId} 
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="v200-select-input"
              >
                {matches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.home_team} vs {m.away_team} ({m.match_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="v200-form-group">
              <label><Clock size={15} /> Godzina Zbiórki na Miejscu:</label>
              <input 
                type="text" 
                value={gatheringTime} 
                onChange={(e) => setGatheringTime(e.target.value)}
                placeholder="np. 45 min przed meczem (godz. 09:15)"
                className="v200-text-input"
              />
            </div>

            <div className="v200-form-row-2">
              <div className="v200-form-group">
                <label><Shirt size={15} /> Komplet Koszulek:</label>
                <input 
                  type="text" 
                  value={kitColor} 
                  onChange={(e) => setKitColor(e.target.value)}
                  placeholder="np. Czerwono-czarny"
                  className="v200-text-input"
                />
              </div>

              <div className="v200-form-group">
                <label><Shirt size={15} /> Getry i Spodenki:</label>
                <input 
                  type="text" 
                  value={socksColor} 
                  onChange={(e) => setSocksColor(e.target.value)}
                  placeholder="np. Czarne getry"
                  className="v200-text-input"
                />
              </div>
            </div>

            <div className="v200-form-group">
              <label><Info size={15} /> Dodatkowe Wskazówki Trenera:</label>
              <textarea 
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="v200-textarea-input"
                placeholder="np. Ochraniacze, bidon z wodą, sucha odzież na zmianę..."
              />
            </div>
          </div>

          {/* PRAWA KOLUMNA: PODGLĄD WIADOMOŚCI */}
          <div className="v200-brief-preview-card">
            <div className="v200-preview-header">
              <Sparkles size={16} />
              <span>PODGLĄD WIADOMOŚCI (WHATSAPP / SMS)</span>
            </div>

            <pre className="v200-brief-pre">{generateBriefText()}</pre>

            <div className="v200-brief-actions">
              <button 
                type="button" 
                className={`v200-btn-copy-brief ${copied ? "copied" : ""}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? "SKOPIOWANO DO SCHOWKA!" : "KOPIUJ KOMUNIKAT"}</span>
              </button>

              <button 
                type="button" 
                className="v200-btn-share-brief"
                onClick={handleShare}
              >
                <Share2 size={18} />
                <span>UDOSTĘPNIJ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
