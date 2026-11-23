import type { ReactNode } from "react";
import type { DashboardUI4Model, ProfileModel, Section } from "./types";

function State<T>({ section, empty, children }: { section: Section<T>; empty: string; children: (data: T) => ReactNode }) {
  if (section.status === "empty") return <p data-state="empty">{empty}</p>;
  if (section.status === "unavailable" || section.data === null) return <p data-state="unavailable">Dane są obecnie niedostępne.</p>;
  return <>{children(section.data)}</>;
}

export function HybridPlayerHeader({ profile }: { profile: ProfileModel }) {
  return <header data-ui4-component="hybrid-player-header"><p>{profile.teamName ?? "Drużyna"}</p><h2>{profile.displayName}</h2>
    <State section={profile.player} empty="Brak przypisanego profilu zawodnika.">{p => <p>{p.displayName}{p.shirtNumber !== null ? ` · #${p.shirtNumber}` : ""}</p>}</State>
  </header>;
}
export function NextActionHero({ section }: { section: DashboardUI4Model["nextAction"] }) {
  return <section data-ui4-component="next-action-hero"><h2>Najbliższa akcja</h2><State section={section} empty="Brak zaplanowanego treningu lub meczu.">{a => <div><p>{a.kind === "match" ? "Mecz" : "Trening"}</p><h3>{a.title}</h3>{a.countdown ? <p>{a.countdown}</p> : null}</div>}</State></section>;
}
export function PlayerProgressStrip({ section }: { section: DashboardUI4Model["progress"] }) {
  return <section data-ui4-component="player-progress-strip"><h2>Progres zawodnika</h2><State section={section} empty="Brak danych o progresie.">{p => <div><p>Poziom {p.level} · {p.title}</p><progress value={p.progressPercent} max={100}>{p.progressPercent}%</progress><p>{p.currentXP} XP</p></div>}</State></section>;
}
export function RecentCardsPanel({ section }: { section: DashboardUI4Model["recentCards"] }) {
  return <section data-ui4-component="recent-cards-panel"><h2>Ostatnie karty</h2><State section={section} empty="Nie zdobyto jeszcze żadnych kart.">{cards => <ul>{cards.map(c => <li key={c.userCardId}>{c.name}</li>)}</ul>}</State></section>;
}
export function AlbumProgressPanel({ section }: { section: DashboardUI4Model["albumProgress"] }) {
  return <section data-ui4-component="album-progress-panel"><h2>Postęp albumu</h2><State section={section} empty="Album nie zawiera jeszcze kart.">{a => <div><progress value={a.percent} max={100}>{a.percent}%</progress><p>{a.owned} / {a.total}</p></div>}</State></section>;
}
export function RecentAchievementsPanel({ section }: { section: DashboardUI4Model["recentAchievements"] }) {
  return <section data-ui4-component="recent-achievements-panel"><h2>Najnowsze odznaki</h2><State section={section} empty="Nie zdobyto jeszcze żadnych odznak.">{items => <ul>{items.map(a => <li key={a.id}>{a.name}</li>)}</ul>}</State></section>;
}
export function TeamShowcaseGateway({ section }: { section: DashboardUI4Model["teamShowcase"] }) {
  return <section data-ui4-component="team-showcase-gateway"><h2>Prezentacja drużyny</h2><State section={section} empty="Brak zawodników do prezentacji.">{s => <p>{s.playerCount} zawodników</p>}</State></section>;
}
