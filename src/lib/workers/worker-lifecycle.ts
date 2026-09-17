import { recipeHasPasswordStep } from "@/lib/recipes/recipe";
import type {
  PdfWorkerOperation,
  PdfWorkerOptions,
} from "@/lib/workers/pdf-worker-types";

const sensitiveOperations = new Set<PdfWorkerOperation>([
  "protect-pdf",
  "unlock-pdf",
]);

export function shouldReusePdfWorker(
  operation: PdfWorkerOperation,
  options?: PdfWorkerOptions,
) {
  if (sensitiveOperations.has(operation)) {
    return false;
  }

  if (
    operation === "recipe" &&
    options?.recipe?.steps &&
    recipeHasPasswordStep(options.recipe.steps)
  ) {
    return false;
  }

  return true;
}
