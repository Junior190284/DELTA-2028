import type { Metadata } from "next";
import { InfernoStadiumStage } from "@/components/inferno-3d";

export const metadata: Metadata = {
  title: "DELTA 2018 GM — INFERNO Stadium Stage V1",
  description: "Cinematic Football Stadium Showroom z interaktywną kartą INFERNO 3D, paralaksą i wolumetrycznymi reflektorami"
};

export default function InfernoStagePage() {
  return (
    <main>
      <InfernoStadiumStage />
    </main>
  );
}
