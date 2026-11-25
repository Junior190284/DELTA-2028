import type { Metadata } from "next";
import { InfernoCardPreview } from "@/components/inferno-3d";

export const metadata: Metadata = {
  title: "DELTA 2018 GM — INFERNO 3D Preview Lab",
  description: "Interaktywny podgląd i edytor karty kolekcjonerskiej DELTA INFERNO 3D Cinematic V3"
};

export default function InfernoCardLabPage() {
  return (
    <main>
      <InfernoCardPreview />
    </main>
  );
}
