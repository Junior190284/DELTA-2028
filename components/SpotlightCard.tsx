"use client";

import React, { useRef, useState, useCallback } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  enableTilt?: boolean;
  glowColor?: "gold" | "red" | "blue" | "emerald";
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function SpotlightCard({
  children,
  className = "",
  enableTilt = true,
  glowColor = "gold",
  style = {},
  onClick,
  ...rest
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; rotateX: number; rotateY: number; isHovered: boolean }>({
    x: 50,
    y: 50,
    rotateX: 0,
    rotateY: 0,
    isHovered: false,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    let rotateX = 0;
    let rotateY = 0;

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      rotateX = ((y - centerY) / centerY) * -5.5; // Max 5.5 deg tilt
      rotateY = ((x - centerX) / centerX) * 5.5;
    }

    setCoords({
      x: percentX,
      y: percentY,
      rotateX,
      rotateY,
      isHovered: true,
    });
  }, [enableTilt]);

  const handleMouseLeave = useCallback(() => {
    setCoords(prev => ({
      ...prev,
      rotateX: 0,
      rotateY: 0,
      isHovered: false,
    }));
  }, []);

  const glowRgba = glowColor === "red"
    ? "rgba(255, 32, 43, 0.22)"
    : glowColor === "blue"
    ? "rgba(59, 130, 246, 0.22)"
    : glowColor === "emerald"
    ? "rgba(16, 185, 129, 0.22)"
    : "rgba(246, 201, 82, 0.22)";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`v200-spotlight-card ${className} ${coords.isHovered ? "is-hovered" : ""}`}
      style={{
        ...style,
        transform: enableTilt && coords.isHovered
          ? `perspective(1000px) rotateX(${coords.rotateX}deg) rotateY(${coords.rotateY}deg) scale3d(1.015, 1.015, 1.015)`
          : undefined,
        ["--spotlight-x" as any]: `${coords.x}%`,
        ["--spotlight-y" as any]: `${coords.y}%`,
        ["--spotlight-glow" as any]: glowRgba,
      }}
      {...rest}
    >
      <div className="v200-spotlight-shine" aria-hidden="true" />
      <div className="v200-spotlight-border" aria-hidden="true" />
      {children}
    </div>
  );
}
