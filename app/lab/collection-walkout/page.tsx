import type { Metadata } from "next";
import { CollectionWalkoutLab } from "@/components/collection-3d";

export const metadata: Metadata = {
  title: "DELTA Collection — Universal Walkout Lab (Etap 3)",
  description: "Uniwersalny silnik 12-sekundowego odkrywania kart dla wszystkich kategorii DELTA (COMMON, RARE, GOLD, MATCHDAY, INFERNO, LEGEND)"
};

export default function CollectionWalkoutPage() {
  return (
    <main>
      <CollectionWalkoutLab />
    </main>
  );
}
