import React, { type ReactNode } from "react";
import type {
  ClubCommunication,
  DashboardUI4Model,
  ProfileModel,
  RecentAchievement,
  RecentCard,
  Section
} from "./types";

function State<T>({
  section,
  empty,
  children
}: {
  section: Section<T>;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (section.status === "empty") {
    return (
      <div className="d4-empty-state" data-state="empty">
        <span className="text-xl mb-1">📭</span>
        <p>{empty}</p>
      </div>
    );
  }
  if (section.status === "unavailable" || section.data === null) {
    const reasonText =
      section.reason === "not_authorized"
        ? "Brak uprawnień do przeglądania tej sekcji."
        : section.reason === "no_linked_player"
        ? "Brak przypisanego profilu zawodnika do konta rodzica."
        : "Dane są obecnie niedostępne.";
    return (
      <div className="d4-unavailable-state" data-state="unavailable">
        <span className="text-xl mb-1">🔒</span>
        <p>{reasonText}</p>
      </div>
    );
  }
  return <>{children(section.data)}</>;
}

export function HybridPlayerHeader({ profile }: { profile: ProfileModel }) {
  return (
    <header
      data-ui4-component="hybrid-player-header"
      className="d4-card d4-card-gold p-5 md:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        {/* Club Crest Medallion */}
        <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400/20 via-slate-900 to-sky-950 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <span className="text-2xl md:text-3xl font-black text-amber-300 tracking-tighter">Δ</span>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="d4-badge d4-badge-gold">
              {profile.teamName ?? "Akademia DELTA"}
            </span>
            <span className="d4-badge d4-badge-blue">
              {profile.actorKind === "parent"
                ? "Profil Rodzica"
                : profile.actorKind === "staff"
                ? "Sztab Szkoleniowy"
                : "Zawodnik Elity"}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {profile.displayName}
          </h1>

          <State
            section={profile.player}
            empty="Brak przypisanego profilu zawodnika."
          >
            {(p) => (
              <div className="flex items-center gap-2 text-sm text-slate-300 mt-1 font-medium">
                <span className="text-sky-400 font-bold">⚽ {p.displayName}</span>
                {p.shirtNumber !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-400/30 text-sky-200 text-xs font-mono font-bold">
                    #{p.shirtNumber}
                  </span>
                )}
                {p.position && (
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    · {p.position}
                  </span>
                )}
              </div>
            )}
          </State>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 gap-1 text-right">
        <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
          Sezon 2026/27
        </span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/90 text-amber-300 border border-amber-400/30">
          ⭐ DELTA HYBRID ELITE
        </span>
      </div>
    </header>
  );
}

export function NextActionHero({
  section
}: {
  section: DashboardUI4Model["nextAction"];
}) {
  return (
    <section
      data-ui4-component="next-action-hero"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 text-lg">⚡</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Najbliższa akcja
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Harmonogram drużyny</span>
      </div>

      <State
        section={section}
        empty="Brak zaplanowanego treningu lub meczu."
      >
        {(a) => (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-gradient-to-r from-sky-950/30 via-slate-900/60 to-slate-950/40 p-4 md:p-5 rounded-xl border border-sky-500/20">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`d4-badge ${
                    a.kind === "match" ? "d4-badge-gold" : "d4-badge-blue"
                  }`}
                >
                  {a.kind === "match" ? "🏆 MECZ LIGOWY" : "⚽ TRENING TECHNICZNY"}
                </span>
                {a.countdown && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    ⏱️ {a.countdown}
                  </span>
                )}
              </div>

              <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                {a.title}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                {a.startsAt && (
                  <span className="flex items-center gap-1">
                    <span className="text-sky-400 font-bold">📅</span>{" "}
                    {new Date(a.startsAt).toLocaleString("pl-PL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                )}
                {a.location && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">📍</span> {a.location}
                  </span>
                )}
                {a.opponent && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <span>⚔️</span> Rywal:{" "}
                    <strong className="text-slate-200">{a.opponent}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Szczegóły i Zbiórka</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </State>
    </section>
  );
}

export function PlayerProgressStrip({
  section
}: {
  section: DashboardUI4Model["progress"];
}) {
  return (
    <section
      data-ui4-component="player-progress-strip"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">📈</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Progres zawodnika
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Stadion Kariery XP</span>
      </div>

      <State section={section} empty="Brak danych o progresie.">
        {(p) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Level & Rank Badge */}
            <div className="flex items-center gap-3.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-base flex flex-col items-center justify-center shrink-0 shadow-md shadow-amber-500/20 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">LVL</span>
                <span className="text-lg font-black">{p.level}</span>
              </div>
              <div>
                <p className="text-xs uppercase font-extrabold text-amber-300 tracking-wider">
                  Ranga: {p.title}
                </p>
                <p className="text-base font-black text-white">
                  {p.currentXP.toLocaleString("pl-PL")}{" "}
                  <span className="text-xs font-semibold text-slate-400">XP Razem</span>
                </p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="md:col-span-2 space-y-2 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/60">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <span className="text-sky-400">⚡</span>
                  Do poziomu {p.level + 1}
                </span>
                <span className="font-mono text-slate-200 font-bold">
                  {p.currentLevelXP} / {p.nextLevelXP} XP ({p.progressPercent}%)
                </span>
              </div>

              <div className="d4-progress-track">
                <div
                  className="d4-progress-fill-gold"
                  style={{ width: `${p.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <span>🔥</span> Seria: <strong className="text-amber-300">{p.activityStreak} dni</strong>
                </span>
                <span>
                  Rekord: <strong className="text-slate-300">{p.maxStreak} dni</strong>
                </span>
                <span>
                  Sezon: <strong className="text-sky-300">{p.seasonXP} XP</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </State>
    </section>
  );
}

export function RecentCardsPanel({
  section
}: {
  section: DashboardUI4Model["recentCards"];
}) {
  return (
    <section
      data-ui4-component="recent-cards-panel"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-amber-300 text-lg">🎴</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Ostatnie karty
          </h2>
        </div>
        <span className="text-xs text-sky-400 font-bold cursor-pointer hover:underline">
          Zobacz wszystkie →
        </span>
      </div>

      <State section={section} empty="Nie zdobyto jeszcze żadnych kart.">
        {(cards) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {cards.map((c) => {
              const rarityColor =
                c.rarity === "inferno"
                  ? "border-red-500/50 bg-red-950/20 text-red-300"
                  : c.rarity === "legendary" || c.rarity === "legend"
                  ? "border-amber-400/50 bg-amber-950/20 text-amber-300"
                  : c.rarity === "rare" || c.rarity === "matchday"
                  ? "border-sky-400/50 bg-sky-950/20 text-sky-300"
                  : "border-slate-700/60 bg-slate-900/40 text-slate-300";

              return (
                <div
                  key={c.userCardId}
                  className={`p-3.5 rounded-xl border ${rarityColor} flex items-center gap-3.5 transition hover:scale-[1.02] shadow-sm`}
                >
                  <div className="w-12 h-16 rounded-lg bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/80 flex flex-col items-center justify-center shrink-0 shadow overflow-hidden relative">
                    {c.artworkUrl ? (
                      <img
                        src={c.artworkUrl}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <span className="text-xl">🏆</span>
                        <span className="text-[8px] font-mono font-bold text-amber-300 mt-0.5">
                          DELTA
                        </span>
                      </>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-75">
                      {c.rarity ?? "Kolekcja"}
                    </span>
                    <h4 className="text-sm font-black text-white truncate">
                      {c.name}
                    </h4>
                    {c.playerName && (
                      <p className="text-xs text-slate-300 truncate">
                        {c.playerName}
                      </p>
                    )}
                    {c.acquiredAt && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(c.acquiredAt).toLocaleDateString("pl-PL", {
                          day: "numeric",
                          month: "short"
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </State>
    </section>
  );
}

export function AlbumProgressPanel({
  section
}: {
  section: DashboardUI4Model["albumProgress"];
}) {
  return (
    <section
      data-ui4-component="album-progress-panel"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 text-lg">📖</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Postęp albumu
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Sezon 2026/27</span>
      </div>

      <State section={section} empty="Album nie zawiera jeszcze kart.">
        {(a) => (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Zgromadzone karty
                </span>
                <p className="text-2xl font-black text-white">
                  {a.owned}{" "}
                  <span className="text-sm font-semibold text-slate-400">
                    {a.total != null ? `/ ${a.total} (${a.percent}%)` : "kart w kolekcji"}
                  </span>
                </p>
              </div>

              {a.unopenedPacks > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <span>📦</span> {a.unopenedPacks} paczki do otwarcia
                </div>
              )}
            </div>

            <div className="d4-progress-track">
              <div
                className="d4-progress-fill-blue"
                style={{ width: `${a.percent != null ? Math.min(100, Math.max(0, a.percent)) : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>
                Duplikaty: <strong className="text-slate-200">{a.duplicates}</strong>
              </span>
              <span className="text-sky-400 font-semibold cursor-pointer hover:underline">
                Otwórz Album Kolekcji →
              </span>
            </div>
          </div>
        )}
      </State>
    </section>
  );
}

export function RecentAchievementsPanel({
  section
}: {
  section: DashboardUI4Model["recentAchievements"];
}) {
  return (
    <section
      data-ui4-component="recent-achievements-panel"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">🎖️</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Najnowsze odznaki
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Osiągnięcia klubu</span>
      </div>

      <State
        section={section}
        empty="Nie zdobyto jeszcze żadnych odznak."
      >
        {(items) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((a: RecentAchievement) => (
              <div
                key={a.id}
                className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3 transition hover:border-amber-400/30"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-lg flex items-center justify-center shrink-0">
                  {a.icon ? (
                    <img src={a.icon} alt={a.name} className="w-6 h-6 object-contain" />
                  ) : (
                    "⭐"
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-white truncate">
                    {a.name}
                  </h4>
                  {a.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {a.description}
                    </p>
                  )}
                  {a.unlockedAt && (
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {new Date(a.unlockedAt).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </State>
    </section>
  );
}

export function TeamShowcaseGateway({
  section
}: {
  section: DashboardUI4Model["teamShowcase"];
}) {
  return (
    <section
      data-ui4-component="team-showcase-gateway"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 text-lg">👥</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Prezentacja drużyny
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Team Showcase 3.0</span>
      </div>

      <State
        section={section}
        empty="Brak zawodników do prezentacji."
      >
        {(s) => (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/80 to-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-base font-black text-white">
                {s.playerCount} Zawodników w Kadrze
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {s.featuredPlayers.map((p) => (
                  <span
                    key={p.id}
                    className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                  >
                    <span>👤</span>
                    <span>{p.displayName}</span>
                    {p.shirtNumber !== null && (
                      <span className="text-amber-300 font-bold font-mono">
                        #{p.shirtNumber}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <a
              href="/preview/team-showcase-v3"
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-400/30 text-xs font-bold uppercase tracking-wider transition text-center shrink-0 cursor-pointer"
            >
              Otwórz Showcase →
            </a>
          </div>
        )}
      </State>
    </section>
  );
}

export function ClubCommunicationsPanel({
  section
}: {
  section: DashboardUI4Model["clubCommunications"];
}) {
  return (
    <section
      data-ui4-component="club-communications-panel"
      className="d4-card p-5 md:p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">📢</span>
          <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-200">
            Komunikaty klubu
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Aktualności DELTA</span>
      </div>

      <State
        section={section}
        empty="Brak nowych komunikatów."
      >
        {(items: ClubCommunication[]) => (
          <div className="space-y-3">
            {items.map((c) => (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border ${
                  c.urgent
                    ? "bg-red-950/20 border-red-500/40"
                    : "bg-slate-900/40 border-slate-800/80"
                } flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {c.urgent && (
                      <span className="d4-badge d4-badge-gold text-[10px]">
                        🚨 PILNE
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-400">
                      {c.source === "club_update" ? "Aktualizacja" : "Wiadomość"}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white">{c.title}</h4>
                  {c.summary && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      {c.summary}
                    </p>
                  )}
                </div>

                {c.publishedAt && (
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {new Date(c.publishedAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short"
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </State>
    </section>
  );
}
