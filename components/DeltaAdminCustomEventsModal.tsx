"use client";

import React, { useState, useEffect } from "react";
import { X, CalendarDays, Plus, MapPin, Clock, Users, Sparkles, Check, Trash2 } from "lucide-react";

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

export default function DeltaAdminCustomEventsModal({
  isOpen,
  onClose,
  onEventCreated
}: DeltaAdminCustomEventsModalProps) {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("mini_game");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [location, setLocation] = useState("Boisko Jordanek");
  const [maxParticipants, setMaxParticipants] = useState("");

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
    if (isOpen) loadEvents();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) {
      alert("Tytuł i data są wymagane!");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/events/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          event_type: eventType,
          event_date: eventDate,
          start_time: startTime,
          location,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTitle("");
        setDescription("");
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

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarDays size={22} />
            </div>
            <div>
              <span className="eyebrow gold">ADMINISTRACJA WYDARZENIAMI</span>
              <h2 className="text-xl font-black text-white m-0">DODATKOWE WYDARZENIA DRUŻYNY</h2>
            </div>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Form */}
          <form onSubmit={handleCreateEvent} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider m-0 flex items-center gap-1.5">
              <Plus size={14} /> Utwórz Nowe Wydarzenie Specjalne
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Nazwa Wydarzenia *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="np. Mini-Gry na Jordanku / Turniej Wewnętrzny / Wyjście do kina"
                className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Typ Wydarzenia</label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
                >
                  <option value="mini_game">⚽ Mini-Gry / Gierka</option>
                  <option value="tournament">🏆 Turniej Wewnętrzny</option>
                  <option value="integration">🤝 Spotkanie Integracyjne</option>
                  <option value="trip">🚌 Wyjście Drużyny</option>
                  <option value="workshop">🧠 Warsztaty / Odprawa</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Godzina</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Miejsce</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="np. Boisko Jordanek / Mokotów"
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Limit Miejsc (opcjonalny)</label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={e => setMaxParticipants(e.target.value)}
                  placeholder="Brak limitu"
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Opis & Szczegóły dla Rodziców</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Dodatkowe informacje, co zabrać, zbiórka itp."
                className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15 outline-none focus:border-amber-400"
              />
            </div>

            <div className="text-right pt-2">
              <button
                type="submit"
                disabled={creating}
                className="v200-tc-action-btn gold"
              >
                <Plus size={14} /> {creating ? "Tworzenie…" : "OPUBLIKUJ WYDARZENIE"}
              </button>
            </div>
          </form>

          {/* List of active events */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">
              Zaplanowane Wydarzenia ({events.length})
            </h3>

            {events.map(ev => (
              <div key={ev.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs text-white">{ev.title}</strong>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      {ev.event_type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><CalendarDays size={12}/> {ev.event_date} {ev.start_time || ""}</span>
                    <span className="flex items-center gap-1"><MapPin size={12}/> {ev.location || "Mokotów"}</span>
                    {ev.max_participants && (
                      <span className="flex items-center gap-1"><Users size={12}/> Max: {ev.max_participants}</span>
                    )}
                  </div>
                  {ev.description && <p className="text-[11px] text-slate-300 mt-1">{ev.description}</p>}
                </div>
              </div>
            ))}

            {events.length === 0 && !loading && (
              <p className="text-xs text-slate-500 text-center py-4">Brak zaplanowanych wydarzeń specjalnych.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex justify-end">
          <button type="button" className="v200-tc-action-btn" onClick={onClose}>
            ZAMKNIJ
          </button>
        </div>
      </div>
    </div>
  );
}
