import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  getRecipePresetHref,
  pipelineStepLabels,
  recipePresets,
} from "@/lib/recipes/recipe";
import { cn } from "@/lib/utils";

export function HomeRecipes() {
  return (
    <section
      aria-labelledby="recipes-title"
      className="border-t border-border/80 bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Automated Pipelines"
          id="recipes-title"
          title="Chain multiple steps into a single private recipe"
        >
          Execute complex multi-step pipelines like sanitizing, flattening, watermarking, and encrypting with a single click.
        </SectionHeading>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {recipePresets.map((preset, index) => {
            const steps = preset.createSteps();

            return (
              <div
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-md"
                key={preset.id}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Play className="size-4 fill-current ml-0.5" />
                    </span>
                    {index === 0 ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Recommended
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                        {steps.length} Steps
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 text-base font-semibold tracking-tight text-zinc-950">
                    {preset.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                    {preset.summary}
                  </p>

                  {/* Visual Step Sequence */}
                  <div className="mt-5 space-y-1.5 rounded-xl bg-zinc-50/80 p-3 border border-zinc-100">
                    <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                      Pipeline Sequence
                    </p>
                    <ol className="space-y-1 text-xs text-zinc-700">
                      {steps.map((step, stepIndex) => (
                        <li
                          className="flex items-center gap-2 font-medium"
                          key={step.type}
                        >
                          <span className="grid size-4 place-items-center rounded-full bg-white text-[10px] font-bold text-zinc-600 border border-zinc-200">
                            {stepIndex + 1}
                          </span>
                          <span className="truncate">
                            {pipelineStepLabels[step.type]}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <Link
                    className={cn(
                      buttonStyles(index === 0 ? "primary" : "secondary", "sm"),
                      "w-full text-xs justify-center",
                    )}
                    href={getRecipePresetHref(preset.id)}
                  >
                    <span>Launch Recipe</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
