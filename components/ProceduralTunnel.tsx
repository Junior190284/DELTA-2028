"use client";

import React, { useEffect, useRef } from "react";

interface ProceduralTunnelProps {
  theme?: "gold" | "inferno" | "legend" | "standard";
  speed?: number;
  videoSrc?: string;
}

export default function ProceduralTunnel({
  theme = "gold",
  speed = 1.0,
  videoSrc
}: ProceduralTunnelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
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

    const primaryColor =
      theme === "inferno"
        ? { r: 239, g: 68, b: 68 }
        : theme === "legend"
        ? { r: 56, g: 189, b: 248 }
        : { r: 241, g: 201, b: 92 };

    // Starfield/Tunnel rings
    const ringsCount = 28;
    const rings: { z: number; speed: number; rot: number }[] = [];
    for (let i = 0; i < ringsCount; i++) {
      rings.push({
        z: (i / ringsCount) * 1000,
        speed: 16 * speed,
        rot: Math.random() * Math.PI * 2
      });
    }

    // High speed laser streaks
    const streaksCount = 45;
    const streaks: { angle: number; dist: number; length: number; speed: number; z: number }[] = [];
    for (let i = 0; i < streaksCount; i++) {
      streaks.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 400 + 80,
        length: Math.random() * 180 + 60,
        speed: (Math.random() * 20 + 15) * speed,
        z: Math.random() * 1000
      });
    }

    const render = () => {
      // Dark space background with radial glow
      const cx = width / 2;
      const cy = height / 2;

      ctx.fillStyle = "rgba(4, 7, 13, 0.4)";
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.7);
      grad.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.25)`);
      grad.addColorStop(0.5, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.08)`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render 3D geometric tunnel rings
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ring.z -= ring.speed;
        if (ring.z <= 10) {
          ring.z = 1000;
        }

        const scale = 500 / ring.z;
        const radius = 320 * scale;
        const alpha = Math.min(1, Math.max(0, 1 - ring.z / 1000));

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.rot);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${alpha * 0.45})`;
        ctx.lineWidth = Math.max(1, 4 * scale);
        ctx.stroke();

        // Crosshairs / stadium arches
        if (i % 3 === 0) {
          for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2;
            const x1 = Math.cos(angle) * (radius * 0.85);
            const y1 = Math.sin(angle) * (radius * 0.85);
            const x2 = Math.cos(angle) * (radius * 1.15);
            const y2 = Math.sin(angle) * (radius * 1.15);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx.lineWidth = Math.max(1, 2 * scale);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Render Laser streaks
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        s.z -= s.speed;
        if (s.z <= 10) {
          s.z = 1000;
          s.angle = Math.random() * Math.PI * 2;
        }

        const scale = 500 / s.z;
        const x1 = cx + Math.cos(s.angle) * s.dist * scale;
        const y1 = cy + Math.sin(s.angle) * s.dist * scale;
        const x2 = cx + Math.cos(s.angle) * (s.dist + s.length) * scale;
        const y2 = cy + Math.sin(s.angle) * (s.dist + s.length) * scale;
        const alpha = Math.min(1, Math.max(0, 1 - s.z / 1000));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.lineWidth = Math.max(1, 3 * scale);
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 1)`;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme, speed]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1 }}>
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
            filter:
              theme === "inferno"
                ? "hue-rotate(330deg) saturate(2.2)"
                : theme === "legend"
                ? "hue-rotate(180deg) saturate(1.8)"
                : "hue-rotate(0deg) contrast(1.2)"
          }}
        />
      ) : null}

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: videoSrc ? 2 : 1,
          mixBlendMode: videoSrc ? "screen" : "normal"
        }}
      />
    </div>
  );
}
