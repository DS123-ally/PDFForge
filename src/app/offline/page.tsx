import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = {
  title: "Offline",
  description:
    "Use PDFForge’s application shell when your network is unavailable.",
};

export default function OfflinePage() {
  return (
    <ContentPage
      eyebrow="Offline"
      intro="PDFForge can keep the app shell available without a network. Document bytes, generated files, extracted text, passwords, and metadata are never stored in the service-worker cache."
      title="You can keep using the PDFForge shell"
    >
      <section className="rounded-2xl border border-zinc-200 p-6">
        <StatusBadge status="ready">App shell ready</StatusBadge>
        <h2 className="mt-5 text-2xl font-bold text-zinc-950">
          What works offline
        </h2>
        <p className="mt-3">
          After a first visit, Home, All Tools, Privacy, About, and previously
          opened tool pages can load from the local app shell. Compatible tools
          still process files in this browser tab.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          What is never cached
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6">
          <li>Uploaded PDFs or images</li>
          <li>Generated downloads</li>
          <li>Extracted document text</li>
          <li>Passwords</li>
          <li>Sensitive document metadata</li>
        </ul>
      </section>
    </ContentPage>
  );
}
