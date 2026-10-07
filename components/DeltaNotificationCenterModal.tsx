'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck } from 'lucide-react';

interface DeltaNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onNotificationRead?: () => void;
}

export const DeltaNotificationCenterModal: React.FC<DeltaNotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  onNotificationRead
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/game/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/game/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true })
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Centrum Powiadomień
              </h2>
              <p className="text-xs text-slate-400">Otrzymane nagrody, mecze i aktualności</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-white/5 flex justify-between items-center text-xs text-slate-400">
          <span>Ostatnie wiadomości</span>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Oznacz wszystkie jako przeczytane
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {loading ? (
            <div className="py-12 flex justify-center text-slate-500">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-xs">Brak nowych powiadomień.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  n.is_read
                    ? 'bg-slate-950/30 border-white/5 opacity-70'
                    : 'bg-slate-800/60 border-amber-500/30 shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="text-lg shrink-0 mt-0.5">
                      {n.type === 'REWARD' ? '🎁' : n.type === 'MATCH' ? '⚽' : n.type === 'MISSION' ? '🎯' : '📢'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{n.title}</h4>
                      <p className="text-xs text-slate-300 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(n.created_at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1 shadow-sm shadow-amber-400" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
