import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DELTA 2018 GM",
  description: "Centrum drużyny K.S. Delta Warszawa 2018 Górny Mokotów",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#07090d"
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pl"><body>{children}</body></html>;
}
