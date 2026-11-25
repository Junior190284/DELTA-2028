"use client";

import React from "react";
import { DeltaButton, type DeltaButtonVariant } from "./DeltaButton.tsx";

export type DeltaEmptyStateVariant = "default" | "gold" | "compact";

export interface DeltaEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: DeltaButtonVariant;
  };
  variant?: DeltaEmptyStateVariant;
}

export const DeltaEmptyState: React.FC<DeltaEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = "default",
  className = "",
  style,
  ...props
}) => {
  const isCompact = variant === "compact";

  const iconFrameStyles: Record<DeltaEmptyStateVariant, string> = {
    default:
      "bg-slate-900 border border-white/10 text-slate-300 shadow-inner",
    gold:
      "bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    compact:
      "bg-slate-900 border border-white/10 text-slate-400",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-white/8 bg-[#0b0e14]/90 ${
        isCompact ? "p-6 gap-3" : "p-8 sm:p-12 gap-5"
      } ${className}`.trim()}
      style={{
        fontFamily: "var(--delta-font-sans, Inter, sans-serif)",
        ...style,
      }}
      {...props}
    >
      {icon && (
        <div
          className={`flex items-center justify-center rounded-2xl ${
            isCompact ? "w-12 h-12" : "w-16 h-16"
          } ${iconFrameStyles[variant]}`}
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col items-center max-w-md gap-1.5">
        <h4 className={`font-black text-slate-100 ${isCompact ? "text-base" : "text-lg sm:text-xl"}`}>
          {title}
        </h4>
        {description && (
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="pt-2">
          <DeltaButton
            variant={action.variant || (variant === "gold" ? "gold" : "primary")}
            onClick={action.onClick}
            icon={action.icon}
            touchTarget={true}
          >
            {action.label}
          </DeltaButton>
        </div>
      )}
    </div>
  );
};

DeltaEmptyState.displayName = "DeltaEmptyState";
export default DeltaEmptyState;
