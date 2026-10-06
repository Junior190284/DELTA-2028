"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Film } from "lucide-react";
import WalkoutStudio from "@/components/WalkoutStudio";
import { createClient } from "@/lib/supabase/client";

export default function InfernoWalkoutDevPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("active", true)
        .order("display_name");
      if (data && data.length > 0) {
        setPlayers(data);
      }
    }
    loadPlayers();
  }, []);

  return (
    <div className="min-h-screen bg-[#07090d] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-amber-400 transition font-bold text-xs uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Powrót do Panelu
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles size={13} /> EDYTOR WALKOUTÓW & FILMÓW
            </span>
          </div>
        </header>

        <WalkoutStudio players={players} />
      </div>
    </div>
  );
}
