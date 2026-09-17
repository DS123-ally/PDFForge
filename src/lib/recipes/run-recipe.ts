import { createOutputName } from "@/lib/files/create-output-name";
import { editPdfBuffer } from "@/lib/pdf/edit-pdf";
import { flattenPdfBuffer } from "@/lib/pdf/flatten-pdf";
import { mergePdfBuffers, PdfMergeCancelledError } from "@/lib/pdf/merge-pdf";
import { protectPdfBuffer } from "@/lib/pdf/password-pdf";
import { sanitizePdfBuffer } from "@/lib/pdf/privacy-sanitize";
import {
  pipelineStepLabels,
  toEditOptions,
  validateRecipe,
  type RecipeStep,
} from "@/lib/recipes/recipe";

export type RecipeFile = {
  bytes: ArrayBuffer;
  name: string;
};

export async function runRecipe(
  files: readonly RecipeFile[],
  steps: readonly RecipeStep[],
  options: {
    isCancelled?: () => boolean;
    onProgress?: (progress: number, message: string) => void;
  } = {},
) {
  validateRecipe(steps, files.length);

  if (files.length === 0) {
    throw new Error("Add at least one PDF.");
  }

  let current: Array<{ bytes: ArrayBuffer; name: string; pages: number }> =
    files.map((file) => ({
      bytes: file.bytes,
      name: file.name,
      pages: 0,
    }));
  const sourceName = files[0]?.name ?? "document.pdf";

  for (const [index, step] of steps.entries()) {
    throwIfCancelled(options.isCancelled);
    const label = pipelineStepLabels[step.type];
    const start = Math.round((index / steps.length) * 90);
    options.onProgress?.(start, `Running ${label}`);

    current = [
      await runStep(current, step, sourceName, options.isCancelled),
    ];
  }

  const output = current[0];

  if (!output) {
    throw new Error("The recipe produced no PDF.");
  }

  options.onProgress?.(100, "Recipe output is ready");

  return {
    fileCount: files.length,
    filename: createOutputName(sourceName, { suffix: "recipe" }),
    outputBytes: output.bytes,
    totalPages: output.pages,
  };
}

async function runStep(
  files: Array<{ bytes: ArrayBuffer; name: string; pages: number }>,
  step: RecipeStep,
  sourceName: string,
  isCancelled?: () => boolean,
) {
  if (step.type === "merge-pdf") {
    const merged = await mergePdfBuffers(
      files.map((file) => file.bytes),
      { isCancelled },
    );
    return {
      bytes: merged.outputBytes,
      name: sourceName,
      pages: merged.totalPages,
    };
  }

  const input = files[0];

  if (!input) {
    throw new Error("A PDF is required for this step.");
  }

  const edit = toEditOptions(step);

  if (edit) {
    const edited = await editPdfBuffer(input.bytes, edit, sourceName);
    return {
      bytes: edited.outputBytes,
      name: sourceName,
      pages: edited.totalPages,
    };
  }

  if (step.type === "flatten-pdf") {
    const flattened = await flattenPdfBuffer(input.bytes, sourceName);
    return {
      bytes: flattened.outputBytes,
      name: sourceName,
      pages: flattened.totalPages,
    };
  }

  if (step.type === "sanitize-pdf") {
    const sanitized = await sanitizePdfBuffer(
      input.bytes,
      step.sanitize,
      sourceName,
    );
    return {
      bytes: sanitized.outputBytes,
      name: sourceName,
      pages: sanitized.totalPages,
    };
  }

  if (step.type === "password-protect-pdf") {
    const protectedPdf = await protectPdfBuffer(
      input.bytes,
      step.password ?? "",
      sourceName,
    );
    return {
      bytes: protectedPdf.outputBytes,
      name: sourceName,
      pages: protectedPdf.totalPages,
    };
  }

  throw new Error("This step cannot run in a recipe.");
}

function throwIfCancelled(isCancelled?: () => boolean) {
  if (isCancelled?.()) {
    throw new PdfMergeCancelledError();
  }
}
