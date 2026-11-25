"use client";

import { Flame, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./public-experience.module.css";

export default function CinematicIntro() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button className={styles.secondaryButton} type="button" onClick={() => setOpen(true)}>
        <Flame aria-hidden="true" /> ZOBACZ INTRO
      </button>

      {open && (
        <div className={styles.introOverlay} role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className={styles.introDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cinematic-intro-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.introHeader}>
              <div>
                <span>DELTA 2018 GM</span>
                <h2 id="cinematic-intro-title">WEJDŹ NA STADION</h2>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Zamknij intro">
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.introVideoWrap}>
              <video
                controls
                autoPlay={!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches}
                muted
                playsInline
                preload="metadata"
                poster="/media/walkouts/delta-inferno-tunnel-prelude.webp"
                aria-label="Cinematic intro DELTA INFERNO"
              >
                <source src="/media/walkouts/delta-inferno-stadium-desktop-v1.mp4" type="video/mp4" />
                Twoja przeglądarka nie obsługuje odtwarzania wideo.
              </video>
            </div>
            <p>Materiał demonstracyjny · bez danych i wizerunku zawodników</p>
          </section>
        </div>
      )}
    </>
  );
}
