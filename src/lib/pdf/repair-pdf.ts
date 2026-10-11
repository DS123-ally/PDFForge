import { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";

import { getPdfJs } from "@/lib/pdf/pdfjs";
import { isEncryptedPdfError } from "@/lib/pdf/pdf-errors";
import { savePdf } from "@/lib/pdf/save-pdf";

export type RepairMode = "pictures" | "rebuild";

export const repairFidelity: Record<
  RepairMode,
  { detail: string; label: string }
> = {
  pictures: {
    label: "Recover pictures",
    detail:
      "Each page that can be drawn is saved as a JPEG in a new PDF. Use this when a rebuild cannot read the file. Selectable text, links, and forms are not kept. Up to 80 pages.",
  },
  rebuild: {
    label: "Rebuild pages",
    detail:
      "Each page that can be read is copied into a new PDF. Selectable text stays when the page content survives. Digital signatures do not survive. Forms, attachments, outlines, and JavaScript are not kept as working features. Up to 400 pages.",
  },
};

const defaultPicturePages = 80;
const defaultRebuildPages = 400;
const headerSearchLimit = 1024 * 1024;
const maxEdge = 4096;
const pictureQuality = 0.82;
const pictureScale = 1.5;
const eofMarker = [0x25, 0x25, 0x45, 0x4f, 0x46];
const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2d];

const rebuildNote =
  "Digital signatures do not survive this rebuild. Forms, attachments, outlines, and JavaScript are not kept as working features.";
const pictureNote = "Selectable text, links, and forms are not in this file.";

export class RepairPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepairPdfError";
  }
}

export type RepairResult = {
  bytes: Uint8Array;
  mode: RepairMode;
  pageCount: number;
  skippedPages: number[];
  sourcePageCount: number;
  warnings: string[];
};

type RepairLimits = {
  maxPages?: number;
};

export async function rebuildPdf(
  bytes: Uint8Array,
  limits?: RepairLimits,
): Promise<RepairResult> {
  const maxPages = limits?.maxPages ?? defaultRebuildPages;
  const prepared = preparePdfBytes(bytes);

  try {
    const source = await loadLenient(prepared.bytes);

    if (source.getPageCount() > maxPages) {
      throw new RepairPdfError(
        `Rebuild can copy up to ${maxPages} pages in this browser.`,
      );
    }

    const copied = await copyRecoverablePages(source);

    if (copied.document.getPageCount() < 1) {
      throw new RepairPdfError(
        "No pages could be rebuilt. Try Recover pictures.",
      );
    }

    return {
      bytes: await savePdf(copied.document),
      mode: "rebuild",
      pageCount: copied.document.getPageCount(),
      skippedPages: copied.skippedPages,
      sourcePageCount: source.getPageCount(),
      warnings: [
        ...prepared.warnings,
        rebuildNote,
        ...skippedPageWarnings(copied.skippedPages, "copied"),
      ],
    };
  } catch (error) {
    throw toRepairError(error, "rebuild");
  }
}

export async function recoverPicturePdf(
  bytes: Uint8Array,
  limits?: RepairLimits,
): Promise<RepairResult> {
  const maxPages = limits?.maxPages ?? defaultPicturePages;
  const prepared = preparePdfBytes(bytes);
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: prepared.bytes.slice(),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;

    if (document.numPages < 1) {
      throw new RepairPdfError("This PDF has no pages.");
    }

    if (document.numPages > maxPages) {
      throw new RepairPdfError(
        `Recover pictures can redraw up to ${maxPages} pages in this browser.`,
      );
    }

    const drawn = await drawPages(document);
    const output = await picturePagesToPdf(drawn.pages);

    return {
      bytes: output,
      mode: "pictures",
      pageCount: drawn.pages.length,
      skippedPages: drawn.skippedPages,
      sourcePageCount: document.numPages,
      warnings: [
        ...prepared.warnings,
        pictureNote,
        ...drawn.warnings,
        ...skippedPageWarnings(drawn.skippedPages, "drawn"),
      ],
    };
  } catch (error) {
    throw toRepairError(error, "pictures");
  } finally {
    await loadingTask.destroy();
  }
}

export async function picturePagesToPdf(
  pages: readonly { height: number; jpeg: Uint8Array; width: number }[],
) {
  if (pages.length === 0) {
    throw new RepairPdfError("No pages could be recovered.");
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

function preparePdfBytes(bytes: Uint8Array) {
  if (bytes.byteLength === 0) {
    throw new RepairPdfError("This file is empty.");
  }

  const headerAt = indexOfBytes(
    bytes,
    pdfHeader,
    0,
    Math.min(bytes.byteLength, headerSearchLimit),
  );

  if (headerAt < 0) {
    throw new RepairPdfError("This file is not a PDF.");
  }

  const warnings: string[] = [];
  let body = headerAt === 0 ? bytes : bytes.subarray(headerAt);

  if (headerAt > 0) {
    warnings.push("Bytes before the PDF header were removed.");
  }

  const tailStart = Math.max(0, body.byteLength - 1024);

  if (indexOfBytes(body, eofMarker, tailStart) < 0) {
    const appended = new Uint8Array(body.byteLength + 6);
    appended.set(body);
    appended[body.byteLength] = 0x0a;
    appended.set(eofMarker, body.byteLength + 1);
    body = appended;
    warnings.push("A missing end marker was added.");
  }

  return { bytes: body, warnings };
}

async function loadLenient(bytes: Uint8Array) {
  const { PDFDocument: Loader } = await import("pdf-lib");
  const document = await Loader.load(bytes, {
    capNumbers: true,
    throwOnInvalidObject: false,
    updateMetadata: false,
  });

  if (document.getPageCount() < 1) {
    throw new RepairPdfError("This PDF has no pages.");
  }

  return document;
}

async function copyRecoverablePages(source: PDFDocument) {
  const indices = source.getPageIndices();
  const batch = await PDFDocument.create();

  try {
    const pages = await batch.copyPages(source, indices);

    for (const page of pages) {
      batch.addPage(page);
    }

    return { document: batch, skippedPages: [] as number[] };
  } catch {
    const single = await PDFDocument.create();
    const skippedPages: number[] = [];

    for (const index of indices) {
      try {
        const [page] = await single.copyPages(source, [index]);
        single.addPage(page);
      } catch {
        skippedPages.push(index + 1);
      }
    }

    return { document: single, skippedPages };
  }
}

async function drawPages(document: PDFDocumentProxy) {
  const pages: { height: number; jpeg: Uint8Array; width: number }[] = [];
  const skippedPages: number[] = [];
  let clamped = false;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    try {
      const page = await document.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      let scale = pictureScale;

      if (base.width * scale > maxEdge || base.height * scale > maxEdge) {
        scale = Math.min(maxEdge / base.width, maxEdge / base.height);
        clamped = true;
      }

      const viewport = page.getViewport({ scale });
      const canvas = globalThis.document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        throw new RepairPdfError("This browser cannot redraw PDF pages.");
      }

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();
      pages.push({
        height: base.height,
        jpeg: await canvasToJpeg(canvas),
        width: base.width,
      });
      canvas.width = 0;
      canvas.height = 0;
    } catch (error) {
      if (error instanceof RepairPdfError) {
        throw error;
      }

      skippedPages.push(pageNumber);
    }
  }

  await document.cleanup();

  if (pages.length === 0) {
    throw new RepairPdfError("No pages could be recovered.");
  }

  return {
    pages,
    skippedPages,
    warnings: clamped
      ? ["A page was drawn smaller so it would fit in this browser."]
      : [],
  };
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new RepairPdfError("A page could not be encoded as JPEG."));
          return;
        }

        void blob.arrayBuffer().then(
          (buffer) => resolve(new Uint8Array(buffer)),
          () =>
            reject(new RepairPdfError("A page could not be encoded as JPEG.")),
        );
      },
      "image/jpeg",
      pictureQuality,
    );
  });
}

function skippedPageWarnings(
  pages: readonly number[],
  verb: "copied" | "drawn",
) {
  if (pages.length === 0) {
    return [];
  }

  const label =
    pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pages.join(", ")}`;

  return [`${label} could not be ${verb}.`];
}

function toRepairError(error: unknown, mode: RepairMode): RepairPdfError {
  if (error instanceof RepairPdfError) {
    return error;
  }

  if (isPasswordError(error)) {
    return new RepairPdfError("Unlock this PDF before repairing it.");
  }

  if (mode === "rebuild") {
    return new RepairPdfError(
      "This PDF could not be rebuilt. Try Recover pictures.",
    );
  }

  return new RepairPdfError("This PDF could not be redrawn in this browser.");
}

function isPasswordError(error: unknown) {
  return (
    isEncryptedPdfError(error) ||
    (error instanceof Error &&
      (error.name === "PasswordException" ||
        /password|encrypted/i.test(error.message)))
  );
}

function indexOfBytes(
  haystack: Uint8Array,
  needle: readonly number[],
  from: number,
  to = haystack.byteLength,
) {
  const end = Math.min(haystack.byteLength, to);

  for (let index = from; index <= end - needle.length; index += 1) {
    let matched = true;

    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return index;
    }
  }

  return -1;
}
