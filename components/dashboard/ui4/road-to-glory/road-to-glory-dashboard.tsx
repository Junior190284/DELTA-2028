"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  Layers3,
  Lock,
  MapPin,
  Medal,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import DeltaCard from "@/components/cards/DeltaCard";
import TeamShowcase2 from "@/components/team-showcase-2/TeamShowcase2";
import { buildRoster, type ShowcasePlayer } from "@/lib/team/teamShowcase";
import { NEUTRAL_SHOWCASE_ROSTER } from "@/lib/team/teamShowcaseDemo";
import { subscribeCardEvents } from "@/lib/cards/cardSync";
import type { DeltaCardModel } from "@/lib/cards/deltaCardModel";
import { toDeltaCardModel } from "../collection-dashboard";
import { DeltaDesktopSidebar } from "../delta-desktop-sidebar";
import { DeltaMobileBottomNav } from "../delta-mobile-nav";
import type { CollectionCard, DashboardUI4Model, RecentCard } from "../types";

export interface RoadToGloryDashboardProps {
  model: DashboardUI4Model;
  mode?: "demo" | "real-data";
  activeChildId?: string | null;
  rosterPlayers?: ShowcasePlayer[];
  parentPlayerIds?: string[];
  teamName?: string;
  userRole?: string | null;
  liveBlockedReason?: string | null;
}

function formatWarsawDateParts(isoString?: string | null) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return null;
    const day = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric" }).format(d);
    const monthShort = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", month: "short" })
      .format(d)
      .replace(".", "")
      .toUpperCase();
    const weekday = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long" })
      .format(d)
      .toUpperCase();
    const time = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return { day, monthShort, weekday, time };
  } catch {
    return null;
  }
}

function formatCommunicationDate(publishedAt?: string | null): string {
  if (!publishedAt) return "—";
  try {
    const d = new Date(publishedAt);
    if (Number.isNaN(d.getTime())) return "—";
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (fmt.format(now) === fmt.format(d)) return "Dzisiaj";
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    if (fmt.format(yesterday) === fmt.format(d)) return "Wczoraj";
    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return "—";
  }
}

function renderAchievementIcon(iconName?: string | null) {
  switch (iconName) {
    case "Shield":
      return <Shield aria-hidden="true" />;
    case "Zap":
      return <Zap aria-hidden="true" />;
    case "Trophy":
      return <Trophy aria-hidden="true" />;
    case "Crown":
      return <Crown aria-hidden="true" />;
    case "Medal":
      return <Medal aria-hidden="true" />;
    case "Flame":
      return <Flame aria-hidden="true" />;
    case "Award":
      return <Award aria-hidden="true" />;
    default:
      return <Star aria-hidden="true" />;
  }
}

function recentCardToDeltaModel(card: RecentCard): DeltaCardModel {
  const syntheticCollectionCard: CollectionCard = {
    id: card.userCardId,
    cardId: card.definitionId,
    name: card.name,
    title: card.name,
    rarity: card.rarity,
    cardType: null,
    category: "base",
    cardNumber: null,
    season: "2026/27",
    playerName: card.playerName,
    playerShirtNumber: null,
    playerPosition: null,
    playerPhotoUrl: null,
    artworkUrl: card.artworkUrl,
    artworkPose: null,
    frameTheme: null,
    acquiredAt: card.acquiredAt,
    duplicatesCount: 0,
    quantity: 1,
    isFavorite: false,
  };
  return toDeltaCardModel(syntheticCollectionCard);
}

export function RoadToGloryDashboard({
  model,
  mode = "demo",
  activeChildId = null,
  rosterPlayers,
  parentPlayerIds,
  teamName,
  userRole,
  liveBlockedReason = null,
}: RoadToGloryDashboardProps) {
  const {
    profile,
    nextAction,
    progress,
    recentCards,
    collectionCards,
    albumProgress,
    recentAchievements,
    clubCommunications,
  } = model;

  const isRealData = mode === "real-data";
  const playerData = profile.player.status === "available" ? profile.player.data : null;
  const resolvedPlayerId = playerData?.id || null;
  const isPlayerRestricted = profile.player.status === "unavailable";
  const isPlayerEmpty = profile.player.status === "empty";

  const [photoFailedForId, setPhotoFailedForId] = useState<string | null>(null);
  const [unopenedPacksCount, setUnopenedPacksCount] = useState<number>(
    albumProgress.data?.unopenedPacks ?? 0
  );

  useEffect(() => {
    setUnopenedPacksCount(albumProgress.data?.unopenedPacks ?? 0);
  }, [albumProgress.data?.unopenedPacks]);

  useEffect(() => {
    const unsubscribe = subscribeCardEvents({
      onPackOpened: (payload) => {
        if (
          typeof payload.remaining_unopened_packs_count === "number" &&
          Number.isFinite(payload.remaining_unopened_packs_count)
        ) {
          setUnopenedPacksCount(Math.max(0, Math.floor(payload.remaining_unopened_packs_count)));
        } else {
          setUnopenedPacksCount((prev) => Math.max(0, prev - 1));
        }
      },
      onCollectionUpdated: (payload) => {
        if (
          typeof payload.remaining_unopened_packs_count === "number" &&
          Number.isFinite(payload.remaining_unopened_packs_count)
        ) {
          setUnopenedPacksCount(Math.max(0, Math.floor(payload.remaining_unopened_packs_count)));
        }
      },
    });
    return unsubscribe;
  }, []);

  // Derive collection route consistent with active mode
  const collectionHref = isRealData
    ? `/preview/dashboard-ui4/real-data?view=collection${activeChildId ? `&child=${activeChildId}` : ""}`
    : "/preview/dashboard-ui4?view=collection";

  // Player Passport resolved fields (strictly from DashboardUI4Model — zero fake numbers)
  const displayPlayerName = playerData?.displayName || (isPlayerEmpty ? "Brak przypisanego zawodnika" : profile.displayName);
  const shirtNumber = playerData?.shirtNumber ?? null;
  const positionLabel = playerData?.position || null;
  const levelData = progress.status === "available" ? progress.data : null;

  // Only attempt authorized photo endpoint in real-data mode for an actual linked player UUID
  const canLoadAuthorizedPhoto =
    isRealData &&
    Boolean(resolvedPlayerId) &&
    !resolvedPlayerId?.startsWith("demo-") &&
    photoFailedForId !== resolvedPlayerId;
  const authorizedPhotoUrl = canLoadAuthorizedPhoto ? `/api/player-photo/${resolvedPlayerId}` : null;

  // Next event date parsing (Europe/Warsaw)
  const nextEvent = nextAction.status === "available" ? nextAction.data : null;
  const nextEventDate = formatWarsawDateParts(nextEvent?.startsAt);

  // Collection cards to display (max 3)
  const previewCardModels: DeltaCardModel[] =
    collectionCards?.status === "available" && collectionCards.data && collectionCards.data.length > 0
      ? collectionCards.data.slice(0, 3).map(toDeltaCardModel)
      : recentCards.status === "available" && recentCards.data && recentCards.data.length > 0
      ? recentCards.data.slice(0, 3).map(recentCardToDeltaModel)
      : [];

  const albumData = albumProgress.status === "available" ? albumProgress.data : null;
  const collectionPercent =
    albumData && typeof albumData.percent === "number" ? albumData.percent : null;

  // Achievements
  const unlockedList =
    recentAchievements.status === "available" && recentAchievements.data
      ? recentAchievements.data
      : [];
  const nextAch = levelData?.nextAchievement || null;
  const ringPercent = nextAch
    ? Math.max(0, Math.min(100, nextAch.percent))
    : levelData
    ? Math.max(0, Math.min(100, levelData.progressPercent))
    : 0;

  // Club communications
  const commsList =
    clubCommunications.status === "available" && clubCommunications.data
      ? clubCommunications.data.slice(0, 3)
      : [];

  // Team Showcase / Roster resolution
  const effectiveTeamName = teamName || profile.teamName || "DELTA 2018 GM";
  const teamShowcaseHref = isRealData
    ? `/preview/team-showcase${activeChildId ? `?child=${activeChildId}` : ""}`
    : "/preview/team-showcase?demo=1";

  const effectiveParentPlayerIds = useMemo(() => {
    if (parentPlayerIds && parentPlayerIds.length > 0) return parentPlayerIds;
    if (isRealData) {
      return resolvedPlayerId ? [resolvedPlayerId] : [];
    }
    // Demo mode: link Zawodnik Alfa
    return [resolvedPlayerId || "demo-player-alpha", "demo-a"];
  }, [parentPlayerIds, isRealData, resolvedPlayerId]);

  const displayedRoster: ShowcasePlayer[] = useMemo(() => {
    if (rosterPlayers && rosterPlayers.length > 0) return rosterPlayers;
    if (!isRealData) {
      return buildRoster(NEUTRAL_SHOWCASE_ROSTER);
    }
    return [];
  }, [rosterPlayers, isRealData]);

  const isRosterRestricted = isRealData && Boolean(liveBlockedReason);

  // Key player-scoped tree by resolvedPlayerId so sibling switching never leaves stale state
  const childRenderKey = resolvedPlayerId || profile.accountId || "default";

  return (
    <div className="min-h-screen bg-[#050b16] text-slate-100 flex flex-col lg:flex-row">
      <div className="hidden lg:block shrink-0">
        <DeltaDesktopSidebar
          profile={profile}
          activeItem="dashboard"
          unopenedPacks={unopenedPacksCount}
          collectionPercent={isRealData ? collectionPercent : collectionPercent ?? 75}
          variantTheme="hybrid"
        />
      </div>

      <div className="road-to-glory flex-1 min-w-0 pb-24 lg:pb-12">
        <main className="rtg-main" key={childRenderKey}>
          {/* 1. STADIUM HERO */}
          <section className="rtg-hero" aria-label="Stadium Hero">
            <div className="rtg-hero-backdrop" aria-hidden="true">
              <img
                src="/media/walkouts/delta-gold-stadium.webp"
                alt="Oświetlony stadion piłkarski DELTA"
                className="rtg-stadium-base"
              />
              <picture>
                <source media="(max-width: 640px)" srcSet="/assets/hero-stadium-clean-mobile-v2.png" />
                <img
                  src="/assets/hero-stadium-clean-desktop-v2.png"
                  alt=""
                  className="rtg-stadium-inferno-atmosphere"
                />
              </picture>
              <div className="rtg-stadium-vignette" />
              <div className="rtg-stadium-horizon-flare" />
              <div className="rtg-stadium-embers" />
              <div className="rtg-floodlight rtg-floodlight--left" />
              <div className="rtg-floodlight rtg-floodlight--right" />
              <svg className="rtg-pitch-perspective" viewBox="0 0 1000 300" fill="none" preserveAspectRatio="none">
                <path d="M80 295 L230 95 L770 95 L920 295" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.32" />
                <ellipse cx="500" cy="205" rx="115" ry="34" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.28" />
                <line x1="500" y1="95" x2="500" y2="295" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.22" />
                <path d="M355 295 L385 235 L615 235 L645 295" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.24" />
                <circle cx="500" cy="205" r="4" fill="currentColor" fillOpacity="0.4" />
              </svg>
            </div>

            <div className="rtg-hero-inner">
              <div className="rtg-club-line">
                <Image
                  src="/teamlogos/gm.png"
                  alt="Herb K.S. DELTA Warszawa"
                  width={40}
                  height={40}
                  className="rtg-mini-crest"
                  priority
                />
                <div className="rtg-club-badges">
                  <span className="rtg-kicker">
                    <Sparkles aria-hidden="true" /> THE ROAD TO GLORY
                  </span>
                  <span className="rtg-club-tag">
                    {effectiveTeamName} · {isRealData ? "STAGING REAL-DATA" : "DEMO"}
                  </span>
                </div>
              </div>

              <h1>
                Każdy trening. Każdy mecz.
                <br />
                <em>Twoja historia.</em>
              </h1>

              <p className="rtg-hero-sub">
                {playerData ? (
                  <>
                    Centrum kariery zawodnika <strong>{playerData.displayName}</strong>
                    {shirtNumber !== null ? ` (#${shirtNumber})` : ""} — zweryfikowane{" "}
                    <strong>Sports XP</strong>, terminarz i kolekcja klubowa.
                  </>
                ) : isPlayerRestricted ? (
                  <>Dostęp do danych zawodnika jest ograniczony dla bieżącej sesji.</>
                ) : (
                  <>Połącz profil zawodnika w systemie klubowym, aby śledzić postępy Sports XP i terminarz.</>
                )}
              </p>

              <div className="rtg-hero-actions">
                {nextEvent && nextEventDate ? (
                  <a href="#rtg-match-center" className="rtg-btn-primary">
                    <CalendarDays aria-hidden="true" />{" "}
                    {nextEvent.kind === "match" ? "Następny mecz" : "Najbliższy trening"} · {nextEventDate.day}{" "}
                    {nextEventDate.monthShort}
                  </a>
                ) : (
                  <a href="#rtg-player-passport" className="rtg-btn-primary">
                    <Award aria-hidden="true" /> Paszport kariery
                  </a>
                )}
                <Link href={collectionHref} className="rtg-btn-ghost">
                  <Layers3 aria-hidden="true" /> Kolekcja kart
                </Link>
              </div>
            </div>

            <div className="rtg-hero-telemetry" aria-hidden="true">
              <i />
              <span>{isRealData ? "DANE RZECZYWISTE · READ-ONLY" : "TRYB DEMO · PODGLĄD"}</span>
            </div>
          </section>

          {/* 2. PLAYER PASSPORT */}
          <section className="rtg-passport" id="rtg-player-passport" aria-label="Player Passport">
            <div className="rtg-passport-sheen" aria-hidden="true" />
            <div className="rtg-passport-glow" aria-hidden="true" />

            {isPlayerRestricted || progress.status === "unavailable" ? (
              <div className="rtg-state-box">
                <Lock className="w-5 h-5 text-amber-400" />
                <strong>Dostęp do paszportu zawodnika ograniczony</strong>
                <p>Zaloguj się jako uprawniony rodzic lub zawodnik, aby wyświetlić kartę kariery.</p>
              </div>
            ) : isPlayerEmpty ? (
              <div className="rtg-state-box">
                <strong>Brak powiązanego zawodnika</strong>
                <p>Konto nie ma jeszcze przypisanego profilu zawodnika w akademii DELTA.</p>
              </div>
            ) : (
              <>
                <div className="rtg-passport-top">
                  <div className="rtg-passport-id">
                    <div className="rtg-passport-photo-slot">
                      {authorizedPhotoUrl ? (
                        <img
                          src={authorizedPhotoUrl}
                          alt={displayPlayerName}
                          className="rtg-passport-photo"
                          onError={() => setPhotoFailedForId(resolvedPlayerId)}
                        />
                      ) : (
                        <div className="rtg-jersey-crest">
                          <span>{shirtNumber !== null ? `#${shirtNumber}` : "D"}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="rtg-eyebrow">PLAYER PASSPORT · KARTA KARIERY</span>
                      <h2>{displayPlayerName}</h2>
                      <p>
                        {positionLabel || "Zawodnik"}
                        {typeof levelData?.attendanceRatePercent === "number"
                          ? ` · Frekwencja ${levelData.attendanceRatePercent}%`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {levelData && (
                    <div className="rtg-passport-level-pill">
                      <Trophy aria-hidden="true" />
                      <div>
                        <small>{levelData.stadiumStage || "POZIOM KARIERY"}</small>
                        <strong>POZIOM {levelData.level}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {levelData ? (
                  <div className="rtg-passport-body">
                    <div className="rtg-xp-progress-box">
                      <div className="rtg-xp-head">
                        <span>
                          <Zap aria-hidden="true" /> <strong>{levelData.seasonXP}</strong> Sports XP{" "}
                          <em>
                            ({levelData.currentLevelXP} / {levelData.nextLevelXP} XP na Poziomie {levelData.level})
                          </em>
                        </span>
                        <span className="rtg-next-goal">
                          <Target aria-hidden="true" />{" "}
                          {nextAch ? (
                            <>
                              Cel: <strong>{nextAch.name}</strong> ({nextAch.current}/{nextAch.target})
                            </>
                          ) : levelData.nextLevelXP > levelData.currentLevelXP ? (
                            <>
                              Do poziomu {levelData.level + 1}:{" "}
                              <strong>+{levelData.nextLevelXP - levelData.currentLevelXP} XP</strong>
                            </>
                          ) : (
                            <>Poziom maksymalny</>
                          )}
                        </span>
                      </div>
                      <div
                        className="rtg-progress-track"
                        role="progressbar"
                        aria-valuenow={levelData.progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <i style={{ width: `${Math.max(0, Math.min(100, levelData.progressPercent))}%` }} />
                      </div>
                    </div>

                    <div className="rtg-passport-kpis">
                      <div className="rtg-kpi-pill">
                        <Flame aria-hidden="true" />
                        <div>
                          <strong>{levelData.activityStreak} dni</strong>
                          <span>Seria aktywności</span>
                        </div>
                      </div>
                      <div className="rtg-kpi-pill">
                        <Award aria-hidden="true" />
                        <div>
                          <strong>{unlockedList.length}</strong>
                          <span>Odblokowanych osiągnięć</span>
                        </div>
                      </div>
                      <div className="rtg-kpi-pill">
                        <Star aria-hidden="true" />
                        <div>
                          <strong>
                            {typeof levelData.verifiedTrainings === "number"
                              ? `${levelData.verifiedTrainings} tr. / ${levelData.verifiedMatches ?? 0} m.`
                              : levelData.title}
                          </strong>
                          <span>
                            {typeof levelData.verifiedTrainings === "number"
                              ? "Potwierdzona aktywność"
                              : "Ranga zawodnika"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rtg-state-box">
                    <strong>Brak danych postępu Sports XP</strong>
                    <p>Dane Sports XP pojawią się po potwierdzeniu pierwszego treningu lub meczu.</p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 3. MATCH CENTER */}
          <section className="rtg-panel rtg-match-center" id="rtg-match-center" aria-label="Match Center">
            <div className="rtg-panel-head">
              <div>
                <span className="rtg-eyebrow">MATCH CENTER · OPRAWA MECZOWA</span>
                <h2>
                  {nextEvent?.kind === "training" ? "Najbliższy trening zespołowy" : "Najbliższe spotkanie"}
                </h2>
              </div>
              {nextEvent?.countdown && (
                <span className="rtg-countdown-badge">
                  <Clock3 aria-hidden="true" /> {nextEvent.countdown}
                </span>
              )}
            </div>

            {nextAction.status === "unavailable" ? (
              <div className="rtg-state-box">
                <Lock className="w-5 h-5 text-amber-400" />
                <strong>Terminarz niedostępny</strong>
                <p>Brak uprawnień do wyświetlenia nadchodzących wydarzeń drużyny.</p>
              </div>
            ) : !nextEvent ? (
              <div className="rtg-state-box">
                <strong>Brak zaplanowanych wydarzeń</strong>
                <p>Gdy trener doda kolejny trening lub mecz ligowy, pojawi się on w tym miejscu.</p>
              </div>
            ) : (
              <div className="rtg-broadcast-stage">
                <div className="rtg-broadcast-pitch-bg" aria-hidden="true" />

                <div className="rtg-date-block">
                  <strong>{nextEventDate?.day || "—"}</strong>
                  <span>{nextEventDate?.monthShort || ""}</span>
                  <small>{nextEventDate?.weekday || ""}</small>
                </div>

                {nextEvent.kind === "match" ? (
                  <div className="rtg-versus-block">
                    <div className="rtg-team-side">
                      <Image src="/teamlogos/gm.png" alt="DELTA" width={54} height={54} />
                      <strong>{effectiveTeamName}</strong>
                      <small>Nasz zespół</small>
                    </div>

                    <div className="rtg-vs-center">
                      <span className="rtg-league-chip">MECZ</span>
                      <b>VS</b>
                      <time>{nextEventDate?.time || "—"}</time>
                    </div>

                    <div className="rtg-team-side">
                      <div className="rtg-away-shield">
                        <Shield aria-hidden="true" />
                      </div>
                      <strong>{nextEvent.opponent || nextEvent.title}</strong>
                      <small>Rywal</small>
                    </div>
                  </div>
                ) : (
                  <div className="rtg-versus-block">
                    <div className="rtg-team-side">
                      <Image src="/teamlogos/gm.png" alt="DELTA" width={54} height={54} />
                      <strong>{nextEvent.title}</strong>
                      <small>{effectiveTeamName}</small>
                    </div>
                    <div className="rtg-vs-center">
                      <span className="rtg-league-chip">TRENING</span>
                      <time>{nextEventDate?.time || "—"}</time>
                    </div>
                    <div className="rtg-team-side">
                      <div className="rtg-away-shield">
                        <Zap aria-hidden="true" />
                      </div>
                      <strong>Jednostka treningowa</strong>
                      <small>Przygotowanie</small>
                    </div>
                  </div>
                )}

                <div className="rtg-venue-bar">
                  {nextEvent.location && (
                    <span>
                      <MapPin aria-hidden="true" /> {nextEvent.location}
                    </span>
                  )}
                  {nextEventDate?.time && (
                    <span>
                      <Clock3 aria-hidden="true" /> Start: <strong>{nextEventDate.time}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 4. TEAM ROSTER / SHOWCASE */}
          <section className="rtg-panel rtg-team-roster" id="rtg-team-roster" aria-label="Kadra Drużyny">
            <div className="rtg-panel-head">
              <div>
                <span className="rtg-eyebrow">TEAM SQUAD · KADRA DRUŻYNY</span>
                <h2>{effectiveTeamName}</h2>
              </div>
              <div className="rtg-panel-head-actions flex items-center gap-3">
                {displayedRoster.length > 0 && (
                  <span className="rtg-countdown-badge">
                    <Users aria-hidden="true" className="w-3.5 h-3.5" /> {displayedRoster.length} zawodników
                  </span>
                )}
                <Link href={teamShowcaseHref} className="rtg-link-btn">
                  Pełny widok <ChevronRight aria-hidden="true" />
                </Link>
              </div>
            </div>

            {isRosterRestricted ? (
              <div className="rtg-state-box">
                <Lock className="w-5 h-5 text-amber-400" />
                <strong>Dostęp do składu drużyny ograniczony</strong>
                <p>{liveBlockedReason || "Zaloguj się na uprawnione konto rodzica, aby zobaczyć kadrę drużyny swojego dziecka."}</p>
              </div>
            ) : isRealData && displayedRoster.length === 0 ? (
              <div className="rtg-state-box">
                <Lock className="w-5 h-5 text-amber-400" />
                <strong>Brak zawodników w kadrze</strong>
                <p>Skład drużyny nie został jeszcze przypisany w systemie akademii lub oczekuje na weryfikację.</p>
              </div>
            ) : (
              <TeamShowcase2
                players={displayedRoster}
                source={isRealData ? "live" : "demo"}
                userRole={userRole || (isRealData ? "parent" : "demo")}
                parentPlayerIds={effectiveParentPlayerIds}
                teamName={effectiveTeamName}
                liveBlockedReason={liveBlockedReason}
                embedded={true}
              />
            )}
          </section>

          {/* 5. ACHIEVEMENTS & COLLECTION PREVIEW */}
          <div className="rtg-glory-grid">
            <section className="rtg-panel" id="rtg-achievements">
              <div className="rtg-panel-head">
                <div>
                  <span className="rtg-eyebrow">ACHIEVEMENTS · POSTĘP KARIERY</span>
                  <h2>Osiągnięcia</h2>
                </div>
                {nextAch && <strong className="rtg-accent-stat">{nextAch.percent}%</strong>}
              </div>

              {recentAchievements.status === "unavailable" ? (
                <div className="rtg-state-box">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <strong>Osiągnięcia zablokowane</strong>
                </div>
              ) : unlockedList.length === 0 && !nextAch ? (
                <div className="rtg-state-box">
                  <strong>Brak odblokowanych osiągnięć</strong>
                  <p>Pierwsze odznaki pojawią się po potwierdzonych treningach i meczach.</p>
                </div>
              ) : (
                <>
                  <div className="rtg-ring-row">
                    <div
                      className="rtg-ring"
                      style={{ "--ring-pct": `${ringPercent}%` } as React.CSSProperties}
                    >
                      <span>
                        <b>{nextAch ? nextAch.current : unlockedList.length}</b>
                        {nextAch ? `/ ${nextAch.target}` : "odzn."}
                      </span>
                    </div>
                    <div className="rtg-ring-copy">
                      <strong>{nextAch ? nextAch.name : "Zdobyte osiągnięcia"}</strong>
                      <p>
                        {nextAch
                          ? nextAch.description || `Postęp: ${nextAch.current} z ${nextAch.target}`
                          : `Łącznie odblokowano ${unlockedList.length} osiągnięć w tym profilu.`}
                      </p>
                    </div>
                  </div>

                  {unlockedList.length > 0 && (
                    <div className="rtg-badge-row">
                      {unlockedList.slice(0, 3).map((ach) => (
                        <div className="rtg-badge is-unlocked" key={ach.id}>
                          {renderAchievementIcon(ach.icon)}
                          <span>{ach.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="rtg-panel" id="rtg-collection-preview">
              <div className="rtg-panel-head">
                <div>
                  <span className="rtg-eyebrow">STADIUM VAULT · KOLEKCJA KART</span>
                  <h2>Twoja kolekcja</h2>
                </div>
                <Link href={collectionHref} className="rtg-link-btn">
                  {albumData
                    ? albumData.total !== null
                      ? `${albumData.owned} / ${albumData.total}`
                      : `${albumData.owned} kart`
                    : "Otwórz"}{" "}
                  <ChevronRight aria-hidden="true" />
                </Link>
              </div>

              {albumProgress.status === "unavailable" || recentCards.status === "unavailable" ? (
                <div className="rtg-state-box">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <strong>Kolekcja niedostępna</strong>
                </div>
              ) : previewCardModels.length === 0 ? (
                <div className="rtg-state-box">
                  <strong>Album jest jeszcze pusty</strong>
                  <p>
                    {unopenedPacksCount > 0
                      ? `Masz ${unopenedPacksCount} nieotwartych paczek w Skarbcu.`
                      : "Otwórz pierwszą paczkę kart, aby zbudować swoją kolekcję."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rtg-cards-strip">
                    {previewCardModels.map((cardModel) => (
                      <div className="rtg-card-slot" key={cardModel.id}>
                        <DeltaCard
                          card={cardModel}
                          size="sm"
                          staticFace="front"
                          interactive={false}
                          showFlip={false}
                        />
                        <span>{cardModel.playerName}</span>
                      </div>
                    ))}
                  </div>

                  {albumData && (
                    <div className="rtg-album-bar">
                      <div className="rtg-album-label">
                        <Layers3 aria-hidden="true" />
                        <span>
                          {albumData.percent !== null ? (
                            <>
                              Ukończono <strong>{albumData.percent}%</strong> albumu
                            </>
                          ) : (
                            <>
                              Posiadane karty: <strong>{albumData.owned}</strong>
                              {unopenedPacksCount > 0 ? ` · Paczki do otwarcia: ${unopenedPacksCount}` : ""}
                            </>
                          )}
                        </span>
                      </div>
                      {albumData.percent !== null && (
                        <div className="rtg-progress-track">
                          <i style={{ width: `${Math.max(0, Math.min(100, albumData.percent))}%` }} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* 5. CLUB COMMUNICATIONS */}
          <section className="rtg-panel" id="rtg-club-news" aria-label="Komunikaty klubowe">
            <div className="rtg-panel-head">
              <div>
                <span className="rtg-eyebrow">CLUB WIRE · AKTUALNOŚCI KLUBOWE</span>
                <h2>Komunikaty klubu</h2>
              </div>
            </div>

            {clubCommunications.status === "unavailable" ? (
              <div className="rtg-state-box">
                <Lock className="w-5 h-5 text-amber-400" />
                <strong>Komunikaty niedostępne</strong>
              </div>
            ) : commsList.length === 0 ? (
              <div className="rtg-state-box">
                <strong>Brak nowych komunikatów klubowych</strong>
                <p>Wszystkie komunikaty zostały przeczytane lub nie opublikowano jeszcze nowych.</p>
              </div>
            ) : (
              <div className="rtg-news-grid">
                {commsList.map((comm) => (
                  <article className="rtg-news-card" key={comm.id}>
                    <div className="rtg-news-icon">
                      {comm.urgent ? <Bell aria-hidden="true" /> : <Users aria-hidden="true" />}
                    </div>
                    <div className="rtg-news-content">
                      <span>{comm.urgent ? "PILNE" : comm.source === "club_update" ? "KLUB" : "AKTUALNOŚCI"}</span>
                      <h3>{comm.title}</h3>
                      <p>{formatCommunicationDate(comm.publishedAt)}</p>
                    </div>
                    <ChevronRight className="rtg-news-chevron" aria-hidden="true" />
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="rtg-footer">
            <span>DELTA INFERNO · THE ROAD TO GLORY (UI4 INTEGRATION)</span>
            <span>{isRealData ? "Tryb REAL-DATA (Read-Only)" : "Tryb DEMO (Syntetyczne dane testowe)"}</span>
          </footer>
        </main>
      </div>

      <div className="lg:hidden">
        <DeltaMobileBottomNav unopenedPacks={unopenedPacksCount} activeItem="dashboard" />
      </div>
    </div>
  );
}
