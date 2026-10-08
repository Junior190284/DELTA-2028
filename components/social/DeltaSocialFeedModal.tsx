'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, MessageSquare, Flame, Sparkles, Heart, Trophy, 
  Send, Award, Bell, ShieldCheck, Megaphone, CheckCircle2, 
  Calendar, ThumbsUp 
} from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setReactingPostId(postId + '-' + reactionType);
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
    } finally {
      setTimeout(() => setReactingPostId(null), 300);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="v200-feed-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-feed-sheet" onClick={(e) => e.stopPropagation()}>
        {/* ================= HEADER ================= */}
        <div className="v200-feed-header">
          <div className="feed-header-brand">
            <div className="feed-megaphone-icon">
              <Megaphone size={22} className="text-amber-400" />
            </div>
            <div>
              <div className="feed-eyebrow-row">
                <span className="feed-title-tag">FEED DRUŻYNY DELTA 2018</span>
                <span className="feed-safe-badge">
                  <ShieldCheck size={12} /> BEZPIECZNA STREFA
                </span>
              </div>
              <h2 className="feed-modal-title">AKTUALNOŚCI I DOPING</h2>
              <p className="feed-modal-subtitle">Oficjalne ogłoszenia sztabu, osiągnięcia adeptów i pozytywny doping</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="feed-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= POSTS LIST ================= */}
        <div className="v200-feed-list-body">
          {loading ? (
            <div className="feed-loading-state">
              <div className="feed-spinner" />
              <span>Ładowanie feedu drużyny...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-empty-state">
              <MessageSquare size={36} className="text-slate-600 mb-2" />
              <p>Brak nowych wpisów w feedzie drużyny.</p>
            </div>
          ) : (
            posts.map((post) => {
              const isCoach = post.author_role === 'COACH';

              return (
                <article
                  key={post.id}
                  className={`v200-feed-card ${isCoach ? 'is-coach' : 'is-system'}`}
                >
                  {/* Top Meta Row */}
                  <div className="feed-card-top-row">
                    <div className="author-badge-wrap">
                      <span className={`author-role-pill ${isCoach ? 'coach' : 'system'}`}>
                        {isCoach ? '📢 TRENER DELTA' : '⚡ SYSTEM KLUBOWY'}
                      </span>
                    </div>

                    <div className="post-date-tag">
                      <Calendar size={12} className="text-slate-500" />
                      <span>{new Date(post.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="feed-card-content">
                    <h3 className="feed-post-title">{post.title}</h3>
                    <p className="feed-post-text">{post.content}</p>
                  </div>

                  {/* Positive Reactions Bar */}
                  <div className="feed-reactions-bar">
                    <button
                      type="button"
                      onClick={() => handleReact(post.id, 'applause')}
                      className={`reaction-pill ${reactingPostId === post.id + '-applause' ? 'is-bouncing' : ''}`}
                      title="Brawo!"
                    >
                      <span className="reaction-emoji">👏</span>
                      <span className="reaction-label">Brawo</span>
                      <b className="reaction-count">{post.reactions?.applause || 0}</b>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReact(post.id, 'fire')}
                      className={`reaction-pill fire ${reactingPostId === post.id + '-fire' ? 'is-bouncing' : ''}`}
                      title="Ogień!"
                    >
                      <span className="reaction-emoji">🔥</span>
                      <span className="reaction-label">Ogień</span>
                      <b className="reaction-count">{post.reactions?.fire || 0}</b>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReact(post.id, 'ball')}
                      className={`reaction-pill ball ${reactingPostId === post.id + '-ball' ? 'is-bouncing' : ''}`}
                      title="Piłka!"
                    >
                      <span className="reaction-emoji">⚽</span>
                      <span className="reaction-label">Piłka</span>
                      <b className="reaction-count">{post.reactions?.ball || 0}</b>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReact(post.id, 'heart')}
                      className={`reaction-pill heart ${reactingPostId === post.id + '-heart' ? 'is-bouncing' : ''}`}
                      title="Doping!"
                    >
                      <span className="reaction-emoji">❤️</span>
                      <span className="reaction-label">Doping</span>
                      <b className="reaction-count">{post.reactions?.heart || 0}</b>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="v200-feed-footer">
          <div className="feed-footer-info">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Bezpieczna komunikacja: Treści i reakcje są moderowane przez sztab DELTA 2018</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="feed-footer-close-btn"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeltaSocialFeedModal;
