import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import "@/components/dashboard/ui4/dashboard-ui4.css";
import "@/components/dashboard/ui4/variants/variants.css";
import "@/components/dashboard/ui4/delta-elite-41.css";
import { HomeDashboard, CollectionDashboard } from "@/components/dashboard/ui4";
import { loadRealDashboardUI4Data, isGenuineLocalEnvironment } from "@/lib/dashboard-ui4/real-data-loader";
import { Shield, Lock, AlertTriangle, ArrowLeft, CheckCircle2, Home, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RealDataIntegrationPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ child?: string; view?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const activeChildId = resolvedParams.child;
  const view = resolvedParams.view === "collection" ? "collection" : "home";

  // 1. Environment & Local Isolation Check
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    "";

  // Strict Remote & Production Guard: NEVER load real data or query Supabase on remote Vercel or non-local hosts
  if (!isGenuineLocalEnvironment(host)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">
            DELTA-027: Środowisko Izolowane
          </h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Podgląd z rzeczywistymi danymi klubowymi (P1) jest dostępny wyłącznie w chronionym
            środowisku lokalnym (localhost / loopback). Zgodnie z zasadami bezpieczeństwa DELTA INFERNO,
            zdalna wersja Vercel Preview oraz produkcja nie mają dostępu do tego punktu wejścia.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/preview/dashboard-ui4"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Wróć do demonstracji Preview (Persony neutralne)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Only invoke real data loader after local loopback verification succeeds
  const result = await loadRealDashboardUI4Data({ activeChildId });

  // 3. Unauthenticated local user guard
  if (!result.actor.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">
                DELTA INFERNO · Integracja Real-Data (P1)
              </h1>
              <p className="text-xs text-slate-400">
                Wymagana autoryzacja do odczytu danych klubowych
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 space-y-2 mb-6">
            <div className="flex items-start gap-2 text-amber-300 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Brak aktywnej sesji Supabase Staging</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Moduł read-only wymaga tożsamości potwierdzonej przez <code className="text-slate-200">supabase.auth.getUser()</code>.
              Zgodnie z zasadami bezpieczeństwa DELTA-031, ciasteczko deweloperskie (<code className="text-amber-400">delta_dev_user</code>) nie ma dostępu do danych rzeczywistych i działa wyłącznie w odizolowanym DEMO.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Zaloguj się na prawdziwe konto rodzica w Supabase Staging (e-mail/hasło lub Google OAuth), aby zweryfikować odczyt własnej kolekcji i terminarza.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href="/preview/dashboard-ui4"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Wróć do dema Preview</span>
            </Link>
            <Link
              href="/login?next=/preview/dashboard-ui4/real-data"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/10"
            >
              <span>Zaloguj się przez Supabase</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated state: Render Home or Collection Dashboard with read-only indicators
  const homeHref = `/preview/dashboard-ui4/real-data?view=home${activeChildId ? `&child=${activeChildId}` : ""}`;
  const collectionHref = `/preview/dashboard-ui4/real-data?view=collection${activeChildId ? `&child=${activeChildId}` : ""}`;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Integration Mode Notification Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/40 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-amber-400" />
              <span>Real Data P1/P2 · Read-Only</span>
            </span>
            <span className="text-slate-300 text-[11px]">
              Rola: <strong className="text-white uppercase">{result.actor.role}</strong>
              {result.actor.activeChildId && (
                <span className="ml-2 text-slate-400">
                  (Podopieczny ID: <span className="font-mono text-slate-300">{result.actor.activeChildId.slice(0, 8)}...</span>)
                </span>
              )}
            </span>
          </div>

          {/* View Switcher: Home vs Collection */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <Link
              href={homeHref}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                view === "home"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Home className="w-3 h-3" />
              <span>Pulpit Główny</span>
            </Link>
            <Link
              href={collectionHref}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                view === "collection"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Kolekcja Kart</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <Link
              href={`/preview/dashboard-ui4?view=${view}`}
              className="text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Przełącz na Demo Fixtures</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout (Home or Collection) */}
      {view === "collection" ? (
        <CollectionDashboard model={result.model} />
      ) : (
        <HomeDashboard model={result.model} />
      )}
    </div>
  );
}
