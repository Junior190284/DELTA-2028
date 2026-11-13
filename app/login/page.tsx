"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");
  const [hasStuckSession,setHasStuckSession]=useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    setIsLocalhost(
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const message = params.get("message");
    if (error) {
      if (error === "profile_missing") {
        setMsg(
          "Brak lub błąd ładowania profilu konta (profile_missing). Wyloguj się z bieżącej sesji i spróbuj ponownie lub skontaktuj się z trenerem."
        );
      } else {
        setMsg(message ? `Błąd logowania: ${message}` : `Błąd logowania: ${error}`);
      }
      // Prevent redirect loop (/dashboard <-> /login?error=profile_missing) when session exists
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setHasStuckSession(true);
        }
      });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/dashboard");
      }
    });
  }, []);

  async function handleSignOutStuckSession() {
    await supabase.auth.signOut();
    setHasStuckSession(false);
    setMsg("Wylogowano bieżącą sesję. Możesz zalogować się ponownie.");
    if (window.location.search) {
      window.history.replaceState({}, "", "/login");
    }
  }

  async function signIn() {
    setMsg("Logowanie…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    location.href="/dashboard";
  }

  async function signInWithGoogle() {
    setMsg("Przekierowanie do Google…");

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/dashboard`
      }
    });

    if (error) setMsg(error.message);
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <div className="login-logo">Δ</div>
          <div>
            <div className="login-eyebrow">DELTA 2018 GM</div>
            <h1>Witaj w Team Hub</h1>
            <p>Zaloguj się jako rodzic, trener lub administrator.</p>
          </div>
        </div>

        <button className="google-btn" onClick={signInWithGoogle}>
          <span className="google-icon">G</span>
          <span>Kontynuuj z Google</span>
        </button>

        <div className="login-divider">
          <span></span><b>lub</b><span></span>
        </div>

        <label>E-mail</label>
        <input
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder="adres@email.pl"
          type="email"
        />

        <label>Hasło</label>
        <input
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder="••••••••"
          type="password"
        />

        <button className="login-primary" onClick={signIn}>ZALOGUJ</button>

        {/* Localhost / Dev Quick Login Box (Restricted strictly to loopback development) */}
        {isLocalhost && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "rgba(245, 158, 11, 0.08)", border: "1px dashed rgba(245, 158, 11, 0.4)" }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#f1c95c", marginBottom: 8, textAlign: "center", textTransform: "uppercase" }}>
              🛠️ Szybkie logowanie deweloperskie (Localhost)
            </div>
            <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
              <button
                type="button"
                onClick={async () => {
                  setMsg("Logowanie jako Administrator/Trener…");
                  await fetch("/api/auth/dev-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: "admin" })
                  });
                  window.location.href = "/dashboard";
                }}
                style={{ minHeight: 44, padding: "10px 14px", borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", color: "#000", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                👑 Wejdź jako Trener / Administrator
              </button>
              <button
                type="button"
                onClick={async () => {
                  setMsg("Logowanie jako Rodzic…");
                  await fetch("/api/auth/dev-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: "parent" })
                  });
                  window.location.href = "/dashboard";
                }}
                style={{ minHeight: 44, padding: "10px 14px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ⚽ Wejdź jako Rodzic (Profil Zawodnika)
              </button>
            </div>
          </div>
        )}

        <a href="/" className="login-public-back">← Wróć do publicznej strony drużyny</a>

        <div className="login-note">
          Konto Google i logowanie e-mail korzystają z tego samego systemu Supabase Auth.
        </div>

        {msg && <div className="login-msg">{msg}</div>}
        {hasStuckSession && (
          <button
            type="button"
            className="google-btn"
            style={{ marginTop: 10 }}
            onClick={handleSignOutStuckSession}
          >
            Wyloguj bieżącą sesję
          </button>
        )}
      </div>
    </main>
  );
}
