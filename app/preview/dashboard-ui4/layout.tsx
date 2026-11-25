import React from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { evaluatePreviewAccess } from "./preview-guard";

export const dynamic = "force-dynamic";

/**
 * DELTA-016: Simplified Layout Guard for /preview/dashboard-ui4
 * - Strictly returns HTTP 404 on Production environments and production domains.
 * - Permits rendering in Preview and local development.
 * - Protection from unauthorized public internet users is delegated to native
 *   Vercel Deployment Protection (Vercel Authentication) at the edge.
 * - Does not require custom secret headers or browser cookies from reviewers.
 */
export default async function DashboardUI4Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    "";

  const decision = evaluatePreviewAccess({
    host,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  });

  if (!decision.allowed) {
    notFound();
  }

  return <>{children}</>;
}
