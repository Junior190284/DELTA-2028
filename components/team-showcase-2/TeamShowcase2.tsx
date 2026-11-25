"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import NeutralPlayerSilhouette from "@/components/cards/NeutralPlayerSilhouette";
import {
  cardLayout,
  circularOffset,
  isWrapJump,
  showNavigation,
  sideSlots,
  swipeStep,
  wrapIndex,
  type ShowcasePlayer,
} from "@/lib/team/teamShowcase";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  Award,
  ArrowRight,
  X,
  UserCheck,
  Lock,
} from "lucide-react";

export interface TeamShowcase2Props {
  players: ShowcasePlayer[];
  source: "live" | "demo";
  userRole?: string | null;
  parentPlayerIds?: string[];
  teamName?: string;
  liveBlockedReason?: string | null;
  embedded?: boolean;
}

type PhotoState = { status: "loading" } | { status: "ready"; url: string } | { status: "none" };

const CREST = "/teamlogos/gm.png";

export default function TeamShowcase2({
  players,
  source,
  userRole = "parent",
  parentPlayerIds = [],
  teamName = "K.S. DELTA WARSZAWA — Rocznik 2018 (U-9)",
  liveBlockedReason = null,
  embedded = false,
}: TeamShowcase2Props) {
  const count = players.length;
  const nav = showNavigation(count);
  const initialActive = useMemo(() => {
    if (!parentPlayerIds || parentPlayerIds.length === 0) return 0;
    const idx = players.findIndex((p) => parentPlayerIds.includes(p.id));
    return idx >= 0 ? idx : 0;
  }, [players, parentPlayerIds]);

  const [active, setActive] = useState(initialActive);

  useEffect(() => {
    if (!parentPlayerIds || parentPlayerIds.length === 0) return;
    const idx = players.findIndex((p) => parentPlayerIds.includes(p.id));
    if (idx >= 0) setActive(idx);
  }, [players, parentPlayerIds]);

  const [slots, setSlots] = useState(2);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [detailPlayer, setDetailPlayer] = useState<ShowcasePlayer | null>(null);

  const requested = useRef<Set<string>>(new Set());
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const prevOffsets = useRef<Map<string, number>>(new Map());

  // Responsive slots
  useEffect(() => {
    const handleResize = () => setSlots(sideSlots(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const go = useCallback(
    (step: number) => {
      if (!nav) return;
      setActive((a) => wrapIndex(a + step, count));
    },
    [count, nav]
  );

  const select = useCallback(
    (index: number) => setActive(wrapIndex(index, count)),
    [count]
  );

  // Lazy photo fetch for active and visible neighbors
  useEffect(() => {
    if (count === 0) return;
    for (let o = -slots; o <= slots; o += 1) {
      const p = players[wrapIndex(active + o, count)];
      if (!p || requested.current.has(p.id)) continue;
      requested.current.add(p.id);

      const photo = p.photo;
      if (photo.kind === "static") {
        setPhotos((s) => ({ ...s, [p.id]: { status: "ready", url: photo.url } }));
      } else if (photo.kind === "signed") {
        // Privacy Gate: In LIVE mode, a parent is authorized to load private storage photos ONLY for their own children.
        // For other children, private storage fetches are blocked, rendering NeutralPlayerSilhouette.
        const canAccessPhoto =
          source === "demo" ||
          parentPlayerIds.includes(p.id) ||
          userRole === "coach" ||
          userRole === "admin";

        if (!canAccessPhoto) {
          setPhotos((s) => ({ ...s, [p.id]: { status: "none" } }));
          continue;
        }

        setPhotos((s) => ({ ...s, [p.id]: { status: "loading" } }));
        fetch(`/api/player-photo/${encodeURIComponent(photo.playerId)}`)
          .then((r) => (r.ok ? r.json() : { url: null }))
          .then((j: { url?: string | null }) =>
            setPhotos((s) => ({ ...s, [p.id]: j?.url ? { status: "ready", url: j.url } : { status: "none" } }))
          )
          .catch(() => setPhotos((s) => ({ ...s, [p.id]: { status: "none" } })));
      } else {
        setPhotos((s) => ({ ...s, [p.id]: { status: "none" } }));
      }
    }
  }, [active, slots, players, count, parentPlayerIds, source, userRole]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!nav) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0);
    } else if (e.key === "End") {
      e.preventDefault();
      select(count - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDetailPlayer(players[wrapIndex(active, count)] || null);
    }
  };

  // Pointer / Touch swipe
  const onPointerDown = (e: React.PointerEvent) => {
    if (!nav) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const step = swipeStep(dx);
    if (step !== 0) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      go(step);
    }
  };

  // Compute cards positions
  const cards = useMemo(
    () =>
      players.map((p, i) => {
        const offset = circularOffset(i, active, count);
        return {
          p,
          i,
          offset,
          layout: cardLayout(offset, slots),
          wrap: isWrapJump(prevOffsets.current.get(p.id), offset),
        };
      }),
    [players, active, count, slots]
  );

  useEffect(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.p.id, c.offset);
    prevOffsets.current = m;
  }, [cards]);

  if (count === 0) {
    return (
      <main className="ts2-root" data-testid="team-showcase-empty">
        <div className="ts2-backdrop" aria-hidden="true">
          <img src="/media/walkouts/delta-gold-stadium.webp" alt="" className="ts2-stadium-base" />
          <div className="ts2-vignette" />
        </div>
        <header className="ts2-header">
          <div className="ts2-brand">
            <Image src={CREST} alt="Herb DELTA Warszawa" width={44} height={44} className="ts2-crest" />
            <div className="ts2-titles">
              <span className="ts2-kicker">
                <Sparkles className="w-3 h-3 text-amber-400" /> KADRA DRUŻYNY
              </span>
              <h1 className="ts2-title">{teamName}</h1>
            </div>
          </div>
        </header>
        <div className="ts2-stage-container text-center px-4">
          <div className="w-24 h-36 mx-auto mb-4 opacity-75">
            <NeutralPlayerSilhouette shirtNumber="-" crestSrc={CREST} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Skład jest obecnie przygotowywany</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Lista zawodników kadry rocznika 2018 pojawi się tutaj po opublikowaniu przez sztab szkoleniowy.
          </p>
        </div>
      </main>
    );
  }

  const current = players[wrapIndex(active, count)];
  const isCurrentChild = parentPlayerIds.includes(current.id);
  const RootTag = embedded ? "div" : "main";

  return (
    <RootTag className={`ts2-root ${embedded ? "ts2-root--embedded" : ""}`} data-testid="team-showcase-2">
      {/* Stadium Backdrop */}
      {!embedded && (
        <div className="ts2-backdrop" aria-hidden="true">
          <img
            src="/media/walkouts/delta-gold-stadium.webp"
            alt="Stadion piłkarski DELTA"
            className="ts2-stadium-base"
          />
          <picture>
            <source media="(max-width: 640px)" srcSet="/assets/hero-stadium-clean-mobile-v2.png" />
            <img src="/assets/hero-stadium-clean-desktop-v2.png" alt="" className="ts2-stadium-overlay" />
          </picture>
          <div className="ts2-vignette" />
          <div className="ts2-floodlight ts2-floodlight--left" />
          <div className="ts2-floodlight ts2-floodlight--right" />
        </div>
      )}

      {/* Header */}
      {!embedded && (
        <header className="ts2-header">
          <div className="ts2-brand">
            <Image
              src={CREST}
              alt="Herb DELTA Warszawa"
              width={44}
              height={44}
              className="ts2-crest"
              priority
            />
            <div className="ts2-titles">
              <span className="ts2-kicker">
                <Sparkles className="w-3 h-3 text-amber-400" /> THE ROAD TO GLORY · TEAM SHOWCASE 2.0
              </span>
              <h1 className="ts2-title">{teamName}</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="ts2-badge">
              {source === "live"
                ? "DANE RZECZYWISTE · SKŁAD DRUŻYNY"
                : liveBlockedReason
                ? "TRYB DEMO · LIVE BLOCKED"
                : "TRYB DEMO · PODGLĄD"}
            </div>
            {liveBlockedReason && (
              <span className="text-[10px] text-amber-300 font-semibold max-w-xs text-right bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                {liveBlockedReason}
              </span>
            )}
          </div>
        </header>
      )}

      {/* Stage / Carousel */}
      <div className="ts2-stage-container">
        <section
          className="ts2-stage"
          role="listbox"
          aria-label={
            nav
              ? "Karta zawodnika w karuzeli drużyny. Użyj strzałek lewo/prawo do zmiany zawodnika."
              : "Zawodnik drużyny"
          }
          aria-activedescendant={`ts2-card-${current.id}`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipe.current = null;
          }}
          data-testid="team-showcase-stage"
          data-count={count}
        >
          {cards.map(({ p, i, offset, layout, wrap }) => {
            const ph = photos[p.id];
            const photoUrl = ph?.status === "ready" ? ph.url : null;
            const isActive = offset === 0;

            return (
              <div
                key={p.id}
                id={`ts2-card-${p.id}`}
                role="option"
                aria-selected={isActive}
                aria-hidden={layout.visible ? undefined : true}
                aria-label={`${p.fullName}${p.shirtNumber ? `, numer ${p.shirtNumber}` : ""}${
                  p.positionLabel ? `, ${p.positionLabel.toLowerCase()}` : ""
                }`}
                className={`ts2-card ${isActive ? "is-active" : ""} ${wrap ? "is-wrap" : ""}`}
                data-offset={offset}
                data-player-id={p.id}
                data-testid={`team-showcase-card-${i}`}
                style={{
                  transform: `translateX(${(layout.x * 100).toFixed(2)}%) scale(${layout.scale.toFixed(
                    3
                  )}) translateY(${isActive ? "0px" : "12px"})`,
                  zIndex: layout.z,
                  opacity: layout.visible ? 1 : 0,
                  pointerEvents: layout.visible ? "auto" : "none",
                  visibility: layout.visible ? "visible" : "hidden",
                }}
                onClick={() => {
                  if (!suppressClick.current) {
                    if (isActive) {
                      setDetailPlayer(p);
                    } else {
                      select(i);
                    }
                  }
                }}
              >
                <div className="ts2-card-inner">
                  <div className="ts2-card-glow" />

                  {/* Corner Badges */}
                  <span className="ts2-card-number">
                    {p.shirtNumber ? `#${p.shirtNumber}` : "#-"}
                  </span>

                  <span className="ts2-card-pos">
                    {p.positionCode || "DELTA"}
                  </span>

                  {/* Photo or Silhouette */}
                  <div className="ts2-photo-slot">
                    {photoUrl ? (
                      <img
                        className="ts2-photo"
                        src={photoUrl}
                        alt={`Zawodnik ${p.fullName}`}
                        draggable={false}
                        onError={() => setPhotos((s) => ({ ...s, [p.id]: { status: "none" } }))}
                      />
                    ) : (
                      <div className="ts2-silhouette" data-testid="team-showcase-silhouette">
                        <NeutralPlayerSilhouette
                          shirtNumber={p.shirtNumber}
                          accentColor="#f5c451"
                          glowColor="rgba(245, 196, 81, 0.45)"
                          crestSrc={CREST}
                        />
                        {ph?.status !== "loading" && (
                          <span className="ts2-soon-pill">ZDJĘCIE WKRÓTCE</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nameplate */}
                  <div className="ts2-nameplate">
                    <span className="ts2-name-first">{p.firstName || "ZAWODNIK"}</span>
                    <strong className="ts2-name-last">{p.lastName}</strong>
                  </div>

                  {/* Dim overlay for side cards */}
                  <div className="ts2-card-dim" style={{ opacity: layout.dim }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Active Player Summary */}
      <section className="ts2-info" aria-live="polite" data-testid="team-showcase-info">
        <div className="ts2-info-headline">
          {current.shirtNumber && <span className="ts2-info-num">#{current.shirtNumber}</span>}
          <h2 className="ts2-info-name">
            {current.firstName && <span className="mr-2 font-normal text-slate-300">{current.firstName}</span>}
            <strong>{current.lastName}</strong>
          </h2>
        </div>

        <div className="ts2-info-meta">
          <span className="ts2-meta-badge">
            {current.positionLabel || "ZAWODNIK AKADEMII"}
          </span>
          {isCurrentChild && (
            <span className="ts2-meta-badge text-emerald-400 border-emerald-500/40 bg-emerald-950/40 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> TWÓJ PODOPIECZNY
            </span>
          )}
        </div>
      </section>

      {/* Controls */}
      <nav className="ts2-controls" aria-label="Nawigacja po składzie drużyny">
        {nav ? (
          <>
            <button
              type="button"
              className="ts2-nav-btn"
              onClick={() => go(-1)}
              aria-label="Poprzedni zawodnik"
              data-testid="team-showcase-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              className="ts2-action-btn"
              onClick={() => setDetailPlayer(current)}
              data-testid="team-showcase-detail-btn"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Szczegóły karty</span>
            </button>

            <span className="ts2-counter" data-testid="team-showcase-counter">
              {wrapIndex(active, count) + 1} / {count}
            </span>

            <button
              type="button"
              className="ts2-nav-btn"
              onClick={() => go(1)}
              aria-label="Następny zawodnik"
              data-testid="team-showcase-next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ts2-action-btn"
            onClick={() => setDetailPlayer(current)}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Szczegóły karty</span>
          </button>
        )}
      </nav>

      {/* Detail Modal (ETAP 5: Szczegółowy panel zgodny z uprawnieniami) */}
      {detailPlayer && (
        <div
          className="ts2-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ts2-modal-title"
          onClick={() => setDetailPlayer(null)}
        >
          <div
            className="ts2-modal-box"
            onClick={(e) => e.stopPropagation()}
            data-testid="team-showcase-modal"
          >
            <div className="ts2-modal-header">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 id="ts2-modal-title" className="text-base font-bold text-white">
                  Karta Zawodnika — Skład 2.0
                </h3>
              </div>
              <button
                type="button"
                className="ts2-modal-close"
                onClick={() => setDetailPlayer(null)}
                aria-label="Zamknij panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-20 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
                <NeutralPlayerSilhouette shirtNumber={detailPlayer.shirtNumber} crestSrc={CREST} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-400">
                  {detailPlayer.shirtNumber ? `NUMER #${detailPlayer.shirtNumber}` : "NUMER NIEPRZYPISANY"}
                </div>
                <div className="text-lg font-black text-white">{detailPlayer.fullName}</div>
                <div className="text-xs text-slate-400">
                  Pozycja: <strong className="text-slate-200">{detailPlayer.positionLabel || "Zawodnik"}</strong>
                </div>
              </div>
            </div>

            {/* Privacy or Direct Link to Career Passport */}
            {parentPlayerIds.includes(detailPlayer.id) ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> To jest Twój podopieczny
                </div>
                <p className="text-xs text-slate-300">
                  Posiadasz pełne uprawnienia do wglądu w statystyki, frekwencję treningową oraz postępy Sports XP.
                </p>
                <Link
                  href={`/preview/dashboard-ui4/real-data?view=road-to-glory&child=${detailPlayer.id}`}
                  className="mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  <span>Otwórz Paszport Kariery (Road to Glory)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" /> Profil chroniony polityką prywatności
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Zgodnie ze standardem DELTA INFERNO i ochroną danych osobowych dzieci, szczegółowe statystyki
                  frekwencji, karty i punkty Sports XP są widoczne wyłącznie dla prawnych opiekunów zawodnika.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition"
                onClick={() => setDetailPlayer(null)}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </RootTag>
  );
}
