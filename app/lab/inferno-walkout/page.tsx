import type { Metadata } from "next";
import { InfernoWalkoutLab } from "@/components/inferno-3d";

export const metadata: Metadata = {
  title: "DELTA 2018 GM — INFERNO Walkout Lab V1",
  description: "Interaktywna, 12-sekundowa animacja odkrywania karty DELTA INFERNO 3D"
};

export default function InfernoWalkoutPage() {
  return (
    <main>
      <InfernoWalkoutLab />
    </main>
  );
}
