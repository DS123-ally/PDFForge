import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { ToolCard } from "@/components/tools/tool-card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { absoluteUrl } from "@/config/site";
import type { ToolDefinition } from "@/config/tools";
import type { ToolSeoContent } from "@/config/tool-seo";
import { getRelatedTools } from "@/config/tool-seo";
import { buildToolJsonLd } from "@/lib/seo/json-ld";

export function ToolSeoSections({
  nonce,
  seo,
  tool,
}: {
  nonce?: string;
  seo: ToolSeoContent;
  tool: ToolDefinition;
}) {
  const related = getRelatedTools(tool.slug);
  const canonical = absoluteUrl(`/tools/${tool.slug}`);

  return (
    <div className="mt-12 space-y-8 text-base leading-7 text-zinc-700">
      <JsonLd data={buildToolJsonLd({ canonical, seo, tool })} nonce={nonce} />

      <GlassPanel>
        <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
          How it works
        </p>
        <h2 className="mt-3 text-2xl font-bold text-zinc-950">
          How {tool.title} works
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-600">{seo.intro}</p>
      </GlassPanel>

      <GlassPanel>
        <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
          Guided steps
        </p>
        <h2 className="mt-3 text-2xl font-bold text-zinc-950">
          How to use {tool.title}
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {seo.steps.map((step, index) => (
            <li
              className="flex gap-4 rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-md"
              key={step}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-red-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-1.5 leading-7 text-zinc-700">{step}</span>
            </li>
          ))}
        </ol>
      </GlassPanel>

      <GlassPanel>
        <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
          Questions
        </p>
        <h2 className="mt-3 text-2xl font-bold text-zinc-950">
          {tool.title} FAQs
        </h2>
        <div className="mt-6 space-y-3">
          {seo.faqs.map((faq) => (
            <details
              className="group rounded-2xl border border-white/70 bg-white/35 p-4 backdrop-blur-md open:bg-white/55"
              key={faq.question}
            >
              <summary className="cursor-pointer list-none font-bold text-zinc-950 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/80 bg-white/70 text-lg leading-none text-red-600 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 pr-11 leading-7 text-zinc-700">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </GlassPanel>

      {related.length > 0 ? (
        <GlassPanel>
          <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
            Continue locally
          </p>
          <h2 className="mt-3 text-2xl font-bold text-zinc-950">
            Related tools
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-zinc-600">
            Stay in the browser with these nearby PDFForge tools.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {related.map((relatedTool) => (
              <li key={relatedTool.slug}>
                <ToolCard className="h-full border-white/70 bg-white/40 hover:bg-white/70" tool={relatedTool} />
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm">
            <Link
              className="font-semibold text-red-700 hover:underline"
              href="/tools"
            >
              Browse all tools
            </Link>
          </p>
        </GlassPanel>
      ) : null}
    </div>
  );
}
