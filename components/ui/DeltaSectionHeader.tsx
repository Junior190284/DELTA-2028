"use client";

import React from "react";

export interface DeltaSectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  kicker?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const DeltaSectionHeader: React.FC<DeltaSectionHeaderProps> = ({
  kicker,
  title,
  subtitle,
  badge,
  action,
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-3 border-b border-white/8 ${className}`.trim()}
      style={{
        fontFamily: "var(--delta-font-sans, Inter, sans-serif)",
        ...style,
      }}
      {...props}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {kicker && (
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-400/90 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
            {kicker}
          </span>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100 m-0">
            {title}
          </h2>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-400 m-0 leading-normal max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
          {action}
        </div>
      )}
    </div>
  );
};

DeltaSectionHeader.displayName = "DeltaSectionHeader";
export default DeltaSectionHeader;
