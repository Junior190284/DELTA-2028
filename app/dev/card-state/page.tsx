"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Gift, 
  RotateCw, 
  Layers, 
  Heart, 
  Copy, 
  Clock, 
  CheckCircle2, 
  Activity,
  Zap
} from "lucide-react";
import { 
  subscribeCardEvents, 
  dispatchPackOpened, 
  dispatchCollectionUpdated, 
  dispatchFavoriteUpdated,
  DeltaPackOpenedPayload,
  DeltaCollectionUpdatedPayload,
  DeltaFavoriteUpdatedPayload
} from "@/lib/cards/cardSync";

export default function DevCardStatePage() {
  const [unopenedCount, setUnopenedCount] = useState<number>(0);
  const [uniqueOwned, setUniqueOwned] = useState<number>(0);
  const [duplicatesCount, setDuplicatesCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [deltaPoints, setDeltaPoints] = useState<number>(0);

  const [lastPackEvent, setLastPackEvent] = useState<DeltaPackOpenedPayload | null>(null);
  const [lastCollectionEvent, setLastCollectionEvent] = useState<DeltaCollectionUpdatedPayload | null>(null);
  const [lastFavoriteEvent, setLastFavoriteEvent] = useState<DeltaFavoriteUpdatedPayload | null>(null);
  const [lastRevalidationTime, setLastRevalidationTime] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState<boolean>(false);

  const fetchState = useCallback(async () => {
    try {
      setRevalidating(true);
      const res = await fetch("/api/cards/collection");
      if (res.ok) {
        const data = await res.json();
        const uCards = data.userCards || [];
        setUniqueOwned(uCards.length);
        const dupCount = uCards.reduce((acc: number, uc: any) => acc + (uc.duplicates_count || 0), 0);
        setDuplicatesCount(dupCount);
        const favCount = uCards.filter((uc: any) => uc.is_favorite).length;
        setFavoritesCount(favCount);
        setUnopenedCount((data.unopenedPacks || []).length);
        setDeltaPoints(data.deltaPoints || 0);
        setLastRevalidationTime(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.warn("Could not fetch debug state:", e);
    } finally {
      setRevalidating(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    const unsubscribe = subscribeCardEvents({
      onPackOpened: (payload) => {
        setLastPackEvent(payload);
        if (typeof payload.remaining_unopened_packs_count === "number") {
          setUnopenedCount(payload.remaining_unopened_packs_count);
        }
        fetchState();
      },
      onCollectionUpdated: (payload) => {
        setLastCollectionEvent(payload);
        fetchState();
      },
      onFavoriteUpdated: (payload) => {
        setLastFavoriteEvent(payload);
        fetchState();
      }
    });

    return () => unsubscribe();
  }, [fetchState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-white/10 pb-4">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
            DEV / STAGING ONLY
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Card State Synchronization & Cache Debugger (ETAP 13F)
          </h1>
          <p className="text-xs text-slate-400">
            Real-time inspection of client state, global card events, race-condition reconciliation and background sync.
          </p>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paczki Nieotwarte</span>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-black text-white">{unopenedCount}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unikalne Karty</span>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span className="text-2xl font-black text-white">{uniqueOwned}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duplikaty</span>
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-black text-white">{duplicatesCount}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ulubione</span>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              <span className="text-2xl font-black text-white">{favoritesCount}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delta Points</span>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-black text-white">{deltaPoints}</span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
          <button
            onClick={fetchState}
            disabled={revalidating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${revalidating ? "animate-spin" : ""}`} />
            <span>Wymuś Revalidację</span>
          </button>

          <button
            onClick={() => dispatchCollectionUpdated("dev_debug_trigger")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Emit: collection-updated</span>
          </button>

          <button
            onClick={() => dispatchPackOpened({
              pack_type_id: "standard_pack",
              remaining_unopened_packs_count: Math.max(0, unopenedCount - 1),
              total_delta_points_earned: 10,
              drawn_card_ids: ["mock_card_1"]
            })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Emit: pack-opened</span>
          </button>

          {lastRevalidationTime && (
            <span className="text-xs text-slate-400 ml-auto font-mono">
              Ostatnia rewalidacja: {lastRevalidationTime}
            </span>
          )}
        </div>

        {/* Event Logs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Ostatni Pack Opened</h3>
            {lastPackEvent ? (
              <pre className="text-[11px] font-mono text-slate-300 bg-black/50 p-3 rounded-xl overflow-x-auto">
                {JSON.stringify(lastPackEvent, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">Brak zarejestrowanych eventów</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
            <h3 className="text-xs font-black text-sky-400 uppercase tracking-wider">Ostatni Collection Updated</h3>
            {lastCollectionEvent ? (
              <pre className="text-[11px] font-mono text-slate-300 bg-black/50 p-3 rounded-xl overflow-x-auto">
                {JSON.stringify(lastCollectionEvent, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">Brak zarejestrowanych eventów</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
            <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider">Ostatni Favorite Updated</h3>
            {lastFavoriteEvent ? (
              <pre className="text-[11px] font-mono text-slate-300 bg-black/50 p-3 rounded-xl overflow-x-auto">
                {JSON.stringify(lastFavoriteEvent, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">Brak zarejestrowanych eventów</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
