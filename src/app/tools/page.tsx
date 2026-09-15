import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { ToolDirectory } from "@/components/tools/tool-directory";

export const metadata: Metadata = {
  title: "All local PDF tools",
  description:
    "Browse every finished PDFForge tool. Each one processes documents in your browser without uploading files.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return (
    <PageShell>
      <main className="px-5 py-14 sm:px-8 sm:py-20" id="main-content">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
            Private browser tools
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            All PDF tools
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
            Find the right tool without uploading your documents or creating an
            account. Public tool pages are indexed for search; a hash workspace
            remains available if you prefer not to send the tool name to the
            host.
          </p>
          <div className="mt-10">
            <ToolDirectory />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
