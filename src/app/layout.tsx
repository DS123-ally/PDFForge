import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PDFForge — Private PDF tools",
    template: "%s | PDFForge",
  },
  description:
    "Free, privacy-first PDF tools that process your files locally in the browser.",
  applicationName: "PDFForge",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ef2f2f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
