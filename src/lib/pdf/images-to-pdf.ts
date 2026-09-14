import { PDFDocument } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import {
  calculateImagePlacement,
  type ImageFitMode,
  type ImageOrientation,
  type ImagePageSize,
} from "@/lib/pdf/image-layout";
import { savePdf } from "@/lib/pdf/save-pdf";

export type ImageInput = {
  bytes: ArrayBuffer | Uint8Array;
  height: number;
  mimeType: string;
  name: string;
  width: number;
};

export type ImagesToPdfOptions = {
  fit: ImageFitMode;
  margin: number;
  orientation: ImageOrientation;
  pageSize: ImagePageSize;
};

export async function imagesToPdf(
  images: readonly ImageInput[],
  options: ImagesToPdfOptions,
) {
  if (images.length === 0) {
    throw new Error("Choose at least one image.");
  }

  const pdf = await PDFDocument.create();

  for (const image of images) {
    const embeddedImage =
      image.mimeType === "image/png" ||
      image.name.toLowerCase().endsWith(".png")
        ? await pdf.embedPng(image.bytes)
        : await pdf.embedJpg(image.bytes);
    const placement = calculateImagePlacement(image, options);
    const page = pdf.addPage([placement.pageWidth, placement.pageHeight]);

    page.drawImage(embeddedImage, {
      height: placement.height,
      width: placement.width,
      x: placement.x,
      y: placement.y,
    });
  }

  return {
    fileCount: images.length,
    filename: createOutputName(images[0]?.name ?? "images.pdf", {
      suffix: "combined",
    }),
    outputBytes: toArrayBuffer(await savePdf(pdf)),
    totalPages: images.length,
  };
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
