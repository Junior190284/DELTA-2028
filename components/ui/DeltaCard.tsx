"use client";

import React from "react";

export type DeltaCardVariant =
  | "default"
  | "elevated"
  | "interactive"
  | "gold"
  | "crimson"
  | "glass";

export type DeltaCardPadding = "none" | "sm" | "md" | "lg";

export interface DeltaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: DeltaCardVariant;
  padding?: DeltaCardPadding;
  glow?: boolean;
}

export const DeltaCard = React.forwardRef<HTMLDivElement, DeltaCardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      glow = false,
      className = "",
      style,
      onClick,
      ...props
    },
    ref
  ) => {
    const isInteractive = variant === "interactive" || Boolean(onClick);

    const baseStyles =
      "relative rounded-2xl transition-all duration-200 overflow-hidden box-border";

    const variantStyles: Record<DeltaCardVariant, string> = {
      default:
        "bg-[#0f1117] border border-white/8 text-slate-100 shadow-md",
      elevated:
        "bg-[#161922] border border-white/12 text-slate-100 shadow-xl",
      interactive:
        "bg-[#0f1117] hover:bg-[#161922] border border-white/8 hover:border-amber-400/40 text-slate-100 shadow-md hover:shadow-amber-950/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
      gold:
        "bg-gradient-to-br from-amber-950/25 via-[#12151e] to-[#0a0d13] border border-amber-500/30 text-slate-100 shadow-lg shadow-amber-950/30",
      crimson:
        "bg-gradient-to-br from-red-950/25 via-[#12151e] to-[#0a0d13] border border-red-500/30 text-slate-100 shadow-lg shadow-red-950/30",
      glass:
        "bg-[#0f1117]/80 backdrop-blur-md border border-white/10 text-slate-100 shadow-lg",
    };

    const paddingStyles: Record<DeltaCardPadding, string> = {
      none: "p-0",
      sm: "p-3",
      md: "p-4 sm:p-5",
      lg: "p-6 sm:p-8",
    };

    const glowStyle = glow
      ? variant === "gold"
        ? "shadow-[0_0_24px_rgba(245,158,11,0.25)]"
        : variant === "crimson"
        ? "shadow-[0_0_24px_rgba(220,38,38,0.25)]"
        : "shadow-[0_0_20px_rgba(255,255,255,0.08)]"
      : "";

    return (
      <div
        ref={ref}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.(e as any);
                }
              }
            : undefined
        }
        className={`delta-card delta-card-${variant} delta-card-pad-${padding} ${glow ? "delta-card-glow" : ""} ${isInteractive ? "delta-card-interactive" : ""} ${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${glowStyle} ${className}`.trim()}
        style={{
          fontFamily: "var(--delta-font-sans, Inter, sans-serif)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DeltaCard.displayName = "DeltaCard";
export default DeltaCard;
