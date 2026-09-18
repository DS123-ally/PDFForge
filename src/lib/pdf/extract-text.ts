import { fillEmptyPagesWithOcr } from "@/lib/convert/ocr-empty-pages";
import { readPdfConvertPages } from "@/lib/convert/read-pdf-pages";
import { getPdfJs } from "@/lib/pdf/pdfjs";
import {
  getPageNumbersFromRanges,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";

export type ExtractTextOptions = {
  ocrEmptyPages?: boolean;
  ranges?: string;
};

export async function extractTextFromPdf(
  source: Blob | ArrayBuffer | Uint8Array,
  options: ExtractTextOptions = {},
) {
  const file = toPdfFile(source);
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    const pageNumbers = options.ranges
      ? getPageNumbersFromRanges(
          parsePageRanges(options.ranges, document.numPages),
        )
      : Array.from({ length: document.numPages }, (_, index) => index + 1);
    await document.cleanup();

    const pages = await readPdfConvertPages(file, {
      includePageImages: false,
      pages: pageNumbers,
      scale: 1.5,
    });

    if (options.ocrEmptyPages !== false) {
      await fillEmptyPagesWithOcr(file, pages, {
        keepImages: false,
        scale: 1.5,
      });
    }

    return pages
      .map((page) => {
        const text = page.lines.map((line) => line.text).join("\n");
        return `Page ${page.pageNumber}\n${text}`;
      })
      .join("\n\n")
      .trim();
  } finally {
    await loadingTask.destroy();
  }
}

function toPdfFile(source: Blob | ArrayBuffer | Uint8Array) {
  if (source instanceof File) {
    return source;
  }

  if (source instanceof Blob) {
    return new File([source], "document.pdf", { type: "application/pdf" });
  }

  const bytes = source instanceof Uint8Array ? toArrayBuffer(source) : source;

  return new File([bytes], "document.pdf", { type: "application/pdf" });
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
