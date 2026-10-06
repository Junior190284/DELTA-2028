"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { 
  Newspaper, 
  Save, 
  Trash2, 
  X, 
  AlertTriangle, 
  Flame, 
  Info, 
  Pin,
  Calendar,
  Sparkles,
  CheckCircle2
} from "lucide-react";

export type NewsItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  published_at: string;
  priority?: "normal" | "important" | "urgent" | string;
  is_pinned?: boolean;
};

interface NewsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsItem?: NewsItem | null;
  onSaved: (item: NewsItem) => void;
  onDeleted?: (id: string) => void;
  currentUserId?: string;
}

export default function NewsEditModal({
  isOpen,
  onClose,
  newsItem,
  onSaved,
  onDeleted,
  currentUserId
}: NewsEditModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("organizacja");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (newsItem) {
      setTitle(newsItem.title || "");
      setBody(newsItem.body || "");
      setType(newsItem.type || "organizacja");
      setPriority((newsItem.priority as any) || "normal");
      setIsPinned(!!newsItem.is_pinned);
    } else {
      setTitle("");
      setBody("");
      setType("organizacja");
      setPriority("normal");
      setIsPinned(false);
    }
    setError(null);
  }, [newsItem, isOpen]);

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Wprowadź tytuł wiadomości.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      if (newsItem?.id) {
        // Edit existing
        const { data, error: updateErr } = await supabase
          .from("news")
          .update({
            title: title.trim(),
            body: body.trim(),
            type,
            // We pass priority and is_pinned in json / updates
            ...(priority ? { priority } : {})
          })
          .eq("id", newsItem.id)
          .select("*")
          .single();

        if (updateErr) {
          // Fallback if column priority doesn't exist
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from("news")
            .update({
              title: title.trim(),
              body: body.trim(),
              type
            })
            .eq("id", newsItem.id)
            .select("*")
            .single();

          if (fallbackErr) throw fallbackErr;
          onSaved({ ...fallbackData, priority, is_pinned: isPinned });
        } else {
          onSaved({ ...data, priority, is_pinned: isPinned });
        }
      } else {
        // Create new
        const { data, error: insertErr } = await supabase
          .from("news")
          .insert({
            title: title.trim(),
            body: body.trim(),
            type,
            created_by: currentUserId
          })
          .select("*")
          .single();

        if (insertErr) throw insertErr;
        onSaved({ ...data, priority, is_pinned: isPinned });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas zapisywania aktualności.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!newsItem?.id || !confirm("Czy na pewno chcesz usunąć tę wiadomość z aktualności?")) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error: delErr } = await supabase.from("news").delete().eq("id", newsItem.id);
      if (delErr) throw delErr;
      if (onDeleted) onDeleted(newsItem.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Błąd podczas usuwania.");
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <div className="v200-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-card v200-news-modal-card" onClick={e => e.stopPropagation()}>
        <header className="v200-modal-header">
          <div className="v200-modal-header-icon red">
            <Newspaper size={24} />
          </div>
          <div className="v200-modal-title-group">
            <span className="v200-modal-badge red">
              {newsItem ? "EDYCJA KOMUNIKATU" : "NOWA WIADOMOŚĆ"}
            </span>
            <h2>{newsItem ? "Edytuj aktualność" : "Dodaj komunikat dla drużyny"}</h2>
            <p>Informacja pojawi się w sekcji Aktualności oraz na pasku powiadomień.</p>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSave} className="v200-news-form">
          {error && <div className="v200-form-alert error">{error}</div>}

          <div className="v200-form-group">
            <label htmlFor="news-title">Tytuł wiadomości *</label>
            <input
              id="news-title"
              type="text"
              required
              placeholder="np. Zbiórka przed meczem ligowym, Zmiana godziny treningu..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="v200-input"
            />
          </div>

          <div className="v200-form-row">
            <div className="v200-form-group">
              <label htmlFor="news-type">Kategoria / Typ</label>
              <select
                id="news-type"
                value={type}
                onChange={e => setType(e.target.value)}
                className="v200-select"
              >
                <option value="organizacja">Organizacyjne</option>
                <option value="mecz">Mecz / Terminarz</option>
                <option value="trening">Trening</option>
                <option value="turniej">Turniej / Wyjazd</option>
                <option value="wazne">Ważny komunikat sztabu</option>
              </select>
            </div>

            <div className="v200-form-group">
              <label htmlFor="news-priority">Priorytet wiadomości</label>
              <select
                id="news-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className={`v200-select priority-${priority}`}
              >
                <option value="normal">⚪ Zwykły (Informacja)</option>
                <option value="important">🟡 Ważny (Wyróżniony komunikat)</option>
                <option value="urgent">🔴 Pilny (Wymagane natychmiastowe odczytanie)</option>
              </select>
            </div>
          </div>

          <div className="v200-form-group">
            <label htmlFor="news-body">Treść komunikatu</label>
            <textarea
              id="news-body"
              rows={5}
              placeholder="Wpisz szczegóły, godzinę zbiórki, miejsce, wymagany sprzęt lub inne ważne instrukcje..."
              value={body}
              onChange={e => setBody(e.target.value)}
              className="v200-textarea"
            />
          </div>

          <div className="v200-news-footer-actions">
            {newsItem?.id && (
              <button
                type="button"
                className="v200-btn-danger"
                disabled={deleting || saving}
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                <span>{deleting ? "Usuwanie..." : "Usuń wiadomość"}</span>
              </button>
            )}

            <div className="v200-news-right-actions">
              <button type="button" className="v200-btn-ghost" onClick={onClose}>
                Anuluj
              </button>
              <button type="submit" className="v200-btn-primary" disabled={saving}>
                <Save size={16} />
                <span>{saving ? "Zapisywanie..." : newsItem ? "Zapisz zmiany" : "Opublikuj wiadomość"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
