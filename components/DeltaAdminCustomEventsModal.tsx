"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  CalendarDays, 
  Plus, 
  MapPin, 
  Clock, 
  Users, 
  Sparkles, 
  Check, 
  Trash2, 
  Trophy, 
  Gamepad2, 
  HeartHandshake, 
  Bus, 
  BrainCircuit,
  Info
} from "lucide-react";

interface CustomEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  max_participants: number | null;
  image_url: string | null;
  is_active: boolean;
}

interface DeltaAdminCustomEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
}

const EVENT_TYPES = [
  { id: "mini_game", label: "Mini-Gry / Gierka", icon: Gamepad2, color: "#38bdf8" },
  { id: "tournament", label: "Turniej Wewnętrzny", icon: Trophy, color: "#f1c95c" },
  { id: "integration", label: "Integracja Drużyny", icon: HeartHandshake, color: "#ec4899" },
  { id: "trip", label: "Wyjazd / Wyjście", icon: Bus, color: "#34d399" },
  { id: "workshop", label: "Odprawa / Warsztaty", icon: BrainCircuit, color: "#a78bfa" },
];

export default function DeltaAdminCustomEventsModal({
  isOpen,
  onClose,
  onEventCreated
}: DeltaAdminCustomEventsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("mini_game");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [location, setLocation] = useState("Boisko Jordanek");
  const [maxParticipants, setMaxParticipants] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadEvents = () => {
    setLoading(true);
    fetch("/api/events/custom")
      .then(res => res.json())
      .then(data => {
        if (data?.events) setEvents(data.events);
      })
      .catch(err => console.error("Error loading events:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      alert("Proszę podać nazwę wydarzenia oraz datę!");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/events/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          event_date: eventDate,
          start_time: startTime || null,
          location: location.trim() || null,
          max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTitle("");
        setDescription("");
        setMaxParticipants("");
        loadEvents();
        if (onEventCreated) onEventCreated();
      } else {
        alert(data.error || "Nie udało się utworzyć wydarzenia.");
      }
    } catch (err: any) {
      alert("Błąd połączenia: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventTitle: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć wydarzenie "${eventTitle}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/custom?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(prev => prev.filter(ev => ev.id !== id));
        if (onEventCreated) onEventCreated();
      } else {
        alert(data.error || "Nie udało się usunąć wydarzenia.");
      }
    } catch (err: any) {
      alert("Błąd połączenia: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeMeta = (typeId: string) => {
    return EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[0];
  };

  return createPortal(
    <div 
      className="delta-events-modal-overlay" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true"
    >
      <div 
        className="delta-events-modal-dialog" 
        onClick={e => e.stopPropagation()}
      >
        {/* Dekoracyjne podświetlenie nagłówka */}
        <div className="delta-events-modal-glow" aria-hidden="true" />

        {/* Nagłówek Modalu */}
        <header className="delta-events-header">
          <div className="delta-events-header-left">
            <div className="delta-events-header-icon-box">
              <CalendarDays size={24} className="text-gold" />
            </div>
            <div>
              <span className="delta-events-eyebrow">
                <Sparkles size={13} /> ADMINISTRACJA WYDARZENIAMI DELTA
              </span>
              <h2>DODATKOWE WYDARZENIA DRUŻYNY</h2>
              <p>Twórz i zarządzaj specjalnymi grami, turniejami wewnętrznymi i wyjazdami.</p>
            </div>
          </div>
          <button 
            type="button" 
            className="delta-events-close-btn" 
            onClick={onClose} 
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </header>

        {/* Zawartość modalu */}
        <div className="delta-events-modal-body">
          {/* Formularz tworzenia nowego wydarzenia */}
          <form onSubmit={handleCreateEvent} className="delta-events-form">
            <div className="delta-events-form-title">
              <Plus size={16} className="text-gold" />
              <span>UTWÓRZ NOWE WYDARZENIE SPECJALNE</span>
            </div>

            {/* Nazwa wydarzenia */}
            <div className="delta-events-field">
              <label className="delta-events-label">Nazwa Wydarzenia *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="np. Mini-Gry na Jordanku / Turniej Wewnętrzny / Wyjście do kina"
                className="delta-events-input"
              />
            </div>

            {/* Typ wydarzenia - Pigułki wyboru */}
            <div className="delta-events-field">
              <label className="delta-events-label">Kategoria Wydarzenia</label>
              <div className="delta-events-type-grid">
                {EVENT_TYPES.map(type => {
                  const IconComp = type.icon;
                  const isSelected = eventType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEventType(type.id)}
                      className={`delta-events-type-chip ${isSelected ? "selected" : ""}`}
                      style={{
                        borderColor: isSelected ? type.color : undefined,
                        boxShadow: isSelected ? `0 0 14px ${type.color}40` : undefined
                      }}
                    >
                      <IconComp size={15} style={{ color: type.color }} />
                      <span>{type.label}</span>
                      {isSelected && <Check size={14} className="delta-chip-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3-kolumnowy wiersz: Data, Godzina, Limit Miejsc */}
            <div className="delta-events-grid-3">
              <div className="delta-events-field">
                <label className="delta-events-label">
                  <CalendarDays size={13} className="text-gold" /> Data Spotkania *
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="delta-events-input"
                />
              </div>

              <div className="delta-events-field">
                <label className="delta-events-label">
                  <Clock size={13} className="text-gold" /> Godzina Rozpoczęcia
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="delta-events-input"
                />
              </div>

              <div className="delta-events-field">
                <label className="delta-events-label">
                  <Users size={13} className="text-gold" /> Limit Miejsc (opcjonalny)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxParticipants}
                  onChange={e => setMaxParticipants(e.target.value)}
                  placeholder="Brak limitu"
                  className="delta-events-input"
                />
              </div>
            </div>

            {/* Lokalizacja */}
            <div className="delta-events-field">
              <label className="delta-events-label">
                <MapPin size={13} className="text-gold" /> Miejsce / Boisko
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="np. Boisko Jordanek / Mokotów"
                className="delta-events-input"
              />
            </div>

            {/* Opis dla rodziców */}
            <div className="delta-events-field">
              <label className="delta-events-label">
                <Info size={13} className="text-gold" /> Opis & Szczegóły dla Rodziców
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Dodatkowe informacje, wymagany strój, zbiórka, zasady..."
                className="delta-events-textarea"
              />
            </div>

            {/* Przycisk publikacji */}
            <div className="delta-events-form-actions">
              <button
                type="submit"
                disabled={creating}
                className="delta-events-submit-btn"
              >
                <Plus size={16} /> 
                <span>{creating ? "Publikowanie…" : "OPUBLIKUJ WYDARZENIE SPECJALNE"}</span>
              </button>
            </div>
          </form>

          {/* Lista zaplanowanych wydarzeń */}
          <div className="delta-events-list-section">
            <div className="delta-events-list-header">
              <h3>
                ZAPLANOWANE WYDARZENIA 
                <span className="delta-events-count-badge">{events.length}</span>
              </h3>
            </div>

            {loading ? (
              <div className="delta-events-loading">
                <Sparkles size={20} className="animate-spin text-gold" />
                <span>Ładowanie listy wydarzeń...</span>
              </div>
            ) : events.length > 0 ? (
              <div className="delta-events-grid">
                {events.map(ev => {
                  const meta = getTypeMeta(ev.event_type);
                  const IconComp = meta.icon;
                  const isDeleting = deletingId === ev.id;

                  return (
                    <article key={ev.id} className="delta-events-card">
                      <div className="delta-events-card-left">
                        <div className="delta-events-date-badge">
                          <span className="delta-date-day">{ev.event_date.split("-")[2] || ev.event_date}</span>
                          <span className="delta-date-month">{ev.event_date.split("-")[1] || "PAŹ"}</span>
                        </div>
                        <div className="delta-events-card-info">
                          <div className="delta-events-card-top-row">
                            <h4>{ev.title}</h4>
                            <span 
                              className="delta-events-card-tag"
                              style={{ 
                                color: meta.color,
                                background: `${meta.color}18`,
                                borderColor: `${meta.color}40`
                              }}
                            >
                              <IconComp size={12} /> {meta.label}
                            </span>
                          </div>

                          <div className="delta-events-card-meta-row">
                            {ev.start_time && (
                              <span><Clock size={12} /> {ev.start_time}</span>
                            )}
                            <span><MapPin size={12} /> {ev.location || "Mokotów"}</span>
                            {ev.max_participants && (
                              <span><Users size={12} /> Limit: {ev.max_participants} os.</span>
                            )}
                          </div>

                          {ev.description && (
                            <p className="delta-events-card-desc">{ev.description}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id, ev.title)}
                        disabled={isDeleting}
                        className="delta-events-delete-btn"
                        title="Usuń wydarzenie"
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="delta-events-empty">
                <div className="delta-events-empty-icon">
                  <CalendarDays size={32} />
                </div>
                <h4>Brak zaplanowanych wydarzeń specjalnych</h4>
                <p>Wypełnij powyższy formularz, aby zaplanować mini-grę, turniej lub wyjazd dla drużyny.</p>
              </div>
            )}
          </div>
        </div>

        {/* Stopka modalu */}
        <footer className="delta-events-footer">
          <button 
            type="button" 
            className="delta-events-close-footer-btn" 
            onClick={onClose}
          >
            ZAMKNIJ OKNO
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

