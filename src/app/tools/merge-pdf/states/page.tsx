import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { ProcessingCard } from "@/components/tools/processing-card";

export const metadata: Metadata = {
  title: "Merge PDF states",
  robots: { index: false, follow: false },
};

export default function MergeStatesPage() {
  return (
    <PageShell>
      <main
        className="bg-zinc-50 px-5 py-14 sm:px-8 sm:py-20"
        id="main-content"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
            UI reference
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Processing and complete states
          </h1>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <ProcessingCard />
            <DownloadResultCard />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
