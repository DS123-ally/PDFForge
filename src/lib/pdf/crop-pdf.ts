import { PDFDocument, type PDFPage } from "pdf-lib";
import type { PDFPageProxy } from "pdfjs-dist";

import { createOutputName } from "@/lib/files/create-output-name";
import type { PdfPageSelection } from "@/lib/pdf/edit-pdf";
import { loadPdf } from "@/lib/pdf/load-pdf";
import {
  getPageNumbersFromRanges,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";
import {
  PdfCorruptError,
  PdfPasswordProtectedError,
} from "@/lib/pdf/pdf-errors";
import { getPdfJs } from "@/lib/pdf/pdfjs";
import { savePdf } from "@/lib/pdf/save-pdf";

export type CropMode = "boxes" | "pictures";

export type CropRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export const cropFidelity: Record<CropMode, { detail: string; label: string }> =
  {
    boxes: {
      label: "Page boxes",
      detail:
        "Each selected page is resized to the box. Selectable text stays. Content outside the box can remain in the file. Rotated pages may need page pictures.",
    },
    pictures: {
      label: "Page pictures",
      detail:
        "Each selected page is redrawn as a JPEG of the box. Content outside the box is not in the download. Selectable text is not kept on those pages.",
    },
  };

export const defaultCropRect: CropRect = {
  height: 80,
  left: 10,
  top: 10,
  width: 80,
};

const maxPicturePages = 80;
const maxEdge = 4096;
const pictureQuality = 0.82;
const pictureScale = 1.5;

export class CropPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CropPdfError";
  }
}

export type CropResult = {
  bytes: Uint8Array;
  filename: string;
  mode: CropMode;
  pageCount: number;
  warnings: string[];
};

export async function cropPdf(
  bytes: Uint8Array,
  options: {
    mode: CropMode;
    rect: CropRect;
    selection?: PdfPageSelection;
    sourceName?: string;
  },
): Promise<CropResult> {
  const rect = normalizeCropRect(options.rect);

  if (rect.width < 2 || rect.height < 2) {
    throw new CropPdfError("Draw a larger crop box.");
  }

  if (options.mode === "pictures") {
    return cropAsPictures(bytes, rect, options.selection, options.sourceName);
  }

  return cropAsBoxes(bytes, rect, options.selection, options.sourceName);
}

export function normalizeCropRect(rect: CropRect): CropRect {
  const left = clampPercent(rect.left);
  const top = clampPercent(rect.top);
  const width = Math.min(100 - left, clampPercent(rect.width));
  const height = Math.min(100 - top, clampPercent(rect.height));

  return { height, left, top, width };
}

async function cropAsBoxes(
  bytes: Uint8Array,
  rect: CropRect,
  selection: PdfPageSelection | undefined,
  sourceName?: string,
): Promise<CropResult> {
  const source = await loadSource(bytes);
  const selected = selectedPages(selection, source.getPageCount());
  const output = await PDFDocument.create();

  for (let index = 0; index < source.getPageCount(); index += 1) {
    const [copied] = await output.copyPages(source, [index]);

    if (selected.has(index + 1)) {
      applyPageBoxes(copied, rect);
    }

    output.addPage(copied);
  }

  const saved = await savePdf(output);

  return {
    bytes: saved,
    filename: createOutputName(sourceName ?? "document.pdf", {
      suffix: "cropped",
    }),
    mode: "boxes",
    pageCount: output.getPageCount(),
    warnings: [],
  };
}

async function cropAsPictures(
  bytes: Uint8Array,
  rect: CropRect,
  selection: PdfPageSelection | undefined,
  sourceName?: string,
): Promise<CropResult> {
  const source = await loadSource(bytes);
  const selected = selectedPages(selection, source.getPageCount());

  if (selected.size > maxPicturePages) {
    throw new CropPdfError(
      `Picture mode can redraw up to ${maxPicturePages} pages in this browser.`,
    );
  }

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: bytes.slice(),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    const output = await PDFDocument.create();
    let clamped = false;

    for (let index = 0; index < source.getPageCount(); index += 1) {
      const pageNumber = index + 1;

      if (!selected.has(pageNumber)) {
        const [copied] = await output.copyPages(source, [index]);
        output.addPage(copied);
        continue;
      }

      const page = await document.getPage(pageNumber);
      const cropped = await renderCroppedPage(page, rect, pictureScale);
      page.cleanup();
      clamped = clamped || cropped.clamped;
      const image = await output.embedJpg(cropped.jpeg);
      const pdfPage = output.addPage([cropped.width, cropped.height]);
      pdfPage.drawImage(image, {
        height: cropped.height,
        width: cropped.width,
        x: 0,
        y: 0,
      });
    }

    await document.cleanup();
    const saved = await savePdf(output);

    return {
      bytes: saved,
      filename: createOutputName(sourceName ?? "document.pdf", {
        suffix: "cropped",
      }),
      mode: "pictures",
      pageCount: output.getPageCount(),
      warnings: clamped
        ? ["A page was drawn smaller so it would fit in this browser."]
        : [],
    };
  } catch (error) {
    throw toCropError(error);
  } finally {
    await loadingTask.destroy();
  }
}

function applyPageBoxes(page: PDFPage, rect: CropRect) {
  const { height, width } = page.getSize();
  const cropWidth = (rect.width / 100) * width;
  const cropHeight = (rect.height / 100) * height;
  const x = (rect.left / 100) * width;
  const y = height - (rect.top / 100) * height - cropHeight;

  page.setMediaBox(x, y, cropWidth, cropHeight);
  page.setCropBox(x, y, cropWidth, cropHeight);
  page.setBleedBox(x, y, cropWidth, cropHeight);
  page.setTrimBox(x, y, cropWidth, cropHeight);
  page.setArtBox(x, y, cropWidth, cropHeight);
}

async function renderCroppedPage(
  page: PDFPageProxy,
  rect: CropRect,
  scale: number,
) {
  const base = page.getViewport({ scale: 1 });
  let renderScale = scale;

  if (
    base.width * renderScale > maxEdge ||
    base.height * renderScale > maxEdge
  ) {
    renderScale = Math.min(maxEdge / base.width, maxEdge / base.height);
  }

  const viewport = page.getViewport({ scale: renderScale });
  const canvas = createCanvas(
    Math.max(1, Math.floor(viewport.width)),
    Math.max(1, Math.floor(viewport.height)),
  );
  const context = get2dContext(canvas);

  if (!context) {
    throw new CropPdfError("This browser cannot redraw PDF pages.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas: canvas as HTMLCanvasElement,
    canvasContext: context as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const sourceX = Math.floor((rect.left / 100) * canvas.width);
  const sourceY = Math.floor((rect.top / 100) * canvas.height);
  const sourceWidth = Math.max(
    1,
    Math.floor((rect.width / 100) * canvas.width),
  );
  const sourceHeight = Math.max(
    1,
    Math.floor((rect.height / 100) * canvas.height),
  );
  const crop = createCanvas(sourceWidth, sourceHeight);
  const cropContext = get2dContext(crop);

  if (!cropContext) {
    throw new CropPdfError("This browser cannot redraw PDF pages.");
  }

  cropContext.fillStyle = "#ffffff";
  cropContext.fillRect(0, 0, sourceWidth, sourceHeight);
  cropContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );
  canvas.width = 0;
  canvas.height = 0;

  const jpeg = await canvasToJpeg(crop, pictureQuality);
  crop.width = 0;
  crop.height = 0;

  return {
    clamped: renderScale < scale,
    height: sourceHeight / renderScale,
    jpeg,
    width: sourceWidth / renderScale,
  };
}

function selectedPages(
  selection: PdfPageSelection | undefined,
  totalPages: number,
) {
  if (totalPages < 1) {
    throw new CropPdfError("This PDF has no pages.");
  }

  if (!selection || selection.mode === "all") {
    return new Set(Array.from({ length: totalPages }, (_, index) => index + 1));
  }

  try {
    return new Set(
      getPageNumbersFromRanges(parsePageRanges(selection.ranges, totalPages)),
    );
  } catch (error) {
    throw toCropError(error);
  }
}

async function loadSource(bytes: Uint8Array) {
  try {
    const document = await loadPdf(bytes);

    if (document.getPageCount() < 1) {
      throw new CropPdfError("This PDF has no pages.");
    }

    return document;
  } catch (error) {
    throw toCropError(error);
  }
}

function get2dContext(canvas: HTMLCanvasElement | OffscreenCanvas) {
  return canvas.getContext("2d", { alpha: false }) as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

function createCanvas(width: number, height: number) {
  if (typeof globalThis.document !== "undefined") {
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  throw new CropPdfError("This browser cannot redraw PDF pages.");
}

function canvasToJpeg(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
) {
  if ("convertToBlob" in canvas) {
    return canvas
      .convertToBlob({ type: "image/jpeg", quality })
      .then(async (blob) => new Uint8Array(await blob.arrayBuffer()));
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new CropPdfError("A page could not be encoded as JPEG."));
          return;
        }

        void blob.arrayBuffer().then(
          (buffer) => resolve(new Uint8Array(buffer)),
          () =>
            reject(new CropPdfError("A page could not be encoded as JPEG.")),
        );
      },
      "image/jpeg",
      quality,
    );
  });
}

function toCropError(error: unknown) {
  if (error instanceof CropPdfError) {
    return error;
  }

  if (error instanceof PdfPasswordProtectedError) {
    return new CropPdfError("Unlock this PDF before cropping it.");
  }

  if (error instanceof PdfCorruptError) {
    return new CropPdfError("This PDF could not be read.");
  }

  if (error instanceof Error && /password/i.test(error.message)) {
    return new CropPdfError("Unlock this PDF before cropping it.");
  }

  if (error instanceof Error && error.message) {
    return new CropPdfError(error.message);
  }

  return new CropPdfError("This PDF could not be cropped.");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}
