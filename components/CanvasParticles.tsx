"use client";

import React, { useEffect, useRef } from "react";

interface CanvasParticlesProps {
  theme?: "gold" | "inferno" | "legend" | "standard" | "common" | "rare" | "epic";
  active?: boolean;
  reducedMotion?: boolean;
  isMobile?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle" | "spark";
}

export default function CanvasParticles({
  theme = "gold",
  active = true,
  reducedMotion = false,
  isMobile: isMobileProp
}: CanvasParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const mqReduce =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    if (!active || reducedMotion || mqReduce || theme === "common") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const isMobile = isMobileProp ?? window.innerWidth < 768;
    const intensityScale =
      theme === "inferno" ? 1 : theme === "gold" || theme === "legend" ? 0.9 : theme === "epic" ? 0.78 : 0.45;
    const initialBurst = Math.round((isMobile ? 24 : 88) * intensityScale);
    const maxParticles = Math.round((isMobile ? 32 : 140) * intensityScale);

    const colors =
      theme === "inferno"
        ? ["#ff2a1a", "#ef4444", "#f97316", "#fbbf24", "#fffbeb"]
        : theme === "epic"
        ? ["#c084fc", "#a855f7", "#38bdf8", "#f0abfc", "#ffffff"]
        : theme === "rare"
        ? ["#38bdf8", "#10b981", "#7dd3fc", "#e0f2fe"]
        : theme === "legend" || theme === "gold"
        ? ["#f1c95c", "#eab308", "#fde047", "#ffffff", "#ca8a04"]
        : ["#e2e8f0", "#94a3b8", "#ffffff"];

    const particles: Particle[] = [];

    // Burst initial confetti/sparks from center
    const createBurst = (count: number) => {
      const centerX = width / 2;
      const centerY = height * 0.54;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isMobile ? 6.5 : 11.5) + 2.5;
        particles.push({
          x: centerX + (Math.random() - 0.5) * 40,
          y: centerY + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2.5,
          size: Math.random() * (isMobile ? 5 : 7.5) + 2.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.018 + 0.01,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 9,
          shape: theme === "epic" || theme === "inferno" ? (Math.random() > 0.35 ? "spark" : "rect") : Math.random() > 0.4 ? "rect" : "circle"
        });
      }
    };

    createBurst(initialBurst);

    // Throttle to ~30fps on mobile to keep CSS 3D transforms silky smooth
    const minFrameMs = isMobile ? 32 : 0;
    let lastDrawTime = 0;

    // Render loop
    const render = (now = 0) => {
      animId = requestAnimationFrame(render);
      if (minFrameMs > 0 && now - lastDrawTime < minFrameMs) {
        return;
      }
      lastDrawTime = now;

      ctx.clearRect(0, 0, width, height);

      // Continuous ambient floating sparkles
      if (Math.random() > (isMobile ? 0.78 : 0.45) && particles.length < maxParticles) {
        particles.push({
          x: Math.random() * width,
          y: height + 10,
          vx: (Math.random() - 0.5) * 1.4,
          vy: -(Math.random() * 2.8 + 1.4),
          size: Math.random() * 3.8 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.85,
          decay: Math.random() * 0.009 + 0.004,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 4,
          shape: "spark"
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.vx *= 0.98;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0 || p.y > height + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === "rect") {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        } else if (p.shape === "circle") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          if (!isMobile && (theme === "inferno" || theme === "epic" || theme === "gold")) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
          }
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        ctx.restore();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme, active, reducedMotion, isMobileProp]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 45,
        width: "100%",
        height: "100%"
      }}
    />
  );
}
