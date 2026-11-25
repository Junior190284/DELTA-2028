import type { Metadata } from "next";
import { CollectionIntegrationLab } from "@/components/collection-3d/CollectionIntegrationLab";

export const metadata: Metadata = {
  title: "DELTA Collection 3D Engine — Safe Integration Preview",
  description: "Pełny przepływ integracji: otwarcie paczki, walkout 3D, szczegóły karty i podgląd kolekcji."
};

export default async function CollectionIntegrationPage({
  searchParams
}: {
  searchParams: Promise<{ step?: string; card?: string; dup?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main>
      <CollectionIntegrationLab
        initialStep={sp?.step as any}
        initialCard={sp?.card}
        initialDup={sp?.dup === "true"}
      />
    </main>
  );
}
