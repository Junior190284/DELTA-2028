import { notFound } from "next/navigation";
import DevPackOpeningV2Page from "@/app/dev/pack-opening-v2/page";

export const dynamic = "force-dynamic";

export default function InfernoStadiumPreviewPage() {
  // The layout already strictly blocks Vercel production and production domains.
  // Do not expose mock pack/card data on production.
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return <DevPackOpeningV2Page />;
}
