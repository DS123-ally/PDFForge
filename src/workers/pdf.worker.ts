import { createOutputName } from "@/lib/files/create-output-name";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { mergePdfBuffers, PdfMergeCancelledError } from "@/lib/pdf/merge-pdf";
import {
  PdfCorruptError,
  PdfPasswordProtectedError,
} from "@/lib/pdf/pdf-errors";
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
    const result =
      request.operation === "merge"
        ? await mergeJob(request)
        : await inspectJob(request);
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

  if (error instanceof PdfCorruptError) {
    return {
      code: "invalid_pdf",
      id,
      message: error.userMessage,
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
