import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn why PDFForge is building practical, local-first PDF tools.",
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
          Complex encryption, permanent redaction, OCR, and high-fidelity Office
          conversion will not be advertised until an entirely local
          implementation can be verified.
        </p>
      </section>
    </ContentPage>
  );
}
