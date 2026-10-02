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

  // If videoSrc is provided, we play the pure hardware-accelerated video for max 60+ FPS
  useEffect(() => {
    if (videoSrc && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [videoSrc]);

  // Only run procedural canvas if NO video is provided (zero CPU overhead during video)
  useEffect(() => {
    if (videoSrc) return; // Don't run canvas loop when video is available

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

    const ringsCount = 14;
    const rings = Array.from({ length: ringsCount }, (_, i) => ({
      z: (i / ringsCount) * 1000,
      speed: 18 * speed
    }));

    const streaksCount = 20;
    const streaks = Array.from({ length: streaksCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 300 + 80,
      length: Math.random() * 120 + 40,
      speed: (Math.random() * 15 + 10) * speed,
      z: Math.random() * 1000
    }));

    const render = () => {
      const cx = width / 2;
      const cy = height / 2;

      ctx.fillStyle = "rgba(4, 7, 13, 0.45)";
      ctx.fillRect(0, 0, width, height);

      // Lightweight rings without heavy shadowBlur
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ring.z -= ring.speed;
        if (ring.z <= 10) ring.z = 1000;

        const scale = 500 / ring.z;
        const radius = 280 * scale;
        const alpha = Math.min(1, Math.max(0, 1 - ring.z / 1000));

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${alpha * 0.4})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.stroke();
      }

      // Streaks
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
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme, speed, videoSrc]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1, pointerEvents: "none" }}>
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 1
          }}
        />
      )}
    </div>
  );
}
