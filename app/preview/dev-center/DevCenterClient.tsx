"use client";

import React, { useState } from "react";
import InteractiveQaPlayground from "@/components/qa/InteractiveQaPlayground";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Server,
  User,
  GitCommit,
  Layers,
  ArrowRight,
  ExternalLink,
  Users,
  Calendar,
  Lock,
  Trophy,
  Activity,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from "lucide-react";

export interface DevCenterTelemetry {
  maskedDbHost: string;
  targetEnv: "PROD_DANGER" | "STAGING_VERIFIED" | "CUSTOM";
  commitSha: string;
  deploymentId: string;
  currentUser: {
    email: string;
    role: string;
    displayName: string;
  };
  isolationStatus: string;
}

export default function DevCenterClient({ telemetry }: { telemetry: DevCenterTelemetry }) {
  const [activeTab, setActiveTab] = useState<"playground" | "overview" | "simulation" | "roles">("playground");
  const [simulatedRole, setSimulatedRole] = useState<"parent" | "coach" | "admin">(
    (telemetry.currentUser.role as any) || "parent"
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#121622] via-[#0d1017] to-[#080a0f] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <Flame size={13} className="text-amber-500" />
                <span>DELTA DEVELOPER & QA CENTER • MVP</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
                DELTA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">QA PORTAL</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Izolowane centrum weryfikacji ról, statusu środowiska oraz symulacji interfejsu dla autoryzowanych testerów DELTA 2018 GM.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                telemetry.targetEnv === "STAGING_VERIFIED"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}>
                {telemetry.targetEnv === "STAGING_VERIFIED" ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                <span>{telemetry.targetEnv === "STAGING_VERIFIED" ? "ŚRODOWISKO STAGING" : "OSTRZEŻENIE PROD"}</span>
              </span>
            </div>
          </div>
        </header>

        {/* SECURITY ISOLATION NOTICE */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs sm:text-sm text-amber-200">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-300 block font-bold">STATUS IZOLACJI BAZY DANYCH:</strong>
            <p className="m-0 text-slate-300">
              Projekt Preview jest połączony z bazą <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded">{telemetry.maskedDbHost}</code>.
              Zgodnie z regułą bezpieczeństwa DELTA-051T3/T4, <strong>nie utworzono fikcyjnych kont sztabu w bazie zawierającej rzeczywiste dane</strong>.
              Udostępniono w 100% bezpieczny <strong>Interaktywny QA Playground (In-Memory State)</strong> oraz zestaw diagnostyczny.
            </p>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("playground")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "playground"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/40"
                : "bg-white/[0.04] text-slate-300 hover:text-white"
            }`}
          >
            <Flame size={14} className={activeTab === "playground" ? "text-black" : "text-amber-400"} />
            <span>INTERAKTYWNY PLAYGROUND</span>
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "overview"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/40"
                : "bg-white/[0.04] text-slate-300 hover:text-white"
            }`}
          >
            STATUS & TELEMETRIA
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "simulation"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/40"
                : "bg-white/[0.04] text-slate-300 hover:text-white"
            }`}
          >
            SYMULACJA RÓL (READ-ONLY)
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "roles"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/40"
                : "bg-white/[0.04] text-slate-300 hover:text-white"
            }`}
          >
            PRZEWODNIK RÓL & SZTABU
          </button>
        </div>

        {/* TAB 0: INTERACTIVE QA PLAYGROUND */}
        {activeTab === "playground" && (
          <InteractiveQaPlayground />
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TELEMETRY CARD */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2 m-0">
                <Server size={18} className="text-amber-400" />
                <span>Parametry Wdrożenia</span>
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Baza Danych (Host):</span>
                  <span className="font-mono text-slate-200">{telemetry.maskedDbHost}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Target Środowiska:</span>
                  <span className="font-bold text-amber-400">{telemetry.targetEnv}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Commit SHA:</span>
                  <span className="font-mono text-slate-200">{telemetry.commitSha}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Deployment ID:</span>
                  <span className="font-mono text-slate-200">{telemetry.deploymentId}</span>
                </div>
              </div>
            </div>

            {/* CURRENT USER SESSION */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2 m-0">
                <User size={18} className="text-amber-400" />
                <span>Aktywna Sesja Testera</span>
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-slate-200">{telemetry.currentUser.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Rola Backendowa:</span>
                  <span className="px-2 py-0.5 rounded font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30">
                    {telemetry.currentUser.role}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Nazwa Wyświetlana:</span>
                  <span className="text-slate-200">{telemetry.currentUser.displayName || "Brak"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Dostęp do /admin:</span>
                  <span className={telemetry.currentUser.role === "admin" || telemetry.currentUser.role === "coach" ? "text-emerald-400 font-bold" : "text-slate-500 font-semibold"}>
                    {telemetry.currentUser.role === "admin" || telemetry.currentUser.role === "coach" ? "DOZWOLONY" : "ZABLOKOWANY (Wymaga roli coach/admin)"}
                  </span>
                </div>
              </div>
            </div>

            {/* QUICK LINKS */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 col-span-full space-y-3">
              <h2 className="text-base font-black text-white m-0">Szybkie Przejścia do Modułów</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Link
                  href="/dashboard"
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-between transition-all"
                >
                  <span>Dashboard</span>
                  <ArrowRight size={13} className="text-slate-400" />
                </Link>
                <Link
                  href="/collection"
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-between transition-all"
                >
                  <span>Kolekcja Kart</span>
                  <ArrowRight size={13} className="text-slate-400" />
                </Link>
                <Link
                  href="/admin"
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-between transition-all"
                >
                  <span>Panel Sztabu (/admin)</span>
                  <ArrowRight size={13} className="text-slate-400" />
                </Link>
                <Link
                  href="/preview/pack-demo"
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-between transition-all"
                >
                  <span>Demo Paczek 3D</span>
                  <ArrowRight size={13} className="text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UI SIMULATION */}
        {activeTab === "simulation" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300">
              <strong className="block font-bold mb-1">TRYB SYMULACJI INTERFEJSU (READ-ONLY):</strong>
              Pozwala przetestować wygląd i zachowanie komponentów w roli trenera, rodzica lub administratora bez modyfikowania Twojej rzeczywistej roli w bazie danych i bez ryzyka zapisu nieautoryzowanych danych.
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Wybierz widok symulowany:</span>
              {(["parent", "coach", "admin"] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSimulatedRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    simulatedRole === role
                      ? "bg-amber-500 text-black font-black"
                      : "bg-white/[0.04] text-slate-300 border border-white/10"
                  }`}
                >
                  {role === "parent" ? "Rodzic" : role === "coach" ? "Trener" : "Administrator"}
                </button>
              ))}
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider m-0">
                  Podgląd Uprawnień dla Roli: <span className="text-amber-400 font-black">{simulatedRole}</span>
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SYMULACJA LOKALNA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-400 block">Deklaracje (Tak/Nie/Niepewny):</span>
                  <strong className={simulatedRole === "parent" ? "text-emerald-400" : "text-slate-500"}>
                    {simulatedRole === "parent" ? "Dostępne (Własne Dziecko)" : "Ukryte (Funkcja rodzica)"}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-400 block">Obecność Boiskowa (+40 XP):</span>
                  <strong className={simulatedRole !== "parent" ? "text-emerald-400" : "text-slate-500"}>
                    {simulatedRole !== "parent" ? "Aktywne (Zatwierdzanie sztabu)" : "Zablokowane"}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-slate-400 block">Tworzenie Drużyn A, B, C, D:</span>
                  <strong className={simulatedRole !== "parent" ? "text-emerald-400" : "text-slate-500"}>
                    {simulatedRole !== "parent" ? "Dostępne w panelu sztabu" : "Niedostępne"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROLES & GUIDANCE */}
        {activeTab === "roles" && (
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 text-xs sm:text-sm text-slate-300">
            <h3 className="text-base font-black text-white m-0">Jak działa autoryzacja w DELTA INFERNO?</h3>
            <p>
              Architektura bezpieczeństwa aplikacji opiera się na <strong>Row Level Security (RLS)</strong> w Supabase oraz weryfikacji tokenu sesji w warstwie Next.js Server Components.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Rola Rodzica (`parent`):</strong> Posiada dostęp do deklaracji obecności wyłącznie dla dzieci powiązanych w tabeli <code className="text-amber-300">parent_players</code>. Nie ma dostępu do panelu <code className="text-amber-300">/admin</code> ani edycji wyników.</li>
              <li><strong>Rola Trenera (`coach`):</strong> Posiada uprawnienie do zatwierdzania obecności na boisku (<code className="text-emerald-400">+40 XP</code>) oraz tworzenia gier kontrolnych i podziału na drużyny A, B, C, D w Panelu Administracyjnym.</li>
              <li><strong>Rola Administratora (`admin`):</strong> Pełne zarządzanie kalendarzem, zawodnikami, uprawnieniami delegowanymi oraz synchronizacją.</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
