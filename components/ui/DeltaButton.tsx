"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type DeltaButtonVariant =
  | "primary"
  | "gold"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type DeltaButtonSize = "sm" | "md" | "lg";

export interface DeltaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DeltaButtonVariant;
  size?: DeltaButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  touchTarget?: boolean;
}

export const DeltaButton = React.forwardRef<HTMLButtonElement, DeltaButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      icon,
      iconPosition = "left",
      touchTarget = true,
      disabled = false,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    // Style bazowy z tokenami DELTA 2.0
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 rounded-xl cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080b]";

    // Warianty kolorystyczne
    const variantStyles: Record<DeltaButtonVariant, string> = {
      primary:
        "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-950/40 border border-red-500/30",
      gold:
        "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-950/40 border border-amber-300/40",
      secondary:
        "bg-[#161922] hover:bg-[#1f2330] text-slate-100 border border-white/10 hover:border-white/20 shadow-md",
      outline:
        "bg-transparent hover:bg-white/5 text-slate-200 border border-white/15 hover:border-amber-400/50 hover:text-amber-300",
      ghost:
        "bg-transparent hover:bg-white/8 text-slate-300 hover:text-white border border-transparent",
      danger:
        "bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-500/40 shadow-sm",
    };

    // Rozmiary
    const sizeStyles: Record<DeltaButtonSize, string> = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3.5 gap-2.5",
    };

    // Dotykowy minimalny rozmiar (WCAG 44x44px)
    const touchStyles = touchTarget ? "min-h-[44px] min-w-[44px]" : "";
    const widthStyle = fullWidth ? "w-full" : "";
    const stateStyles = (disabled || isLoading)
      ? "opacity-55 cursor-not-allowed pointer-events-none active:scale-100"
      : "";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${touchStyles} ${widthStyle} ${stateStyles} ${className}`.trim()}
        style={{
          fontFamily: "var(--delta-font-sans, Inter, sans-serif)",
          ...style,
        }}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
            <span>Ładowanie…</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
            )}
            {children && <span>{children}</span>}
            {icon && iconPosition === "right" && (
              <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

DeltaButton.displayName = "DeltaButton";
export default DeltaButton;
