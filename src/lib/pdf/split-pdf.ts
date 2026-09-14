import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import { loadPdf } from "@/lib/pdf/load-pdf";
import {
  createEveryPageRanges,
  getPageNumbersFromRanges,
  parsePageRanges,
  type PageRange,
} from "@/lib/pdf/page-ranges";
import { savePdf } from "@/lib/pdf/save-pdf";

export type SplitPdfMode = "extract" | "ranges" | "every-page";

export type SplitPdfOptions = {
  mode: SplitPdfMode;
  ranges?: string;
  sourceName?: string;
};

export type SplitPdfResult = {
  fileCount: number;
  filename: string;
  outputBytes: ArrayBuffer;
  outputMimeType: string;
  totalPages: number;
};

export async function splitPdfBuffer(
  bytes: ArrayBuffer,
  options: SplitPdfOptions,
) {
  const sourcePdf = await loadPdf(bytes);
  const totalPages = sourcePdf.getPageCount();
  const sourceName = options.sourceName ?? "document.pdf";

  if (options.mode === "extract") {
    const ranges = parsePageRanges(options.ranges ?? "", totalPages);
    const selectedPages = getPageNumbersFromRanges(ranges);
    const outputBytes = await createPdfFromPages(sourcePdf, selectedPages);

    return {
      fileCount: 1,
      filename: createOutputName(sourceName, { suffix: "selected-pages" }),
      outputBytes,
      outputMimeType: "application/pdf",
      totalPages: selectedPages.length,
    } satisfies SplitPdfResult;
  }

  const ranges =
    options.mode === "every-page"
      ? createEveryPageRanges(totalPages)
      : parsePageRanges(options.ranges ?? "", totalPages);
  const zip = new JSZip();

  for (const range of ranges) {
    const outputBytes = await createPdfFromPages(sourcePdf, range.pages);
    zip.file(getSplitFilename(sourceName, range), outputBytes);
  }

  return {
    fileCount: ranges.length,
    filename: createOutputName(sourceName, {
      extension: ".zip",
      suffix: options.mode === "every-page" ? "pages" : "split",
    }),
    outputBytes: toArrayBuffer(await zip.generateAsync({ type: "uint8array" })),
    outputMimeType: "application/zip",
    totalPages,
  } satisfies SplitPdfResult;
}

async function createPdfFromPages(
  sourcePdf: PDFDocument,
  pageNumbers: readonly number[],
) {
  const outputPdf = await PDFDocument.create();
  const copiedPages = await outputPdf.copyPages(
    sourcePdf,
    pageNumbers.map((pageNumber) => pageNumber - 1),
  );

  for (const page of copiedPages) {
    outputPdf.addPage(page);
  }

  return toArrayBuffer(await savePdf(outputPdf));
}

function getSplitFilename(sourceName: string, range: PageRange) {
  return createOutputName(sourceName, {
    suffix: `pages-${range.label}`,
  });
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
