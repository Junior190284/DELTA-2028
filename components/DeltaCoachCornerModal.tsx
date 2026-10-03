"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Award, 
  Lightbulb, 
  Sparkles, 
  X, 
  Crown, 
  CheckCircle2, 
  Clock, 
  Send, 
  Trophy, 
  Flame, 
  Target, 
  Zap, 
  Shield, 
  Check, 
  MessageSquare,
  ChevronRight,
  BookOpen,
  Plus,
  Footprints,
  UserCheck,
  HelpCircle
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";

interface PlayerOption {
  id: string;
  display_name: string;
  shirt_number: string | null;
  photo_path?: string | null;
}

export interface SkillSubmission {
  id: string;
  playerId: string;
  playerName: string;
  challengeKey: string;
  challengeTitle: string;
  scoreResult: string;
  trainingContext: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  coachNote?: string;
}

const INITIAL_SKILL_RECORDS: SkillSubmission[] = [
  { id: "s1", playerId: "p1", playerName: "Staś Kowalski #10", challengeKey: "juggling", challengeTitle: "Klub Żonglerki", scoreResult: "48 żonglerek", trainingContext: "Próba na treningu wtorkowym pod okiem trenera", submittedAt: "Wczoraj", status: "approved", coachNote: "Rewelacyjna kontrola piłki obiema nogami! Brawo!" },
  { id: "s2", playerId: "p2", playerName: "Jan Nowak #7", challengeKey: "slalom", challengeTitle: "Slalom Mistrza", scoreResult: "8.4 sek.", trainingContext: "Próba po czwartkowym treningu", submittedAt: "2 dni temu", status: "approved", coachNote: "Świetna dynamika i ciasne zwody." },
  { id: "s3", playerId: "p3", playerName: "Tymon Wiśniewski #9", challengeKey: "crossbar", challengeTitle: "Snajper Poprzeczki", scoreResult: "3 trafienia z rzędu", trainingContext: "Próba przed piątkową gierką", submittedAt: "3 dni temu", status: "approved", coachNote: "Precyzja uderzenia wzorowa!" },
  { id: "s4", playerId: "p4", playerName: "Oliwier Wójcik #1", challengeKey: "juggling", challengeTitle: "Klub Żonglerki", scoreResult: "28 żonglerek", trainingContext: "Próba zgłoszona po rozgrzewce", submittedAt: "Dzisiaj, 10:15", status: "pending" }
];

const SKILL_CHALLENGES = [
  {
    key: "juggling",
    title: "🤹 Klub Żonglerki DELTA",
    badge: "KONTROLA PIŁKI",
    desc: "Podbijanie piłki stopami, udami i głową bez upadku na ziemię.",
    tiers: [
      { name: "Brąz", req: "10 żonglerek", emoji: "🥉" },
      { name: "Srebro", req: "25 żonglerek", emoji: "🥈" },
      { name: "Złoto", req: "50 żonglerek", emoji: "🥇" },
      { name: "Diament", req: "100+ żonglerek", emoji: "💎" }
    ]
  },
  {
    key: "slalom",
    title: "⚡ Slalom Zwinności z Piłką",
    badge: "PROWADZENIE",
    desc: "Slalom między 5 pachołkami rozstawionymi co 1.5m na czas.",
    tiers: [
      { name: "Brąz", req: "< 14 sek.", emoji: "🥉" },
      { name: "Srebro", req: "< 11 sek.", emoji: "🥈" },
      { name: "Złoto", req: "< 9 sek.", emoji: "🥇" },
      { name: "Diament", req: "< 8 sek.", emoji: "💎" }
    ]
  },
  {
    key: "crossbar",
    title: "🎯 Snajper Poprzeczki",
    badge: "PRECYZJA STRZAŁU",
    desc: "Trafienie w poprzeczkę bramki z odległości 12 metrów.",
    tiers: [
      { name: "Brąz", req: "1 trafienie na 5 prób", emoji: "🥉" },
      { name: "Srebro", req: "2 trafienia", emoji: "🥈" },
      { name: "Złoto", req: "3 trafienia z rzędu", emoji: "🥇" }
    ]
  },
  {
    key: "rebound",
    title: "🛡️ Ściana Mistrzów (One-Touch)",
    badge: "PODANIA I PRZYJĘCIA",
    desc: "Podania wewnętrzną częścią stopy o ścianę/rebounder bez przyjęcia.",
    tiers: [
      { name: "Brąz", req: "15 podań", emoji: "🥉" },
      { name: "Srebro", req: "30 podań", emoji: "🥈" },
      { name: "Złoto", req: "50 podań (P+L noga)", emoji: "🥇" }
    ]
  }
];

interface DeltaCoachCornerModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: PlayerOption[];
  isCoachOrAdmin?: boolean;
  currentUserName?: string;
}

export default function DeltaCoachCornerModal({
  isOpen,
  onClose,
  players = [],
  isCoachOrAdmin = false,
  currentUserName = "Kibic DELTY"
}: DeltaCoachCornerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"skills" | "inspiration" | "submit">("skills");
  const [submissions, setSubmissions] = useState<SkillSubmission[]>(INITIAL_SKILL_RECORDS);
  const [celebrating, setCelebrating] = useState(false);

  // Form states
  const [selectedPlayerId, setSelectedPlayerId] = useState(players.length > 0 ? players[0].id : "");
  const [selectedChallengeKey, setSelectedChallengeKey] = useState("juggling");
  const [scoreInput, setScoreInput] = useState("");
  const [trainingNote, setTrainingNote] = useState("Próba wykonana na treningu pod okiem trenera");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Idea submission state
  const [ideaText, setIdeaText] = useState("");
  const [ideaSubmitted, setIdeaSubmitted] = useState(false);

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

  // Submit Skill Record after successful attempt with coach
  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreInput.trim()) return;

    const targetPlayer = players.find(p => p.id === selectedPlayerId) || { display_name: currentUserName, shirt_number: "10" };
    const targetChallenge = SKILL_CHALLENGES.find(c => c.key === selectedChallengeKey) || SKILL_CHALLENGES[0];

    const newSub: SkillSubmission = {
      id: `sub-${Date.now()}`,
      playerId: selectedPlayerId || "p-custom",
      playerName: `${targetPlayer.display_name} #${targetPlayer.shirt_number || "DELTA"}`,
      challengeKey: targetChallenge.key,
      challengeTitle: targetChallenge.title.replace(/^[^\s]+\s/, ""),
      scoreResult: scoreInput.trim(),
      trainingContext: trainingNote.trim() || "Próba na treningu",
      submittedAt: "Przed chwilą",
      status: "pending"
    };

    setSubmissions(prev => [newSub, ...prev]);
    cardSound.playPurchase();
    setSubmittedSuccess(true);
    setScoreInput("");

    setTimeout(() => {
      setSubmittedSuccess(false);
      setActiveTab("skills");
    }, 2000);
  };

  // Coach approves record
  const handleApprove = (subId: string) => {
    cardSound.playWalkoutFanfare();
    setCelebrating(true);
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "approved", coachNote: "Zatwierdzone przez Trenera!" } : s));
    setTimeout(() => setCelebrating(false), 2000);
  };

  // Coach rejects record
  const handleReject = (subId: string) => {
    cardSound.playHover();
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "rejected", coachNote: "Wymagana ponowna próba na treningu." } : s));
  };

  // Submit Coach Corner Idea
  const handleSendIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaText.trim()) return;

    cardSound.playWalkoutFanfare();
    setIdeaSubmitted(true);
    setIdeaText("");
    setTimeout(() => setIdeaSubmitted(false), 3000);
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

      <div className="v200-coach-modal animate-scaleUp">
        {/* Header */}
        <div className="v200-coach-header">
          <div className="v200-coach-header-left">
            <div className="v200-coach-badge">
              <Award size={14} className="text-yellow-400 animate-pulse" />
              <span>SZTAB SZKOLENIOWY DELTA WARSZAWA</span>
            </div>
            <h2>KĄCIK TRENERA & SKILL MASTER ⚽</h2>
            <p>Zadania domowe, oficjalne próby bicia rekordów pod okiem trenera oraz bank inspiracji!</p>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="v200-coach-close-btn"
            aria-label="Zamknij"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="v200-coach-tabs-row">
          <button
            type="button"
            onClick={() => setActiveTab("skills")}
            className={`v200-coach-tab-btn ${activeTab === "skills" ? "active" : ""}`}
          >
            <Trophy size={16} />
            <span>TABLICA REKORDÓW SKILL MASTER</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("submit")}
            className={`v200-coach-tab-btn ${activeTab === "submit" ? "active" : ""}`}
          >
            <Plus size={16} />
            <span>WPISZ WYNIK Z PRÓBY NA TRENINGU</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inspiration")}
            className={`v200-coach-tab-btn ${activeTab === "inspiration" ? "active" : ""}`}
          >
            <Lightbulb size={16} />
            <span>KĄCIK INSPIRACJI & ZADANIA DOMOWE</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="v200-coach-body custom-scrollbar">
          {/* ================= TAB 1: SKILL MASTER CHALLENGES & RECORDS ================= */}
          {activeTab === "skills" && (
            <div className="v200-skills-view animate-fadeIn">
              {/* How it works info card */}
              <div className="v200-skill-rules-banner">
                <div className="v200-rules-header">
                  <Flame size={20} className="text-red-500 animate-pulse" />
                  <h4>JAK DZIAŁA SKILL MASTER? ZASADY OFICJALNYCH PRÓB:</h4>
                </div>
                <div className="v200-rules-steps-grid">
                  <div className="v200-rule-step">
                    <span className="v200-step-num">1</span>
                    <p><strong>Podejdź do trenera na treningu</strong> i powiedz, że chcesz wykonać oficjalną próbę bicia rekordu.</p>
                  </div>
                  <div className="v200-rule-step">
                    <span className="v200-step-num">2</span>
                    <p>Gdy trener ma chwilę czasu i wyrazi zgodę, <strong>wykonujesz próbę pod jego okiem</strong>.</p>
                  </div>
                  <div className="v200-rule-step">
                    <span className="v200-step-num">3</span>
                    <p>Po udanej próbie <strong>wpisujesz wynik w aplikacji</strong>, a trener lub administrator zatwierdza Twój rekord na oficjalnej tablicy!</p>
                  </div>
                </div>
              </div>

              {/* Challenge cards grid */}
              <div className="v200-challenges-grid">
                {SKILL_CHALLENGES.map(ch => (
                  <div key={ch.key} className="v200-challenge-card">
                    <div className="v200-ch-top">
                      <span className="v200-ch-badge">{ch.badge}</span>
                      <h4 className="v200-ch-title">{ch.title}</h4>
                    </div>
                    <p className="v200-ch-desc">{ch.desc}</p>
                    
                    <div className="v200-ch-tiers">
                      {ch.tiers.map((t, idx) => (
                        <div key={idx} className="v200-tier-pill">
                          <span>{t.emoji} {t.name}:</span>
                          <strong>{t.req}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hall of Fame / Approved Records Table */}
              <div className="v200-records-board">
                <div className="v200-records-header">
                  <div>
                    <span className="v200-rec-eyebrow">
                      <Crown size={14} className="text-yellow-400 inline mr-1" />
                      OFICJALNA TABLICA REKORDÓW DELTY
                    </span>
                    <h3 className="v200-rec-title">ZATWIERDZENI MISTRZOWIE TECHNIKI</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("submit")}
                    className="v200-add-record-btn"
                  >
                    <Plus size={14} />
                    <span>WPISZ REKORD Z TRENINGU</span>
                  </button>
                </div>

                <div className="v200-records-list">
                  {submissions.map(sub => {
                    const isApproved = sub.status === "approved";
                    const isRejected = sub.status === "rejected";

                    return (
                      <div key={sub.id} className={`v200-record-row ${isApproved ? "approved" : isRejected ? "rejected" : "pending"}`}>
                        <div className="v200-rec-left">
                          <div className="v200-rec-icon">
                            {isApproved ? "🥇" : isRejected ? "❌" : "⏳"}
                          </div>
                          <div>
                            <strong className="v200-rec-pname">{sub.playerName}</strong>
                            <div className="v200-rec-meta">
                              <span>{sub.challengeTitle}</span> • <span className="v200-rec-score">{sub.scoreResult}</span>
                              <span className="v200-rec-context"> ({sub.trainingContext})</span>
                            </div>
                            {sub.coachNote && (
                              <p className="v200-coach-feedback">
                                💬 <em>Trener: „{sub.coachNote}”</em>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="v200-rec-status-col">
                          {isApproved ? (
                            <span className="v200-status-badge approved">
                              <CheckCircle2 size={13} className="inline mr-1" /> ZATWIERDZONE PRZEZ TRENERA
                            </span>
                          ) : isRejected ? (
                            <span className="v200-status-badge rejected">
                              <X size={13} className="inline mr-1" /> POWTÓRZ PRÓBĘ
                            </span>
                          ) : (
                            <div className="v200-pending-actions">
                              <span className="v200-status-badge pending">
                                <Clock size={13} className="inline mr-1" /> CZEKA NA ZATWIERDZENIE
                              </span>

                              {/* Coach or Admin Approval Buttons */}
                              <button
                                type="button"
                                onClick={() => handleApprove(sub.id)}
                                className="v200-approve-btn"
                                title="Kliknij jako Trener / Administrator, aby zatwierdzić rekord"
                              >
                                <Check size={14} /> Zatwierdź
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReject(sub.id)}
                                className="v200-reject-btn"
                                title="Odrzuć lub poproś o powtórzenie"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: SUBMIT RECORD FORM ================= */}
          {activeTab === "submit" && (
            <div className="v200-submit-view animate-fadeIn">
              <div className="v200-submit-card">
                <div className="v200-submit-header">
                  <Target size={24} className="text-yellow-400" />
                  <div>
                    <h3>WPISZ WYNIK Z UDANEJ PRÓBY NA TRENINGU</h3>
                    <p>Udało Ci się zrobić rekord pod okiem trenera na treningu? Wpisz wynik poniżej, a trener lub administrator zatwierdzi go na oficjalnej tablicy!</p>
                  </div>
                </div>

                {submittedSuccess ? (
                  <div className="v200-submit-success animate-scaleUp">
                    <CheckCircle2 size={44} className="text-green-400" />
                    <h4>BRAWO! WYNIK ZOSTAŁ WPISANY DO SYSTEMU!</h4>
                    <p>Trener lub administrator potwierdzi wpis i Twój rekord pojawi się na oficjalnej Tablicy Rekordów DELTY!</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitRecord} className="v200-submit-form">
                    <div className="v200-form-row">
                      <div className="v200-form-field">
                        <label>Wybierz zawodnika</label>
                        <select
                          value={selectedPlayerId}
                          onChange={(e) => setSelectedPlayerId(e.target.value)}
                          className="v200-input"
                          required
                        >
                          {players.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.display_name} #{p.shirt_number || "DELTA"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="v200-form-field">
                        <label>Kategoria wyzwania</label>
                        <select
                          value={selectedChallengeKey}
                          onChange={(e) => setSelectedChallengeKey(e.target.value)}
                          className="v200-input"
                        >
                          {SKILL_CHALLENGES.map(ch => (
                            <option key={ch.key} value={ch.key}>{ch.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="v200-form-field">
                      <label>Osiągnięty wynik na treningu (np. 35 żonglerek / 8.6 sekundy / 3 trafienia)</label>
                      <input
                        type="text"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        placeholder="Wpisz uzyskany wynik..."
                        className="v200-input"
                        required
                      />
                    </div>

                    <div className="v200-form-field">
                      <label>Kiedy i przy kim wykonano próbę?</label>
                      <input
                        type="text"
                        value={trainingNote}
                        onChange={(e) => setTrainingNote(e.target.value)}
                        placeholder="np. Próba wykonana przed wtorkowym treningiem pod okiem trenera"
                        className="v200-input"
                      />
                    </div>

                    <div className="v200-submit-disclaimer">
                      <UserCheck size={16} className="text-yellow-400 flex-shrink-0" />
                      <span>Pamiętaj: Rekord musi być wykonany na żywo pod okiem trenera, aby został oficjalnie zatwierdzony w klasyfikacji.</span>
                    </div>

                    <button type="submit" className="v200-form-submit-btn">
                      <Send size={16} />
                      <span>ZAPISZ REKORD DO ZATWIERDZENIA</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: INSPIRATION & COACH THOUGHTS ================= */}
          {activeTab === "inspiration" && (
            <div className="v200-inspire-view animate-fadeIn">
              {/* Wisdom & Homework */}
              <div className="v200-wisdom-card">
                <div className="v200-wisdom-tag">
                  <Sparkles size={14} className="text-yellow-400" />
                  <span>MĄDROŚĆ PIŁKARSKA TRENERA NA TEN TYDZIEŃ</span>
                </div>
                <blockquote className="v200-wisdom-quote">
                  „Prawdziwy mistrz trenuje nawet wtedy, gdy nikt nie patrzy. Każda minuta spędzona z piłką przy nodze w domu, na podwórku czy w ogrodzie daje Ci pewność siebie podczas meczu ligowego!”
                </blockquote>
                <span className="v200-wisdom-author">— Sztab Szkoleniowy DELTA Warszawa 2018 GM</span>
              </div>

              {/* Training homework */}
              <div className="v200-homework-box">
                <div className="v200-hw-header">
                  <Zap size={20} className="text-yellow-400" />
                  <h4>ĆWICZENIE TYGODNIA DO DOMU: „MAGICZNE V-PULL”</h4>
                </div>
                <p className="v200-hw-text">
                  <strong>Instrukcja dla chłopaków:</strong> Pociągnij piłkę podeszwą prawej nogi do tyłu, po czym wewnętrzną częścią stopy wypchnij ją pod kątem w lewo. Powtórz lewą nogą! Zrób 3 serie po 20 powtórzeń dziennie przed kolejnym treningiem.
                </p>
              </div>

              {/* Ideas & Brainstorming Box */}
              <div className="v200-idea-box">
                <div className="v200-idea-top">
                  <Lightbulb size={24} className="text-yellow-400" />
                  <div>
                    <h4>SZUKAMY POMYSŁÓW I INSPIRACJI! 💡</h4>
                    <p>Masz pomysł na nowe wyzwanie, urozmaicenie treningu lub ciekawe ćwiczenie dla chłopaków? Napisz do nas!</p>
                  </div>
                </div>

                {ideaSubmitted ? (
                  <div className="v200-idea-thankyou animate-fadeIn">
                    <CheckCircle2 size={32} className="text-green-400" />
                    <span>Dziękujemy za przesłanie pomysłu! Sztab szkoleniowy zapozna się z Twoją propozycją.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendIdea} className="v200-idea-form">
                    <textarea
                      value={ideaText}
                      onChange={(e) => setIdeaText(e.target.value)}
                      placeholder="Wpisz swój pomysł, inspirację lub propozycję nowego ćwiczenia..."
                      className="v200-textarea"
                      rows={3}
                      required
                    />
                    <button type="submit" className="v200-send-idea-btn">
                      <Send size={15} />
                      <span>PRZEŚLIJ POMYSŁ DO TRENERA</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
