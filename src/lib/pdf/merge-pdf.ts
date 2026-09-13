import { PDFDocument } from "pdf-lib";

import { loadPdf } from "@/lib/pdf/load-pdf";
import { savePdf } from "@/lib/pdf/save-pdf";

export class PdfMergeCancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "PdfMergeCancelledError";
  }
}

export type MergePdfOptions = {
  isCancelled?: () => boolean;
  onProgress?: (progress: number, message: string) => void;
};

export type MergedPdfResult = {
  fileCount: number;
  outputBytes: ArrayBuffer;
  totalPages: number;
};

export async function mergePdfBuffers(
  files: readonly ArrayBuffer[],
  options: MergePdfOptions = {},
): Promise<MergedPdfResult> {
  if (files.length === 0) {
    throw new Error("At least one PDF is required to merge.");
  }

  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  options.onProgress?.(5, "Starting local merge");

  for (const [index, bytes] of files.entries()) {
    throwIfCancelled(options.isCancelled);
    options.onProgress?.(
      calculateProgress(index, files.length, 10, 85),
      `Merging file ${index + 1} of ${files.length}`,
    );

    const sourcePdf = await loadPdf(bytes);
    const pageIndices = sourcePdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

    for (const page of copiedPages) {
      throwIfCancelled(options.isCancelled);
      mergedPdf.addPage(page);
    }

    totalPages += pageIndices.length;
  }

  throwIfCancelled(options.isCancelled);
  options.onProgress?.(95, "Saving merged PDF");

  const outputBytes = toArrayBuffer(await savePdf(mergedPdf));

  options.onProgress?.(100, "Merged PDF is ready");

  return {
    fileCount: files.length,
    outputBytes,
    totalPages,
  };
}

function throwIfCancelled(isCancelled?: () => boolean) {
  if (isCancelled?.()) {
    throw new PdfMergeCancelledError();
  }
}

function calculateProgress(
  index: number,
  total: number,
  start: number,
  end: number,
) {
  if (total === 0) {
    return end;
  }

  return Math.round(start + (index / total) * (end - start));
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
