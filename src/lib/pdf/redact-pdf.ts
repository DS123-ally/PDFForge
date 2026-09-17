import type { PDFPageProxy } from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import { getPdfJs } from "@/lib/pdf/pdfjs";
import { toArrayBuffer } from "@/lib/pdf/password-pdf";

export type RedactionRegion = {
  height: number;
  pageNumber: number;
  width: number;
  x: number;
  y: number;
};

export type RedactPdfOptions = {
  rasterizePages?: readonly number[];
  regions: readonly RedactionRegion[];
  scale?: number;
  sourceName?: string;
};

export function percentRectToPdfRegion(
  pageSize: { height: number; width: number },
  pageNumber: number,
  rect: { height: number; left: number; top: number; width: number },
): RedactionRegion {
  const width = (clampPercent(rect.width) / 100) * pageSize.width;
  const height = (clampPercent(rect.height) / 100) * pageSize.height;
  const x = (clampPercent(rect.left) / 100) * pageSize.width;
  const y =
    pageSize.height - (clampPercent(rect.top) / 100) * pageSize.height - height;

  return {
    height,
    pageNumber,
    width,
    x,
    y,
  };
}

export async function redactPdf(file: File, options: RedactPdfOptions) {
  const regions = options.regions.filter(
    (region) => region.width > 0 && region.height > 0,
  );
  const rasterizePages = new Set(options.rasterizePages ?? []);

  if (regions.length === 0 && rasterizePages.size === 0) {
    throw new Error("Draw or add at least one redaction region.");
  }

  const sourceBytes = await file.arrayBuffer();
  const source = await PDFDocument.load(sourceBytes);
  const output = await PDFDocument.create();
  const scale = options.scale ?? 2;

  for (let index = 0; index < source.getPageCount(); index += 1) {
    const pageNumber = index + 1;
    const pageRegions = regions.filter(
      (region) => region.pageNumber === pageNumber,
    );

    if (pageRegions.length === 0 && !rasterizePages.has(pageNumber)) {
      const [copiedPage] = await output.copyPages(source, [index]);
      output.addPage(copiedPage);
      continue;
    }

    const pngBytes = await renderRedactedPage(
      file,
      pageNumber,
      pageRegions,
      scale,
    );
    const image = await output.embedPng(pngBytes);
    const size = source.getPage(index).getSize();
    const page = output.addPage([size.width, size.height]);
    page.drawImage(image, {
      height: size.height,
      width: size.width,
      x: 0,
      y: 0,
    });
  }

  return {
    fileCount: 1,
    filename: createOutputName(options.sourceName ?? file.name, {
      suffix: "redacted",
    }),
    outputBytes: toArrayBuffer(await output.save()),
    totalPages: output.getPageCount(),
  };
}

export async function rasterizeUnlockedPdf(
  file: File,
  password: string,
  sourceName = file.name,
) {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
    password,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    const output = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const pngBytes = await renderPdfPageToPng(page, 2);
      const image = await output.embedPng(pngBytes);
      const viewport = page.getViewport({ scale: 1 });
      const outputPage = output.addPage([viewport.width, viewport.height]);
      outputPage.drawImage(image, {
        height: viewport.height,
        width: viewport.width,
        x: 0,
        y: 0,
      });
      page.cleanup();
    }

    await document.cleanup();

    return {
      fileCount: 1,
      filename: createOutputName(sourceName, { suffix: "unlocked-raster" }),
      outputBytes: toArrayBuffer(await output.save()),
      totalPages: document.numPages,
      wasEncrypted: true,
    };
  } finally {
    await loadingTask.destroy();
  }
}

async function renderRedactedPage(
  file: File,
  pageNumber: number,
  regions: readonly RedactionRegion[],
  scale: number,
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
    const page = await document.getPage(pageNumber);
    const pngBytes = await renderPdfPageToPng(
      page,
      scale,
      (context, viewport) => {
        context.fillStyle = "#000000";

        for (const region of regions) {
          const x = region.x * scale;
          const width = region.width * scale;
          const height = region.height * scale;
          const y = viewport.height - region.y * scale - height;
          context.fillRect(x, y, width, height);
        }
      },
    );
    page.cleanup();
    await document.cleanup();
    return pngBytes;
  } finally {
    await loadingTask.destroy();
  }
}

async function renderPdfPageToPng(
  page: PDFPageProxy,
  scale: number,
  afterRender?: (
    context: CanvasRenderingContext2D,
    viewport: { height: number; width: number },
  ) => void,
) {
  const viewport = page.getViewport({ scale });
  const canvas = globalThis.document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("This browser cannot rasterize PDF pages.");
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;
  afterRender?.(context, viewport);

  const bytes = await canvasToPngBytes(canvas);
  canvas.width = 0;
  canvas.height = 0;
  return bytes;
}

function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("This browser could not export the redacted page."));
        return;
      }

      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)));
    }, "image/png");
  });
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}
