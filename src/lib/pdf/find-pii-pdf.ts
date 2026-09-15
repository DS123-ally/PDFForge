import type { PDFDocumentProxy } from "pdfjs-dist";

import {
  findPiiMatches,
  type FindPiiOptions,
  type PiiMatch,
} from "@/lib/pdf/find-pii";
import { getPdfJs } from "@/lib/pdf/pdfjs";

export async function findPiiInPdf(file: File, options: FindPiiOptions) {
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
    return findPiiInDocument(document, options);
  } finally {
    await loadingTask.destroy();
  }
}

export async function findPiiInDocument(
  document: PDFDocumentProxy,
  options: FindPiiOptions,
) {
  const matches: PiiMatch[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const runs = content.items.flatMap((item) => {
      if (!("str" in item) || !item.str || !("transform" in item)) {
        return [];
      }

      const transform = item.transform;
      const width = "width" in item ? Number(item.width) : 0;
      const height = "height" in item ? Number(item.height) : 8;

      return [
        {
          height,
          pageNumber,
          str: item.str,
          width: width || height,
          x: transform[4],
          y: transform[5],
        },
      ];
    });

    matches.push(
      ...findPiiMatches(runs, options, {
        height: viewport.height,
        width: viewport.width,
      }),
    );
    page.cleanup();
  }

  return matches;
}
