import type { Metadata } from "next";
import { headers } from "next/headers";

import { PageShell } from "@/components/layout/page-shell";
import { WorkspaceApp } from "@/components/tools/workspace-app";
import { noIndex } from "@/config/site";
import { workspaceHashCaptureScript } from "@/lib/privacy/tool-location";

export const metadata: Metadata = {
  title: "Local Workspace — PDFForge Studio",
  description:
    "Run PDFForge tools locally in your browser memory. Selected tools remain in the URL hash and are never transmitted across the network.",
  robots: noIndex,
};

export default async function WorkspacePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <PageShell>
      <script
        dangerouslySetInnerHTML={{ __html: workspaceHashCaptureScript }}
        nonce={nonce}
      />
      <main className="relative min-h-[calc(100vh-140px)] px-5 py-8 sm:px-8 sm:py-12" id="main-content">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 reframe-grid-bg opacity-40 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_10%,#000_60%,transparent_100%)]"
        />
        <div className="mx-auto max-w-5xl">
          <WorkspaceApp />
        </div>
      </main>
    </PageShell>
  );
}
