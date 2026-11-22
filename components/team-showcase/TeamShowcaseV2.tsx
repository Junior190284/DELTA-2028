"use client";

/**
 * DELTA INFERNO — P14A / P14A.1: Team Showcase 2.0 (prototype).
 * Cinematic roster presentation: the selected player is large in the middle; the others
 * are smaller, darkened cards on the sides. Selection by tap/click, finger swipe, buttons
 * and the keyboard.
 *
 * Rendering: 2D only (translate + scale), no rotateY/preserve-3d/backface-visibility.
 * Side cards are darkened with an overlay's opacity, not a filter. Animations:
 * transform/opacity. No extra libraries.
 * Photos: only the player's own photo; otherwise a silhouette + "ZDJĘCIE WKRÓTCE".
 *
 * P14A.1:
 *  - views: roster (demo/live), empty ("Skład jest przygotowywany"), error (+ "Spróbuj ponownie");
 *  - each player = one card (no duplicates); with 1 player no arrows, counter or swipe;
 *  - a card that wraps (far left -> far right) does not fly across the centre: it is
 *    moved instantly and faded in.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import "./team-showcase.css";

export type TeamShowcaseView =
  | { kind: "roster"; source: "live" | "demo"; players: ShowcasePlayer[] }
  | { kind: "empty" }
  | { kind: "error"; reason: "session-invalid" | "auth-unavailable" | "query" };

export interface TeamShowcaseV2Props {
  view: TeamShowcaseView;
}

type PhotoState = { status: "loading" } | { status: "ready"; url: string } | { status: "none" };

const STADIUM_BG = "/media/walkouts/delta-gold-stadium.webp";
const CREST = "/teamlogos/gm.png";

/** Shared stadium backdrop + header (premium look in every state). */
function Shell({ children, entered, demo, testState }: { children: React.ReactNode; entered: boolean; demo?: boolean; testState: string }) {
  return (
    <main className={`dts-root ${entered ? "is-entered" : ""}`} data-testid="team-showcase-v2" data-state={testState}>
      <div className="dts-bg" style={{ backgroundImage: `url('${STADIUM_BG}')` }} aria-hidden="true" />
      <div className="dts-bg-tint" aria-hidden="true" />
      <div className="dts-lights" aria-hidden="true">
        <span className="dts-beam is-l" />
        <span className="dts-beam is-c" />
        <span className="dts-beam is-r" />
      </div>
      <header className="dts-header">
        <img className="dts-crest" src={CREST} alt="Herb DELTA Warszawa 2018 GM" />
        <div className="dts-titles">
          <span className="dts-kicker">DELTA WARSZAWA 2018 GM</span>
          <h1 className="dts-title">Skład drużyny</h1>
        </div>
        {demo && <span className="dts-demo-pill" data-testid="team-showcase-demo-pill">DEMO</span>}
      </header>
      {children}
    </main>
  );
}

function useEntered() {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return entered;
}

export default function TeamShowcaseV2({ view }: TeamShowcaseV2Props) {
  if (view.kind === "empty") return <EmptyView />;
  if (view.kind === "error") return <ErrorView reason={view.reason} />;
  if (view.players.length === 0) return <EmptyView />;
  return <RosterView players={view.players} source={view.source} />;
}

function EmptyView() {
  const entered = useEntered();
  return (
    <Shell entered={entered} testState="empty">
      <section className="dts-message" role="status" data-testid="team-showcase-empty">
        <div className="dts-message-silhouette" aria-hidden="true">
          <NeutralPlayerSilhouette accentColor="#f5c451" glowColor="rgba(220, 38, 38, 0.38)" crestSrc={CREST} />
        </div>
        <h2 className="dts-message-title">Skład jest przygotowywany</h2>
        <p className="dts-message-text">Zawodnicy pojawią się tutaj, gdy trener uzupełni skład drużyny.</p>
      </section>
    </Shell>
  );
}

function ErrorView({ reason }: { reason: "session-invalid" | "auth-unavailable" | "query" }) {
  const entered = useEntered();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const copy = {
    "session-invalid": {
      title: "Sesja wygasła",
      text: "Twoja sesja wygasła lub jest nieprawidłowa. Zaloguj się ponownie, aby zobaczyć skład drużyny.",
    },
    "auth-unavailable": {
      title: "Nie udało się sprawdzić sesji",
      text: "Nie możemy teraz potwierdzić Twojego logowania. Sprawdź połączenie i spróbuj ponownie.",
    },
    query: {
      title: "Nie udało się wczytać składu",
      text: "Wystąpił problem z pobraniem listy zawodników. Sprawdź połączenie i spróbuj ponownie.",
    },
  }[reason];
  return (
    <Shell entered={entered} testState="error">
      <section className="dts-message" role="alert" data-testid="team-showcase-error" data-reason={reason}>
        <h2 className="dts-message-title">{copy.title}</h2>
        <p className="dts-message-text">{copy.text}</p>
        <div className="dts-message-actions">
          {reason === "session-invalid" && (
            <a className="dts-retry" href="/login" data-testid="team-showcase-login">Zaloguj się ponownie</a>
          )}
          <button
            type="button"
            className={reason === "session-invalid" ? "dts-retry is-secondary" : "dts-retry"}
            data-testid="team-showcase-retry"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            {pending ? "Wczytywanie…" : "Spróbuj ponownie"}
          </button>
        </div>
      </section>
    </Shell>
  );
}

function RosterView({ players, source }: { players: ShowcasePlayer[]; source: "live" | "demo" }) {
  const count = players.length;
  const nav = showNavigation(count);
  const entered = useEntered();
  const [active, setActive] = useState(0);
  const [slots, setSlots] = useState(2);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const requested = useRef<Set<string>>(new Set());
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const prevOffsets = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const read = () => setSlots(sideSlots(window.innerWidth));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const go = useCallback((step: number) => {
    if (!nav) return;
    setActive((a) => wrapIndex(a + step, count));
  }, [count, nav]);
  const select = useCallback((index: number) => setActive(wrapIndex(index, count)), [count]);

  // Photos: only the active card and its visible neighbours. Private storage goes through
  // the existing /api/player-photo/[id] (signed URL, user's session, RLS).
  useEffect(() => {
    for (let o = -slots; o <= slots; o += 1) {
      const p = players[wrapIndex(active + o, count)];
      if (!p || requested.current.has(p.id)) continue;
      requested.current.add(p.id);
      const photo = p.photo;
      if (photo.kind === "static") {
        setPhotos((s) => ({ ...s, [p.id]: { status: "ready", url: photo.url } }));
      } else if (photo.kind === "signed") {
        setPhotos((s) => ({ ...s, [p.id]: { status: "loading" } }));
        fetch(`/api/player-photo/${encodeURIComponent(photo.playerId)}`)
          .then((r) => (r.ok ? r.json() : { url: null }))
          .then((j: { url?: string | null }) =>
            setPhotos((s) => ({ ...s, [p.id]: j?.url ? { status: "ready", url: j.url } : { status: "none" } })))
          .catch(() => setPhotos((s) => ({ ...s, [p.id]: { status: "none" } })));
      } else {
        setPhotos((s) => ({ ...s, [p.id]: { status: "none" } }));
      }
    }
  }, [active, slots, players, count]);

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
      suppressClick.current = true; // a swipe is not a click on a side card
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      go(step);
    }
  };

  // One card per player; offsets and the "wrap" flag (a jump of more than 1 position).
  const cards = useMemo(() => players.map((p, i) => {
    const offset = circularOffset(i, active, count);
    return { p, i, offset, layout: cardLayout(offset, slots), wrap: isWrapJump(prevOffsets.current.get(p.id), offset) };
  }), [players, active, count, slots]);
  useEffect(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.p.id, c.offset);
    prevOffsets.current = m;
  }, [cards]);

  const current = players[wrapIndex(active, count)];
  const currentPhoto = photos[current.id];
  const currentHasPhoto = currentPhoto?.status === "ready";

  return (
    <Shell entered={entered} demo={source === "demo"} testState={source}>
      <div key={`sweep-${current.id}`} className="dts-sweep" aria-hidden="true" />
      <section
        className={`dts-stage ${nav ? "" : "is-single"}`}
        role="listbox"
        aria-label={nav ? "Zawodnicy drużyny. Strzałki w lewo i prawo zmieniają zawodnika." : "Zawodnik drużyny"}
        aria-activedescendant={`dts-card-${current.id}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
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
              id={`dts-card-${p.id}`}
              role="option"
              aria-selected={isActive}
              aria-hidden={layout.visible ? undefined : true}
              aria-label={`${p.fullName}${p.shirtNumber ? `, numer ${p.shirtNumber}` : ""}${p.positionLabel ? `, ${p.positionLabel.toLowerCase()}` : ""}`}
              className={`dts-card ${isActive ? "is-active" : ""} ${wrap ? "is-wrap" : ""}`}
              data-offset={offset}
              data-visible={layout.visible ? "1" : "0"}
              data-player-id={p.id}
              data-testid={`team-showcase-card-${i}`}
              style={{
                transform: `translateX(${(layout.x * 100).toFixed(2)}%) scale(${layout.scale.toFixed(3)})`,
                zIndex: layout.z,
                opacity: layout.visible ? 1 : 0,
                pointerEvents: layout.visible ? "auto" : "none",
                visibility: layout.visible ? "visible" : "hidden",
              }}
              onClick={() => { if (!suppressClick.current && !isActive) select(i); }}
            >
              <div className="dts-card-inner">
                <div className="dts-card-glow" />
                {photoUrl ? (
                  <img
                    className="dts-photo"
                    src={photoUrl}
                    alt={`Zawodnik ${p.fullName}`}
                    draggable={false}
                    onError={() => setPhotos((s) => ({ ...s, [p.id]: { status: "none" } }))}
                  />
                ) : (
                  <div className="dts-silhouette" data-testid="team-showcase-silhouette">
                    {/* P14A.1: no number in the medallion; the number is shown once, in the card corner */}
                    <NeutralPlayerSilhouette shirtNumber={null} accentColor="#f5c451" glowColor="rgba(220, 38, 38, 0.38)" crestSrc={CREST} />
                  </div>
                )}
                {p.shirtNumber && <span className="dts-card-number">{p.shirtNumber}</span>}
                <div className="dts-card-nameplate">
                  <span className="dts-card-first">{p.firstName}</span>
                  <strong className="dts-card-last">{p.lastName}</strong>
                </div>
                {!photoUrl && ph?.status !== "loading" && (
                  <span className="dts-soon" data-testid="team-showcase-photo-soon">ZDJĘCIE WKRÓTCE</span>
                )}
                <div className="dts-card-dim" style={{ opacity: layout.dim }} />
              </div>
            </div>
          );
        })}
      </section>

      <section key={`info-${current.id}`} className="dts-info" aria-live="polite" data-testid="team-showcase-info">
        {current.shirtNumber && <span className="dts-info-number" data-testid="team-showcase-info-number">#{current.shirtNumber}</span>}
        <h2 className="dts-info-name" data-testid="team-showcase-info-name">
          {current.firstName && <span>{current.firstName}</span>}
          <strong>{current.lastName}</strong>
        </h2>
        <div className="dts-info-meta">
          {current.positionLabel && <span className="dts-pill is-position" data-testid="team-showcase-info-position">{current.positionLabel}</span>}
          {!currentHasPhoto && currentPhoto?.status !== "loading" && <span className="dts-pill is-soon">ZDJĘCIE WKRÓTCE</span>}
        </div>
      </section>

      {nav ? (
        <nav className="dts-controls" aria-label="Nawigacja po składzie" data-testid="team-showcase-controls">
          <button type="button" className="dts-nav" onClick={() => go(-1)} aria-label="Poprzedni zawodnik" data-testid="team-showcase-prev">‹</button>
          <span className="dts-counter" data-testid="team-showcase-counter">{wrapIndex(active, count) + 1} / {count}</span>
          <button type="button" className="dts-nav" onClick={() => go(1)} aria-label="Następny zawodnik" data-testid="team-showcase-next">›</button>
        </nav>
      ) : (
        <div className="dts-controls is-placeholder" aria-hidden="true" />
      )}
    </Shell>
  );
}
