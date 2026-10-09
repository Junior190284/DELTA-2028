import { notFound } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  // Strict production blocker: /dev/* routes are entirely unavailable in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <>{children}</>;
}
