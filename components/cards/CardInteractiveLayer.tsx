"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { cardSound } from "@/lib/cards/audio";
import { DeltaCardSize, SIZE_DIMENSIONS } from "@/lib/cards/deltaCardModel";

export interface CardInteractiveLayerProps {
  children: (props: {
    rotateX: number;
    rotateY: number;
    glarePos: { x: number; y: number; opacity: number };
    isHovered: boolean;
    isDragging: boolean;
    isBackFace: boolean;
    flipCard: (e?: React.MouseEvent) => void;
  }) => React.ReactNode;
  size?: DeltaCardSize;
  interactive?: boolean;
  touchFlip?: boolean;
  isFlipped?: boolean;
  onFlipChange?: (isFlipped: boolean) => void;
  onClick?: () => void;
  glowColor?: string;
  className?: string;
  isLocked?: boolean;
  style?: React.CSSProperties;
}

export default function CardInteractiveLayer({
  children,
  size = "md",
  interactive = true,
  touchFlip = false,
  isFlipped: controlledFlipped,
  onFlipChange,
  onClick,
  glowColor = "rgba(245, 158, 11, 0.5)",
  className = "",
  isLocked = false,
  style = {}
}: CardInteractiveLayerProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [internalRotateY, setInternalRotateY] = useState(controlledFlipped ? 180 : 0);
  const [internalRotateX, setInternalRotateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const rotationRef = useRef({ x: 0, y: controlledFlipped ? 180 : 0 });
  const dragStartRef = useRef<{ startX: number; startY: number; startRotY: number; startRotX: number } | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const applyRotation = useCallback((x: number, y: number) => {
    rotationRef.current = { x, y };
    setInternalRotateX(x);
    setInternalRotateY(y);
  }, []);

  // Synchronize controlled flip
  useEffect(() => {
    if (controlledFlipped !== undefined) {
      const targetY = controlledFlipped ? 180 : 0;
      applyRotation(0, targetY);
    }
  }, [controlledFlipped, applyRotation]);

  const flipCard = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const curFace = Math.round(rotationRef.current.y / 180);
    const nextSnapY = (Math.abs(curFace) % 2 === 0) ? curFace * 180 + 180 : curFace * 180 - 180;
    applyRotation(0, nextSnapY);
    const isBack = Math.abs((nextSnapY / 180) % 2) === 1;
    cardSound?.playFlip?.();
    cardSound?.playHaptic?.("light");
    onFlipChange?.(isBack);
  }, [applyRotation, onFlipChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || prefersReducedMotion) return;
    if (e.pointerType !== "mouse" && !touchFlip) return;
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotY: rotationRef.current.y,
      startRotX: rotationRef.current.x
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || prefersReducedMotion) return;
    if (e.pointerType !== "mouse") return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x, y, opacity: isDragging ? 0.8 : 0.45 });

    if (dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      applyRotation(
        Math.max(-20, Math.min(20, dragStartRef.current.startRotX - deltaY * 0.35)),
        dragStartRef.current.startRotY + deltaX * 0.65
      );
    } else if (isHovered) {
      const rotY = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 12;
      const rotX = -((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 12;
      applyRotation(rotX, rotY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;
    setIsDragging(false);
    dragStartRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    if (e.pointerType !== "mouse") {
      const deltaX = e.clientX - dragStart.startX;
      const currentFace = Math.round(dragStart.startRotY / 180);
      const currentSnap = currentFace * 180;

      if (Math.abs(deltaX) < 32) {
        applyRotation(0, currentSnap);
        return;
      }

      const nextFace = currentSnap + (deltaX < 0 ? 180 : -180);
      applyRotation(0, nextFace);
      const isBack = Math.abs((nextFace / 180) % 2) === 1;
      cardSound?.playFlip?.();
      cardSound?.playHaptic?.("light");
      onFlipChange?.(isBack);
      return;
    }

    const nearestFace = Math.round(rotationRef.current.y / 180) * 180;
    applyRotation(0, nearestFace);
    onFlipChange?.(Math.abs((nearestFace / 180) % 2) === 1);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;
    setIsDragging(false);
    dragStartRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    applyRotation(0, Math.round(dragStart.startRotY / 180) * 180);
  };

  const isBackFace = Math.abs(Math.round(internalRotateY / 180)) % 2 === 1;
  const dim = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.md;

  const sizeStyle: React.CSSProperties = size === "responsive"
    ? { width: "100%", height: "auto", aspectRatio: "2 / 3" }
    : {
        width: `${dim.width}px`,
        height: `${dim.height}px`,
        minWidth: `${dim.width}px`,
        maxWidth: `${dim.width}px`,
        minHeight: `${dim.height}px`,
        maxHeight: `${dim.height}px`,
        aspectRatio: "2 / 3"
      };

  return (
    <div
      ref={cardRef}
      className={`delta-card-container relative select-none ${interactive ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}
      style={{
        ...sizeStyle,
        containerType: "inline-size",
        perspective: prefersReducedMotion ? "none" : "1200px",
        touchAction: touchFlip ? "pan-y" : "auto",
        ...style
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setIsHovered(true);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
        if (!isDragging && !prefersReducedMotion) {
          const nearestFace = Math.round(rotationRef.current.y / 180) * 180;
          applyRotation(0, nearestFace);
          setGlarePos(prev => ({ ...prev, opacity: 0 }));
        }
      }}
      onClick={onClick}
    >
      <div
        className="delta-card-rotator w-full h-full relative"
        style={{
          transformStyle: "preserve-3d",
          transform: prefersReducedMotion 
            ? (isBackFace ? "rotateY(180deg)" : "none")
            : `rotateX(${internalRotateX}deg) rotateY(${internalRotateY}deg)`,
          transition: isDragging || prefersReducedMotion ? "none" : "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
          boxShadow: isLocked
            ? "0 6px 18px rgba(0,0,0,0.8)"
            : isHovered || isDragging
            ? `0 18px 45px -10px ${glowColor}, 0 0 30px ${glowColor}`
            : `0 8px 24px -6px ${glowColor}, 0 0 16px ${glowColor}`
        }}
      >
        {children({
          rotateX: internalRotateX,
          rotateY: internalRotateY,
          glarePos,
          isHovered,
          isDragging,
          isBackFace,
          flipCard
        })}
      </div>
    </div>
  );
}
