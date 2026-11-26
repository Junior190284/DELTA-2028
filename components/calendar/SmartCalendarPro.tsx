"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquare,
  FileText,
  AlertCircle,
  ExternalLink,
  Lock,
  Eye,
  Info,
  CalendarDays,
  Send,
  Flag,
  Sparkles,
  Trophy,
  Activity
} from "lucide-react";
import {
  SmartCalendarItem,
  SmartCalendarCategory,
  SmartCalendarVisibility,
  SmartCalendarStatus,
  SmartCalendarComment,
  SmartCalendarPrivateNote,
  CALENDAR_CATEGORIES,
  CALENDAR_STATUS_LABELS,
  CALENDAR_VISIBILITY_LABELS
} from "@/lib/calendar/smartCalendarTypes";

export interface SmartCalendarProProps {
  initialEvents: SmartCalendarItem[];
  currentUser: {
    id: string;
    role: string;
    name?: string;
  };
  userChildPlayerIds?: string[];
  isSimulation?: boolean; // Jeśli true, wszystkie zapisy są 100% in-memory (dla QA Playground)
  onNavigateToMatchHub?: () => void;
  onNavigateToTrainingCenter?: () => void;
}

export default function SmartCalendarPro({
  initialEvents,
  currentUser,
  userChildPlayerIds = [],
  isSimulation = false,
  onNavigateToMatchHub,
  onNavigateToTrainingCenter
}: SmartCalendarProProps) {
  // Stan wydarzeń
  const [events, setEvents] = useState<SmartCalendarItem[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<SmartCalendarItem | null>(null);

  // Widok kalendarza: month | week | list
  const [calendarView, setCalendarView] = useState<"month" | "week" | "list">("list");
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 10, 26)); // Domyślnie listopad 2026

  // Filtrowanie kategorii
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<string>("all");

  // Formularz dodawania / edycji
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SmartCalendarItem | null>(null);

  // Pola formularza
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<SmartCalendarCategory>("individual_training");
  const [formDate, setFormDate] = useState("2026-11-26");
  const [formStartTime, setFormStartTime] = useState("18:00");
  const [formEndTime, setFormEndTime] = useState("19:30");
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formLocation, setFormLocation] = useState("Boisko Treningowe / Hala");
  const [formDescription, setFormDescription] = useState("");
  const [formVisibility, setFormVisibility] = useState<SmartCalendarVisibility>("private");

  // Komentarze i prywatne notatki (w pamięci dla pojedynczych zdarzeń)
  const [comments, setComments] = useState<Record<string, SmartCalendarComment[]>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [privateNotes, setPrivateNotes] = useState<Record<string, string>>({});
  const [activePrivateNoteText, setActivePrivateNoteText] = useState("");

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isStaff = currentUser.role === "admin" || currentUser.role === "coach";

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filtrowanie wydarzeń
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
      if (selectedVisibilityFilter !== "all" && e.visibility !== selectedVisibilityFilter) return false;
      return true;
    }).sort((a, b) => `${a.event_date} ${a.start_time || ""}`.localeCompare(`${b.event_date} ${b.start_time || ""}`));
  }, [events, selectedCategory, selectedVisibilityFilter]);

  // Obsługa otwierania formularza
  const handleOpenAddForm = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCategory(isStaff ? "training" : "individual_training");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStartTime("17:30");
    setFormEndTime("19:00");
    setFormIsAllDay(false);
    setFormLocation("");
    setFormDescription("");
    setFormVisibility(isStaff ? "public" : "private");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: SmartCalendarItem) => {
    // Weryfikacja: Rodzic nie może edytować oficjalnych treningów ani meczów
    if (!isStaff && (item.is_official || item.created_by !== currentUser.id)) {
      alert("Nie masz uprawnień do edycji tego wydarzenia. Oficjalne mecze i treningi może modyfikować wyłącznie sztab.");
      return;
    }
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormDate(item.event_date);
    setFormStartTime(item.start_time || "");
    setFormEndTime(item.end_time || "");
    setFormIsAllDay(Boolean(item.is_all_day));
    setFormLocation(item.location || "");
    setFormDescription(item.description || "");
    setFormVisibility(item.visibility);
    setIsFormOpen(true);
  };

  // Zapis formularza
  const handleSaveForm = async () => {
    if (!formTitle.trim()) {
      alert("Podaj nazwę wydarzenia.");
      return;
    }
    if (!formDate) {
      alert("Wybierz datę.");
      return;
    }

    if (editingItem) {
      // Aktualizacja istniejącego
      const updatedItem: SmartCalendarItem = {
        ...editingItem,
        title: formTitle.trim(),
        category: formCategory,
        event_date: formDate,
        start_time: formIsAllDay ? null : formStartTime || null,
        end_time: formIsAllDay ? null : formEndTime || null,
        is_all_day: formIsAllDay,
        location: formLocation.trim() || null,
        description: formDescription.trim() || null,
        visibility: formVisibility,
      };

      if (!isSimulation) {
        try {
          await fetch("/api/calendar/events", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedItem),
          });
        } catch (e) {
          console.error("API error", e);
        }
      }

      setEvents(prev => prev.map(e => e.id === editingItem.id ? updatedItem : e));
      if (selectedEvent?.id === editingItem.id) setSelectedEvent(updatedItem);
      triggerToast("✓ Zaktualizowano wydarzenie.");
    } else {
      // Nowe wydarzenie
      const newItem: SmartCalendarItem = {
        id: `cal-ev-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        event_date: formDate,
        start_time: formIsAllDay ? null : formStartTime || null,
        end_time: formIsAllDay ? null : formEndTime || null,
        is_all_day: formIsAllDay,
        location: formLocation.trim() || null,
        description: formDescription.trim() || null,
        organizer: isStaff ? "Sztab DELTA" : currentUser.name || "Użytkownik",
        visibility: formVisibility,
        status: "scheduled",
        is_official: isStaff && formVisibility === "public",
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      };

      if (!isSimulation) {
        try {
          await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newItem),
          });
        } catch (e) {
          console.error("API error", e);
        }
      }

      setEvents(prev => [...prev, newItem]);
      triggerToast("✓ Dodano nowe wydarzenie do kalendarza.");
    }

    setIsFormOpen(false);
  };

  // Usuwanie wydarzenia
  const handleDeleteEvent = async (id: string) => {
    const item = events.find(e => e.id === id);
    if (!item) return;

    if (!isStaff && (item.is_official || item.created_by !== currentUser.id)) {
      alert("Brak uprawnień do usunięcia tego wydarzenia.");
      return;
    }

    if (!confirm("Czy na pewno chcesz usunąć to wydarzenie z kalendarza?")) return;

    if (!isSimulation) {
      try {
        await fetch(`/api/calendar/events?id=${id}`, { method: "DELETE" });
      } catch (e) {
        console.error("Delete error", e);
      }
    }

    setEvents(prev => prev.filter(e => e.id !== id));
    if (selectedEvent?.id === id) setSelectedEvent(null);
    triggerToast("✓ Wydarzenie zostało usunięte.");
  };

  // Komentarze
  const handleAddComment = () => {
    if (!selectedEvent || !newCommentText.trim()) return;
    const comment: SmartCalendarComment = {
      id: `comm-${Date.now()}`,
      event_id: selectedEvent.id,
      user_id: currentUser.id,
      author_name: currentUser.name || "Rodzic",
      author_role: (currentUser.role as any) || "parent",
      content: newCommentText.trim(),
      is_edited: false,
      created_at: new Date().toISOString(),
    };

    setComments(prev => ({
      ...prev,
      [selectedEvent.id]: [...(prev[selectedEvent.id] || []), comment],
    }));
    setNewCommentText("");
    triggerToast("✓ Komentarz został opublikowany.");
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedEvent) return;
    setComments(prev => ({
      ...prev,
      [selectedEvent.id]: (prev[selectedEvent.id] || []).filter(c => c.id !== commentId),
    }));
    triggerToast("✓ Komentarz został usunięty.");
  };

  // Prywatne notatki
  const handleSavePrivateNote = () => {
    if (!selectedEvent) return;
    setPrivateNotes(prev => ({
      ...prev,
      [selectedEvent.id]: activePrivateNoteText.trim(),
    }));
    triggerToast("✓ Zapisano prywatną notatkę rodzica.");
  };

  return (
    <div className="space-y-6">
      
      {/* TOAST FEEDBACK */}
      {toastMsg && (
        <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check size={14} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER & ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
            <CalendarDays size={16} />
            <span>SMART CALENDAR PRO • DELTA ELITE 4.1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white m-0">
            Harmonogram Drużyny & Kalendarz Osobisty
          </h2>
          <p className="text-xs text-slate-400 m-0 mt-0.5">
            Treningi, mecze, konsultacje, turnieje oraz indywidualne wydarzenia zawodnika
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* VIEW SWITCHER */}
          <div className="flex items-center rounded-xl bg-black/40 border border-white/10 p-1">
            <button
              onClick={() => setCalendarView("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calendarView === "list" ? "bg-amber-500 text-black font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calendarView === "week" ? "bg-amber-500 text-black font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Tydzień
            </button>
            <button
              onClick={() => setCalendarView("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calendarView === "month" ? "bg-amber-500 text-black font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Miesiąc
            </button>
          </div>

          {/* ADD EVENT BUTTON */}
          <button
            onClick={handleOpenAddForm}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg shadow-amber-950/40"
          >
            <Plus size={15} />
            <span>Dodaj Wydarzenie</span>
          </button>
        </div>
      </div>

      {/* CATEGORY & VISIBILITY FILTERS */}
      <div className="p-4 rounded-2xl bg-white/[0.015] border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter size={13} className="text-amber-400" />
          <span>Filtruj według kategorii:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              selectedCategory === "all"
                ? "bg-amber-500 text-black font-black"
                : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/5"
            }`}
          >
            Wszystkie ({events.length})
          </button>
          {CALENDAR_CATEGORIES.map(cat => {
            const count = events.filter(e => e.category === cat.key).length;
            if (count === 0 && selectedCategory !== cat.key) return null;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.key
                    ? "bg-amber-500 text-black font-black"
                    : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/5"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                <span>{cat.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN VIEW: LIST OF EVENTS */}
      {calendarView === "list" && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-2">
              <CalendarIcon size={32} className="mx-auto text-slate-600" />
              <h4 className="text-base font-bold text-white m-0">Brak wydarzeń w wybranym filtrze</h4>
              <p className="text-xs text-slate-400 m-0">
                Możesz dodać nową pozycję do kalendarza za pomocą przycisku powyżej.
              </p>
            </div>
          ) : (
            filteredEvents.map(item => {
              const catConfig = CALENDAR_CATEGORIES.find(c => c.key === item.category) || CALENDAR_CATEGORIES[CALENDAR_CATEGORIES.length - 1];
              const statusConfig = CALENDAR_STATUS_LABELS[item.status] || CALENDAR_STATUS_LABELS.scheduled;
              const isPast = new Date(item.event_date) < new Date(new Date().setHours(0, 0, 0, 0));
              const eventComments = comments[item.id] || [];

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedEvent(item);
                    setActivePrivateNoteText(privateNotes[item.id] || "");
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selectedEvent?.id === item.id
                      ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-950/20"
                      : "bg-white/[0.025] hover:bg-white/[0.04] border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Category indicator icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                      {item.category === "match" ? "⚽" : item.category === "training" ? "🏃" : item.category === "tournament" ? "🏆" : "📅"}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                          {catConfig.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusConfig.badge}`}>
                          {statusConfig.label}
                        </span>
                        {item.visibility !== "public" && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                            <Lock size={10} />
                            <span>{CALENDAR_VISIBILITY_LABELS[item.visibility]?.label}</span>
                          </span>
                        )}
                        {item.important && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            WAŻNE
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-white m-0 truncate">
                        {item.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <CalendarIcon size={12} className="text-amber-400" />
                          <span>{item.event_date}</span>
                        </div>
                        {item.start_time && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-amber-400" />
                            <span>{item.start_time} {item.end_time ? `- ${item.end_time}` : ""}</span>
                          </div>
                        )}
                        {item.location && (
                          <div className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin size={12} className="text-amber-400 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {eventComments.length > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-slate-300 text-xs flex items-center gap-1">
                        <MessageSquare size={12} />
                        <span>{eventComments.length}</span>
                      </span>
                    )}

                    {privateNotes[item.id] && (
                      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs flex items-center gap-1" title="Posiada prywatną notatkę rodzica">
                        <FileText size={12} />
                      </span>
                    )}

                    <span className="text-xs font-bold text-amber-400 hover:text-amber-300">
                      Szczegóły →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MONTH VIEW (CALENDAR GRID) */}
      {calendarView === "month" && (
        <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Listopad 2026 • Widok Miesiąca
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Month grid mockup */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map(d => (
              <div key={d} className="p-2 font-black text-slate-500 uppercase">{d}</div>
            ))}
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const dateStr = `2026-11-${String(day).padStart(2, "0")}`;
              const dayEvents = filteredEvents.filter(e => e.event_date === dateStr);

              return (
                <div
                  key={day}
                  onClick={() => dayEvents[0] && setSelectedEvent(dayEvents[0])}
                  className={`min-h-[70px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    dayEvents.length > 0
                      ? "bg-white/[0.04] border-amber-500/30 hover:border-amber-400 cursor-pointer"
                      : "bg-white/[0.01] border-white/5 opacity-60"
                  }`}
                >
                  <span className="font-bold text-slate-400 text-[10px]">{day}</span>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold truncate"
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-500 font-bold block">
                        +{dayEvents.length - 2} więcej
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {calendarView === "week" && (
        <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="border-b border-white/5 pb-3">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Tydzień: 23 Listopada – 29 Listopada 2026
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {[23, 24, 25, 26, 27, 28, 29].map(day => {
              const dateStr = `2026-11-${day}`;
              const dayEvents = filteredEvents.filter(e => e.event_date === dateStr);

              return (
                <div
                  key={day}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2"
                >
                  <span className="text-xs font-bold text-amber-400 block border-b border-white/5 pb-1">
                    {day} Listopada
                  </span>

                  {dayEvents.length === 0 ? (
                    <span className="text-[10px] text-slate-600 italic">Brak wydarzeń</span>
                  ) : (
                    dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-bold cursor-pointer hover:brightness-125"
                      >
                        <div className="text-[10px] opacity-75">{ev.start_time || "Całodniowe"}</div>
                        <div className="truncate">{ev.title}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: EVENT DETAILS & COMMENTS */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#121622] border border-white/15 p-5 sm:p-6 space-y-5 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {CALENDAR_CATEGORIES.find(c => c.key === selectedEvent.category)?.label || selectedEvent.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-white/5 text-slate-300">
                    {CALENDAR_STATUS_LABELS[selectedEvent.status]?.label || selectedEvent.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                    <Lock size={10} />
                    <span>{CALENDAR_VISIBILITY_LABELS[selectedEvent.visibility]?.label}</span>
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white m-0">
                  {selectedEvent.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Event Info Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Data i czas:</span>
                  <strong className="text-white flex items-center gap-1.5">
                    <CalendarIcon size={13} className="text-amber-400" />
                    {selectedEvent.event_date} {selectedEvent.start_time ? `(${selectedEvent.start_time} - ${selectedEvent.end_time || ""})` : "(Cały dzień)"}
                  </strong>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Miejsce:</span>
                  <strong className="text-white flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{selectedEvent.location || "Nie określono"}</span>
                  </strong>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Organizator:</span>
                  <strong className="text-slate-200">
                    {selectedEvent.organizer || "Klub DELTA"}
                  </strong>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Zakres widoczności:</span>
                  <span className="text-purple-300 font-bold block">
                    {CALENDAR_VISIBILITY_LABELS[selectedEvent.visibility]?.desc}
                  </span>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-400 font-bold block">Opis i informacje:</span>
                  <p className="text-slate-200 leading-relaxed m-0 whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* MODULE CROSS-LINKS */}
              {(selectedEvent.category === "match" || selectedEvent.category === "training") && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <Sparkles size={16} />
                    <span>Oficjalne wydarzenie klubowe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedEvent.category === "match" && onNavigateToMatchHub && (
                      <button
                        onClick={() => {
                          setSelectedEvent(null);
                          onNavigateToMatchHub();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase flex items-center gap-1.5"
                      >
                        <Trophy size={13} />
                        <span>Przejdź do Match Hub</span>
                      </button>
                    )}
                    {selectedEvent.category === "training" && onNavigateToTrainingCenter && (
                      <button
                        onClick={() => {
                          setSelectedEvent(null);
                          onNavigateToTrainingCenter();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase flex items-center gap-1.5"
                      >
                        <Activity size={13} />
                        <span>Centrum Treningowe</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* PRIVATE PARENT NOTES SECTION */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <FileText size={14} />
                  <span>Prywatna notatka rodzica (widoczna tylko dla Ciebie):</span>
                </div>
                <textarea
                  value={activePrivateNoteText}
                  onChange={(e) => setActivePrivateNoteText(e.target.value)}
                  placeholder="np. zabrać ochraniacze, powrót z kolegą z drużyny..."
                  className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl p-2.5 text-xs resize-none h-16"
                />
                <button
                  onClick={handleSavePrivateNote}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Check size={13} />
                  <span>Zapisz notatkę</span>
                </button>
              </div>

              {/* EVENT COMMENTS SECTION */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <MessageSquare size={14} className="text-amber-400" />
                    <span>Komentarze ({(comments[selectedEvent.id] || []).length}):</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Moderowane przez sztab</span>
                </div>

                {/* Comments list */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(comments[selectedEvent.id] || []).length === 0 ? (
                    <p className="text-slate-500 italic text-[11px] m-0">Brak komentarzy. Bądź pierwszym, który skomentuje.</p>
                  ) : (
                    (comments[selectedEvent.id] || []).map(comm => (
                      <div key={comm.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-amber-300">
                            {comm.author_name} ({comm.author_role === "coach" ? "Trener" : comm.author_role === "admin" ? "Sztab" : "Rodzic"})
                          </span>
                          {(isStaff || comm.user_id === currentUser.id) && (
                            <button
                              onClick={() => handleDeleteComment(comm.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Usuń komentarz"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-200 m-0">{comm.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Napisz komentarz..."
                    className="flex-1 bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div>
                {(isStaff || selectedEvent.created_by === currentUser.id) && !selectedEvent.is_official && (
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Usuń Wydarzenie</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(isStaff || selectedEvent.created_by === currentUser.id) && !selectedEvent.is_official && (
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      handleOpenEditForm(selectedEvent);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Edit2 size={13} />
                    <span>Edytuj</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EVENT FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#121622] border border-white/15 p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white m-0">
                  {editingItem ? "Edycja Wydarzenia" : "Dodaj Nowe Wydarzenie"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Tytuł wydarzenia *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="np. Dodatkowy Trening Indywidualny / Basen"
                  className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Kategoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as SmartCalendarCategory)}
                    className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                  >
                    {CALENDAR_CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Zakres widoczności</label>
                  <select
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as SmartCalendarVisibility)}
                    className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="private">Prywatne (tylko Ty i dziecko)</option>
                    <option value="coach">Udostępnione trenerowi</option>
                    <option value="team_proposal">Propozycja dla drużyny</option>
                    {isStaff && <option value="public">Oficjalne klubowe (publiczne)</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Data *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Godzina startu</label>
                  <input
                    type="time"
                    disabled={formIsAllDay}
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 font-bold disabled:opacity-40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Godzina końca</label>
                  <input
                    type="time"
                    disabled={formIsAllDay}
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2 font-bold disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={formIsAllDay}
                  onChange={(e) => setFormIsAllDay(e.target.checked)}
                  className="rounded text-amber-500 bg-[#0a0d14] border-white/10"
                />
                <label htmlFor="allDayCheck" className="font-bold text-slate-300 cursor-pointer">
                  Wydarzenie całodniowe (bez konkretnych godzin)
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Lokalizacja</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="np. OSiR Mokotów / Boisko A"
                  className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl px-3 py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Opis / Dodatkowe uwagi</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Wskazówki, sprzęt, plan..."
                  className="w-full bg-[#0a0d14] text-white border border-white/10 rounded-xl p-2.5 resize-none h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveForm}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase shadow-md shadow-amber-950/40"
              >
                {editingItem ? "Zapisz Zmiany" : "Utwórz Wydarzenie"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
