import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = {
  title: "Offline support",
  description: "Current and planned offline behavior in PDFForge.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <ContentPage
      eyebrow="Planned capability"
      intro="PDFForge does not claim complete offline support yet. Installable PWA and offline application-shell support are scheduled for a later approved phase."
      title="Offline support is coming later"
    >
      <section className="rounded-2xl border border-zinc-200 p-6">
        <StatusBadge status="pending">Not available yet</StatusBadge>
        <h2 className="mt-5 text-2xl font-bold text-zinc-950">
          What will work offline
        </h2>
        <p className="mt-3">
          Compatible local PDF tools and the application interface will be
          cached. Uploaded documents, generated files, extracted text,
          passwords, and metadata will never be stored in the service-worker
          cache.
        </p>
      </section>
    </ContentPage>
  );
}
