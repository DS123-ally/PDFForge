import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import {
  getRecipePresetHref,
  pipelineStepLabels,
  recipePresets,
} from "@/lib/recipes/recipe";

export function HomeRecipes() {
  return (
    <section aria-labelledby="recipes-title" className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-black tracking-tight" id="recipes-title">
          Recipes
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Open a recipe, drop the PDF, and run the steps in this browser.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {recipePresets.map((preset, index) => (
            <article
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              key={preset.id}
            >
              {index === 0 ? (
                <p className="text-xs font-bold tracking-wide text-red-600 uppercase">
                  Start here
                </p>
              ) : null}
              <h3
                className={
                  index === 0 ? "mt-2 text-lg font-black" : "text-lg font-black"
                }
              >
                {preset.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {preset.summary}
              </p>
              <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
                {preset.createSteps().map((step) => (
                  <li key={step.type}>{pipelineStepLabels[step.type]}</li>
                ))}
              </ol>
              <Link
                className={`${buttonStyles(index === 0 ? "primary" : "secondary")} mt-5`}
                href={getRecipePresetHref(preset.id)}
              >
                Open {preset.name}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
