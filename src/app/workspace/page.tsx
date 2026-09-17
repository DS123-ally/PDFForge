import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { WorkspaceApp } from "@/components/tools/workspace-app";
import { noIndex } from "@/config/site";
import { workspaceHashCaptureScript } from "@/lib/privacy/tool-location";

export const metadata: Metadata = {
  title: "Local workspace",
  description:
    "Run PDFForge tools locally. The selected tool stays in the URL hash and is not sent to the host.",
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
      <main className="px-5 py-10 sm:px-8 sm:py-14" id="main-content">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  className="min-h-11 content-center hover:text-red-600"
                  href="/"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  className="min-h-11 content-center hover:text-red-600"
                  href="/tools"
                >
                  All tools
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Local workspace</li>
            </ol>
          </nav>
          <div className="mt-4">
            <WorkspaceApp />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
