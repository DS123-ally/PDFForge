import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import Link from "next/link";

import { HomeRecipes } from "@/components/home/home-recipes";
import { PageShell } from "@/components/layout/page-shell";
import { FileUploader } from "@/components/pdf/file-uploader";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { ToolGroups } from "@/components/tools/tool-groups";
import { buttonStyles } from "@/components/ui/button";
import { tools } from "@/config/tools";

const trustPoints = [
  "100% local processing",
  "No signup or tracking",
  "No document uploads",
  "No watermarks",
];

export const metadata: Metadata = {
  title: {
    absolute: "PDFForge — Private PDF tools that stay on this device",
  },
  description:
    "Clean, redact, and share PDFs without uploading. PDFForge processes files in the browser.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PageShell>
      <main id="main-content">
        <section className="px-5 py-10 text-center sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="mx-auto inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold tracking-wide text-red-600 uppercase">
              Private · Local · Free
            </p>
            <h1 className="mx-auto mt-4 max-w-5xl text-4xl leading-[1.08] font-black tracking-tight text-balance sm:text-5xl lg:text-[3.25rem]">
              Clean, redact, and share without uploading.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Merge, edit, convert, and lock PDFs on this device. Nothing is
              sent to a server.
            </p>
            <div className="mx-auto mt-7 max-w-4xl text-left">
              <FileUploader multiple />
            </div>
          </div>
        </section>

        <HomeRecipes />

        <section
          className="px-5 py-14 sm:px-8"
          aria-labelledby="tools-title"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2
                  id="tools-title"
                  className="text-3xl font-black tracking-tight"
                >
                  All PDF tools
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Everything you need, organized for quick access.
                </p>
              </div>
              <Link className={buttonStyles("secondary")} href="/tools">
                Browse all tools
              </Link>
            </div>
            <div className="mt-10">
              <ToolGroups headingLevel="h3" linkHeadings tools={tools} />
            </div>
          </div>
        </section>

        <section
          className="px-5 py-16 sm:px-8 sm:py-20"
          aria-labelledby="privacy-title"
        >
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <h2
                id="privacy-title"
                className="text-3xl font-black tracking-tight sm:text-4xl"
              >
                Your documents never leave your device
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-zinc-600">
                PDFForge processes files inside your browser. There are no
                accounts, server-side document storage, watermarks, or hidden
                limits.
              </p>
              <div className="mt-6 max-w-2xl">
                <PrivacyNotice />
              </div>
            </div>
            <div>
              <ul className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                {trustPoints.map((point) => (
                  <li
                    className="flex min-h-11 items-center gap-3 text-sm font-semibold"
                    key={point}
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-5 text-emerald-600"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
