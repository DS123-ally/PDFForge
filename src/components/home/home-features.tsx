import { ArrowRight, ChevronRight, Layers } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { directoryGroups, tools, type ToolCategory } from "@/config/tools";
import {
  getToolHref,
  getToolsCategoryHref,
} from "@/lib/privacy/tool-location";

const categoryCopy: Record<ToolCategory, string> = {
  Business: "Generate GST invoices and supply bills client-side with compliance formatting.",
  Convert: "Convert scans, Office formats, images, CSV tables, Markdown, and HTML.",
  Edit: "Rotate, crop, watermark, add page numbers, headers, and footers.",
  Organize: "Merge, split, compress, repair corrupted trees, and reorder pages.",
  Privacy: "Find hidden metadata, strip author traces, and extract pure text layers.",
  Security: "Redact PII, flatten interactive forms, lock and unlock with AES-256.",
};

export function HomeFeatures() {
  return (
    <section
      aria-labelledby="tools-title"
      className="border-t border-border/80 bg-zinc-50/50 px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Toolkit"
          id="tools-title"
          title="25+ Modular tools designed for high precision"
        >
          Execute complex document operations directly in your browser without switching between disconnected utilities.
        </SectionHeading>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {directoryGroups.map((category) => {
            const group = tools.filter((tool) => tool.category === category);

            return (
              <div
                className="group flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs"
                key={category}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-950">
                      <Link
                        className="hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                        href={getToolsCategoryHref(category)}
                      >
                        {category}
                      </Link>
                    </h3>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                      {group.length} tools
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {categoryCopy[category]}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {group.slice(0, 4).map((tool) => (
                      <Link
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50/70 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white hover:text-zinc-950"
                        href={getToolHref(tool.slug)}
                        key={tool.slug}
                      >
                        <span>{tool.title}</span>
                      </Link>
                    ))}
                    {group.length > 4 ? (
                      <Link
                        className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
                        href={getToolsCategoryHref(category)}
                      >
                        <span>+{group.length - 4} more</span>
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <Link
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 group-hover:text-primary transition-colors"
                    href={getToolsCategoryHref(category)}
                  >
                    <span>Browse all {category} tools</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-xs font-semibold text-zinc-900 shadow-2xs transition-all hover:bg-zinc-50 hover:shadow-xs"
            href="/tools"
          >
            <Layers className="size-3.5 text-zinc-500" />
            <span>View Full Directory of All Tools</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
