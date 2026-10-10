import { stripRecipeSecrets, type RecipeStep } from "@/lib/recipes/recipe";

export type ExportedRecipe = {
  exportedAt: string;
  id: string;
  name: string;
  schema: "forge.private-recipe.v1";
  steps: RecipeStep[];
};

export function createRecipeExport({
  exportedAt = new Date().toISOString(),
  id,
  name,
  steps,
}: {
  exportedAt?: string;
  id: string;
  name: string;
  steps: readonly RecipeStep[];
}): ExportedRecipe {
  return {
    exportedAt,
    id,
    name: name.trim() || "Untitled recipe",
    schema: "forge.private-recipe.v1",
    steps: stripRecipeSecrets(steps),
  };
}

export function recipeExportToJson(recipe: ExportedRecipe) {
  return `${JSON.stringify(recipe, null, 2)}\n`;
}

export function recipeExportFilename(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safe || "recipe"}-recipe.json`;
}
