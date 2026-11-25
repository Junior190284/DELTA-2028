export interface PreviewAccessContext {
  host: string;
  vercelEnv?: string;
  nodeEnv?: string;
}

export type PreviewAccessDecision =
  | { allowed: false; reason: "production_blocked"; statusCode: 404 }
  | { allowed: true; reason: "local_dev"; statusCode: 200 }
  | { allowed: true; reason: "preview_environment"; statusCode: 200 };

/**
 * DELTA-016: Simplified Preview Guard Architecture.
 * - Application layer enforces strict 404 on Production environments and production hostnames.
 * - Local development remains fully functional.
 * - In Remote Preview (VERCEL_ENV === "preview"), the application allows rendering,
 *   relying on native Vercel Deployment Protection (Vercel Authentication) at the edge.
 * - Does NOT require custom in-app tokens or secret headers in user browsers.
 */
export function evaluatePreviewAccess(ctx: PreviewAccessContext): PreviewAccessDecision {
  const host = (ctx.host || "").toLowerCase();

  // 1. Strict Production Guard (Always returns HTTP 404 on Production)
  const isVercelProduction = ctx.vercelEnv === "production";
  const isProductionHost =
    host.includes("gm2018.pl") ||
    host === "delta-2028.vercel.app";

  if (isVercelProduction || isProductionHost) {
    return { allowed: false, reason: "production_blocked", statusCode: 404 };
  }

  // 2. Local Development Guard (strictly for loopback / local dev machines)
  const isLocalHost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.");

  if (isLocalHost) {
    return { allowed: true, reason: "local_dev", statusCode: 200 };
  }

  // 3. Remote Preview Environment
  // Protection against unauthorized public access is delegated to native
  // Vercel Deployment Protection (Vercel Authentication) at the edge.
  return { allowed: true, reason: "preview_environment", statusCode: 200 };
}
