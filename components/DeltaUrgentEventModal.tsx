"use client";

import React from "react";
import { AlertCircle, CalendarDays, Clock, MapPin, X, ArrowRight, Flame } from "lucide-react";
import type { DeltaSystemEvent } from "@/lib/events/types";

interface DeltaUrgentEventModalProps {
  event: DeltaSystemEvent | null;
  onClose: () => void;
  onAction: (event: DeltaSystemEvent) => void;
}

export default function DeltaUrgentEventModal({
  event,
  onClose,
  onAction
}: DeltaUrgentEventModalProps) {
  if (!event) return null;

  return (
    <div 
      className="delta-urgent-modal-backdrop animate-fadeIn" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pilny komunikat DELTA 2018 GM"
    >
      <div 
        className="delta-urgent-modal-container animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Urgent header badge */}
        <div className="delta-urgent-header">
          <div className="delta-urgent-badge">
            <AlertCircle size={18} className="delta-urgent-icon" />
            <span>PILNY KOMUNIKAT KLUBOWY</span>
          </div>

          <button 
            type="button" 
            className="delta-urgent-close" 
            onClick={onClose}
            aria-label="Zamknij okno"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="delta-urgent-body">
          <h2 className="delta-urgent-title">{event.title}</h2>
          <p className="delta-urgent-message">{event.message}</p>

          {/* Details snippet if match change */}
          {event.metadata && (
            <div className="delta-urgent-meta-box">
              {event.metadata.old_time && event.metadata.new_time && (
                <div className="delta-urgent-meta-row">
                  <Clock size={15} className="text-amber-400 shrink-0" />
                  <span>
                    Godzina: <del className="text-slate-500">{event.metadata.old_time}</del> → <b className="text-amber-400">{event.metadata.new_time}</b>
                  </span>
                </div>
              )}
              {event.metadata.new_venue && (
                <div className="delta-urgent-meta-row">
                  <MapPin size={15} className="text-amber-400 shrink-0" />
                  <span>
                    Miejsce: <b className="text-white">{event.metadata.new_venue}</b>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="delta-urgent-actions">
          <button
            type="button"
            className="delta-urgent-btn-primary"
            onClick={() => {
              onClose();
              onAction(event);
            }}
          >
            <span>ZOBACZ SZCZEGÓŁY</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="delta-urgent-btn-secondary"
            onClick={onClose}
          >
            PÓŹNIEJ
          </button>
        </div>
      </div>
    </div>
  );
}
