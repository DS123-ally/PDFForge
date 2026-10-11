import { PDFDocument } from "pdf-lib";

import { getPdfJs } from "@/lib/pdf/pdfjs";
import {
  PdfCorruptError,
  PdfPasswordProtectedError,
} from "@/lib/pdf/pdf-errors";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { savePdf } from "@/lib/pdf/save-pdf";

export type CompressMode = "rewrite" | "pictures";

export type PicturePresetId = "smaller" | "balanced" | "clearer";

export const compressFidelity: Record<
  CompressMode,
  { detail: string; label: string }
> = {
  pictures: {
    label: "Page pictures",
    detail:
      "Each page is drawn as a JPEG in a new PDF. This is the mode that shrinks scans and photo pages. Selectable text, links, and form fields are not kept.",
  },
  rewrite: {
    label: "Lossless rewrite",
    detail:
      "The file is resaved with compressed object streams. Selectable text stays selectable. A smaller file is a new PDF, so signatures, tags, and uncommon annotations can be dropped. When the rewrite is not smaller, the download is your original file.",
  },
};

export const picturePresets: Record<
  PicturePresetId,
  { label: string; quality: number; scale: number }
> = {
  balanced: { label: "Balanced", quality: 0.72, scale: 1.5 },
  clearer: { label: "Clearer", quality: 0.85, scale: 2 },
  smaller: { label: "Smaller", quality: 0.55, scale: 1 },
};

const maxPicturePages = 80;
const maxEdge = 4096;

export class CompressPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompressPdfError";
  }
}

export type CompressResult = {
  bytes: Uint8Array;
  keptOriginal: boolean;
  originalBytes: number;
  outputBytes: number;
  pageCount: number;
  warnings: string[];
};

export async function rewritePdf(bytes: Uint8Array): Promise<CompressResult> {
  const document = await loadSource(bytes);
  const output = await savePdf(document);
  const keptOriginal = output.byteLength >= bytes.byteLength;

  return {
    bytes: keptOriginal ? bytes : output,
    keptOriginal,
    originalBytes: bytes.byteLength,
    outputBytes: keptOriginal ? bytes.byteLength : output.byteLength,
    pageCount: document.getPageCount(),
    warnings: [],
  };
}

export async function picturePdf(
  bytes: Uint8Array,
  preset: PicturePresetId,
): Promise<CompressResult> {
  const pages = await renderPicturePages(bytes, picturePresets[preset]);
  const output = await picturePagesToPdf(pages.pages);
  const keptOriginal = output.byteLength >= bytes.byteLength;

  return {
    bytes: keptOriginal ? bytes : output,
    keptOriginal,
    originalBytes: bytes.byteLength,
    outputBytes: keptOriginal ? bytes.byteLength : output.byteLength,
    pageCount: pages.pages.length,
    warnings: pages.warnings,
  };
}

export async function picturePagesToPdf(
  pages: readonly { height: number; jpeg: Uint8Array; width: number }[],
) {
  if (pages.length === 0) {
    throw new CompressPdfError("This PDF has no pages.");
  }

  const pdf = await PDFDocument.create();

  for (const page of pages) {
    const image = await pdf.embedJpg(page.jpeg);
    const pdfPage = pdf.addPage([page.width, page.height]);
    pdfPage.drawImage(image, {
      height: page.height,
      width: page.width,
      x: 0,
      y: 0,
    });
  }

  return savePdf(pdf);
}

async function renderPicturePages(
  bytes: Uint8Array,
  preset: { quality: number; scale: number },
) {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: bytes.slice(),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;

    if (document.numPages > maxPicturePages) {
      throw new CompressPdfError(
        `Picture mode can redraw up to ${maxPicturePages} pages in this browser.`,
      );
    }

    const pages: { height: number; jpeg: Uint8Array; width: number }[] = [];
    let clamped = false;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      let scale = preset.scale;

      if (base.width * scale > maxEdge || base.height * scale > maxEdge) {
        scale = Math.min(maxEdge / base.width, maxEdge / base.height);
        clamped = true;
      }

      const viewport = page.getViewport({ scale });
      const canvas = globalThis.document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        throw new CompressPdfError("This browser cannot redraw PDF pages.");
      }

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();
      pages.push({
        height: base.height,
        jpeg: await canvasToJpeg(canvas, preset.quality),
        width: base.width,
      });
      canvas.width = 0;
      canvas.height = 0;
    }

    await document.cleanup();

    return {
      pages,
      warnings: clamped
        ? ["A page was drawn smaller so it would fit in this browser."]
        : [],
    };
  } catch (error) {
    throw toCompressError(error);
  } finally {
    await loadingTask.destroy();
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new CompressPdfError("A page could not be encoded as JPEG."));
          return;
        }

        void blob.arrayBuffer().then(
          (buffer) => resolve(new Uint8Array(buffer)),
          () =>
            reject(
              new CompressPdfError("A page could not be encoded as JPEG."),
            ),
        );
      },
      "image/jpeg",
      quality,
    );
  });
}

async function loadSource(bytes: Uint8Array) {
  try {
    const document = await loadPdf(bytes);

    if (document.getPageCount() < 1) {
      throw new CompressPdfError("This PDF has no pages.");
    }

    return document;
  } catch (error) {
    throw toCompressError(error);
  }
}

function toCompressError(error: unknown) {
  if (error instanceof CompressPdfError) {
    return error;
  }

  if (error instanceof PdfPasswordProtectedError) {
    return new CompressPdfError("Unlock this PDF before compressing it.");
  }

  if (error instanceof PdfCorruptError) {
    return new CompressPdfError("This PDF could not be read.");
  }

  if (error instanceof Error && /password/i.test(error.message)) {
    return new CompressPdfError("Unlock this PDF before compressing it.");
  }

  if (error instanceof Error && error.message) {
    return new CompressPdfError(error.message);
  }

  return new CompressPdfError("This PDF could not be compressed.");
}
