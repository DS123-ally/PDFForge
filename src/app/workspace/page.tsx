import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { WorkspaceApp } from "@/components/tools/workspace-app";

export const metadata: Metadata = {
  title: "Local workspace",
  description:
    "Run PDFForge tools locally. The selected tool stays in the URL hash and is not sent to the host.",
};

export default function WorkspacePage() {
  return (
    <PageShell>
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
