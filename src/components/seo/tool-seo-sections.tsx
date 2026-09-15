import Link from "next/link";

import { ToolCard } from "@/components/tools/tool-card";
import type { ToolDefinition } from "@/config/tools";
import type { ToolSeo } from "@/config/tool-seo";

export function ToolSeoSections({
  relatedTools,
  seo,
  tool,
}: {
  relatedTools: ToolDefinition[];
  seo: ToolSeo;
  tool: ToolDefinition;
}) {
  return (
    <div className="mt-16 space-y-12 border-t border-zinc-200 pt-12">
      <section aria-labelledby="how-it-works">
        <h2
          className="text-2xl font-bold tracking-tight text-zinc-950"
          id="how-it-works"
        >
          How {tool.title} works
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700">
          {seo.explanation}
        </p>
      </section>
      <section aria-labelledby="how-to">
        <h2
          className="text-2xl font-bold tracking-tight text-zinc-950"
          id="how-to"
        >
          How to use {tool.title}
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-base leading-7 text-zinc-700">
          {seo.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="faq">
        <h2
          className="text-2xl font-bold tracking-tight text-zinc-950"
          id="faq"
        >
          {tool.title} FAQs
        </h2>
        <div className="mt-4 space-y-3">
          {seo.faqs.map((faq) => (
            <details
              className="rounded-2xl border border-zinc-200 bg-white p-4"
              key={faq.question}
            >
              <summary className="cursor-pointer text-base font-semibold text-zinc-950">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-6 text-zinc-700">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
      {relatedTools.length > 0 ? (
        <section aria-labelledby="related-tools">
          <h2
            className="text-2xl font-bold tracking-tight text-zinc-950"
            id="related-tools"
          >
            Related tools
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Stay in the browser with a nearby local tool.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((related) => (
              <ToolCard key={related.slug} tool={related} />
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-600">
            Or browse the{" "}
            <Link className="font-semibold text-red-700 hover:underline" href="/tools">
              full tool directory
            </Link>
            .
          </p>
        </section>
      ) : null}
    </div>
  );
}
