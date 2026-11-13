/**
 * DELTA INFERNO 2.0 — DESIGN TOKENS (TYPESCRIPT)
 * Central type-safe token references for UI components
 */

export const DELTA_COLORS = {
  canvas: "#07080b",
  canvasSubtle: "#0b0d13",
  surface1: "#0f1117",
  surface2: "#161922",
  surface3: "#1f2330",
  surfaceHover: "#262c3d",
  crimson: {
    primary: "#dc2626",
    hover: "#ef4444",
    active: "#b91c1c",
    subtle: "rgba(220, 38, 38, 0.14)",
    border: "rgba(220, 38, 38, 0.35)",
  },
  gold: {
    primary: "#f59e0b",
    hover: "#fbbf24",
    active: "#d97706",
    subtle: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  text: {
    primary: "#f8fafc",
    secondary: "#94a3b8",
    muted: "#64748b",
    inverse: "#07080b",
  },
  status: {
    success: "#10b981",
    info: "#3b82f6",
    warning: "#f59e0b",
    danger: "#ef4444",
  }
} as const;

export const DELTA_LAYOUT = {
  touchMinPx: 44,
  touchOptimalPx: 48,
  radii: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "18px",
    full: "9999px",
  }
} as const;
