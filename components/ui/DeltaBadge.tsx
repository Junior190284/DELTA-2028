"use client";

import React from "react";

export type DeltaBadgeVariant =
  | "default"
  | "crimson"
  | "gold"
  | "success"
  | "live"
  | "muted";

export type DeltaBadgeSize = "sm" | "md";

export interface DeltaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: DeltaBadgeVariant;
  size?: DeltaBadgeSize;
  dot?: boolean;
}

export const DeltaBadge = React.forwardRef<HTMLSpanElement, DeltaBadgeProps>(
  (
    {
      children,
      variant = "default",
      size = "md",
      dot = false,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full select-none";

    const variantStyles: Record<DeltaBadgeVariant, string> = {
      default: "bg-white/8 text-slate-200 border border-white/12",
      crimson: "bg-red-500/15 text-red-300 border border-red-500/30",
      gold: "bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
      success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
      live: "bg-red-950/70 text-red-100 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.35)]",
      muted: "bg-slate-900/60 text-slate-400 border border-white/6",
    };

    const sizeStyles: Record<DeltaBadgeSize, string> = {
      sm: "text-[10px] px-2 py-0.5",
      md: "text-xs px-2.5 py-1",
    };

    const dotColor: Record<DeltaBadgeVariant, string> = {
      default: "bg-slate-400",
      crimson: "bg-red-400",
      gold: "bg-amber-400",
      success: "bg-emerald-400",
      live: "bg-red-500 animate-ping",
      muted: "bg-slate-500",
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim()}
        style={{
          fontFamily: "var(--delta-font-sans, Inter, sans-serif)",
          ...style,
        }}
        {...props}
      >
        {dot && (
          <span className="relative flex h-2 w-2 items-center justify-center">
            {variant === "live" && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            )}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor[variant]}`} />
          </span>
        )}
        {children}
      </span>
    );
  }
);

DeltaBadge.displayName = "DeltaBadge";
export default DeltaBadge;
