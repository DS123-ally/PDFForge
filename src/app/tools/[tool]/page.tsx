import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { getTool, tools } from "@/config/tools";

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

  if (!tool) return {};

  return { title: tool.title, description: tool.description };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { tool: slug } = await params;
  const tool = getTool(slug);

  if (!tool) notFound();

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
                  {tool.category}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{tool.title}</li>
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            {tool.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
            {tool.description}
          </p>
          <div className="mt-8">
            <ToolWorkspace tool={tool} />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
