import JSZip from "jszip";

import { createOutputName } from "@/lib/files/create-output-name";
import { getPdfJs } from "@/lib/pdf/pdfjs";

export type PdfImageFormat = "png" | "jpg";

export type PdfToImagesOptions = {
  format: PdfImageFormat;
  pages: readonly number[];
  quality: number;
  scale: number;
  sourceName: string;
};

export type PdfImageOutput = {
  bytes: Blob;
  filename: string;
  pageNumber: number;
};

export async function pdfToImages(file: File, options: PdfToImagesOptions) {
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
    const outputs: PdfImageOutput[] = [];

    for (const pageNumber of options.pages) {
      if (pageNumber < 1 || pageNumber > document.numPages) {
        throw new Error(`Choose pages between 1 and ${document.numPages}.`);
      }

      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: options.scale });
      const canvas = globalThis.document.createElement("canvas");
      const context = canvas.getContext("2d", {
        alpha: options.format === "png",
      });

      if (!context) {
        throw new Error("This browser cannot render PDF pages to images.");
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
      page.cleanup();

      outputs.push({
        bytes: await canvasToBlob(canvas, options.format, options.quality),
        filename: createOutputName(options.sourceName, {
          extension: `.${options.format}`,
          suffix: `page-${pageNumber}`,
        }),
        pageNumber,
      });
      canvas.width = 0;
      canvas.height = 0;
    }

    await document.cleanup();
    return outputs;
  } finally {
    await loadingTask.destroy();
  }
}

export async function createImagesZip(
  outputs: readonly PdfImageOutput[],
  sourceName: string,
) {
  const zip = new JSZip();

  for (const output of outputs) {
    zip.file(output.filename, await output.bytes.arrayBuffer());
  }

  return {
    bytes: new Blob(
      [toArrayBuffer(await zip.generateAsync({ type: "uint8array" }))],
      {
        type: "application/zip",
      },
    ),
    filename: createOutputName(sourceName, {
      extension: ".zip",
      suffix: "images",
    }),
  };
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: PdfImageFormat,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("This browser could not export the rendered page."));
      },
      format === "png" ? "image/png" : "image/jpeg",
      quality,
    );
  });
}
