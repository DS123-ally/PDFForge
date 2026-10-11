import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { buttonStyles } from "@/components/ui/button";
import type { IndustryPage } from "@/config/industries";
import { industries } from "@/config/industries";
import {
  getRecipePreset,
  getRecipePresetHref,
  pipelineStepLabels,
} from "@/lib/recipes/recipe";

export function IndustryLanding({ page }: { page: IndustryPage }) {
  const preset = getRecipePreset(page.presetId);
  const matching = getRecipePreset(page.matchingPresetId);
  const others = industries.filter((entry) => entry.slug !== page.slug);

  if (!preset || !matching) {
    return null;
  }

  return (
    <PageShell>
      <main className="px-5 py-14 sm:px-8 sm:py-20" id="main-content">
        <article className="mx-auto w-full max-w-3xl min-w-0">
          <p className="text-sm font-bold tracking-wide text-red-600 uppercase">
            Industry
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-balance sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">{page.intro}</p>

          <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-bold tracking-wide text-red-600 uppercase">
              Default recipe
            </p>
            <h2 className="mt-2 text-2xl font-black text-zinc-950">
              {preset.name}
            </h2>
            <p className="mt-2 leading-7 text-zinc-600">{preset.summary}</p>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              {preset.createSteps().map((step) => (
                <li key={step.type}>{pipelineStepLabels[step.type]}</li>
              ))}
            </ol>
            <Link
              className={`${buttonStyles()} mt-5`}
              href={getRecipePresetHref(preset.id)}
            >
              Open {preset.name}
            </Link>
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <h2 className="text-2xl font-black text-zinc-950">
              {matching.name}
            </h2>
            <p className="mt-2 leading-7 text-zinc-600">{page.matchingNote}</p>
            <p className="mt-2 leading-7 text-zinc-600">{matching.summary}</p>
            <Link
              className={`${buttonStyles("secondary")} mt-5`}
              href={getRecipePresetHref(matching.id)}
            >
              Open {matching.name}
            </Link>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-bold text-zinc-950">Related tools</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {page.toolLinks.map((tool) => (
                <li key={tool.href}>
                  <Link className={buttonStyles("secondary")} href={tool.href}>
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <nav
            aria-label="Other industries"
            className="mt-10 flex flex-wrap gap-3"
          >
            {others.map((other) => (
              <Link
                className={buttonStyles("secondary")}
                href={`/for/${other.slug}`}
                key={other.slug}
              >
                {other.navLabel}
              </Link>
            ))}
          </nav>
        </article>
      </main>
    </PageShell>
  );
}
