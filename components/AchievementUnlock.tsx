'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  Trophy, 
  Flame, 
  ChevronRight, 
  RotateCw, 
  Award, 
  CheckCircle2,
  Share2,
  Download,
  Camera,
  Check
} from 'lucide-react';
import { cinematicAudio } from '@/lib/cinematic/audio';

export type AchievementVariant = 'gold' | 'inferno' | 'silver' | 'bronze' | 'epic' | 'legendary';

export interface AchievementUnlockProps {
  grantId?: string;
  title: string;
  description: string;
  badgeImage?: string;
  badgeIcon?: React.ReactNode;
  variant?: AchievementVariant;
  eyebrow?: string;
  grantDate?: string;
  serialNumber?: string;
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
  queueIndex?: number;
  queueTotal?: number;
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
  grantDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }),
  serialNumber = '#042 / 2018 GM',
  effectColors,
  progress,
  nextGoal,
  playerName = 'Ryszard Rybacki',
  playerNumber = '10',
  queueIndex,
  queueTotal,
  onClose,
  onClaim,
  isDevPreview = false
}) => {
  const [phase, setPhase] = useState<'enter' | 'badge' | 'gleam' | 'particles' | 'content' | 'ready'>('enter');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [specularPos, setSpecularPos] = useState({ x: 50, y: 50 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  // Check prefers-reduced-motion & trigger multi-phase entrance sequence
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      setPhase('ready');
    } else {
      // 1. Badge Reveal (150ms)
      const t1 = setTimeout(() => {
        setPhase('badge');
        cinematicAudio.playBadgeReveal();
      }, 150);

      // 2. Metallic Gleam Sweep (600ms)
      const t2 = setTimeout(() => {
        setPhase('gleam');
        cinematicAudio.playBadgeGleam();
      }, 600);

      // 3. Particle Burst & Mobile Haptic Vibration (850ms)
      const t3 = setTimeout(() => {
        setPhase('particles');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([12, 35, 18]);
          } catch (e) {}
        }
      }, 850);

      // 4. Content Reveal (1200ms)
      const t4 = setTimeout(() => setPhase('content'), 1200);

      // 5. Resting State (1600ms)
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
        p.vy += 0.06;
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

  // Desktop 3D Parallax Tilt Handler (max ±8 degrees + dynamic specular highlight)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = Math.max(-8, Math.min(8, -(y / (rect.height / 2)) * 8));
    const rotateY = Math.max(-8, Math.min(8, (x / (rect.width / 2)) * 8));

    setTilt({ x: rotateX, y: rotateY });
    setSpecularPos({
      x: 50 - (rotateY * 3.5),
      y: 50 + (rotateX * 3.5)
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setSpecularPos({ x: 50, y: 50 });
  };

  // Toggle 3D Flip
  const handleToggleFlip = () => {
    setIsFlipped(prev => !prev);
    cinematicAudio.playBadgeFlip();
  };

  const handleDismiss = () => {
    if (onClaim && !isDevPreview) {
      onClaim(grantId);
    }
    onClose();
  };

  // Export Commemorative Poster (9:16 HD Card for WhatsApp / Instagram Story)
  const handleExportPoster = async () => {
    setExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1080;
      exportCanvas.height = 1920;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Gradient & Stadium Vignette
      const bgGrad = ctx.createRadialGradient(540, 600, 100, 540, 960, 1000);
      bgGrad.addColorStop(0, isInferno ? '#2b0909' : '#1e1406');
      bgGrad.addColorStop(0.5, '#0c0e14');
      bgGrad.addColorStop(1, '#020305');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Gold / Red Ambient Glow behind shield
      const glow = ctx.createRadialGradient(540, 720, 50, 540, 720, 450);
      glow.addColorStop(0, isInferno ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.4)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 200, 1080, 1100);

      // 2. Top Club Header
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 28px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '6px';
      ctx.fillText('K.S. DELTA WARSZAWA · GÓRNY MOKOTÓW', 540, 220);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px Inter, Arial, sans-serif';
      ctx.fillText('OFICJALNY CERTYFIKAT OSIĄGNIĘCIA', 540, 290);

      // 3. Draw Shield
      ctx.save();
      ctx.translate(540, 740);

      // Draw Shield Path
      ctx.shadowColor = isInferno ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 50;

      ctx.beginPath();
      ctx.moveTo(0, -320);
      ctx.lineTo(260, -240);
      ctx.bezierCurveTo(260, 140, 140, 280, 0, 350);
      ctx.bezierCurveTo(-140, 280, -260, 140, -260, -240);
      ctx.closePath();

      const shieldGrad = ctx.createLinearGradient(-260, -320, 260, 350);
      shieldGrad.addColorStop(0, isInferno ? '#ef4444' : '#fff2a3');
      shieldGrad.addColorStop(0.5, isInferno ? '#7f1d1d' : '#d99b26');
      shieldGrad.addColorStop(1, isInferno ? '#dc2626' : '#ffe685');
      ctx.fillStyle = shieldGrad;
      ctx.fill();

      // Inner Plate
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, -290);
      ctx.lineTo(230, -220);
      ctx.bezierCurveTo(230, 110, 120, 240, 0, 310);
      ctx.bezierCurveTo(-120, 240, -230, 110, -230, -220);
      ctx.closePath();
      ctx.fillStyle = isInferno ? '#160404' : '#0a0804';
      ctx.fill();
      ctx.strokeStyle = isInferno ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Shield Big Text / Icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '1000 110px Inter, Arial, sans-serif';
      if (title.toLowerCase().includes('trening') || title.includes('10')) {
        ctx.fillText('10', 0, 30);
        ctx.fillStyle = '#f59e0b';
        ctx.font = '900 32px Inter, Arial, sans-serif';
        ctx.fillText('TRENINGÓW', 0, 110);
      } else if (title.toLowerCase().includes('hat')) {
        ctx.font = '1000 70px Inter, Arial, sans-serif';
        ctx.fillText('⚽ ⚽ ⚽', 0, 10);
        ctx.fillStyle = '#f59e0b';
        ctx.font = '900 32px Inter, Arial, sans-serif';
        ctx.fillText('HAT-TRICK!', 0, 100);
      } else {
        ctx.font = '1000 80px Inter, Arial, sans-serif';
        ctx.fillText('🔥', 0, 30);
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 32px Inter, Arial, sans-serif';
        ctx.fillText('INFERNO', 0, 110);
      }
      ctx.restore();

      // 4. Player Name & Badge Title Section
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 30px Inter, Arial, sans-serif';
      ctx.fillText(`ZAWODNIK: ${playerName.toUpperCase()} #${playerNumber}`, 540, 1250);

      ctx.fillStyle = '#ffffff';
      ctx.font = '1000 68px Inter, Arial, sans-serif';
      ctx.fillText(title, 540, 1340);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 30px Inter, Arial, sans-serif';
      ctx.fillText(description, 540, 1420);

      // 5. Verification & Stamp Section
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, 1520);
      ctx.lineTo(900, 1520);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 24px Inter, Arial, sans-serif';
      ctx.fillText(`Seria: ${serialNumber}  ·  Data przyznania: ${grantDate}`, 540, 1590);

      ctx.fillStyle = '#22c55e';
      ctx.font = '900 28px Inter, Arial, sans-serif';
      ctx.fillText('✓ CERTYFIKOWANE PRZEZ SZTAB SZKOLENIOWY DELTA WARSZAWA 2018', 540, 1660);

      // 6. Convert & Trigger Share / Download
      const dataUrl = exportCanvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `delta-odznaka-${title.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Odznaka DELTA: ${title}`,
          text: `Zawodnik ${playerName} zdobył odznakę ${title} w K.S. Delta Warszawa 2018!`,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = `delta-odznaka-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const isContentVisible = phase === 'content' || phase === 'ready' || isReducedMotion;
  const isGleamActive = phase === 'gleam' || phase === 'particles' || phase === 'content' || phase === 'ready';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
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

        {/* Multi-Badge Queue Indicator (e.g. "ODZNAKA 1 Z 2") */}
        {queueTotal && queueTotal > 1 && (
          <div className="v200-unlock-queue-tag">
            <Sparkles size={12} />
            <span>ODZNAKA {queueIndex || 1} Z {queueTotal}</span>
          </div>
        )}

        {/* 3D Shield Presentation Area with Parallax Tilt */}
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
            {/* 3D Flip Container */}
            <div
              className={`v200-unlock-shield-flipper ${isFlipped ? 'is-flipped' : ''}`}
              onClick={handleToggleFlip}
              title="Kliknij, aby odwrócić odznakę"
            >
              {/* FRONT SIDE OF SHIELD */}
              <div className="v200-unlock-shield-front">
                {/* Metallic Gleam Ray Overlay */}
                <div className="v200-unlock-gleam-ray">
                  <div className={`v200-unlock-gleam-shimmer ${isGleamActive ? 'active' : ''}`} />
                </div>

                {/* Dynamic Specular Sheen Layer (Follows Mouse Cursor) */}
                <div
                  className="v200-unlock-specular-sheen"
                  style={{
                    background: `radial-gradient(circle 120px at ${specularPos.x}% ${specularPos.y}%, rgba(255, 255, 255, 0.45) 0%, transparent 70%)`
                  }}
                />

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
                  ) : title.toLowerCase().includes('czyste') || title.toLowerCase().includes('bramkarz') ? (
                    /* Variant 4: Czyste Konto / Bramkarz (Emerald, Silver & Fortress Shield) */
                    <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="emeraldRimGrad" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#a7f3d0" />
                          <stop offset="50%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#064e3b" />
                        </linearGradient>
                        <linearGradient id="gkInnerGrad" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#064e3b" />
                          <stop offset="60%" stopColor="#022c22" />
                          <stop offset="100%" stopColor="#011612" />
                        </linearGradient>
                      </defs>
                      <path d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z" fill="url(#emeraldRimGrad)" filter="drop-shadow(0 8px 24px rgba(16,185,129,0.4))" />
                      <path d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z" fill="url(#gkInnerGrad)" stroke="rgba(167,243,208,0.5)" strokeWidth="1.5" />
                      <g transform="translate(100, 100)">
                        <circle cx="0" cy="0" r="34" fill="#042f2e" stroke="#10b981" strokeWidth="2.5" />
                        <text x="0" y="10" textAnchor="middle" fill="#6ee7b7" fontSize="36">🧤</text>
                      </g>
                      <rect x="36" y="152" width="128" height="26" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
                      <text x="100" y="170" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="1000" letterSpacing="0.1em">CZYSTE KONTO</text>
                    </svg>
                  ) : title.toLowerCase().includes('kapitan') ? (
                    /* Variant 5: Kapitan Zespołu (Royal Navy & Gold with Crown & 'C') */
                    <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="captRimGrad" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#fde047" />
                          <stop offset="50%" stopColor="#ca8a04" />
                          <stop offset="100%" stopColor="#854d0e" />
                        </linearGradient>
                      </defs>
                      <path d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z" fill="url(#captRimGrad)" filter="drop-shadow(0 8px 24px rgba(234,179,8,0.5))" />
                      <path d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z" fill="#0f172a" stroke="rgba(253,224,71,0.5)" strokeWidth="1.5" />
                      <g transform="translate(100, 100)">
                        <polygon points="0,-42 12,-20 32,-30 20,5 -20,5 -32,-30 -12,-20" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                        <circle cx="0" cy="18" r="26" fill="#1e293b" stroke="#eab308" strokeWidth="2" />
                        <text x="0" y="29" textAnchor="middle" fill="#fde047" fontSize="28" fontWeight="1000">C</text>
                      </g>
                      <rect x="36" y="152" width="128" height="26" rx="6" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
                      <text x="100" y="170" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="1000" letterSpacing="0.1em">KAPITAN GM</text>
                    </svg>
                  ) : title.toLowerCase().includes('but') || title.toLowerCase().includes('snajper') ? (
                    /* Variant 6: Złoty But / Snajper (24K Gold) */
                    <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z" fill="url(#goldRimGrad)" filter="drop-shadow(0 8px 24px rgba(245,158,11,0.6))" />
                      <path d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z" fill="#171206" stroke="rgba(255,234,121,0.5)" strokeWidth="1.5" />
                      <g transform="translate(100, 95)">
                        <text x="0" y="15" textAnchor="middle" fill="#fde047" fontSize="48" filter="drop-shadow(0 0 12px #f59e0b)">👟</text>
                      </g>
                      <rect x="36" y="152" width="128" height="26" rx="6" fill="#241a06" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="100" y="170" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="1000" letterSpacing="0.1em">ZŁOTY BUT</text>
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
                    /* Default Generic Shield: Royal Gold & Onyx Championship Trophy Shield */
                    <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="defGoldRim" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#fff2a3" />
                          <stop offset="25%" stopColor="#d99b26" />
                          <stop offset="50%" stopColor="#ffea79" />
                          <stop offset="75%" stopColor="#b37814" />
                          <stop offset="100%" stopColor="#ffe685" />
                        </linearGradient>
                        <linearGradient id="defPlateGrad" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#1e180c" />
                          <stop offset="45%" stopColor="#0d0a06" />
                          <stop offset="100%" stopColor="#040301" />
                        </linearGradient>
                        <linearGradient id="trophyMetalGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="30%" stopColor="#fde047" />
                          <stop offset="70%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#a16207" />
                        </linearGradient>
                        <radialGradient id="defCenterGlow" cx="100" cy="105" r="70" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="rgba(245, 158, 11, 0.45)" />
                          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                        </radialGradient>
                      </defs>

                      {/* Outer Rim */}
                      <path
                        d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z"
                        fill="url(#defGoldRim)"
                        filter="drop-shadow(0 10px 28px rgba(245,158,11,0.5))"
                      />
                      {/* Inner Plate */}
                      <path
                        d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z"
                        fill="url(#defPlateGrad)"
                        stroke="rgba(255, 234, 121, 0.4)"
                        strokeWidth="1.5"
                      />

                      {/* Center Glow */}
                      <circle cx="100" cy="105" r="65" fill="url(#defCenterGlow)" />

                      {/* Star Header */}
                      <g transform="translate(100, 50)">
                        <polygon points="0,-8 2.5,-2.5 8,-2 4,2 5.5,7.5 0,4.5 -5.5,7.5 -4,2 -8,-2 -2.5,-2.5" fill="#fde047" filter="drop-shadow(0 0 6px #f59e0b)" />
                        <polygon points="-24,-5 -22,-1 -17,-1 -20,2 -19,6 -24,4 -29,6 -28,2 -31,-1 -26,-1" fill="#fde047" opacity="0.8" />
                        <polygon points="24,-5 26,-1 31,-1 28,2 29,6 24,4 19,6 20,2 17,-1 22,-1" fill="#fde047" opacity="0.8" />
                      </g>

                      {/* Vector Metallic Trophy in Center */}
                      <g transform="translate(100, 106)">
                        {/* Trophy Cup */}
                        <path
                          d="M-22,-36 L22,-36 C22,-36 24,-6 0,6 C-24,-6 -22,-36 -22,-36 Z"
                          fill="url(#trophyMetalGrad)"
                          stroke="#ca8a04"
                          strokeWidth="1.5"
                          filter="drop-shadow(0 4px 10px rgba(0,0,0,0.8))"
                        />
                        {/* Left Handle */}
                        <path
                          d="M-22,-30 C-34,-30 -34,-10 -20,-10"
                          fill="none"
                          stroke="url(#trophyMetalGrad)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        {/* Right Handle */}
                        <path
                          d="M22,-30 C34,-30 34,-10 20,-10"
                          fill="none"
                          stroke="url(#trophyMetalGrad)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        {/* Center Star on Cup */}
                        <polygon points="0,-22 2,-17 7,-17 3,-14 4.5,-9 0,-12 -4.5,-9 -3,-14 -7,-17 -2,-17" fill="#ffffff" />
                        {/* Stem */}
                        <rect x="-4" y="6" width="8" height="12" fill="url(#trophyMetalGrad)" stroke="#ca8a04" strokeWidth="1" />
                        {/* Base */}
                        <path d="M-14,18 L14,18 L18,28 L-18,28 Z" fill="url(#trophyMetalGrad)" stroke="#ca8a04" strokeWidth="1" />
                        <rect x="-20" y="28" width="40" height="7" rx="2" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
                      </g>

                      {/* Ribbon Banner */}
                      <rect x="36" y="156" width="128" height="24" rx="6" fill="#171206" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="100" y="172" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="1000" letterSpacing="0.12em">
                        DELTA GM 2018
                      </text>
                    </svg>
                  )}
                </div>
              </div>

              {/* BACK SIDE OF SHIELD (Official Certificate of Authenticity) */}
              <div className="v200-unlock-shield-back">
                <div className="v200-unlock-shield-svg-wrap">
                  <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="backRimGrad" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#cbd5e1" />
                        <stop offset="50%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                      <linearGradient id="backPlateGrad" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#020617" />
                      </linearGradient>
                    </defs>

                    {/* Outer Rim */}
                    <path
                      d="M100 8 L188 32 C188 150 148 205 100 232 C52 205 12 150 12 32 Z"
                      fill="url(#backRimGrad)"
                    />
                    {/* Inner Plate */}
                    <path
                      d="M100 18 L176 39 C176 142 140 192 100 218 C60 192 24 142 24 39 Z"
                      fill="url(#backPlateGrad)"
                      stroke="rgba(245, 158, 11, 0.4)"
                      strokeWidth="1.5"
                    />

                    {/* Verification Header */}
                    <text x="100" y="52" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="900" letterSpacing="0.16em">
                      K.S. DELTA WARSZAWA
                    </text>
                    <text x="100" y="65" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="1000" letterSpacing="0.1em">
                      OFICJALNY CERTYFIKAT
                    </text>

                    {/* Serial Number Box */}
                    <rect x="36" y="80" width="128" height="24" rx="6" fill="#1e293b" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
                    <text x="100" y="95" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" letterSpacing="0.08em">
                      SERIA: {serialNumber}
                    </text>

                    {/* Player Info */}
                    <text x="100" y="125" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="900">
                      {playerName} #{playerNumber}
                    </text>
                    <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="8.5">
                      Zdobyto: {grantDate}
                    </text>

                    {/* Verified Club Stamp */}
                    <g transform="translate(100, 180)">
                      <circle cx="0" cy="0" r="22" fill="#0b1329" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                      <text x="0" y="-3" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="900">DELTA</text>
                      <text x="0" y="6" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="800">2018 GM</text>
                      <text x="0" y="14" textAnchor="middle" fill="#22c55e" fontSize="6" fontWeight="900">✓ VERIFIED</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Flip Hint Pill */}
        <button
          type="button"
          onClick={handleToggleFlip}
          className="v200-unlock-flip-hint"
        >
          <RotateCw size={11} className={isFlipped ? 'rotate-180 transition-transform' : ''} />
          <span>{isFlipped ? 'Kliknij, aby zobaczyć przód' : 'Kliknij odznakę, aby zobaczyć certyfikat'}</span>
        </button>

        {/* Content Section: Eyebrow, Title, Description, Progress & Actions */}
        <div className={`w-full flex flex-col items-center mt-3 ${isContentVisible ? 'v200-animate-text-reveal' : 'opacity-0'}`}>
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

          {/* Unified Bottom Stack: Progress Box + Actions */}
          <div className="v200-unlock-bottom-stack">
            {/* Optional Progress Box */}
            {progress && (
              <div className="v200-unlock-progress-box">
                <div className="v200-unlock-progress-header">
                  <span>{progress.label || 'Zrealizowany cel:'}</span>
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
              <span>{queueTotal && queueIndex && queueIndex < queueTotal ? 'NASTĘPNA ODZNAKA' : 'ODBIERZ ODZNAKĘ'}</span>
              <ChevronRight size={17} />
            </button>

            {/* Commemorative Poster Export Button (WhatsApp / Instagram Story) */}
            <button
              type="button"
              onClick={handleExportPoster}
              disabled={exporting}
              className="v200-unlock-poster-btn"
            >
              {exportSuccess ? (
                <>
                  <Check size={15} className="text-emerald-400" />
                  <span className="text-emerald-300">Pamiątka Zapisana (Pobrano PNG)!</span>
                </>
              ) : exporting ? (
                <>
                  <div className="v200-btn-spinner" />
                  <span>Generowanie Pamiątki HD (9:16)…</span>
                </>
              ) : (
                <>
                  <Camera size={15} className="text-yellow-400" />
                  <span>Pobierz Plakat Pamiątkowy (Story / WhatsApp)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AchievementUnlock;
