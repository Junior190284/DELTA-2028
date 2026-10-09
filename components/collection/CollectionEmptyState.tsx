"use client";

import React from "react";
import { SearchX, Star, Copy, Layers, AlertCircle, RotateCcw } from "lucide-react";

export interface CollectionEmptyStateProps {
  type: "no_results" | "no_favorites" | "no_duplicates" | "empty_collection" | "error";
  onResetFilters?: () => void;
  onOpenPacks?: () => void;
  onRetry?: () => void;
  errorMessage?: string;
}

export default function CollectionEmptyState({
  type,
  onResetFilters,
  onOpenPacks,
  onRetry,
  errorMessage
}: CollectionEmptyStateProps) {
  if (type === "no_favorites") {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
          <Star className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-lg font-bold text-white">Brak Ulubionych Kart</h3>
          <p className="text-sm text-slate-400">
            Kliknij ikonę gwiazdki na dowolnej karcie, aby dodać ją do listy swoich ulubionych perełek.
          </p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10"
          >
            Pokaż Wszystkie Karty
          </button>
        )}
      </div>
    );
  }

  if (type === "no_duplicates") {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
          <Copy className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-lg font-bold text-white">Brak Powtórzonych Kart</h3>
          <p className="text-sm text-slate-400">
            Wszystkie Twoje karty są obecnie unikalne! Duplikaty pojawią się, gdy wylosujesz powtarzającą się kartę z paczek.
          </p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10"
          >
            Pokaż Wszystkie Karty
          </button>
        )}
      </div>
    );
  }

  if (type === "empty_collection") {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner">
          <Layers className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-lg font-bold text-white">Twój Album Jest Jeszcze Pusty</h3>
          <p className="text-sm text-slate-400">
            Otwórz swoje darmowe paczki startowe, aby wylosować pierwsze karty zawodników DELTY i rozpocząć kolekcję!
          </p>
        </div>
        {onOpenPacks && (
          <button
            onClick={onOpenPacks}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-sm font-black text-slate-950 shadow-xl"
          >
            Otwórz Paczki Startowe 📦
          </button>
        )}
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-red-950/20 border border-red-500/20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-lg font-bold text-white">Błąd Ładowania Kolekcji</h3>
          <p className="text-sm text-red-300/80">
            {errorMessage || "Nie udało się pobrać kart z bazy danych. Sprawdź połączenie."}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Spróbuj Ponownie</span>
          </button>
        )}
      </div>
    );
  }

  // Default: no_results from search/filters
  return (
    <div className="w-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
        <SearchX className="w-8 h-8" />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-lg font-bold text-white">Brak Wyników Wyszukiwania</h3>
        <p className="text-sm text-slate-400">
          Żadna karta nie odpowiada aktualnie wybranym filtrom lub frazie wyszukiwania.
        </p>
      </div>
      {onResetFilters && (
        <button
          onClick={onResetFilters}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950 shadow-md"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Wyczyść Filtry</span>
        </button>
      )}
    </div>
  );
}
