"use client";

/**
 * DELTA INFERNO — P15B: TEAM SHOWCASE 3.0 — DELTA CHAMPIONS (prototype, DEMO data).
 *
 * Intro (CSS, ~3 s): darkened stadium -> DELTA crest -> beams light up ->
 * cinematic entrance of the central player -> large surname and number -> side players.
 * Carousel: one card per player (the Showcase 2.0 geometry: no duplicates), swipe /
 * tap / arrows / keyboard; beams change colour and tilt with the selected player.
 * Variants (CSS skins over one structure): champions (recommended), stadium (A),
 * ultimate (B), barca (C) — switchable in Preview.
 *
 * Performance: 2D only (translate/scale), animations of transform/opacity, no video,
 * no libraries, no backdrop-filter. Reduced Motion: no intro, instant changes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { INTRO_TIMELINE, SHOWCASE_VARIANTS, lightRigFor, type ShowcaseVariant } from "@/lib/team/teamShowcaseV3";
import "./team-showcase-v3.css";

export interface TeamShowcaseV3Props {
  players: ShowcasePlayer[];
  initialVariant: ShowcaseVariant;
}

const CREST = "/teamlogos/gm.png";
const STADIUM: Record<ShowcaseVariant, string> = {
  champions: "/media/walkouts/delta-inferno-red-stadium.webp",
  stadium: "/media/walkouts/delta-gold-stadium.webp",
  ultimate: "/media/walkouts/delta-matchday-stadium.webp",
  barca: "/media/walkouts/delta-inferno-red-stadium.webp",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener?.("change", read);
    return () => mq.removeEventListener?.("change", read);
  }, []);
  return reduced;
}

export default function TeamShowcaseV3({ players, initialVariant }: TeamShowcaseV3Props) {
  const count = players.length;
  const nav = showNavigation(count);
  const reduced = usePrefersReducedMotion();
  const [variant, setVariant] = useState<ShowcaseVariant>(initialVariant);
  const [phase, setPhase] = useState<"intro" | "ready">("intro");
  const [active, setActive] = useState(0);
  const [slots, setSlots] = useState(1);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, true>>({});
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const prevOffsets = useRef<Map<string, number>>(new Map());

  // Intro: one-off; Reduced Motion = straight to "ready".
  useEffect(() => {
    if (reduced) { setPhase("ready"); return; }
    const t = window.setTimeout(() => setPhase("ready"), INTRO_TIMELINE.done);
    return () => window.clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    const read = () => setSlots(sideSlots(window.innerWidth));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const chooseVariant = useCallback((v: ShowcaseVariant) => {
    setVariant(v);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", v);
      window.history.replaceState(null, "", url.toString());
    } catch { /* safe */ }
  }, []);

  const go = useCallback((step: number) => {
    if (!nav) return;
    setPhase("ready");
    setActive((a) => wrapIndex(a + step, count));
  }, [count, nav]);
  const select = useCallback((i: number) => { setPhase("ready"); setActive(wrapIndex(i, count)); }, [count]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!nav) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "Home") { e.preventDefault(); select(0); }
    else if (e.key === "End") { e.preventDefault(); select(count - 1); }
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!nav) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const step = swipeStep(dx);
    if (step !== 0) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      go(step);
    }
  };

  const cards = useMemo(() => players.map((p, i) => {
    const offset = circularOffset(i, active, count);
    return { p, i, offset, layout: cardLayout(offset, slots), wrap: isWrapJump(prevOffsets.current.get(p.id), offset) };
  }), [players, active, count, slots]);
  useEffect(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.p.id, c.offset);
    prevOffsets.current = m;
  }, [cards]);

  if (count === 0) {
    return (
      <main className="dc-root is-ready" data-variant={variant} data-testid="team-showcase-v3" data-state="empty">
        <div className="dc-empty" role="status">Skład jest przygotowywany</div>
      </main>
    );
  }

  const current = players[wrapIndex(active, count)];
  const rig = lightRigFor(current);
  const photoOf = (p: ShowcasePlayer) => (p.photo.kind === "static" && !failedPhotos[p.id] ? p.photo.url : null);
  const currentPhoto = photoOf(current);

  return (
    <main
      className={`dc-root ${phase === "intro" ? "is-intro" : "is-ready"} ${reduced ? "is-reduced" : ""}`}
      data-variant={variant}
      data-phase={phase}
      data-rig={rig.key}
      data-testid="team-showcase-v3"
      data-state="demo"
      style={{ ["--dc-beam" as string]: rig.beam, ["--dc-accent" as string]: rig.accent, ["--dc-tilt" as string]: `${rig.tilt}deg` } as React.CSSProperties}
    >
      {/* 1. Darkened stadium */}
      <div className="dc-bg" style={{ backgroundImage: `url('${STADIUM[variant]}')` }} aria-hidden="true" />
      <div className="dc-bg-dim" aria-hidden="true" />
      <div className="dc-pitch-lines" aria-hidden="true" />

      {/* 3. Beams (colour and tilt follow the selected player) */}
      <div className="dc-lights" aria-hidden="true">
        <span className="dc-beam is-l" />
        <span className="dc-beam is-c" />
        <span className="dc-beam is-r" />
        <span key={`flare-${current.id}`} className="dc-flare" />
      </div>

      {/* 2. DELTA crest in the intro */}
      <div className="dc-crest-intro" aria-hidden="true">
        <img src={CREST} alt="" />
      </div>

      {/* 5. Giant typography behind the player (recommended / C) */}
      <div key={`type-${current.id}`} className="dc-hero-type" aria-hidden="true">
        {current.shirtNumber && <span className="dc-hero-number">{current.shirtNumber}</span>}
        <span className="dc-hero-surname">{current.lastName}</span>
      </div>

      <header className="dc-header">
        <img className="dc-crest" src={CREST} alt="Herb DELTA Warszawa 2018 GM" />
        <div className="dc-titles">
          <span className="dc-kicker">DELTA WARSZAWA 2018 GM</span>
          <h1 className="dc-title">DELTA Champions</h1>
        </div>
        <span className="dc-demo-pill" data-testid="team-showcase-v3-demo-pill">DEMO</span>
      </header>

      {/* 4 + 6. Carousel: central player + side players */}
      <section
        className="dc-stage"
        role="listbox"
        aria-label={nav ? "Zawodnicy drużyny. Strzałki w lewo i prawo zmieniają zawodnika." : "Zawodnik drużyny"}
        aria-activedescendant={`dc-card-${current.id}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
        data-testid="team-showcase-v3-stage"
      >
        {cards.map(({ p, i, offset, layout, wrap }) => {
          const isActive = offset === 0;
          const photo = photoOf(p);
          return (
            <div
              key={p.id}
              id={`dc-card-${p.id}`}
              role="option"
              aria-selected={isActive}
              aria-hidden={layout.visible ? undefined : true}
              aria-label={`${p.fullName}${p.shirtNumber ? `, numer ${p.shirtNumber}` : ""}${p.positionLabel ? `, ${p.positionLabel.toLowerCase()}` : ""}`}
              className={`dc-card ${isActive ? "is-active" : "is-side"} ${wrap ? "is-wrap" : ""} ${photo ? "has-photo" : "no-photo"}`}
              data-offset={offset}
              data-visible={layout.visible ? "1" : "0"}
              data-player-id={p.id}
              style={{
                transform: `translateX(${(layout.x * 100).toFixed(2)}%) scale(${layout.scale.toFixed(3)})`,
                zIndex: layout.z,
                opacity: layout.visible ? 1 : 0,
                pointerEvents: layout.visible ? "auto" : "none",
                visibility: layout.visible ? "visible" : "hidden",
                ["--dc-side-delay" as string]: `${Math.min(3, Math.abs(offset)) * 90}ms`,
              } as React.CSSProperties}
              onClick={() => { if (!suppressClick.current && !isActive) select(i); }}
            >
              <div className="dc-card-inner">
                <div className="dc-card-bg" />
                <div className="dc-card-frame" />
                {photo ? (
                  <img
                    className="dc-photo"
                    src={photo}
                    alt={`Zawodnik ${p.fullName}`}
                    draggable={false}
                    onError={() => setFailedPhotos((s) => ({ ...s, [p.id]: true }))}
                  />
                ) : (
                  <div className="dc-silhouette" data-testid="team-showcase-v3-silhouette">
                    <NeutralPlayerSilhouette shirtNumber={null} accentColor="#f5c451" glowColor="rgba(220, 38, 38, 0.38)" crestSrc={CREST} />
                  </div>
                )}
                {p.shirtNumber && <span className="dc-card-number">{p.shirtNumber}</span>}
                {p.positionCode && <span className="dc-card-pos">{p.positionCode}</span>}
                <div className="dc-card-nameplate">
                  <span className="dc-card-first">{p.firstName}</span>
                  <strong className="dc-card-last">{p.lastName}</strong>
                </div>
                {!photo && <span className="dc-soon" data-testid="team-showcase-v3-photo-soon">ZDJĘCIE WKRÓTCE</span>}
                <div className="dc-card-dim" style={{ opacity: layout.dim }} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Selected player details */}
      <section key={`info-${current.id}`} className="dc-info" aria-live="polite" data-testid="team-showcase-v3-info">
        {current.shirtNumber && <span className="dc-info-number">#{current.shirtNumber}</span>}
        <h2 className="dc-info-name" data-testid="team-showcase-v3-info-name">
          {current.firstName && <span>{current.firstName}</span>}
          <strong>{current.lastName}</strong>
        </h2>
        <div className="dc-info-meta">
          {current.positionLabel && <span className="dc-pill is-position">{current.positionLabel}</span>}
          {!currentPhoto && <span className="dc-pill is-soon">ZDJĘCIE WKRÓTCE</span>}
        </div>
      </section>

      <footer className="dc-footer">
        {nav ? (
          <nav className="dc-controls" aria-label="Nawigacja po składzie" data-testid="team-showcase-v3-controls">
            <button type="button" className="dc-nav" onClick={() => go(-1)} aria-label="Poprzedni zawodnik" data-testid="team-showcase-v3-prev">‹</button>
            <span className="dc-counter" data-testid="team-showcase-v3-counter">{wrapIndex(active, count) + 1} / {count}</span>
            <button type="button" className="dc-nav" onClick={() => go(1)} aria-label="Następny zawodnik" data-testid="team-showcase-v3-next">›</button>
          </nav>
        ) : <div className="dc-controls is-placeholder" aria-hidden="true" />}

        {/* Variant switcher (Preview) */}
        <div className="dc-variants" role="radiogroup" aria-label="Wariant wyglądu (Preview)" data-testid="team-showcase-v3-variants">
          {SHOWCASE_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={variant === v.id}
              title={`${v.name} — ${v.tagline}`}
              className={`dc-variant ${variant === v.id ? "is-on" : ""}`}
              onClick={() => chooseVariant(v.id)}
              data-testid={`team-showcase-v3-variant-${v.id}`}
            >
              <b>{v.letter}</b><span>{v.name}</span>
            </button>
          ))}
        </div>
      </footer>

      {phase === "intro" && (
        <button type="button" className="dc-skip" onClick={() => setPhase("ready")} data-testid="team-showcase-v3-skip">Pomiń intro</button>
      )}
    </main>
  );
}
