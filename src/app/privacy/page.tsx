import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How PDFForge keeps document processing private and local.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Privacy first"
      intro="PDFForge is designed so your documents remain under your control. Tool processing will run inside your browser, not on our servers."
      title="Your files stay with you"
    >
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          What PDFForge does not collect
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6">
          <li>PDF files, images, or generated documents.</li>
          <li>Document text, filenames, metadata, or passwords.</li>
          <li>Accounts, profiles, or payment information.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          Temporary browser data
        </h2>
        <p className="mt-4">
          Future processing tools will use memory and temporary object URLs,
          releasing them after completion, cancellation, replacement, or
          navigation. IndexedDB will only be introduced if a later approved
          feature genuinely needs temporary recovery.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">Your environment</h2>
        <p className="mt-4">
          Your browser, operating system, extensions, and chosen download
          location remain outside PDFForge’s control. Use a trusted device for
          sensitive documents.
        </p>
      </section>
    </ContentPage>
  );
}
