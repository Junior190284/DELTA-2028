import { notFound } from "next/navigation";
import DevPackOpeningV2Page from "@/app/dev/pack-opening-v2/page";

export const dynamic = "force-dynamic";

export default function InfernoStadiumPreviewPage() {
  // The cinematic demo is accessible only on Vercel Preview deployments.
  // In particular, do not expose mock pack/card data on the production site.
  if (process.env.VERCEL_ENV !== "preview") {
    notFound();
  }

  return <DevPackOpeningV2Page />;
}
