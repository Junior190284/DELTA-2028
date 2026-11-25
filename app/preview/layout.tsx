import { notFound } from "next/navigation";
import { headers } from "next/headers";
import React from "react";

export const dynamic = "force-dynamic";

/**
 * Preview Layout Guard
 * Strictly blocks access on Production environments and production domains.
 * Returns HTTP 404 if accessed anywhere outside of isolated Preview or local dev.
 */
export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Strict Production Environment Blocker (Vercel Production)
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  // 2. Strict Production Domain Blocker
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const isProductionHost =
    host.includes("gm2018.pl") ||
    host === "delta-2028.vercel.app";

  if (isProductionHost) {
    notFound();
  }

  return <>{children}</>;
}
