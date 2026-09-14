import { getPdfJs } from "@/lib/pdf/pdfjs";
import {
  getPageNumbersFromRanges,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";

export type ExtractTextOptions = {
  ranges?: string;
};

export async function extractTextFromPdf(
  file: File,
  options: ExtractTextOptions = {},
) {
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
    const pages = options.ranges
      ? getPageNumbersFromRanges(
          parsePageRanges(options.ranges, document.numPages),
        )
      : Array.from({ length: document.numPages }, (_, index) => index + 1);
    const chunks: string[] = [];

    for (const pageNumber of pages) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");

      chunks.push(`Page ${pageNumber}\n${text}`);
      page.cleanup();
    }

    await document.cleanup();
    return chunks.join("\n\n").trim();
  } finally {
    await loadingTask.destroy();
  }
}
