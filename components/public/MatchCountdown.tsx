"use client";

import { useEffect, useState } from "react";
import styles from "./public-experience.module.css";

function getParts(target: string) {
  const remaining = Math.max(0, new Date(target).getTime() - Date.now());
  const minutes = Math.floor(remaining / 60_000);
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
    live: remaining === 0,
  };
}

export default function MatchCountdown({ target }: { target: string }) {
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const update = () => setParts(getParts(target));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (parts.live) return <strong className={styles.countdownLive}>TERAZ</strong>;

  return (
    <div className={styles.countdown} aria-label={`${parts.days} dni, ${parts.hours} godzin, ${parts.minutes} minut`}>
      <span><b>{String(parts.days).padStart(2, "0")}</b><small>DNI</small></span>
      <i>:</i>
      <span><b>{String(parts.hours).padStart(2, "0")}</b><small>GODZ.</small></span>
      <i>:</i>
      <span><b>{String(parts.minutes).padStart(2, "0")}</b><small>MIN.</small></span>
    </div>
  );
}
