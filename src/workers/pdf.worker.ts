import { createOutputName } from "@/lib/files/create-output-name";
import { editPdfBuffer } from "@/lib/pdf/edit-pdf";
import { imagesToPdf } from "@/lib/pdf/images-to-pdf";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { mergePdfBuffers, PdfMergeCancelledError } from "@/lib/pdf/merge-pdf";
import { organizePdfBuffer } from "@/lib/pdf/organize-pdf";
import { PageRangeError } from "@/lib/pdf/page-ranges";
import { flattenPdfBuffer } from "@/lib/pdf/flatten-pdf";
import { protectPdfBuffer, unlockPdfBuffer } from "@/lib/pdf/password-pdf";
import { sanitizePdfBuffer } from "@/lib/pdf/privacy-sanitize";
import {
  PdfCorruptError,
  PdfPasswordProtectedError,
  PdfUnsupportedEncryptionError,
  PdfWrongPasswordError,
} from "@/lib/pdf/pdf-errors";
import { splitPdfBuffer } from "@/lib/pdf/split-pdf";
import { runRecipe } from "@/lib/recipes/run-recipe";
import type {
  PdfWorkerRequest,
  PdfWorkerResponse,
  PdfWorkerResult,
} from "@/lib/workers/pdf-worker-types";

const cancelledJobs = new Set<string>();
const workerSelf = self as unknown as {
  onmessage: ((event: MessageEvent<PdfWorkerRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

workerSelf.onmessage = (event: MessageEvent<PdfWorkerRequest>) => {
  const request = event.data;

  if (request.type === "cancel") {
    cancelledJobs.add(request.id);
    workerSelf.postMessage({
      id: request.id,
      reason: "Processing cancelled",
      type: "cancelled",
    } satisfies PdfWorkerResponse);
    return;
  }

  void runJob(request);
};

async function runJob(request: Extract<PdfWorkerRequest, { type: "prepare" }>) {
  try {
    const result = await runOperation(request);
    const response = {
      id: request.id,
      result,
      type: "complete",
    } satisfies PdfWorkerResponse;

    workerSelf.postMessage(
      response,
      result.outputBytes ? [result.outputBytes] : [],
    );
  } catch (error) {
    if (isCancelledError(error) || cancelledJobs.has(request.id)) {
      cancelledJobs.delete(request.id);
      workerSelf.postMessage({
        id: request.id,
        reason: "Processing cancelled",
        type: "cancelled",
      } satisfies PdfWorkerResponse);
      return;
    }

    workerSelf.postMessage(toWorkerError(request.id, error));
  }
}

async function runOperation(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
) {
  switch (request.operation) {
    case "merge":
      return mergeJob(request);
    case "split":
      return splitJob(request);
    case "organize":
      return organizeJob(request);
    case "images-to-pdf":
      return imagesToPdfJob(request);
    case "edit-pdf":
      return editPdfJob(request);
    case "protect-pdf":
      return protectPdfJob(request);
    case "unlock-pdf":
      return unlockPdfJob(request);
    case "flatten-pdf":
      return flattenPdfJob(request);
    case "sanitize-pdf":
      return sanitizePdfJob(request);
    case "recipe":
      return recipeJob(request);
    case "prepare":
      return inspectJob(request);
  }
}

async function mergeJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const merged = await mergePdfBuffers(
    request.files.map((file) => file.bytes),
    {
      isCancelled: () => cancelledJobs.has(request.id),
      onProgress: (progress, message) => {
        postProgress(request.id, progress, message);
      },
    },
  );

  return {
    fileCount: merged.fileCount,
    filename: createOutputName(request.files[0]?.name ?? "document.pdf", {
      suffix: "merged",
    }),
    outputBytes: merged.outputBytes,
    totalBytes: request.files.reduce((total, file) => total + file.size, 0),
    totalPages: merged.totalPages,
  };
}

async function splitJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];

  if (!file) {
    throw new Error("A PDF is required.");
  }

  postProgress(request.id, 10, "Splitting PDF locally");
  const splitOptions = request.options?.split;
  const result = await splitPdfBuffer(file.bytes, {
    mode: splitOptions?.mode ?? "extract",
    ranges: splitOptions?.ranges,
    sourceName: file.name,
  });
  postProgress(request.id, 100, "Split output is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    outputMimeType: result.outputMimeType,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function imagesToPdfJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const options = request.options?.imagesToPdf;

  if (!options) {
    throw new Error("Image conversion options are required.");
  }

  postProgress(request.id, 10, "Converting images to PDF locally");
  const imageInputs = request.files.map((file) => {
    const dimensions = options.images.find((image) => image.id === file.id);

    if (!dimensions) {
      throw new Error("Image dimensions are required.");
    }

    return {
      bytes: file.bytes,
      height: dimensions.height,
      mimeType: dimensions.mimeType,
      name: file.name,
      width: dimensions.width,
    };
  });
  const result = await imagesToPdf(imageInputs, options);
  postProgress(request.id, 100, "Images PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: request.files.reduce((total, file) => total + file.size, 0),
    totalPages: result.totalPages,
  };
}

async function editPdfJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];
  const options = request.options?.editPdf;

  if (!file || !options) {
    throw new Error("A PDF and edit options are required.");
  }

  postProgress(request.id, 10, "Editing PDF locally");
  const result = await editPdfBuffer(file.bytes, options, file.name);
  postProgress(request.id, 100, "Edited PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function protectPdfJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];
  const password = request.options?.passwordPdf?.password;

  if (!file || !password) {
    throw new Error("A PDF and password are required.");
  }

  postProgress(request.id, 10, "Encrypting PDF locally");
  const result = await protectPdfBuffer(file.bytes, password, file.name);
  postProgress(request.id, 100, "Protected PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function unlockPdfJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];
  const password = request.options?.passwordPdf?.password;

  if (!file || !password) {
    throw new Error("A PDF and password are required.");
  }

  postProgress(request.id, 10, "Unlocking PDF locally");
  const result = await unlockPdfBuffer(file.bytes, password, file.name);
  postProgress(request.id, 100, "Unlocked PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function sanitizePdfJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];
  const options = request.options?.sanitizePdf;

  if (!file || !options) {
    throw new Error("A PDF and sanitize options are required.");
  }

  postProgress(request.id, 10, "Sanitizing PDF locally");
  const result = await sanitizePdfBuffer(file.bytes, options, file.name);
  postProgress(request.id, 100, "Sanitized PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function flattenPdfJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];

  if (!file) {
    throw new Error("A PDF is required.");
  }

  postProgress(request.id, 10, "Flattening form fields locally");
  const result = await flattenPdfBuffer(file.bytes, file.name);
  postProgress(request.id, 100, "Flattened PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function organizeJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const file = request.files[0];

  if (!file) {
    throw new Error("A PDF is required.");
  }

  postProgress(request.id, 10, "Organizing PDF pages locally");
  const result = await organizePdfBuffer(file.bytes, {
    pages: request.options?.organize?.pages ?? [],
    sourceName: file.name,
  });
  postProgress(request.id, 100, "Organized PDF is ready");

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: file.size,
    totalPages: result.totalPages,
  };
}

async function recipeJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const steps = request.options?.recipe?.steps;

  if (!steps) {
    throw new Error("Recipe steps are required.");
  }

  const result = await runRecipe(
    request.files.map((file) => ({
      bytes: file.bytes,
      name: file.name,
    })),
    steps,
    {
      isCancelled: () => cancelledJobs.has(request.id),
      onProgress: (progress, message) => {
        postProgress(request.id, progress, message);
      },
    },
  );

  return {
    fileCount: result.fileCount,
    filename: result.filename,
    outputBytes: result.outputBytes,
    totalBytes: request.files.reduce((total, file) => total + file.size, 0),
    totalPages: result.totalPages,
  };
}

async function inspectJob(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
): Promise<PdfWorkerResult> {
  const result: PdfWorkerResult = {
    fileCount: request.files.length,
    totalBytes: request.files.reduce((total, file) => total + file.size, 0),
    totalPages: 0,
  };

  postProgress(request.id, 5, "Starting local worker");

  for (const [index, file] of request.files.entries()) {
    throwIfCancelled(request.id);
    postProgress(
      request.id,
      calculateProgress(index, request.files.length, 15),
      `Reading file ${index + 1} of ${request.files.length}`,
    );

    const pdf = await loadPdf(file.bytes);
    result.totalPages += pdf.getPageCount();
    postProgress(
      request.id,
      calculateProgress(index + 1, request.files.length, 90),
      `Prepared ${index + 1} of ${request.files.length} files`,
    );
  }

  throwIfCancelled(request.id);
  postProgress(request.id, 100, "Files are ready");

  return result;
}

function postProgress(id: string, progress: number, message: string) {
  workerSelf.postMessage({
    id,
    message,
    progress,
    type: "progress",
  } satisfies PdfWorkerResponse);
}

function calculateProgress(index: number, total: number, max: number) {
  if (total === 0) {
    return max;
  }

  return Math.round((index / total) * max);
}

function throwIfCancelled(id: string) {
  if (cancelledJobs.has(id)) {
    throw new PdfMergeCancelledError();
  }
}

function isCancelledError(error: unknown) {
  return error instanceof PdfMergeCancelledError;
}

function toWorkerError(id: string, error: unknown): PdfWorkerResponse {
  if (error instanceof PdfPasswordProtectedError) {
    return {
      code: "password_protected_pdf",
      id,
      message: error.userMessage,
      type: "error",
    };
  }

  if (error instanceof PdfWrongPasswordError) {
    return {
      code: "wrong_password",
      id,
      message: error.userMessage,
      type: "error",
    };
  }

  if (error instanceof PdfUnsupportedEncryptionError) {
    return {
      code: "unsupported_encryption",
      id,
      message: error.userMessage,
      type: "error",
    };
  }

  if (error instanceof PdfCorruptError) {
    return {
      code: "invalid_pdf",
      id,
      message: error.userMessage,
      type: "error",
    };
  }

  if (error instanceof PageRangeError) {
    return {
      code: "invalid_page_range",
      id,
      message: error.message,
      type: "error",
    };
  }

  return {
    code: "processing_failed",
    id,
    message: "The local worker could not prepare these files.",
    type: "error",
  };
}
