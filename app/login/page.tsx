"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const message = params.get("message");
    if (error) {
      setMsg(message ? `Błąd logowania: ${message}` : `Błąd logowania: ${error}`);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/dashboard");
      }
    });
  }, []);

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

        <a href="/" className="login-public-back">← Wróć do publicznej strony drużyny</a>

        <div className="login-note">
          Konto Google i logowanie e-mail korzystają z tego samego systemu Supabase Auth.
        </div>

        {msg && <div className="login-msg">{msg}</div>}
      </div>
    </main>
  );
}
