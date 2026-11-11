"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FastForward,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  ChevronRight,
  RotateCw,
  Layers,
  CheckCircle2,
  Loader2
} from "lucide-react";
import {
  PackExperienceController,
  type PackExperienceState
} from "@/lib/cards/packExperienceController";
import {
  type PackDefinition,
  type PackOpeningResult,
  getPackImageUrl
} from "@/lib/cards/types";
import { dispatchPackOpened, dispatchCollectionUpdated } from "@/lib/cards/cardSync";
import {
  executeLivePackOpen,
  createOpenPackAttemptKey,
  LivePackOpenError
} from "@/lib/cards/packOpeningAlbumBridge";
import { DeltaCard } from "@/components/cards";
import { Stage3DEngine } from "@/components/collection-3d/Stage3DEngine";
import { Card3DEngine } from "@/components/collection-3d/Card3DEngine";
import { toUnifiedCardShowcase } from "@/components/collection-3d/adapter";
import type { PlayerCardData, CardVisualTheme } from "@/components/collection-3d/types";
import { getCardVisualTheme } from "@/components/collection-3d/themes";
import type { PackDrawnItem } from "@/lib/cards/packExperienceController";
import { getRarityPresentation } from "@/lib/cards/rarityPresentation";
import { cardSound } from "@/lib/cards/audio";
import "./cinematic-pack.css";

type UnifiedShowcaseEntry = {
  slotKey: string;
  item: PackDrawnItem;
  card3D: PlayerCardData;
  theme3D: CardVisualTheme;
  miniCard: ReturnType<typeof toUnifiedCardShowcase>["deltaCard"];
  displayName: string;
};

export interface CinematicPackExperienceProps {
  pack: PackDefinition;
  mockResult?: PackOpeningResult;
  result?: PackOpeningResult;
  userUnopenedPackId?: string | null;
  sessionKey?: string | number;
  onClose: () => void;
  onOpenAnother?: () => void;
  onPackConsumed?: (result: PackOpeningResult) => void;
  openPackFetch?: typeof fetch;
  unopenedCount?: number;
  reducedMotion?: boolean;
  autoStart?: boolean;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function CinematicPackExperience({
  pack,
  mockResult,
  result,
  userUnopenedPackId = null,
  sessionKey = 0,
  onClose,
  onOpenAnother,
  onPackConsumed,
  openPackFetch,
  unopenedCount = 0,
  reducedMotion = false,
  autoStart = false
}: CinematicPackExperienceProps) {
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [serverResult, setServerResult] = useState<PackOpeningResult | null>(null);
  const [isRequestingOpen, setIsRequestingOpen] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [isMutedLive, setIsMutedLive] = useState(false);
  const [inspectedSummaryCard, setInspectedSummaryCard] = useState<UnifiedShowcaseEntry | null>(null);
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);

  useEffect(() => {
    setIsPreviewFlipped(false);
  }, [inspectedSummaryCard]);

  const isMountedRef = useRef(true);
  const isOpeningInFlightRef = useRef(false);
  const openRequestGenRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptIdempotencyKeyRef = useRef<string | null>(null);
  const pendingAutoPlayRef = useRef(false);
  const liveAutoStartHandledSessionRef = useRef<string | number | null>(null);

  const effectiveReducedMotion = reducedMotion || prefersReducedMotion;
  const activeResult = useMemo(
    () => result || mockResult || serverResult,
    [result, mockResult, serverResult]
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const [layoutMetrics, setLayoutMetrics] = useState(() => ({
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : 390,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 844,
    headerHeight: 64,
    footerHeight: 0
  }));

  // 1. Initialize and cleanly dispose Central Controller FSM (React StrictMode safe)
  const [controller, setController] = useState<PackExperienceController | null>(null);
  const [state, setState] = useState<PackExperienceState | null>(null);

  // Walkout 3D Card rotation state
  const [walkoutYaw, setWalkoutYaw] = useState<number>(180);
  const [walkoutPitch, setWalkoutPitch] = useState<number>(-3);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let mq: MediaQueryList | null = null;
    const syncMotion = () => {
      if (mq) setPrefersReducedMotion(mq.matches);
    };
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      syncMotion();
      mq.addEventListener?.("change", syncMotion);
    }

    return () => {
      isMountedRef.current = false;
      openRequestGenRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isOpeningInFlightRef.current = false;
      mq?.removeEventListener?.("change", syncMotion);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Reset server state and abort stale requests whenever pack session changes (prevents old result reuse)
  useEffect(() => {
    openRequestGenRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isOpeningInFlightRef.current = false;
    attemptIdempotencyKeyRef.current = null;
    pendingAutoPlayRef.current = false;
    setServerResult(null);
    setIsRequestingOpen(false);
    setOpenError(null);
    setInspectedSummaryCard(null);
  }, [sessionKey, pack.id, userUnopenedPackId]);

  useEffect(() => {
    if (!activeResult) {
      setController(null);
      setState(null);
      return;
    }

    const nextController = new PackExperienceController({
      result: activeResult,
      reducedMotion: effectiveReducedMotion,
      initialMuted: isMutedLive,
      onAudioCue: (cue) => {
        try {
          switch (cue) {
            case "TEAR":
              cardSound.playPackTear();
              break;
            case "TRANSITION_FLASH":
              cardSound.playCinematicBoom();
              break;
            case "TEASER_HIT":
              cardSound.playTeaserHit(1);
              break;
            case "HERO_FANFARE":
              cardSound.playWalkoutFanfare();
              break;
            case "STADIUM_CHEER":
              cardSound.playDeltaChant();
              break;
            case "CARD_FLIP":
              cardSound.playFlip();
              break;
            case "SUMMARY_CHIME":
              cardSound.playReveal("rare");
              break;
            case "STOP_ALL":
              cardSound.stopDeltaChant();
              break;
          }
        } catch {}
      }
    });

    setController(nextController);
    setWalkoutYaw(180);
    setWalkoutPitch(-3);

    const unsubscribe = nextController.subscribe((nextState) => {
      setState(nextState);
    });

    if (pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false;
      nextController.dispatch("PLAY");
    } else {
      setState(nextController.getState());
    }

    return () => {
      unsubscribe();
      nextController.dispose();
    };
  }, [activeResult, effectiveReducedMotion, sessionKey]);

  const triggerLiveOpenPack = useCallback(async () => {
    if (isOpeningInFlightRef.current || activeResult) return;

    isOpeningInFlightRef.current = true;
    setIsRequestingOpen(true);
    setOpenError(null);

    const reqGen = ++openRequestGenRef.current;
    abortControllerRef.current?.abort();
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    const idempotencyKey = attemptIdempotencyKeyRef.current || createOpenPackAttemptKey();
    attemptIdempotencyKeyRef.current = idempotencyKey;

    try {
      const data = await executeLivePackOpen({
        fetchImpl: openPackFetch,
        packTypeId: pack.id,
        userUnopenedPackId,
        idempotencyKey,
        signal: abortCtrl.signal
      });

      // Notify album & sync bus immediately upon server confirmation so rewards are never lost
      onPackConsumed?.(data);
      dispatchPackOpened({
        pack_type_id: data.pack_type_id || pack.id,
        consumed_pack_id: data.consumed_pack_id,
        remaining_unopened_packs_count: data.remaining_unopened_packs_count,
        total_delta_points_earned: data.total_delta_points_earned,
        new_points_balance: data.new_points_balance,
        drawn_card_ids: (data.cards || []).map((c) => c.card.id)
      });
      dispatchCollectionUpdated("pack_opening_success");

      if (!isMountedRef.current || reqGen !== openRequestGenRef.current) {
        return;
      }

      attemptIdempotencyKeyRef.current = null;
      pendingAutoPlayRef.current = true;
      isOpeningInFlightRef.current = false;
      setIsRequestingOpen(false);
      setServerResult(data);
    } catch (err) {
      if (abortCtrl.signal.aborted || !isMountedRef.current || reqGen !== openRequestGenRef.current) {
        if (reqGen === openRequestGenRef.current) {
          isOpeningInFlightRef.current = false;
        }
        return;
      }

      if (err instanceof LivePackOpenError && err.code === "ALREADY_OPENED") {
        attemptIdempotencyKeyRef.current = null;
        dispatchCollectionUpdated("already_opened_reconciliation");
        setOpenError(err.message);
      } else {
        if (err instanceof LivePackOpenError && err.status >= 400 && err.status < 500) {
          attemptIdempotencyKeyRef.current = null;
        }
        setOpenError(err instanceof Error ? err.message : "Błąd połączenia. Spróbuj ponownie.");
      }

      isOpeningInFlightRef.current = false;
      setIsRequestingOpen(false);
    }
  }, [activeResult, onPackConsumed, openPackFetch, pack.id, userUnopenedPackId]);

  // Helper safe dispatches
  const handlePlay = useCallback(() => {
    if (controller) {
      controller.dispatch("PLAY");
      return;
    }
    void triggerLiveOpenPack();
  }, [controller, triggerLiveOpenPack]);

  const handleNext = useCallback(() => {
    controller?.dispatch("NEXT");
  }, [controller]);

  const handleSkip = useCallback(() => {
    controller?.dispatch("SKIP");
  }, [controller]);

  const handleClose = useCallback(() => {
    openRequestGenRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isOpeningInFlightRef.current = false;
    pendingAutoPlayRef.current = false;
    setInspectedSummaryCard(null);
    controller?.dispatch("CLOSE");
    controller?.dispose();
    onClose();
  }, [controller, onClose]);

  const handleToggleMute = useCallback(() => {
    setIsMutedLive((prev) => !prev);
    controller?.toggleMute();
  }, [controller]);

  const handleOpenAnother = useCallback(() => {
    if (!onOpenAnother || isOpeningInFlightRef.current) return;
    openRequestGenRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    attemptIdempotencyKeyRef.current = null;
    pendingAutoPlayRef.current = false;
    setServerResult(null);
    setOpenError(null);
    setIsRequestingOpen(false);
    setInspectedSummaryCard(null);
    controller?.dispose();
    onOpenAnother();
  }, [controller, onOpenAnother]);

  // Auto-start triggering (works for both mockResult/result and live album opening)
  useEffect(() => {
    if (!autoStart) return;
    if (controller && state?.phase === "READY") {
      controller.dispatch("PLAY");
      return;
    }
    const sessionToken = `${sessionKey}-${pack.id}-${userUnopenedPackId ?? "any"}`;
    if (
      !activeResult &&
      !controller &&
      !isRequestingOpen &&
      !openError &&
      liveAutoStartHandledSessionRef.current !== sessionToken
    ) {
      liveAutoStartHandledSessionRef.current = sessionToken;
      void triggerLiveOpenPack();
    }
  }, [
    autoStart,
    controller,
    state?.phase,
    activeResult,
    isRequestingOpen,
    openError,
    sessionKey,
    pack.id,
    userUnopenedPackId,
    triggerLiveOpenPack
  ]);

  // Move focus cleanly into dialog on open / re-open so Escape, Enter and Space don't trigger background buttons
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [mounted, controller, sessionKey]);

  // Keyboard controls: Escape -> Close preview or modal, Space/Enter -> advance active phases without double-fire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (inspectedSummaryCard) {
          setInspectedSummaryCard(null);
          return;
        }
        handleClose();
        return;
      }

      if (inspectedSummaryCard) {
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        const isInsideDialogInteractive = Boolean(
          target &&
            dialogRef.current?.contains(target) &&
            target.closest("button, a, input, select, textarea, [role='button']")
        );
        if (isInsideDialogInteractive) {
          return;
        }

        if (!controller) {
          e.preventDefault();
          void triggerLiveOpenPack();
          return;
        }

        const currentPhase = controller.getState().phase;
        if (currentPhase === "READY") {
          e.preventDefault();
          controller.dispatch("PLAY");
        } else if (
          currentPhase === "OPENING" ||
          currentPhase === "TRANSITION" ||
          currentPhase === "WALKOUT" ||
          currentPhase === "HERO_REVEAL" ||
          currentPhase === "CARD_REVEAL"
        ) {
          e.preventDefault();
          controller.dispatch("NEXT");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [controller, handleClose, inspectedSummaryCard, triggerLiveOpenPack]);

  // Measure header, footer, and viewport bounds synchronously to keep 3D card strictly centered between HUD bars
  useIsomorphicLayoutEffect(() => {
    if (!mounted) return;
    const measure = () => {
      const dialogRect = dialogRef.current?.getBoundingClientRect();
      const headerRect = headerRef.current?.getBoundingClientRect();
      const footerRect = footerRef.current?.getBoundingClientRect();

      const viewportWidth = dialogRect?.width || window.innerWidth;
      const viewportHeight = dialogRect?.height || window.innerHeight;
      const headerHeight = headerRect?.height || 64;
      const footerHeight = footerRect?.height || 0;

      setLayoutMetrics((prev) => {
        if (
          Math.abs(prev.viewportWidth - viewportWidth) < 1 &&
          Math.abs(prev.viewportHeight - viewportHeight) < 1 &&
          Math.abs(prev.headerHeight - headerHeight) < 1 &&
          Math.abs(prev.footerHeight - footerHeight) < 1
        ) {
          return prev;
        }
        return { viewportWidth, viewportHeight, headerHeight, footerHeight };
      });
    };

    measure();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      if (dialogRef.current) observer.observe(dialogRef.current);
      if (headerRef.current) observer.observe(headerRef.current);
      if (footerRef.current) observer.observe(footerRef.current);
    }

    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mounted, state?.phase, state?.heroCard?.card.id, state?.currentRevealIndex]);

  // Unified card showcase mapping shared between Hero 3D, Card Reveal 3D, and Summary miniatures
  const buildShowcaseEntry = useCallback((slotKey: string, item: PackDrawnItem): UnifiedShowcaseEntry => {
    const unified = toUnifiedCardShowcase(item.card, {
      isDuplicate: item.is_duplicate,
      duplicatePoints: item.duplicate_points,
      preferArtworkUrl: true
    });
    return {
      slotKey,
      item,
      card3D: unified.card3D,
      theme3D: getCardVisualTheme(unified.card3D.visualType),
      miniCard: unified.deltaCard,
      displayName: unified.card3D.fullDisplayName || unified.deltaCard.playerName
    };
  }, []);

  const heroShowcase = useMemo(() => {
    if (!state?.heroCard) return null;
    return buildShowcaseEntry(`hero-${state.heroCard.card.id}`, state.heroCard);
  }, [state?.heroCard, buildShowcaseEntry]);

  const revealShowcases = useMemo(() => {
    if (!state?.revealCards) return [];
    return state.revealCards.map((item, idx) =>
      buildShowcaseEntry(`reveal-${idx}-${item.card.id}`, item)
    );
  }, [state?.revealCards, buildShowcaseEntry]);

  const summaryShowcases = useMemo(() => {
    if (!state?.summaryCards) return [];
    return state.summaryCards.map((item, idx) =>
      buildShowcaseEntry(`summary-${idx}-${item.card.id}`, item)
    );
  }, [state?.summaryCards, buildShowcaseEntry]);

  const currentRevealShowcase =
    state?.phase === "CARD_REVEAL" && revealShowcases.length > 0
      ? revealShowcases[state.currentRevealIndex] || null
      : null;

  // Single continuous stadium arena across TRANSITION, WALKOUT, HERO_REVEAL, and CARD_REVEAL
  const activeStagePhase = state?.phase;
  const isStadiumPhase =
    activeStagePhase === "TRANSITION" ||
    activeStagePhase === "WALKOUT" ||
    activeStagePhase === "HERO_REVEAL" ||
    activeStagePhase === "CARD_REVEAL";

  const activeStageShowcase: UnifiedShowcaseEntry | null =
    activeStagePhase === "CARD_REVEAL"
      ? currentRevealShowcase
      : heroShowcase || (activeStagePhase === "TRANSITION" ? revealShowcases[0] || null : null);

  const activeCardShowcase: UnifiedShowcaseEntry | null =
    activeStagePhase === "CARD_REVEAL"
      ? currentRevealShowcase
      : heroShowcase && (activeStagePhase === "TRANSITION" || activeStagePhase === "WALKOUT" || activeStagePhase === "HERO_REVEAL")
      ? heroShowcase
      : null;

  const isStadiumSceneActive = Boolean(isStadiumPhase && activeStageShowcase);
  const isHeroReveal = activeStagePhase === "HERO_REVEAL";
  const isCardInteractive = activeStagePhase === "HERO_REVEAL" || activeStagePhase === "CARD_REVEAL";

  // Smooth exit / enter tracking when swapping active 3D card on the same continuous stadium
  const [exitingCard, setExitingCard] = useState<{
    entry: UnifiedShowcaseEntry;
    yaw: number;
    pitch: number;
    scale: number;
  } | null>(null);
  const prevActiveCardRef = useRef<{
    entry: UnifiedShowcaseEntry;
    yaw: number;
    pitch: number;
    scale: number;
  } | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute current card scale cleanly before tracking snapshots
  const { viewportWidth, viewportHeight, headerHeight, footerHeight } = layoutMetrics;
  const isSmallViewport = viewportWidth <= 540;
  const baseCardWidth = isSmallViewport ? 340 : 380;
  const baseCardHeight = (baseCardWidth * 3) / 2;
  const heroFooterReserve = viewportWidth < 640 ? 176 : 196;
  const effectiveBottomReserve = Math.max(footerHeight, heroFooterReserve);
  const horizontalMargin = viewportWidth < 640 ? 48 : 80;
  const usableWidth = Math.max(200, viewportWidth - horizontalMargin);
  const usableHeroHeight = Math.max(220, viewportHeight - headerHeight - effectiveBottomReserve - 24);
  const maxAllowedScale = viewportWidth < 640 ? 0.98 : 1.08;
  const climaxScale = Math.max(
    0.45,
    Math.min(usableWidth / baseCardWidth, usableHeroHeight / baseCardHeight, maxAllowedScale)
  );
  const stageCardScale =
    activeStagePhase === "HERO_REVEAL" || activeStagePhase === "CARD_REVEAL"
      ? climaxScale
      : activeStagePhase === "WALKOUT"
      ? climaxScale * 0.94
      : climaxScale * 0.8;

  useEffect(() => {
    const prev = prevActiveCardRef.current;
    if (prev && activeCardShowcase && prev.entry.slotKey !== activeCardShowcase.slotKey) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      setExitingCard({ ...prev });
      exitTimerRef.current = setTimeout(() => {
        setExitingCard(null);
        exitTimerRef.current = null;
      }, 390);
    } else if (!activeCardShowcase) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      setExitingCard(null);
    }

    if (activeCardShowcase) {
      prevActiveCardRef.current = {
        entry: activeCardShowcase,
        yaw: walkoutYaw,
        pitch: walkoutPitch,
        scale: stageCardScale
      };
    } else {
      prevActiveCardRef.current = null;
    }
  }, [activeCardShowcase?.slotKey]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  // Reset interactive 3D rotation to front center whenever advancing into a CARD_REVEAL card
  useEffect(() => {
    if (state?.phase === "CARD_REVEAL") {
      setWalkoutYaw(0);
      setWalkoutPitch(0);
    }
  }, [state?.phase, state?.currentRevealIndex]);

  // 3D Walkout rotational animation loop synchronized with PackExperienceController timing
  useEffect(() => {
    if (state?.phase !== "WALKOUT") {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (state?.phase === "HERO_REVEAL") {
        setWalkoutYaw(0);
        setWalkoutPitch(0);
      } else if (state?.phase === "TRANSITION") {
        setWalkoutYaw(180);
        setWalkoutPitch(-3);
      }
      return;
    }

    const totalDuration = Math.max(1200, state.walkoutDurationMs || 3200);
    const spinStartTime = Math.round(totalDuration * 0.24);
    const spinEndTime = Math.round(totalDuration * 0.52);

    const startTime = performance.now();

    const animateWalkout = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed < spinStartTime) {
        // Phase 1: Dark awakening with card back
        const t = elapsed;
        const swayYaw = 180 + Math.sin(t * 0.0035) * 4;
        const swayPitch = -3 + Math.cos(t * 0.0028) * 2;
        setWalkoutYaw(swayYaw);
        setWalkoutPitch(swayPitch);
      } else if (elapsed < spinEndTime) {
        // Phase 2: High-energy spin from 180° to 0° (passes 90° fast to prevent edge stall)
        const s = (elapsed - spinStartTime) / Math.max(1, spinEndTime - spinStartTime);
        const ease = s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2;
        const currentYaw = 180 - ease * 180;
        const pitchArch = Math.sin(s * Math.PI) * 12;
        const currentPitch = -3 + pitchArch + ease * 3;
        setWalkoutYaw(currentYaw);
        setWalkoutPitch(currentPitch);
      } else {
        // Phase 3: Spotlight presentation tapering smoothly to (0, 0) at exact controller end
        const postElapsed = elapsed - spinEndTime;
        const postTotal = Math.max(1, totalDuration - spinEndTime);
        const settleFactor = Math.max(0, 1 - Math.pow(postElapsed / postTotal, 2));
        const sway = Math.sin(postElapsed * 0.0022) * 2.5 * settleFactor;
        const pitchSway = Math.cos(postElapsed * 0.0022) * 1.5 * settleFactor;
        setWalkoutYaw(sway);
        setWalkoutPitch(pitchSway);
      }

      if (elapsed < totalDuration) {
        animFrameRef.current = requestAnimationFrame(animateWalkout);
      } else {
        setWalkoutYaw(0);
        setWalkoutPitch(0);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateWalkout);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [state?.phase, state?.heroCard?.card.id, state?.walkoutDurationMs]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const currentPhase = state?.phase ?? "READY";
  const isMuted = state ? state.isMuted : isMutedLive;
  const canSkip = state ? state.canSkip : false;
  const canClose = state ? state.canClose : true;
  const packImage = getPackImageUrl(pack.id, pack.theme);
  const totalEarnedPoints = activeResult?.total_delta_points_earned || 0;
  const isMobileViewport = viewportWidth <= 640;
  const activeStageRarityProfile = getRarityPresentation(
    activeStageShowcase?.item.card.rarity,
    activeStageShowcase?.card3D.visualType
  );
  const heroRarityProfile = getRarityPresentation(
    heroShowcase?.item.card.rarity,
    heroShowcase?.card3D.visualType
  );
  const inspectedRarityProfile = inspectedSummaryCard
    ? getRarityPresentation(
        inspectedSummaryCard.item.card.rarity,
        inspectedSummaryCard.card3D.visualType
      )
    : null;
  const summaryNewCount = summaryShowcases.filter((entry) => !entry.item.is_duplicate).length;
  const summaryDupCount = summaryShowcases.length - summaryNewCount;

  const previewUsableHeight = Math.max(220, viewportHeight - 176);
  const previewUsableWidth = Math.max(200, viewportWidth - (viewportWidth < 640 ? 36 : 72));
  const previewScale = Math.max(
    0.45,
    Math.min(previewUsableWidth / baseCardWidth, previewUsableHeight / baseCardHeight, viewportWidth < 640 ? 0.94 : 1.06)
  );

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Cinematic Pack Opening: ${pack.name}`}
      data-testid="cinematic-pack-modal"
      data-phase={currentPhase}
      data-rarity={activeStageRarityProfile.tier}
      data-pack-theme={pack.theme}
      className={`fixed inset-0 h-[100dvh] z-[9999999] isolate bg-[#020408] text-white flex flex-col justify-between overflow-hidden outline-none select-none cinematic-v2-arena ${isMobileViewport ? "is-mobile-viewport" : ""} ${effectiveReducedMotion ? "is-reduced-motion" : ""}`}
      style={{ isolation: "isolate", backgroundColor: "#020408" }}
    >
      {/* Dynamic Stadium Spotlights (strictly clipped so diagonal beams never create scroll overflow) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "clip",
          pointerEvents: "none",
          zIndex: 0
        }}
      >
        <div className="cinematic-v2-spotlight-left" />
        <div className="cinematic-v2-spotlight-right" />
      </div>

      {/* ===================================================================== */}
      {/* 1. TOP HUD (Club Crest, Pack Name, Controls)                          */}
      {/* ===================================================================== */}
      <header
        ref={headerRef}
        data-testid="cinematic-pack-header"
        style={{ position: "relative", zIndex: 100 }}
        className="v2-header"
      >
        <div className="v2-header-brand">
          <img
            src="/teamlogos/gm.png"
            alt="DELTA"
            className="v2-header-logo"
            style={{
              width: "28px",
              height: "28px",
              maxWidth: "28px",
              maxHeight: "28px",
              objectFit: "contain",
              flexShrink: 0
            }}
          />
          <div className="v2-header-meta">
            <div className="v2-header-badges">
              <span className="v2-header-kicker">DELTA INFERNO 2.0</span>
              <span className="v2-phase-badge">{currentPhase}</span>
            </div>
            <h2 className="v2-header-title">{pack.name}</h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="v2-header-actions" style={{ position: "relative", zIndex: 110 }}>
          {/* Mute button */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? "Włącz dźwięk" : "Wycisz dźwięk"}
            className="v2-icon-btn"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Skip button (Visible during animation phases) */}
          {canSkip && (
            <button
              type="button"
              data-testid="cinematic-skip-btn"
              onClick={handleSkip}
              className="v2-skip-btn"
            >
              <FastForward size={14} color="#fbbf24" />
              <span>Pomiń</span>
            </button>
          )}

          {/* Close button */}
          {canClose && (
            <button
              type="button"
              data-testid="cinematic-close-btn"
              onClick={handleClose}
              aria-label="Zamknij"
              className="v2-icon-btn is-close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. CONTINUOUS 3D STADIUM ARENA (Unbroken across TRANSITION, WALKOUT, HERO_REVEAL, CARD_REVEAL) */}
      {/* ===================================================================== */}
      {isStadiumSceneActive && activeStageShowcase && state && (
        <div
          data-testid="cinematic-stadium-backdrop"
          style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: isCardInteractive ? "auto" : "none" }}
        >
          <Stage3DEngine
            theme={activeStageShowcase.theme3D}
            rarity={activeStageRarityProfile.tier}
            lightingMode={
              currentPhase === "TRANSITION"
                ? "stealth"
                : currentPhase === "CARD_REVEAL"
                ? "stadium"
                : "dynamic"
            }
            stadiumZoom={currentPhase === "WALKOUT" || currentPhase === "HERO_REVEAL" || currentPhase === "CARD_REVEAL"}
            isPulsing={currentPhase === "WALKOUT"}
            isShockwaving={currentPhase === "WALKOUT" && activeStageRarityProfile.enableShockwave}
            isFlashing={currentPhase === "WALKOUT" && activeStageRarityProfile.enableFlash}
            isScreenShaking={currentPhase === "WALKOUT" && activeStageRarityProfile.enableScreenShake}
            reducedMotion={effectiveReducedMotion}
            isMobile={isMobileViewport}
            ribbonText={`${activeStageShowcase.theme3D.displayName} • ${activeStageShowcase.card3D.surname}`}
          >
            {/* Safe stage slot reserving header & footer height so any 3D card stays centered cleanly between HUDs */}
            <div
              data-testid="cinematic-card-stage-slot"
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                paddingTop: `${headerHeight}px`,
                paddingBottom: `${footerHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "padding-bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {/* Outgoing Card Layer (smoothly slides/fades out on card change) */}
                {exitingCard && (
                  <div key={`exit-${exitingCard.entry.slotKey}`} className="v2-card-exiting-layer">
                    <div
                      style={{
                        transform: `scale(${exitingCard.scale.toFixed(4)})`,
                        transformOrigin: "center center"
                      }}
                    >
                      <Card3DEngine
                        data={exitingCard.entry.card3D}
                        theme={exitingCard.entry.theme3D}
                        yaw={exitingCard.yaw}
                        pitch={exitingCard.pitch}
                        interactive={false}
                        autoRotate={false}
                      />
                    </div>
                  </div>
                )}

                {/* Active 3D Card Instance (Hero or sequentially revealed Card 3D) */}
                {activeCardShowcase && (
                  <div
                    data-testid="cinematic-card-3d-wrapper"
                    style={{
                      position: "relative",
                      zIndex: 10,
                      transform: `scale(${stageCardScale.toFixed(4)})`,
                      transformOrigin: "center center",
                      transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                  >
                    <div
                      key={activeCardShowcase.slotKey}
                      className={state.phase === "CARD_REVEAL" ? "v2-card-entering-anim" : undefined}
                    >
                      <Card3DEngine
                        data={activeCardShowcase.card3D}
                        theme={activeCardShowcase.theme3D}
                        yaw={walkoutYaw}
                        pitch={walkoutPitch}
                        interactive={isCardInteractive}
                        autoRotate={false}
                        isRevealing={state.phase === "WALKOUT"}
                        onRotationChange={(y, p) => {
                          setWalkoutYaw(y);
                          setWalkoutPitch(p);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Stage3DEngine>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. MAIN CONTENT (Driven purely by FSM Phase)                           */}
      {/* ===================================================================== */}
      <main className="v2-main">
        {/* PHASE A: READY (Centered 3D Floating Booster Pack) */}
        {currentPhase === "READY" && (
          <div className="v2-ready-stage cinematic-pack-perspective animate-fadeIn">
            {/* 3D Booster Pack */}
            <div
              onClick={isRequestingOpen ? undefined : handlePlay}
              style={{ cursor: isRequestingOpen ? "wait" : "pointer" }}
              className="v2-pack-box cinematic-pack-card"
            >
              <img src={packImage} alt={pack.name} className="v2-pack-img" />
              {/* Foil Shimmer effect */}
              <div className="cinematic-pack-shimmer" />

              {/* Rarity & Cards Pill */}
              <div className="v2-pack-count-pill">{pack.cards_count} KART</div>
            </div>

            {/* Pack Title & Meta */}
            <div className="v2-ready-meta">
              <h3 className="v2-ready-title">{pack.name}</h3>
              <p className="v2-ready-desc">
                {pack.description || "Otwórz paczkę, aby wylosować unikalne karty DELTA."}
              </p>
            </div>

            {openError && (
              <div role="alert" data-testid="cinematic-open-error" className="v2-error-banner">
                {openError}
              </div>
            )}

            {/* Big Premium CTA Button */}
            <button
              type="button"
              data-testid="cinematic-open-btn"
              disabled={isRequestingOpen}
              onClick={handlePlay}
              className="v2-primary-cta"
            >
              {isRequestingOpen ? (
                <>
                  <Loader2 size={18} color="#fde68a" className="v2-spin" />
                  <span>OTWIERANIE PACZKI...</span>
                </>
              ) : (
                <>
                  <Flame size={18} color="#fde68a" />
                  <span>{openError ? "SPRÓBUJ PONOWNIE" : "OTWÓRZ PACZKĘ"}</span>
                  <Sparkles size={16} color="#fde68a" />
                </>
              )}
            </button>
          </div>
        )}

        {/* PHASE B: OPENING (Fast, high-energy 1.1s tear burst) */}
        {state?.phase === "OPENING" && (
          <div className="v2-opening-stage cinematic-pack-perspective">
            <div className="v2-opening-aura" />
            <div className="v2-opening-ring" />
            <div
              className="v2-pack-box cinematic-pack-tearing"
              style={{ boxShadow: "0 0 60px rgba(255,60,20,0.8)" }}
            >
              <img src={packImage} alt={pack.name} className="v2-pack-img" />
              <div className="cinematic-laser-cut" />
            </div>
            <div className="v2-opening-label">ROZRYWANIE OPAKOWANIA...</div>
          </div>
        )}

        {/* PHASE C: TRANSITION (Stealth blackout + tunnel sweep before stadium floodlights ignite) */}
        {state?.phase === "TRANSITION" && (
          <div className="v2-transition-overlay">
            <div className="v2-transition-streak" />
            <div className="v2-transition-flash cinematic-flash-burst" />
            <div className="v2-transition-label">WEJŚCIE NA STADION...</div>
          </div>
        )}

        {/* PHASE G: SUMMARY (Aesthetic, Centered, Scroll-safe complete pull overview) */}
        {state?.phase === "SUMMARY" && (
          <div className="v2-summary-stage">
            {/* Scrollable Cards Grid Container */}
            <div className="v2-summary-scroll cinematic-summary-scroll">
              <div className="v2-summary-inner">
                {/* Summary Header */}
                <div className="v2-summary-header">
                  <div className="v2-summary-kicker">
                    <Sparkles size={16} color="#fbbf24" />
                    <span>PODSUMOWANIE PACZKI</span>
                    <Sparkles size={16} color="#fbbf24" />
                  </div>
                  <h3 className="v2-summary-title">{pack.name}</h3>
                  <div className="v2-summary-stats">
                    <span>
                      Zdobyto: <strong style={{ color: "#ffffff" }}>{summaryShowcases.length} kart</strong>
                    </span>
                    {summaryNewCount > 0 && (
                      <span className="v2-new-pill">{summaryNewCount} NOWYCH</span>
                    )}
                    {summaryDupCount > 0 && (
                      <span className="v2-dp-pill">
                        {summaryDupCount} {summaryDupCount === 1 ? "DUPLIKAT" : "DUPLIKATY"} • +{totalEarnedPoints} DP
                      </span>
                    )}
                    {summaryDupCount === 0 && totalEarnedPoints > 0 && (
                      <span className="v2-dp-pill">+{totalEarnedPoints} DP z duplikatów</span>
                    )}
                  </div>
                  <div className="v2-summary-hint">
                    Kliknij dowolną kartę, aby obejrzeć ją w powiększonym 3D
                  </div>
                </div>

                {/* Centered Cards Container (Unified DeltaCard miniatures + interactive 3D preview click) */}
                <div className="v2-summary-grid">
                  {summaryShowcases.map((entry, idx) => {
                    const { slotKey, item, miniCard, displayName } = entry;
                    const entryRarity = getRarityPresentation(item.card.rarity, entry.card3D.visualType);
                    return (
                      <button
                        key={slotKey}
                        type="button"
                        data-testid={`summary-card-${idx}`}
                        data-rarity={entryRarity.tier}
                        aria-label={`Powiększ kartę 3D: ${displayName}`}
                        onClick={() => {
                          try {
                            cardSound.playFlip();
                          } catch {}
                          setInspectedSummaryCard(entry);
                        }}
                        className="v2-summary-tile v2-summary-tile-btn"
                      >
                        <div className="v2-summary-card-box">
                          <DeltaCard
                            card={miniCard}
                            size="responsive"
                            interactive={false}
                            showFlip={false}
                            className="w-full h-full pointer-events-none"
                          />
                        </div>
                        {item.is_duplicate ? (
                          <div className="v2-dup-row">
                            <span className="v2-dup-badge">DUPLIKAT</span>
                            {item.duplicate_points > 0 && (
                              <span className="v2-dup-dp-badge">+{item.duplicate_points} DP</span>
                            )}
                          </div>
                        ) : (
                          <div className="v2-new-badge">NOWA KARTA</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* 4. PINNED FOOTER ACTION HUD (Guaranteed Top Pointer Events & No Clipping) */}
      {/* ===================================================================== */}
      {state?.phase === "WALKOUT" && (
        <footer ref={footerRef} data-testid="cinematic-pack-footer" className="v2-footer-walkout">
          <div data-testid="walkout-rarity-teaser" className="v2-walkout-teaser">
            {heroRarityProfile.walkoutKicker}
          </div>
          <button type="button" onClick={handleNext} className="v2-walkout-btn">
            <span>ODKRYJ KARTĘ</span>
            <ChevronRight size={16} />
          </button>
        </footer>
      )}

      {state?.phase === "HERO_REVEAL" && heroShowcase && (
        <footer ref={footerRef} data-testid="cinematic-pack-footer" className="v2-footer-hero">
          <div className="v2-hero-meta animate-fadeIn">
            {/* Badge & Duplicate Pill */}
            <div className="v2-hero-pills">
              <span className="v2-hero-theme-pill">{heroShowcase.theme3D.displayName}</span>
              {heroShowcase.item.is_duplicate ? (
                <span className="v2-dp-pill">+{heroShowcase.item.duplicate_points} DP DUPLIKAT</span>
              ) : (
                <span className="v2-new-pill">NOWA KARTA</span>
              )}
            </div>

            {/* Player Full Name */}
            <h3 className="v2-hero-name">{heroShowcase.displayName}</h3>

            {/* Advance CTA Button */}
            <button type="button" onClick={handleNext} className="v2-hero-cta">
              <span>
                {revealShowcases.length > 0
                  ? `POZOSTAŁE KARTY (${revealShowcases.length})`
                  : "ZOBACZ PODSUMOWANIE"}
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      )}

      {state?.phase === "CARD_REVEAL" && currentRevealShowcase && (
        <footer ref={footerRef} data-testid="cinematic-pack-footer" className="v2-footer-hero">
          <div className="v2-hero-meta animate-fadeIn">
            {/* Card Progress Counter + Series + Status Pill */}
            <div className="v2-hero-pills">
              <span className="v2-counter-pill">
                <Layers size={11} color="#fbbf24" />
                <span>
                  KARTA {state.currentRevealIndex + 1} Z {revealShowcases.length}
                </span>
              </span>
              <span className="v2-hero-theme-pill">{currentRevealShowcase.theme3D.displayName}</span>
              {currentRevealShowcase.item.is_duplicate ? (
                <span className="v2-dp-pill">
                  +{currentRevealShowcase.item.duplicate_points} DP DUPLIKAT
                </span>
              ) : (
                <span className="v2-new-pill">NOWA KARTA</span>
              )}
            </div>

            {/* Player Full Name */}
            <h3 className="v2-hero-name">{currentRevealShowcase.displayName}</h3>

            {/* Advance CTA Button */}
            <button type="button" onClick={handleNext} className="v2-hero-cta">
              <span>
                {state.currentRevealIndex + 1 < revealShowcases.length
                  ? `NASTĘPNA KARTA (${revealShowcases.length - state.currentRevealIndex - 1})`
                  : "ZOBACZ PODSUMOWANIE"}
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      )}

      {state?.phase === "SUMMARY" && (
        <footer ref={footerRef} data-testid="cinematic-pack-footer" className="v2-footer-summary">
          <button type="button" onClick={handleClose} className="v2-summary-primary-btn">
            <CheckCircle2 size={16} />
            <span>DO KOLEKCJI</span>
          </button>

          {onOpenAnother && unopenedCount > 0 && (
            <button
              type="button"
              data-testid="cinematic-open-another-btn"
              disabled={isRequestingOpen}
              onClick={handleOpenAnother}
              className="v2-summary-secondary-btn"
            >
              <RotateCw size={15} />
              <span>OTWÓRZ KOLEJNĄ ({unopenedCount})</span>
            </button>
          )}
        </footer>
      )}

      {/* Interactive Enlarged 3D Card Lightbox from SUMMARY (Read-only, zero economy API calls) */}
      {state?.phase === "SUMMARY" && inspectedSummaryCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Podgląd 3D: ${inspectedSummaryCard.displayName}`}
          data-testid="summary-card-preview-modal"
          onClick={() => setInspectedSummaryCard(null)}
          className="v2-preview-backdrop"
        >
          <div className="v2-preview-header" onClick={(e) => e.stopPropagation()}>
            <span className="v2-preview-kicker">
              PODGLĄD KARTY 3D • {inspectedSummaryCard.theme3D.displayName}
            </span>
            <div className="v2-preview-actions">
              <button
                type="button"
                data-testid="summary-preview-flip-btn"
                onClick={() => setIsPreviewFlipped((v) => !v)}
                className="v2-preview-flip-btn"
              >
                <RotateCw size={14} />
                <span>{isPreviewFlipped ? "Awers" : "Rewers"}</span>
              </button>
              <button
                type="button"
                data-testid="summary-preview-close-btn"
                aria-label="Zamknij podgląd 3D"
                onClick={() => setInspectedSummaryCard(null)}
                className="v2-preview-close-btn"
              >
                <X size={15} />
                <span>Zamknij</span>
              </button>
            </div>
          </div>

          <div className="v2-preview-card-stage" onClick={(e) => e.stopPropagation()}>
            <div
              data-testid="summary-preview-card-3d"
              style={{
                transform: `scale(${previewScale.toFixed(4)})`,
                transformOrigin: "center center"
              }}
            >
              <Card3DEngine
                key={`preview-${inspectedSummaryCard.slotKey}`}
                data={inspectedSummaryCard.card3D}
                theme={inspectedSummaryCard.theme3D}
                isFlipped={isPreviewFlipped}
                interactive={true}
                autoRotate={false}
              />
            </div>
          </div>

          <div className="v2-preview-footer" onClick={(e) => e.stopPropagation()}>
            <div className="v2-hero-pills">
              {inspectedRarityProfile && (
                <span className="v2-hero-theme-pill">{inspectedRarityProfile.labelPl}</span>
              )}
              {inspectedSummaryCard.item.is_duplicate ? (
                <span className="v2-dp-pill">
                  +{inspectedSummaryCard.item.duplicate_points} DP DUPLIKAT
                </span>
              ) : (
                <span className="v2-new-pill">NOWA KARTA</span>
              )}
            </div>
            <h3 className="v2-hero-name">{inspectedSummaryCard.displayName}</h3>
            <span className="v2-summary-hint">
              Przeciągnij kartę lub użyj przycisku Obróć, aby obejrzeć w 3D
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
