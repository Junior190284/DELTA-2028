"use client";

import React from "react";

export type DeltaSkeletonVariant = "text" | "rectangular" | "circular" | "card";

export interface DeltaSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: DeltaSkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const DeltaSkeleton: React.FC<DeltaSkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  lines = 1,
  className = "",
  style,
  ...props
}) => {
  const baseShimmer =
    "relative overflow-hidden bg-slate-900/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/8 before:to-transparent";

  if (variant === "text" && lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`} style={{ width }} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseShimmer} rounded-md h-4 ${
              i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
            }`}
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-white/8 bg-[#0f1117] p-5 flex flex-col gap-4 ${className}`}
        style={{ width, height }}
        {...props}
      >
        <div className="flex items-center gap-3">
          <div className={`${baseShimmer} h-12 w-12 rounded-full shrink-0`} />
          <div className="flex flex-col gap-2 flex-1">
            <div className={`${baseShimmer} h-4 w-3/4 rounded-md`} />
            <div className={`${baseShimmer} h-3 w-1/2 rounded-md`} />
          </div>
        </div>
        <div className={`${baseShimmer} h-24 rounded-xl w-full`} />
        <div className="flex justify-between items-center pt-2">
          <div className={`${baseShimmer} h-6 w-20 rounded-full`} />
          <div className={`${baseShimmer} h-8 w-24 rounded-xl`} />
        </div>
      </div>
    );
  }

  const variantStyles: Record<DeltaSkeletonVariant, string> = {
    text: "h-4 w-full rounded-md",
    rectangular: "rounded-xl",
    circular: "rounded-full shrink-0",
    card: "",
  };

  return (
    <div
      className={`${baseShimmer} ${variantStyles[variant]} ${className}`.trim()}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

DeltaSkeleton.displayName = "DeltaSkeleton";
export default DeltaSkeleton;
