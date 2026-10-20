import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { ToolSeoSections } from "@/components/tools/tool-seo-sections";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { absoluteUrl, noIndex } from "@/config/site";
import { getTool, tools } from "@/config/tools";
import { getToolSeo } from "@/config/tool-seo";

type ToolPageProps = {
  params: Promise<{ tool: string }>;
};

export function generateStaticParams() {
  return tools.map((tool) => ({ tool: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = getTool(slug);
  const seo = getToolSeo(slug);

  if (!tool || !seo) {
    return { robots: noIndex };
  }

  const url = absoluteUrl(`/tools/${tool.slug}`);

  return {
    title: seo.pageTitle,
    description: seo.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: seo.pageTitle,
      description: seo.metaDescription,
      url,
      siteName: "PDFForge",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: seo.pageTitle,
      description: seo.metaDescription,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { tool: slug } = await params;
  const tool = getTool(slug);
  const seo = getToolSeo(slug);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  if (!tool || !seo) {
    notFound();
  }

  return (
    <PageShell>
      <main
        className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-12"
        id="main-content"
      >
        <div
          aria-hidden="true"
          className="reframe-grid-bg pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_10%,#000_60%,transparent_100%)] opacity-40"
        />

        <div className="mx-auto max-w-5xl">
          {/* Breadcrumb pill */}
          <nav
            aria-label="Breadcrumb"
            className="border-border/80 inline-flex items-center rounded-full border bg-white/90 px-3.5 py-1 text-xs text-zinc-500 shadow-2xs backdrop-blur-xs"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link className="hover:text-primary transition-colors" href="/">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  className="hover:text-primary transition-colors"
                  href="/tools"
                >
                  {tool.category}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-semibold text-zinc-950">
                {tool.title}
              </li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                Local {tool.category} Tool
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                {tool.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
                {seo.intro}
              </p>
            </div>

            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 sm:inline-flex">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
              <span>In-Memory Sandbox</span>
            </div>
          </div>

          <div className="border-border/90 mt-8 rounded-3xl border bg-white p-5 shadow-xs sm:p-8">
            <ToolWorkspace tool={tool} />
          </div>

          <ToolSeoSections nonce={nonce} seo={seo} tool={tool} />
        </div>
      </main>
    </PageShell>
  );
}
