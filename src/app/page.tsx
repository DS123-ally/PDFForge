import type { Metadata } from "next";

import { HomeFeatures } from "@/components/home/home-features";
import { HomeHero } from "@/components/home/home-hero";
import { HomePricing } from "@/components/home/home-pricing";
import { HomeRecipes } from "@/components/home/home-recipes";
import { HomeSolutions } from "@/components/home/home-solutions";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: {
    absolute: "PDFForge — Private In-Browser PDF Studio",
  },
  description:
    "Clean, redact, compress, OCR, convert, and protect PDFs without uploading. PDFForge processes files entirely inside your browser's WebAssembly sandbox.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PageShell>
      <main className="bg-background" id="main-content">
        <HomeHero />
        <HomeSolutions />
        <HomeFeatures />
        <HomeRecipes />
        <HomePricing />
      </main>
    </PageShell>
  );
}
