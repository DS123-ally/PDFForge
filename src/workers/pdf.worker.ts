import { PDFDocument } from "pdf-lib";

import type {
  PdfWorkerRequest,
  PdfWorkerResponse,
  PdfWorkerResult,
} from "@/lib/workers/pdf-worker-types";

const cancelledJobs = new Set<string>();

self.onmessage = (event: MessageEvent<PdfWorkerRequest>) => {
  const request = event.data;

  if (request.type === "cancel") {
    cancelledJobs.add(request.id);
    postMessage({
      id: request.id,
      reason: "Processing cancelled",
      type: "cancelled",
    } satisfies PdfWorkerResponse);
    return;
  }

  void prepareFiles(request);
};

async function prepareFiles(
  request: Extract<PdfWorkerRequest, { type: "prepare" }>,
) {
  const result: PdfWorkerResult = {
    fileCount: request.files.length,
    totalBytes: request.files.reduce((total, file) => total + file.size, 0),
    totalPages: 0,
  };

  try {
    postProgress(request.id, 5, "Starting local worker");

    for (const [index, file] of request.files.entries()) {
      throwIfCancelled(request.id);
      postProgress(
        request.id,
        calculateProgress(index, request.files.length, 15),
        `Reading ${file.name}`,
      );

      const pdf = await PDFDocument.load(file.bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      result.totalPages += pdf.getPageCount();

      await delay(30);
      postProgress(
        request.id,
        calculateProgress(index + 1, request.files.length, 90),
        `Prepared ${index + 1} of ${request.files.length} files`,
      );
    }

    throwIfCancelled(request.id);
    postProgress(request.id, 100, "Files are ready");
    postMessage({
      id: request.id,
      result,
      type: "complete",
    } satisfies PdfWorkerResponse);
  } catch (error) {
    if (cancelledJobs.has(request.id)) {
      cancelledJobs.delete(request.id);
      postMessage({
        id: request.id,
        reason: "Processing cancelled",
        type: "cancelled",
      } satisfies PdfWorkerResponse);
      return;
    }

    postMessage(toWorkerError(request.id, error));
  }
}

function postProgress(id: string, progress: number, message: string) {
  postMessage({
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
    throw new Error("cancelled");
  }
}

function toWorkerError(id: string, error: unknown): PdfWorkerResponse {
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("encrypted")
  ) {
    return {
      code: "password_protected_pdf",
      id,
      message: "Password-protected PDFs cannot be processed yet.",
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

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
