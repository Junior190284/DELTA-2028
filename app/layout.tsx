import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DELTA 2018 GM",
  description: "Centrum drużyny K.S. Delta Warszawa 2018 Górny Mokotów",
  manifest: "/manifest.webmanifest",
  applicationName: "DELTA 2018 GM",
  appleWebApp: {
    capable: true,
    title: "DELTA 2018 GM",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/icons/delta-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/delta-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/icons/delta-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/delta-48.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#07090d"
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pl"><body>{children}</body></html>;
}
