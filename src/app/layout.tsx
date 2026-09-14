import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PrivacyCleanupProvider } from "@/components/privacy/privacy-cleanup-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PDFForge — Private PDF tools",
    template: "%s | PDFForge",
  },
  description:
    "Free, privacy-first PDF tools that process your files locally in the browser.",
  applicationName: "PDFForge",
  referrer: "no-referrer",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PDFForge",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ef2f2f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <PrivacyCleanupProvider />
        <PwaProvider />
      </body>
    </html>
  );
}
