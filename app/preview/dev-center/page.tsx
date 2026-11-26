import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/current-profile";
import DevCenterClient from "./DevCenterClient";

export const dynamic = "force-dynamic";

export default async function DevCenterPage() {
  // 1. HARD SECURITY GUARD: Completely forbidden on production environment
  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production";

  if (isProduction) {
    notFound();
  }

  // 2. Session verification
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) {
    redirect("/login?next=/preview/dev-center");
  }

  // 3. Database & Deployment Telemetry (strictly sanitized, zero secrets)
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let maskedDbHost = "Nieznana";
  try {
    const host = new URL(rawUrl).hostname;
    maskedDbHost = host.slice(0, 8) + "..." + host.slice(-12);
  } catch {}

  const isStagingRef = rawUrl.includes("tdlsxamxtygojxhmjjvp");
  const isProdRef = rawUrl.includes("fctgruvciakhohfxkdzp");

  const targetEnv: "PROD_DANGER" | "STAGING_VERIFIED" | "CUSTOM" = isProdRef
    ? "PROD_DANGER"
    : isStagingRef
    ? "STAGING_VERIFIED"
    : "CUSTOM";

  const telemetry = {
    maskedDbHost,
    targetEnv,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "local_dev",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "dpl_preview",
    currentUser: {
      email: user.email || "anon@delta",
      role: profile.role,
      displayName: profile.display_name,
    },
    isolationStatus: isStagingRef
      ? "STAGING_DATA_CONTAINS_REAL_ROSTER"
      : "ISOLATION_UNCONFIRMED",
  };

  return <DevCenterClient telemetry={telemetry} />;
}
