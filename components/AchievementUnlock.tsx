'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { X, Sparkles, Trophy, Flame, ChevronRight, Zap } from 'lucide-react';

export type AchievementVariant = 'gold' | 'inferno' | 'silver' | 'bronze' | 'epic' | 'legendary';

export interface AchievementUnlockProps {
  grantId?: string;
  title: string;
  description: string;
  badgeImage?: string;
  badgeIcon?: React.ReactNode;
  variant?: AchievementVariant;
  eyebrow?: string;
  effectColors?: {
    primary?: string;
    glow?: string;
    particle?: string;
    accent?: string;
  };
  progress?: {
    current: number;
    max: number;
    unit?: string;
    label?: string;
  };
  nextGoal?: {
    label: string;
    target: number;
    rewardLabel?: string;
  };
  playerName?: string;
  playerNumber?: string | number;
  onClose: () => void;
  onClaim?: (grantId: string) => Promise<void> | void;
  isDevPreview?: boolean;
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
  shape: 'circle' | 'spark' | 'ember';
}

export const AchievementUnlock: React.FC<AchievementUnlockProps> = ({
  grantId = 'achievement_default',
  title,
  description,
  badgeImage,
  badgeIcon,
  variant = 'gold',
  eyebrow = 'ODBLOKOWANO NOWĄ ODZNAKĘ',
  effectColors,
  progress,
  nextGoal,
  playerName,
  playerNumber,
  onClose,
  onClaim,
  isDevPreview = false
}) => {
  const [phase, setPhase] = useState<'enter' | 'badge' | 'gleam' | 'particles' | 'content' | 'ready'>('enter');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const titleId = useId();

  // Determine theme colors based on variant
  const isInferno = variant === 'inferno';
  const primaryColor = effectColors?.primary || (isInferno ? '#ef4444' : '#f59e0b');
  const glowColor = effectColors?.glow || (isInferno ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.45)');
  const accentColor = effectColors?.accent || (isInferno ? '#fca5a5' : '#fde047');

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      setPhase('ready');
    } else {
      // Execute multi-phase timed entrance animation (1.5 - 2.0s total)
      const t1 = setTimeout(() => setPhase('badge'), 150);
      const t2 = setTimeout(() => setPhase('gleam'), 600);
      const t3 = setTimeout(() => setPhase('particles'), 850);
      const t4 = setTimeout(() => setPhase('content'), 1200);
      const t5 = setTimeout(() => setPhase('ready'), 1600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
      };
    }
  }, []);

  // Keyboard navigation & focus restoration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus primary CTA button once content is visible
    if (phase === 'content' || phase === 'ready') {
      closeBtnRef.current?.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [phase]);

  // Particle celebration canvas effect
  useEffect(() => {
    if (isReducedMotion || phase === 'enter' || phase === 'badge') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 440);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const centerX = width / 2;
    const centerY = height * 0.35;

    const particles: Particle[] = [];
    const particleCount = isInferno ? 55 : 45;
    const goldPalette = ['#f59e0b', '#fbbf24', '#fef08a', '#d97706', '#ffffff'];
    const infernoPalette = ['#ef4444', '#f97316', '#dc2626', '#ffedd5', '#b91c1c'];
    const colors = isInferno ? infernoPalette : goldPalette;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 5.5;

      particles.push({
        x: centerX + (Math.random() - 0.5) * 20,
        y: centerY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isInferno ? 1.5 : 0.8),
        size: 2 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.012 + Math.random() * 0.018,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        shape: isInferno ? (Math.random() > 0.4 ? 'ember' : 'spark') : (Math.random() > 0.5 ? 'spark' : 'circle')
      });
    }

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.alpha <= 0) continue;

        aliveCount++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // subtle gravity
        p.vx *= 0.98;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.shape === 'spark') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.6);
          ctx.lineTo(p.size * 0.4, 0);
          ctx.lineTo(0, p.size * 1.6);
          ctx.lineTo(-p.size * 0.4, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'ember') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (aliveCount > 0) {
        animationFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, isReducedMotion, isInferno]);

  // Desktop 3D Parallax Tilt Handler (max ±8 degrees)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = Math.max(-8, Math.min(8, -(y / (rect.height / 2)) * 8));
    const rotateY = Math.max(-8, Math.min(8, (x / (rect.width / 2)) * 8));

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleDismiss = () => {
    if (onClaim && !isDevPreview) {
      onClaim(grantId);
    }
    onClose();
  };

  const isContentVisible = phase === 'content' || phase === 'ready' || isReducedMotion;
  const isGleamActive = phase === 'gleam' || phase === 'particles' || phase === 'content' || phase === 'ready';

  return (
    <div
      className="v200-unlock-overlay"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        ['--unlock-accent' as any]: primaryColor,
        ['--unlock-glow' as any]: glowColor,
        ['--shield-glow' as any]: glowColor
      }}
    >
      <div
        ref={cardRef}
        className="v200-unlock-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Atmosphere Glow */}
        <div className={`v200-unlock-ambient-glow ${isInferno ? 'inferno' : 'gold'}`} />

        {/* Canvas for Particle Burst */}
        <canvas ref={canvasRef} className="v200-unlock-particle-canvas" />

        {/* Top Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="v200-unlock-corner-close"
          aria-label="Zamknij"
        >
          <X size={20} />
        </button>

        {/* 3D Shield Presentation Area */}
        <div
          className="v200-unlock-shield-stage"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`v200-unlock-shield-tilt ${phase !== 'enter' ? 'v200-animate-badge-reveal' : ''}`}
            style={{
              transform: isReducedMotion
                ? 'none'
                : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            }}
          >
            {/* Metallic Gleam Ray Overlay */}
            <div className="v200-unlock-gleam-ray">
              <div className={`v200-unlock-gleam-shimmer ${isGleamActive ? 'active' : ''}`} />
            </div>

            {/* Render Metallic Badge Graphic */}
            <div className="v200-unlock-shield-svg-wrap">
              {badgeImage ? (
                <img
                  src={badgeImage}
                  alt={title}
                  className="w-full h-full object-contain"
                />
              ) : title.toLowerCase().includes('trening') || title.includes('10') ? (
                /* Variant 1: 10 Treningów (Gold Metallic Shield) */
                <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="goldRimGrad" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fff2a3" />
                      <stop offset="25%" stopColor="#d99b26" />
                      <stop offset="50%" stopColor="#ffea79" />
                      <stop offset="75%" stopColor="#b37814" />
                      <stop offset="100%" stopColor="#ffe685" />
                    </linearGradient>
                    <linearGradient id="goldInnerGrad" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#1a1408" />
                      <stop offset="45%" stopColor="#0c0a06" />
                      <stop offset="100%" stopColor="#050402" />
                    </linearGradient>
                    <linearGradient id="goldTextGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="40%" stopColor="#ffea79" />
                      <stop offset="100%" stopColor="#d99b26" />
                    </linearGradient>
                    <radialGradient id="goldCenterGlow" cx="100" cy="110" r="80" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="rgba(245, 158, 11, 0.35)" />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </radialGradient>
                    <filter id="goldBevel">
                      <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {/* Outer Shield Rim */}
                  <path
                    d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z"
                    fill="url(#goldRimGrad)"
                    filter="url(#goldBevel)"
                  />
                  {/* Inner Dark Metal Plate */}
                  <path
                    d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z"
                    fill="url(#goldInnerGrad)"
                    stroke="rgba(255, 234, 121, 0.4)"
                    strokeWidth="1.5"
                  />
                  {/* Center Glow */}
                  <circle cx="100" cy="110" r="75" fill="url(#goldCenterGlow)" />

                  {/* Embossed Shield Details */}
                  <path
                    d="M100 25 L165 44 C165 130 134 175 100 198 C66 175 35 130 35 44 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />

                  {/* Top Crown / Laurel Arch */}
                  <path
                    d="M75 52 Q100 45 125 52"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <polygon points="100,40 104,49 114,49 106,55 109,64 100,58 91,64 94,55 86,49 96,49" fill="#fde047" />

                  {/* Big Embossed "10" Number */}
                  <text
                    x="100"
                    y="132"
                    textAnchor="middle"
                    fill="url(#goldTextGrad)"
                    fontSize="64"
                    fontWeight="1000"
                    fontFamily="Inter, Arial, sans-serif"
                    letterSpacing="-0.03em"
                    filter="drop-shadow(0 4px 12px rgba(0,0,0,0.9))"
                  >
                    10
                  </text>

                  {/* Bottom Ribbon / Banner: "TRENINGÓW" */}
                  <rect x="42" y="148" width="116" height="24" rx="6" fill="#1e1406" stroke="url(#goldRimGrad)" strokeWidth="1.5" />
                  <text
                    x="100"
                    y="164"
                    textAnchor="middle"
                    fill="#fef08a"
                    fontSize="11"
                    fontWeight="900"
                    letterSpacing="0.12em"
                  >
                    TRENINGÓW
                  </text>

                  {/* Delta GM Stars */}
                  <circle cx="56" cy="160" r="2" fill="#ffd700" />
                  <circle cx="144" cy="160" r="2" fill="#ffd700" />
                </svg>
              ) : title.toLowerCase().includes('hat') || title.toLowerCase().includes('trick') ? (
                /* Variant 2: Hat-trick (Platinum / Gold & Onyx Shield) */
                <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="platRimGrad" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#94a3b8" />
                      <stop offset="50%" stopColor="#f8fafc" />
                      <stop offset="75%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <linearGradient id="onyxInnerGrad" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="50%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#020617" />
                    </linearGradient>
                    <linearGradient id="fireBallGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>

                  {/* Outer Shield Rim */}
                  <path
                    d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z"
                    fill="url(#platRimGrad)"
                    filter="drop-shadow(0 8px 24px rgba(0,0,0,0.8))"
                  />
                  {/* Inner Onyx Plate */}
                  <path
                    d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z"
                    fill="url(#onyxInnerGrad)"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1.5"
                  />

                  {/* 3 Golden / Fiery Soccer Balls / Triple Strike Crest */}
                  <g transform="translate(100, 100)">
                    {/* Center Top Ball */}
                    <circle cx="0" cy="-28" r="22" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
                    <circle cx="0" cy="-28" r="18" fill="url(#fireBallGrad)" opacity="0.9" />
                    <text x="0" y="-23" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">⚽</text>

                    {/* Bottom Left Ball */}
                    <circle cx="-28" cy="16" r="19" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                    <circle cx="-28" cy="16" r="15" fill="url(#fireBallGrad)" opacity="0.9" />
                    <text x="-28" y="21" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">⚽</text>

                    {/* Bottom Right Ball */}
                    <circle cx="28" cy="16" r="19" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                    <circle cx="28" cy="16" r="15" fill="url(#fireBallGrad)" opacity="0.9" />
                    <text x="28" y="21" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">⚽</text>
                  </g>

                  {/* Banner: "HAT-TRICK" */}
                  <rect x="36" y="152" width="128" height="26" rx="6" fill="#090d16" stroke="#f59e0b" strokeWidth="1.5" />
                  <text
                    x="100"
                    y="170"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="1000"
                    letterSpacing="0.1em"
                  >
                    HAT-TRICK!
                  </text>
                </svg>
              ) : isInferno || title.toLowerCase().includes('inferno') ? (
                /* Variant 3: INFERNO (Volcanic Titanium & Burning Ruby Shield) */
                <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="infernoRimGrad" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="25%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#991b1b" />
                      <stop offset="75%" stopColor="#450a0a" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                    <linearGradient id="magmaCoreGrad" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#2b0d0d" />
                      <stop offset="50%" stopColor="#140505" />
                      <stop offset="100%" stopColor="#050101" />
                    </linearGradient>
                    <radialGradient id="infernoFireGlow" cx="100" cy="115" r="75" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="rgba(239, 68, 68, 0.45)" />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </radialGradient>
                  </defs>

                  {/* Outer Ruby Metal Shield Rim */}
                  <path
                    d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z"
                    fill="url(#infernoRimGrad)"
                    filter="drop-shadow(0 8px 26px rgba(239, 68, 68, 0.4))"
                  />
                  {/* Inner Charred Titanium Plate */}
                  <path
                    d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z"
                    fill="url(#magmaCoreGrad)"
                    stroke="rgba(239, 68, 68, 0.6)"
                    strokeWidth="1.5"
                  />

                  {/* Magma Flame Glow */}
                  <circle cx="100" cy="115" r="70" fill="url(#infernoFireGlow)" />

                  {/* Inferno Devil / Flame Crest */}
                  <g transform="translate(100, 105) scale(1.15)">
                    <path
                      d="M0 -35 C15 -20 30 -5 20 18 C15 28 5 35 0 35 C-5 35 -15 28 -20 18 C-30 -5 -15 -20 0 -35 Z"
                      fill="#ef4444"
                      filter="drop-shadow(0 0 10px #f97316)"
                    />
                    <path
                      d="M0 -22 C8 -12 18 0 12 15 C8 22 3 25 0 25 C-3 25 -8 22 -12 15 C-18 0 -8 -12 0 -22 Z"
                      fill="#fef08a"
                    />
                  </g>

                  {/* INFERNO Banner */}
                  <rect x="36" y="152" width="128" height="26" rx="6" fill="#1c0505" stroke="#ef4444" strokeWidth="1.5" />
                  <text
                    x="100"
                    y="170"
                    textAnchor="middle"
                    fill="#fca5a5"
                    fontSize="13"
                    fontWeight="1000"
                    letterSpacing="0.14em"
                  >
                    INFERNO PRO
                  </text>
                </svg>
              ) : (
                /* Default Generic Shield */
                <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z"
                    fill="#f59e0b"
                  />
                  <path
                    d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z"
                    fill="#0f172a"
                  />
                  <g transform="translate(100, 110)">
                    {badgeIcon || <Trophy size={48} className="text-amber-400 -translate-x-6 -translate-y-6" />}
                  </g>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Content Section: Eyebrow, Title, Description, Progress & Button */}
        <div className={`w-full flex flex-col items-center ${isContentVisible ? 'v200-animate-text-reveal' : 'opacity-0'}`}>
          {/* Eyebrow */}
          <div className="v200-unlock-eyebrow">
            <Sparkles size={13} />
            <span>{eyebrow}</span>
            <Sparkles size={13} />
          </div>

          {/* Title */}
          <h2 id={titleId} className="v200-unlock-title">
            {title}
          </h2>

          {/* Optional Player Reference Tag */}
          {playerName && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300 mb-2">
              <span>{playerName}</span>
              {playerNumber && <span className="text-amber-400">#{playerNumber}</span>}
            </div>
          )}

          {/* Description */}
          <p className="v200-unlock-desc">
            {description}
          </p>

          {/* Optional Progress Box */}
          {progress && (
            <div className="v200-unlock-progress-box">
              <div className="v200-unlock-progress-header">
                <span>{progress.label || 'Postęp odznaki:'}</span>
                <strong className="text-white font-black">
                  {progress.current} / {progress.max} {progress.unit || ''}
                </strong>
              </div>
              <div className="v200-unlock-progress-bar-bg">
                <div
                  className="v200-unlock-progress-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((progress.current / progress.max) * 100))}%`
                  }}
                />
              </div>

              {/* Optional Next Goal Section (ONLY shown if nextGoal exists) */}
              {nextGoal && (
                <div className="v200-unlock-next-goal">
                  <span>{nextGoal.label} ({nextGoal.target})</span>
                  {nextGoal.rewardLabel && <b>{nextGoal.rewardLabel}</b>}
                </div>
              )}
            </div>
          )}

          {/* Red CTA Action Button: "ODBIERZ ODZNAKĘ" */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleDismiss}
            className="v200-unlock-cta-btn"
          >
            <span>ODBIERZ ODZNAKĘ</span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementUnlock;
