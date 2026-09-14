import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How PDFForge processes PDFs locally, what is never collected, and how temporary browser data is cleared.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Privacy policy"
      intro="PDFForge is a local-only PDF utility. Document bytes, extracted text, metadata, filenames, and passwords stay on your device. This policy describes the actual product behaviour as of 14 September 2026."
      title="Your files stay on this device"
    >
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          What we do not collect
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6">
          <li>PDF files, images, generated downloads, or ZIP archives.</li>
          <li>Document text, thumbnails, metadata, filenames, or passwords.</li>
          <li>
            Accounts, profiles, cookies for tracking, or payment information.
          </li>
          <li>
            Analytics events, advertising identifiers, or error reports that
            contain file content.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          How processing works
        </h2>
        <p className="mt-4">
          Tools run inside this browser tab and a same-origin Web Worker. Files
          are read with the browser File API, processed in memory, and saved
          through a local download. There is no document upload API and no
          server-side document store.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          Temporary browser data
        </h2>
        <p className="mt-4">
          Previews use short-lived object URLs. Those URLs, worker jobs, and
          in-memory buffers are released when you clear files, finish or cancel
          a job, leave the page, or close the tab. IndexedDB, localStorage, and
          sessionStorage are not used for documents. The service worker may
          cache the public app shell and hashed static assets only.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          Service worker cache
        </h2>
        <p className="mt-4">
          PDFForge never caches uploaded documents, generated files, extracted
          text, passwords, or PDF/ZIP responses. Navigations are fetched from
          the network when available. If the network is unavailable, the
          precached shell and <Link href="/offline">offline page</Link> can
          still load.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">Hosting and logs</h2>
        <p className="mt-4">
          Tool choice is kept in the URL hash (`/workspace#merge-pdf`). Browsers
          do not send that hash to the host, so access logs see `/workspace` or
          `/tools`, not which tool you opened. Those requests still never
          include your documents. PDFForge application code does not log
          filenames, document text, metadata, or passwords.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">Browser extensions</h2>
        <p className="mt-4">
          A per-request Content-Security-Policy nonce blocks page scripts that
          are not issued by PDFForge. If an extension still injects
          extension-scheme resources, PDFForge shows a warning. Use a clean
          browser profile without extensions for sensitive files.
        </p>
      </section>
    </ContentPage>
  );
}
