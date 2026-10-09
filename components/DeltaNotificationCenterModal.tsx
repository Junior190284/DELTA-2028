'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  CalendarDays,
  Zap,
  Trophy,
  Sparkles,
  Camera,
  Video,
  AlertTriangle,
  Info,
  Layers,
  Flame,
  Check,
  Settings
} from 'lucide-react';
import type { DeltaSystemEvent, EventImportance } from '@/lib/events/types';
import {
  mapEventToCategory,
  groupEventsChronologically,
  sanitizeDeepLink,
  formatNotificationBadge,
  NOTIFICATION_FILTERS,
  NotificationCategory
} from '@/lib/events/notifications';

interface DeltaNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userRole?: string;
  parentPlayerIds?: string[];
  onNotificationRead?: () => void;
  onNavigate?: (tab: string, payload?: any) => void;
  onOpenSettings?: () => void;
}

export const DeltaNotificationCenterModal: React.FC<DeltaNotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  userRole = 'parent',
  parentPlayerIds = [],
  onNotificationRead,
  onNavigate,
  onOpenSettings,
}) => {
  const [events, setEvents] = useState<DeltaSystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationCategory>('all');
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events?userId=${encodeURIComponent(userId)}&limit=60`);
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
        const map: Record<string, boolean> = {};
        data.events.forEach((e: DeltaSystemEvent) => {
          if (e.is_read) map[e.id] = true;
        });
        setReadMap(map);
      }
    } catch (err) {
      console.error('Error fetching notification center events:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen, fetchEvents]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const unreadCount = useMemo(() => {
    return events.filter((e) => !readMap[e.id]).length;
  }, [events, readMap]);

  const badgeInfo = useMemo(() => {
    return formatNotificationBadge(unreadCount);
  }, [unreadCount]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const isRead = !!readMap[e.id];
      if (activeFilter === 'unread') return !isRead;
      if (activeFilter === 'all') return true;
      const cat = mapEventToCategory(e);
      return cat === activeFilter;
    });
  }, [events, activeFilter, readMap]);

  const grouped = useMemo(() => {
    return groupEventsChronologically(filteredEvents);
  }, [filteredEvents]);

  const handleMarkAsRead = async (eventId: string) => {
    if (readMap[eventId]) return;

    // Optimistic local update
    setReadMap((prev) => ({ ...prev, [eventId]: true }));

    try {
      await fetch('/api/events/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, eventId }),
      });
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error('Error marking event read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = events.filter((e) => !readMap[e.id]).map((e) => e.id);
    if (!unreadIds.length) return;

    // Optimistic update
    const next = { ...readMap };
    unreadIds.forEach((id) => {
      next[id] = true;
    });
    setReadMap(next);

    try {
      await fetch('/api/events/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, eventIds: unreadIds }),
      });
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleCardClick = async (event: DeltaSystemEvent) => {
    // 1. Mark as read
    await handleMarkAsRead(event.id);

    // 2. Handle deep link / navigation
    const deepLinkRaw = event.metadata?.deepLink || event.metadata?.route;
    const sanitized = sanitizeDeepLink(deepLinkRaw);

    if (sanitized.safe && sanitized.isInternal && sanitized.tab && onNavigate) {
      onClose();
      onNavigate(sanitized.tab, event.metadata);
      return;
    }

    // Default category based navigation if no explicit deep link
    const category = mapEventToCategory(event);
    if (onNavigate) {
      if (category === 'matches') {
        onClose();
        onNavigate('matches', event.metadata);
      } else if (category === 'trainings') {
        onClose();
        onNavigate('training', event.metadata);
      } else if (category === 'achievements') {
        onClose();
        onNavigate(event.type === 'PLAYER_CARD_UNLOCKED' ? 'collection' : 'achievements', event.metadata);
      } else if (category === 'multimedia') {
        onClose();
        onNavigate('gallery', event.metadata);
      } else if (category === 'club' && sanitized.sourceUrl) {
        window.open(sanitized.sourceUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!isOpen) return null;

  const renderEventIcon = (event: DeltaSystemEvent) => {
    const category = mapEventToCategory(event);
    switch (category) {
      case 'matches':
        return <Flame className="w-4 h-4 text-rose-400" />;
      case 'trainings':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'achievements':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'multimedia':
        return event.type === 'VIDEO_PUBLISHED' ? (
          <Video className="w-4 h-4 text-sky-400" />
        ) : (
          <Camera className="w-4 h-4 text-emerald-400" />
        );
      case 'system':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'club':
      default:
        return <Bell className="w-4 h-4 text-red-400" />;
    }
  };

  const renderImportanceBadge = (importance: EventImportance) => {
    if (importance === 'URGENT' || importance === 'CRITICAL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
          PILNE
        </span>
      );
    }
    if (importance === 'IMPORTANT' || importance === 'HIGH') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
          WAŻNE
        </span>
      );
    }
    return null;
  };

  const renderGroup = (title: string, groupEvents: DeltaSystemEvent[]) => {
    if (!groupEvents || groupEvents.length === 0) return null;

    return (
      <div className="space-y-2 mb-4" key={title}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            {title}
          </span>
          <div className="h-[1px] flex-1 bg-white/5" />
          <span className="text-[10px] font-mono text-slate-500">{groupEvents.length}</span>
        </div>

        <div className="space-y-2">
          {groupEvents.map((item) => {
            const isRead = !!readMap[item.id];
            const isUrgent = item.importance === 'URGENT' || item.importance === 'CRITICAL';
            const isImportant = item.importance === 'IMPORTANT' || item.importance === 'HIGH';

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
                  isRead
                    ? 'bg-slate-950/40 border-white/5 opacity-75 hover:opacity-100 hover:border-white/15'
                    : isUrgent
                    ? 'bg-red-950/30 border-red-500/40 shadow-lg shadow-red-950/20 hover:border-red-500/70'
                    : isImportant
                    ? 'bg-amber-950/20 border-amber-500/30 shadow-md shadow-amber-950/10 hover:border-amber-500/60'
                    : 'bg-slate-900/70 border-white/10 hover:border-white/20 shadow-sm'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(item);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        isUrgent
                          ? 'bg-red-500/20 border-red-500/40'
                          : isImportant
                          ? 'bg-amber-500/20 border-amber-500/40'
                          : 'bg-slate-800/80 border-white/10'
                      }`}
                    >
                      {renderEventIcon(item)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {renderImportanceBadge(item.importance)}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.source || 'DELTA'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-2 m-0 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h4>

                      {item.message && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed m-0">
                          {item.message}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[11px] font-bold text-amber-400 group-hover:underline flex items-center gap-1">
                          <span>
                            {item.type === 'CLUB_NEWS'
                              ? 'Czytaj artykuł'
                              : item.type.startsWith('MATCH')
                              ? 'Zobacz mecz'
                              : item.type.startsWith('TRAINING')
                              ? 'Zobacz trening'
                              : item.type === 'PLAYER_ACHIEVEMENT'
                              ? 'Zobacz osiągnięcie'
                              : item.type === 'PLAYER_CARD_UNLOCKED'
                              ? 'Otwórz kolekcję'
                              : 'Szczegóły'}
                          </span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isRead && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1.5 shadow-sm shadow-red-500 animate-pulse"
                      title="Nieprzeczytane"
                      aria-label="Nieprzeczytane"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hasAnyGroup =
    grouped.today.length > 0 ||
    grouped.yesterday.length > 0 ||
    grouped.last7Days.length > 0 ||
    grouped.earlier.length > 0;

  return (
    <div
      className="v200-modal-overlay fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Centrum Powiadomień"
    >
      <div
        className="v200-modal-container w-full max-w-xl max-h-[85vh] bg-slate-950 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider m-0">
                  Centrum Powiadomień
                </h2>
                {badgeInfo.hasUnread && (
                  <span
                    className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black"
                    aria-live="polite"
                  >
                    {badgeInfo.display}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Mecze, treningi, aktualności klubowe i osiągnięcia
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Ustawienia powiadomień Web Push"
                title="Ustawienia powiadomień Web Push"
              >
                <Settings size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Zamknij"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {NOTIFICATION_FILTERS.map((filter) => {
            const count =
              filter.id === 'all'
                ? events.length
                : filter.id === 'unread'
                ? unreadCount
                : events.filter((e) => mapEventToCategory(e) === filter.id).length;

            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className="px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0"
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  height: '34px',
                  background: isActive ? 'rgba(185, 28, 28, 0.25)' : 'rgba(255, 255, 255, 0.035)',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.70)',
                  cursor: 'pointer'
                }}
              >
                <span>{filter.label}</span>
                {count > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
                    style={{
                      background: isActive ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-white/5 flex justify-between items-center text-xs text-slate-400">
          <span className="font-medium text-[11px]">
            {filteredEvents.length}{' '}
            {filteredEvents.length === 1
              ? 'wiadomość'
              : filteredEvents.length < 5
              ? 'wiadomości'
              : 'wiadomości'}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors text-[11px]"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#d6b04c'
              }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Oznacz jako przeczytane</span>
            </button>
          )}
        </div>

        {/* Notification Feed List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[55vh]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Ładowanie powiadomień...</span>
            </div>
          ) : !hasAnyGroup ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-bold text-white">
                {activeFilter === 'unread'
                  ? 'Wszystkie wiadomości przeczytane!'
                  : activeFilter !== 'all'
                  ? 'Brak wiadomości w wybranej kategorii.'
                  : 'Brak nowych powiadomień.'}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {activeFilter === 'unread'
                  ? 'Jesteś na bieżąco ze wszystkimi wydarzeniami i aktualnościami drużyny.'
                  : 'Gdy pojawią się nowe aktualności, mecze lub powołania, zobaczysz je tutaj.'}
              </p>
            </div>
          ) : (
            <>
              {renderGroup('DZIŚ', grouped.today)}
              {renderGroup('WCZORAJ', grouped.yesterday)}
              {renderGroup('OSTATNIE 7 DNI', grouped.last7Days)}
              {renderGroup('WCZEŚNIEJ', grouped.earlier)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
