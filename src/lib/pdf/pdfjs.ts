import type { PDFDocumentLoadingTask } from "pdfjs-dist";

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfJs() {
  pdfJsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    return pdfjs;
  });

  return pdfJsPromise;
}

export function destroyLoadingTask(
  loadingTask: PDFDocumentLoadingTask | null | undefined,
) {
  if (!loadingTask) {
    return;
  }

  void loadingTask.destroy();
}
