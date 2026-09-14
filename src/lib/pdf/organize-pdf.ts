import { degrees, PDFDocument } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { savePdf } from "@/lib/pdf/save-pdf";

export type OrganizedPageInput = {
  pageNumber: number;
  rotation: number;
};

export type OrganizePdfOptions = {
  pages: readonly OrganizedPageInput[];
  sourceName?: string;
};

export type OrganizePdfResult = {
  fileCount: number;
  filename: string;
  outputBytes: ArrayBuffer;
  totalPages: number;
};

export async function organizePdfBuffer(
  bytes: ArrayBuffer,
  options: OrganizePdfOptions,
) {
  const sourcePdf = await loadPdf(bytes);
  const outputPdf = await saveOrganizedPages(sourcePdf, options.pages);

  return {
    fileCount: 1,
    filename: createOutputName(options.sourceName ?? "document.pdf", {
      suffix: "organized",
    }),
    outputBytes: outputPdf,
    totalPages: options.pages.length,
  } satisfies OrganizePdfResult;
}

async function saveOrganizedPages(
  sourcePdf: Awaited<ReturnType<typeof loadPdf>>,
  pages: readonly OrganizedPageInput[],
) {
  if (pages.length === 0) {
    throw new Error("At least one page is required.");
  }

  const totalPages = sourcePdf.getPageCount();
  const outputPdf = await PDFDocument.create();
  const copiedPages = await outputPdf.copyPages(
    sourcePdf,
    pages.map(
      ({ pageNumber }) => validatePageNumber(pageNumber, totalPages) - 1,
    ),
  );

  copiedPages.forEach((page, index) => {
    const normalizedRotation = normalizeRotation(pages[index]?.rotation ?? 0);
    page.setRotation(degrees(normalizedRotation));
    outputPdf.addPage(page);
  });

  return toArrayBuffer(await savePdf(outputPdf));
}

function validatePageNumber(pageNumber: number, totalPages: number) {
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > totalPages
  ) {
    throw new Error(`Choose pages between 1 and ${totalPages}.`);
  }

  return pageNumber;
}

export function normalizeRotation(rotation: number) {
  if (!Number.isFinite(rotation)) {
    return 0;
  }

  return (((Math.round(rotation / 90) * 90) % 360) + 360) % 360;
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
