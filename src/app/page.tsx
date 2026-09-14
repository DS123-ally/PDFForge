import { CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { ToolCard } from "@/components/tools/tool-card";
import { buttonStyles } from "@/components/ui/button";
import { tools } from "@/config/tools";

const FileUploader = dynamic(
  () =>
    import("@/components/pdf/file-uploader").then((mod) => ({
      default: mod.FileUploader,
    })),
  {
    loading: () => (
      <div
        className="min-h-52 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-600"
        role="status"
      >
        Loading local file picker
      </div>
    ),
  },
);

const trustPoints = [
  "100% local processing",
  "No signup or tracking",
  "No document uploads",
  "No watermarks",
];

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
              Edit PDFs directly in your browser. No uploads. No signups. No
              nonsense.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Simple PDF tools that process documents locally on your device.
            </p>
            <div className="mx-auto mt-7 max-w-4xl text-left">
              <FileUploader multiple />
            </div>
          </div>
        </section>

        <section
          className="bg-zinc-50 px-5 py-14 sm:px-8"
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
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.slice(0, 4).map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
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
            <ul className="rounded-2xl border border-zinc-200 p-6 shadow-sm">
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
        </section>
      </main>
    </PageShell>
  );
}
