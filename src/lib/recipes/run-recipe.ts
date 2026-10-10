import { createOutputName } from "@/lib/files/create-output-name";
import { editPdfBuffer } from "@/lib/pdf/edit-pdf";
import { flattenPdfBuffer } from "@/lib/pdf/flatten-pdf";
import { mergePdfBuffers, PdfMergeCancelledError } from "@/lib/pdf/merge-pdf";
import { protectPdfBuffer } from "@/lib/pdf/password-pdf";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";
import { sanitizePdfBuffer } from "@/lib/pdf/privacy-sanitize";
import { scanPrivacyRisk } from "@/lib/pdf/privacy-risk";
import { percentRectToPdfRegion, redactPdfBuffer } from "@/lib/pdf/redact-pdf";
import {
  verifyTokensRemovedFromTextLayer,
  type RedactionCheckResult,
} from "@/lib/pdf/redaction-check";
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

type RecipeWorkingFile = {
  bytes: ArrayBuffer;
  name: string;
  pages: number;
  redactionCheck?: RedactionCheckResult;
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

  let current: RecipeWorkingFile[] = files.map((file) => ({
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

    current = [await runStep(current, step, sourceName, options.isCancelled)];
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
    redactionCheck: output.redactionCheck,
    totalPages: output.pages,
  };
}

async function runStep(
  files: RecipeWorkingFile[],
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
      redactionCheck: input.redactionCheck,
    };
  }

  if (step.type === "flatten-pdf") {
    const flattened = await flattenPdfBuffer(input.bytes, sourceName);
    return {
      bytes: flattened.outputBytes,
      name: sourceName,
      pages: flattened.totalPages,
      redactionCheck: input.redactionCheck,
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
      redactionCheck: input.redactionCheck,
    };
  }

  if (step.type === "scan-redact-pii") {
    return scanAndRedactPii(input.bytes, step, sourceName);
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
      redactionCheck: input.redactionCheck,
    };
  }

  throw new Error("This step cannot run in a recipe.");
}

async function scanAndRedactPii(
  bytes: ArrayBuffer,
  step: Extract<RecipeStep, { type: "scan-redact-pii" }>,
  sourceName: string,
) {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes.slice(0)),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    const report = await scanPrivacyRisk(bytes, document);
    const regions = [];
    const confirmedTokens = step.confirmAllMatches
      ? report.matches.map((match) => match.text)
      : [];

    if (step.confirmAllMatches) {
      for (const match of report.matches) {
        const page = await document.getPage(match.box.pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        regions.push(
          percentRectToPdfRegion(
            { height: viewport.height, width: viewport.width },
            match.box.pageNumber,
            match.box,
          ),
        );
        page.cleanup();
      }
    }

    const rasterizePages = step.includeHiddenTextPages
      ? report.hiddenTextPages
      : [];

    if (regions.length === 0 && rasterizePages.length === 0) {
      const totalPages = document.numPages;
      const redactionCheck = await verifyTokensRemovedFromTextLayer(
        bytes,
        confirmedTokens,
      );
      await document.cleanup();
      return { bytes, name: sourceName, pages: totalPages, redactionCheck };
    }

    const redacted = await redactPdfBuffer(bytes, {
      rasterizePages,
      regions,
      sourceName,
    });
    const redactionCheck = await verifyTokensRemovedFromTextLayer(
      redacted.outputBytes,
      confirmedTokens,
    );
    await document.cleanup();

    return {
      bytes: redacted.outputBytes,
      name: sourceName,
      pages: redacted.totalPages,
      redactionCheck,
    };
  } finally {
    destroyLoadingTask(loadingTask);
  }
}

function throwIfCancelled(isCancelled?: () => boolean) {
  if (isCancelled?.()) {
    throw new PdfMergeCancelledError();
  }
}
