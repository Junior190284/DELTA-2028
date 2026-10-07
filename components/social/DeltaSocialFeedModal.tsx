'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Flame, Sparkles, Heart, Trophy, Send, Award, Bell } from 'lucide-react';

interface DeltaSocialFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const DeltaSocialFeedModal: React.FC<DeltaSocialFeedModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user'
}) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/social/feed');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Fetch feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeed();
    }
  }, [isOpen]);

  const handleReact = async (postId: string, reactionType: string) => {
    try {
      const res = await fetch('/api/social/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reactionType })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: data.reactions } : p));
      }
    } catch (err) {
      console.error('React error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
              📢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base uppercase tracking-wider">
                  Feed Drużyny DELTA 2018
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  BEZPIECZNA STREFA
                </span>
              </div>
              <p className="text-xs text-slate-400">Oficjalne ogłoszenia, osiągnięcia i pozytywny doping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Posts List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 flex justify-center text-slate-500">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3 shadow-md"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                    post.author_role === 'COACH'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  }`}>
                    {post.author_role === 'COACH' ? 'TRENER DELTA' : 'SYSTEM KLUBOWY'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(post.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm leading-snug">{post.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{post.content}</p>
                </div>

                {/* Positive Reactions Bar */}
                <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => handleReact(post.id, 'applause')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 hover:border-amber-500 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all transform active:scale-95"
                  >
                    👏 <span>{post.reactions?.applause || 0}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, 'fire')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 hover:border-red-500 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all transform active:scale-95"
                  >
                    🔥 <span>{post.reactions?.fire || 0}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, 'ball')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 hover:border-emerald-500 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all transform active:scale-95"
                  >
                    ⚽ <span>{post.reactions?.ball || 0}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, 'heart')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 hover:border-pink-500 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all transform active:scale-95"
                  >
                    ❤️ <span>{post.reactions?.heart || 0}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
