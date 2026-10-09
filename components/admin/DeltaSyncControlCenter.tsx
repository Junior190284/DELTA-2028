"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Zap, Database, ArrowRight, ShieldCheck } from "lucide-react";

interface SyncLogItem {
  id: number | string;
  status: string;
  items_found: number;
  items_inserted: number;
  items_updated: number;
  changes_detected: number;
  duration_ms: number;
  created_at: string;
  details?: any;
}

export default function DeltaSyncControlCenter() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/sync-status");
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
      }
    } catch (e) {
      console.error("Error loading sync status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunSyncNow = async () => {
    try {
      setSyncing(true);
      setActionMessage("Uruchamianie synchronizacji DELTA Sync 2.0...");
      const res = await fetch("/api/delta-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredBy: "admin_control_center" })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✅ Synchronizacja zakończona sukcesem! Pobrano ${data.items_found} wpisów, wykryto ${data.changes_detected || 0} zmian w ${data.duration_ms}ms.`);
      } else {
        setActionMessage(`❌ Błąd synchronizacji: ${data.error || "Nieznany błąd"}`);
      }
      await fetchStatus();
    } catch (err: any) {
      setActionMessage(`❌ Błąd połączenia: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (!statusData) return null;
    if (statusData.status === "OK") {
      return (
        <span className="delta-sync-pill ok">
          <CheckCircle2 size={14} />
          <span>🟢 STATUS: OK</span>
        </span>
      );
    } else if (statusData.status === "DELAY") {
      return (
        <span className="delta-sync-pill delay">
          <AlertTriangle size={14} />
          <span>🟡 STATUS: OPÓŹNIENIE</span>
        </span>
      );
    } else {
      return (
        <span className="delta-sync-pill error">
          <XCircle size={14} />
          <span>🔴 STATUS: BŁĄD</span>
        </span>
      );
    }
  };

  return (
    <div className="delta-sync-panel-wrap">
      {/* Header & Main Status */}
      <div className="delta-sync-panel-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase">MODUŁ DIAGNOSTYCZNY</span>
            <h3 className="text-lg font-black text-white m-0">DELTA SYNC 2.0 CONTROL CENTER</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            type="button"
            className="delta-sync-trigger-btn"
            onClick={handleRunSyncNow}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "SYNCHRONIZACJA..." : "SYNCHRONIZUJ TERAZ"}</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="delta-sync-feedback-banner">
          {actionMessage}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="delta-sync-kpi-grid">
        <div className="delta-sync-kpi-card">
          <span className="kpi-label">OSTATNIA SYNCHRONIZACJA</span>
          <strong className="kpi-value text-white">
            {statusData?.lastSync?.synced_at
              ? new Date(statusData.lastSync.synced_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "—"}
          </strong>
          <small className="kpi-sub">
            {statusData?.lastSync?.synced_at
              ? new Date(statusData.lastSync.synced_at).toLocaleDateString("pl-PL")
              : "Brak danych"}
          </small>
        </div>

        <div className="delta-sync-kpi-card">
          <span className="kpi-label">CZAS ODPOWIEDZI (MS)</span>
          <strong className="kpi-value text-amber-400">
            {statusData?.lastSync?.duration_ms || 0} ms
          </strong>
          <small className="kpi-sub">K.S. Delta Warszawa Feed</small>
        </div>

        <div className="delta-sync-kpi-card">
          <span className="kpi-label">WYKRYTO ZMIAN</span>
          <strong className="kpi-value text-emerald-400">
            {statusData?.stats?.totalChanges || 0}
          </strong>
          <small className="kpi-sub">Change Detector</small>
        </div>

        <div className="delta-sync-kpi-card">
          <span className="kpi-label">ZAREJESTROWANE BŁĘDY</span>
          <strong className={`kpi-value ${statusData?.stats?.totalErrors > 0 ? "text-red-400" : "text-slate-400"}`}>
            {statusData?.stats?.totalErrors || 0}
          </strong>
          <small className="kpi-sub">Ostatnie 15 przebiegów</small>
        </div>
      </div>

      {/* History table */}
      <div className="delta-sync-history-section">
        <h4 className="delta-sync-history-heading">HISTORIA PRZEBIEGÓW CRON & SYNC</h4>
        <div className="delta-sync-history-list">
          {statusData?.history?.length ? (
            statusData.history.map((item: SyncLogItem) => (
              <div key={item.id} className="delta-sync-history-row">
                <div className="flex items-center gap-3">
                  <span className={`status-dot ${item.status === "SUCCESS" ? "ok" : "err"}`} />
                  <span className="text-xs font-mono font-bold text-white">
                    {new Date(item.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-xs text-slate-400">
                    — {item.status === "SUCCESS" ? "OK" : item.status} —
                  </span>
                  <span className="text-xs text-amber-400 font-bold">
                    {item.changes_detected || 0} zmian
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {item.duration_ms}ms · {item.items_found} wpisów
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500 py-4 text-center">Brak wpisów w historii synchronizacji.</div>
          )}
        </div>
      </div>
    </div>
  );
}
