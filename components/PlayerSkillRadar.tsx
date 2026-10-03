"use client";

import { useMemo } from "react";
import { Zap, Target, Flame, Award, Shield, Sparkles, TrendingUp } from "lucide-react";

export interface SkillStats {
  matches: number;
  starts: number;
  captain: number;
  goals: number;
  assists: number;
  mvp: number;
  trainings: number;
  trainingGoals: number;
  trainingAssists: number;
  streak: number;
}

interface SkillRadarProps {
  stats: SkillStats;
  playerName: string;
  position?: string | null;
}

interface Attribute {
  key: string;
  label: string;
  shortLabel: string;
  val: number;
  desc: string;
  icon: any;
}

export default function PlayerSkillRadar({ stats, playerName, position }: SkillRadarProps) {
  const attributes: Attribute[] = useMemo(() => {
    // Obliczanie zbalansowanych ocen 50-99 (w stylu EA FC)
    // 1. Skuteczność (Bramki w meczach i treningach)
    const totalGoals = stats.goals * 2 + stats.trainingGoals;
    const finVal = Math.min(99, Math.max(60, 65 + totalGoals * 3));

    // 2. Kreacja (Asysty i podania)
    const totalAssists = stats.assists * 2 + stats.trainingAssists;
    const creVal = Math.min(99, Math.max(60, 62 + totalAssists * 4));

    // 3. Frekwencja & Dyscyplina (Treningi + streak)
    const reqTrainings = stats.trainings;
    const attVal = Math.min(99, Math.max(65, 70 + reqTrainings * 2 + stats.streak * 2));

    // 4. Doświadczenie Meczowe (Występy i wyjściowa 6)
    const expVal = Math.min(99, Math.max(60, 64 + stats.matches * 5 + stats.starts * 3));

    // 5. Przywództwo & Wpływ (Kapitan + MVP)
    const leadVal = Math.min(99, Math.max(60, 60 + stats.captain * 8 + stats.mvp * 7));

    // 6. Dynamika Treningowa (Gry i zaangażowanie)
    const dynVal = Math.min(99, Math.max(62, 66 + (stats.trainingGoals + stats.trainingAssists) * 2 + reqTrainings));

    return [
      { key: "fin", label: "SKUTECZNOŚĆ", shortLabel: "SKU", val: finVal, desc: `${stats.goals} goli w meczach`, icon: Target },
      { key: "cre", label: "KREACJA", shortLabel: "KRE", val: creVal, desc: `${stats.assists} asyst zespołu`, icon: Sparkles },
      { key: "att", label: "FREKWENCJA", shortLabel: "FRK", val: attVal, desc: `${stats.trainings} obecności na treningach`, icon: Shield },
      { key: "exp", label: "DOŚWIADCZENIE", shortLabel: "DOŚ", val: expVal, desc: `${stats.matches} meczów (${stats.starts} w '6')`, icon: TrendingUp },
      { key: "lead", label: "PRZYWÓDZTWO", shortLabel: "LID", val: leadVal, desc: `${stats.captain}x kapitan, ${stats.mvp}x MVP`, icon: Award },
      { key: "dyn", label: "DYNAMIKA", shortLabel: "DYN", val: dynVal, desc: `Seria obecności: ${stats.streak}`, icon: Flame },
    ];
  }, [stats]);

  // Obliczenie Overall Rating (OVR)
  const ovr = useMemo(() => {
    const avg = attributes.reduce((sum, a) => sum + a.val, 0) / attributes.length;
    return Math.round(avg);
  }, [attributes]);

  // Styl gry na podstawie wiodącego atrybutu
  const playStyle = useMemo(() => {
    const top = [...attributes].sort((a, b) => b.val - a.val)[0];
    switch (top.key) {
      case "fin": return { title: "SNAJPER", desc: "Znakomite wykończenie i instynkt strzelecki", color: "#ff202b" };
      case "cre": return { title: "DYRYGENT", desc: "Wizja gry, kluczowe podania i kreacja", color: "#38bdf8" };
      case "att": return { title: "FILAR ZESPOŁU", desc: "Niezawodna obecność i etyka pracy", color: "#34d399" };
      case "exp": return { title: "TAKTYK", desc: "Pewność na boisku i kontrola tempa gry", color: "#fbbf24" };
      case "lead": return { title: "KAPITAN", desc: "Charyzma, motywacja i serce do walki", color: "#e879f9" };
      case "dyn": return { title: "MOTOR NAPĘDOWY", desc: "Nieustanna energia i tempo w treningu", color: "#fb923c" };
      default: return { title: "WSZECHSTRONNY", desc: "Zbalansowane umiejętności na każdej pozycji", color: "#f6c952" };
    }
  }, [attributes]);

  // Geometria sześciokąta SVG (Center: 120, 120, Radius: 90)
  const cx = 130;
  const cy = 130;
  const maxR = 85;

  const getCoordinates = (angleIndex: number, radiusRatio: number) => {
    // 6 wierzchołków (co 60 stopni, start od góry: -90 deg)
    const angle = ((angleIndex * 60 - 90) * Math.PI) / 180;
    return {
      x: cx + maxR * radiusRatio * Math.cos(angle),
      y: cy + maxR * radiusRatio * Math.sin(angle),
    };
  };

  // Punkty siatki (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map(level => {
    return Array.from({ length: 6 })
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level);
        return `${x},${y}`;
      })
      .join(" ");
  });

  // Punkty wartości zawodnika (mapowane z 50-99 na 0.3-1.0)
  const polygonPoints = attributes
    .map((attr, i) => {
      const ratio = 0.25 + ((attr.val - 50) / 50) * 0.75;
      const { x, y } = getCoordinates(i, Math.min(1.0, Math.max(0.2, ratio)));
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="v200-skill-radar-card devil-card">
      <div className="v200-skill-radar-header">
        <div className="v200-skill-radar-title-wrap">
          <div className="v200-skill-radar-badge">
            <Zap size={14} />
            <span>RADAR UMIEJĘTNOŚCI</span>
          </div>
          <h3>ATRYBUTY MECZOWE & TRENINGOWE</h3>
          <p>Profil motoryczno-piłkarski budowany na podstawie realnych statystyk z boiska.</p>
        </div>

        <div className="v200-ovr-card">
          <div className="v200-ovr-value">
            <strong>{ovr}</strong>
            <small>OVR</small>
          </div>
          <div className="v200-playstyle-pill" style={{ borderColor: `${playStyle.color}66`, color: playStyle.color }}>
            <span style={{ backgroundColor: playStyle.color }} />
            {playStyle.title}
          </div>
        </div>
      </div>

      <div className="v200-skill-radar-body">
        {/* SVG Hexagon Radar */}
        <div className="v200-radar-canvas-wrap">
          <svg viewBox="0 0 260 260" className="v200-radar-svg">
            <defs>
              <linearGradient id="v200RadarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f6c952" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#ff202b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#991b1b" stopOpacity="0.65" />
              </linearGradient>
              <radialGradient id="v200CenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f6c952" stopOpacity="0.25" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <filter id="v200GlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Central Ambient Glow */}
            <circle cx={cx} cy={cy} r={maxR} fill="url(#v200CenterGlow)" />

            {/* Axis Spoke Lines */}
            {Array.from({ length: 6 }).map((_, i) => {
              const { x, y } = getCoordinates(i, 1.0);
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2,2" />;
            })}

            {/* Background Hexagon Grids */}
            {gridPolygons.map((points, idx) => (
              <polygon
                key={idx}
                points={points}
                fill={idx === 3 ? "rgba(255,255,255,0.02)" : "none"}
                stroke="rgba(246,201,82,0.14)"
                strokeWidth={idx === 3 ? "1.5" : "1"}
              />
            ))}

            {/* Player Stats Polygon Shape */}
            <polygon
              points={polygonPoints}
              fill="url(#v200RadarGrad)"
              stroke="#f6c952"
              strokeWidth="2.5"
              strokeLinejoin="round"
              filter="url(#v200GlowFilter)"
            />

            {/* Vertices Dots */}
            {attributes.map((attr, i) => {
              const ratio = 0.25 + ((attr.val - 50) / 50) * 0.75;
              const { x, y } = getCoordinates(i, Math.min(1.0, Math.max(0.2, ratio)));
              return (
                <g key={attr.key}>
                  <circle cx={x} cy={y} r="5" fill="#f6c952" stroke="#090b10" strokeWidth="2" />
                  <circle cx={x} cy={y} r="2.2" fill="#ffffff" />
                </g>
              );
            })}

            {/* Vertex Labels */}
            {attributes.map((attr, i) => {
              const { x, y } = getCoordinates(i, 1.22);
              return (
                <text
                  key={attr.key}
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className="v200-radar-axis-text"
                >
                  {attr.shortLabel}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Attribute Breakdown Cards */}
        <div className="v200-skill-metrics-grid">
          {attributes.map((attr) => {
            const Icon = attr.icon;
            return (
              <div className="v200-skill-metric-item" key={attr.key}>
                <div className="v200-skill-metric-top">
                  <span className="v200-skill-metric-icon">
                    <Icon size={14} />
                  </span>
                  <span className="v200-skill-metric-label">{attr.label}</span>
                  <b className="v200-skill-metric-val">{attr.val}</b>
                </div>
                <div className="v200-skill-progress-bar">
                  <div
                    className="v200-skill-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.max(10, ((attr.val - 50) / 50) * 100))}%`,
                    }}
                  />
                </div>
                <small className="v200-skill-metric-desc">{attr.desc}</small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
