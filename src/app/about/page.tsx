import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "About local-first PDF tools",
  description:
    "Learn why PDFForge is building practical, local-first PDF tools that run in the browser.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About PDFForge"
      intro="PDFForge is being built for students, professionals, and small businesses that need dependable PDF tools without giving up document privacy."
      title="Practical PDF tools without the baggage"
    >
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">How it works</h2>
        <p className="mt-4">
          You choose a tool and select files from your device. Supported
          operations run in browser workers, then PDFForge creates a temporary
          local download. There is no account, cloud library, or server document
          queue.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          Built in careful stages
        </h2>
        <p className="mt-4">
          Reliability comes before tool count. Shared validation, rendering,
          processing, cleanup, accessibility, and privacy checks are completed
          before individual tools are released.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">Honest limitations</h2>
        <p className="mt-4">
          PDFForge still cannot reconstruct every PDF feature. Rewrites can drop
          digital signatures, tags, and uncommon annotations. Office export and
          Extract Text use the text layer first, then on-device English OCR for
          pages with no selectable text — they are not a desktop publisher. Some
          AES-128 files unlock only as images. Redaction rasterizes pages.
          Strong compression, accounts, and cloud storage are not offered.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">Supported browsers</h2>
        <p className="mt-4">
          PDFForge is tested in current Chromium, Firefox, and WebKit engines on
          desktop, with a phone-width layout check. Use a current Chrome, Edge,
          Firefox, or Safari release. Processing still depends on the memory and
          PDF support of the device in use.
        </p>
      </section>
    </ContentPage>
  );
}
