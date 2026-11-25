"use client";

import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./public-experience.module.css";

const links = [
  ["Mecze", "#mecze"],
  ["Drużyna", "#druzyna"],
  ["Kalendarz", "#kalendarz"],
  ["O aplikacji", "#o-aplikacji"],
] as const;

export default function PublicNav({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const destination = signedIn ? "/dashboard" : "/login";

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ""}`}>
      <a className={styles.navBrand} href="#top" aria-label="DELTA 2018 GM — strona główna">
        <Image src="/teamlogos/gm-crest.webp" alt="" width={54} height={54} priority />
        <span><b>DELTA 2018 GM</b><small>GÓRNY MOKOTÓW</small></span>
      </a>

      <nav className={styles.desktopNav} aria-label="Główna nawigacja">
        {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      </nav>

      <Link className={styles.navLogin} href={destination}>
        <LockKeyhole aria-hidden="true" /> {signedIn ? "PANEL DRUŻYNY" : "ZALOGUJ SIĘ"}
      </Link>

      <button
        className={styles.menuButton}
        type="button"
        aria-label={open ? "Zamknij menu" : "Otwórz menu"}
        aria-expanded={open}
        aria-controls="public-mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X /> : <Menu />}
      </button>

      <nav
        id="public-mobile-menu"
        className={`${styles.mobileMenu} ${open ? styles.mobileMenuOpen : ""}`}
        aria-label="Mobilna nawigacja"
      >
        {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        <Link href={destination} onClick={() => setOpen(false)}><LockKeyhole /> {signedIn ? "PANEL DRUŻYNY" : "ZALOGUJ SIĘ"}</Link>
      </nav>
    </header>
  );
}
