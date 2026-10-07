"use client";

import React, { useState } from "react";
import { X, Sparkles, Shield, Zap, Info, Award, HelpCircle, Trophy, Target, Crown } from "lucide-react";
import { CENTRAL_CARD_TYPES, POLISH_CARD_STATS, CentralCardTypeKey } from "@/lib/cards/central-types";
import { RARITY_CONFIG, CardRarity } from "@/lib/cards/types";

interface DeltaCardLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeltaCardLegendModal({ isOpen, onClose }: DeltaCardLegendModalProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "rarity" | "types" | "ovr">("stats");

  if (!isOpen) return null;

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HelpCircle size={22} />
            </div>
            <div>
              <span className="eyebrow gold">PRZEWODNIK KOLEKCJONERA</span>
              <h2 className="text-xl font-black text-white m-0">JAK CZYTAĆ KARTĘ DELTA?</h2>
            </div>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-3 bg-black/40 border-b border-white/10 overflow-x-auto">
          {[
            { id: "stats", label: "Współczynniki (Stats)", icon: Zap },
            { id: "rarity", label: "Rzadkość (Rarity)", icon: Sparkles },
            { id: "types", label: "Typy Kart", icon: Award },
            { id: "ovr", label: "Ocena Ogólna (OVR)", icon: Crown }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500 text-black shadow-lg"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {/* TAB 1: POLSKIE STATYSTYKI */}
          {activeTab === "stats" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/20 text-xs text-slate-300">
                <strong className="text-amber-400 block mb-1">🇵🇱 Polskie Oznaczenia Statystyk</strong>
                Każda karta zawodnika posiada 6 kluczowych współczynników piłkarskich oraz dane z oficjalnych meczów i treningów.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(POLISH_CARD_STATS).map(st => (
                  <div key={st.key} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/60 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
                      {st.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-wider">
                          {st.codePL}
                        </span>
                        <strong className="text-xs text-white font-bold">{st.fullNamePL}</strong>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{st.descriptionPL}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: RZADKOŚĆ */}
          {activeTab === "rarity" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Rzadkość określa unikalność karty, efekty wizualne folii oraz dodatkowy bonus do oceny OVR w Squad Builderze:
              </p>

              <div className="space-y-2">
                {(["common", "rare", "epic", "legendary", "inferno"] as CardRarity[]).map(r => {
                  const cfg = RARITY_CONFIG[r];
                  return (
                    <div
                      key={r}
                      className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                      style={{
                        background: cfg.bgGradient,
                        borderColor: cfg.borderGlow
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider text-black"
                          style={{ background: cfg.color }}
                        >
                          {cfg.label}
                        </div>
                        <div>
                          <strong className="text-xs text-white block">
                            {r === "inferno" ? "Najwyższa rzadkość DELTA INFERNO" : `Karta ${cfg.label}`}
                          </strong>
                          <small className="text-[11px] text-slate-300">
                            Wartość duplikatu: <b className="text-amber-400">{cfg.duplicatePoints} DP</b>
                          </small>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-amber-300 block">
                          {r === "inferno" ? "+9 OVR Bonus" : r === "legendary" ? "+6 OVR Bonus" : r === "epic" ? "+4 OVR Bonus" : r === "rare" ? "+2 OVR Bonus" : "Standard"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TYPY KART */}
          {activeTab === "types" && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-300">
                W kolekcji DELTA 2018 GM istnieje 10 dedykowanych typów kart:
              </p>

              <div className="space-y-2">
                {Object.values(CENTRAL_CARD_TYPES).map(t => (
                  <div key={t.type} className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
                    <div className="text-2xl shrink-0 p-2 rounded-lg bg-black/40 border border-white/5">
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-xs text-white font-bold">{t.displayName}</strong>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-amber-400 text-[10px] font-bold">
                          {t.badgeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                    </div>
                    {t.ratingBonus > 0 && (
                      <div className="shrink-0 px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-black">
                        +{t.ratingBonus} OVR
                      </div>
                    )}
                    {t.squadBonusDescription && (
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] text-emerald-400 font-bold block">{t.squadBonusDescription}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM OCENY OVR */}
          {activeTab === "ovr" && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/60 to-black border border-red-500/30 text-xs text-slate-200 space-y-2">
                <strong className="text-amber-400 text-sm block flex items-center gap-1.5">
                  <Crown size={16} /> Jak obliczany jest Overall Rating (OVR)?
                </strong>
                <p>
                  Rating karty w DELTA 2018 GM nie jest przypadkowy. Powstaje na podstawie 3 spójnych filarów:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li><b>Baza zawodnika (70 OVR)</b>: Wyjściowy poziom młodego adepta piłki nożnej.</li>
                  <li><b>Realne Statystyki</b>: Gole, asysty, czyste konta bramkarza, frekwencja treningowa oraz tytuły MVP meczu bezpośrednio podnoszą ocenę.</li>
                  <li><b>Edycja & Rzadkość Karty</b>: Karty Training Hero (+3), Matchday Hero (+5), Gold Master (+8), Delta Icon (+12) i INFERNO (+16) zapewniają potężne wzmocnienie składu!</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs space-y-2">
                <strong className="text-white block">💡 Wskazówka dla Trenerów i Rodziców</strong>
                <p className="text-slate-400">
                  Własna drużyna (Squad Builder) zyskuje dodatkowe premie za ustawienie Kapitana (+2 OVR), Kartę Trenera (+2 Taktyka) oraz Kartę Twierdzy Jordanek (+1 OVR Gospodarza).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex justify-end">
          <button type="button" className="v200-tc-action-btn gold" onClick={onClose}>
            ROZUMIEM, DZIĘKUJĘ!
          </button>
        </div>
      </div>
    </div>
  );
}
