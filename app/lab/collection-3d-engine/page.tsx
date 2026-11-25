import type { Metadata } from "next";
import { Collection3DEngineLab } from "@/components/collection-3d";

export const metadata: Metadata = {
  title: "DELTA Collection 3D Engine — Showroom Lab",
  description: "Uniwersalny silnik kart 3D dla wszystkich kategorii kart DELTA (COMMON, RARE, GOLD, MATCHDAY, INFERNO, LEGEND)"
};

export default function Collection3DEngineLabPage() {
  return (
    <main>
      <Collection3DEngineLab />
    </main>
  );
}
