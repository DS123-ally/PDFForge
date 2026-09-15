import { headers } from "next/headers";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { ToolCard } from "@/components/tools/tool-card";
import { env } from "@/config/env";
import type { ToolDefinition } from "@/config/tools";
import type { ToolSeoContent } from "@/config/tool-seo";
import { getRelatedTools } from "@/config/tool-seo";
import { buildToolJsonLd } from "@/lib/seo/json-ld";

export async function ToolSeoSections({
  tool,
  seo,
}: {
  tool: ToolDefinition;
  seo: ToolSeoContent;
}) {
  const related = getRelatedTools(tool.slug);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const canonical = `${env.siteUrl.origin}/tools/${tool.slug}`;

  return (
    <div className="mt-16 space-y-12 border-t border-zinc-200 pt-12 text-base leading-7 text-zinc-700">
      <JsonLd
        data={buildToolJsonLd({ canonical, seo, tool })}
        nonce={nonce}
      />
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          How {tool.title} works
        </h2>
        <p className="mt-4">{seo.intro}</p>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          How to use {tool.title}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6">
          {seo.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-zinc-950">
          {tool.title} FAQs
        </h2>
        <div className="mt-4 space-y-3">
          {seo.faqs.map((faq) => (
            <details
              className="rounded-xl border border-zinc-200 p-4"
              key={faq.question}
            >
              <summary className="cursor-pointer font-semibold text-zinc-950">
                {faq.question}
              </summary>
              <p className="mt-3">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
      {related.length > 0 ? (
        <section>
          <h2 className="text-2xl font-bold text-zinc-950">Related tools</h2>
          <p className="mt-3">
            Stay in the browser with these nearby PDFForge tools.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {related.map((relatedTool) => (
              <li key={relatedTool.slug}>
                <ToolCard tool={relatedTool} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link
              className="font-semibold text-red-700 hover:underline"
              href="/tools"
            >
              Browse all tools
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
