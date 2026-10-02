"use client";

import React, { useEffect, useRef } from "react";

interface CanvasParticlesProps {
  theme?: "gold" | "inferno" | "legend" | "standard";
  active?: boolean;
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

export default function CanvasParticles({ theme = "gold", active = true }: CanvasParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const colors =
      theme === "inferno"
        ? ["#ef4444", "#f97316", "#fbbf24", "#dc2626", "#ffffff"]
        : theme === "legend"
        ? ["#38bdf8", "#818cf8", "#c084fc", "#f8fafc", "#e0e7ff"]
        : ["#f1c95c", "#eab308", "#fde047", "#ffffff", "#ca8a04"];

    const particles: Particle[] = [];

    // Burst initial confetti/sparks from center
    const createBurst = (count: number) => {
      const centerX = width / 2;
      const centerY = height * 0.55;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        particles.push({
          x: centerX + (Math.random() - 0.5) * 60,
          y: centerY + (Math.random() - 0.5) * 60,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 4,
          size: Math.random() * 8 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.015 + 0.008,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          shape: Math.random() > 0.4 ? "rect" : "circle"
        });
      }
    };

    createBurst(90);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Continuous ambient floating sparkles
      if (Math.random() > 0.4 && particles.length < 160) {
        particles.push({
          x: Math.random() * width,
          y: height + 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(Math.random() * 3 + 1.5),
          size: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.9,
          decay: Math.random() * 0.008 + 0.003,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 4,
          shape: "spark"
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.vx *= 0.98; // Air friction
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
          // Sparkle star
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme, active]);

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
