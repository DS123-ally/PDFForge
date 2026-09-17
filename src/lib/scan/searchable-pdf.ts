import { imagesToPdf, type ImagesToPdfOptions } from "@/lib/pdf/images-to-pdf";
import { calculateImagePlacement } from "@/lib/pdf/image-layout";
import { savePdf } from "@/lib/pdf/save-pdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type OcrWord = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export async function scannedPagesToPdf(
  pages: ReadonlyArray<{
    bytes: ArrayBuffer | Uint8Array;
    height: number;
    mimeType: string;
    name: string;
    words?: readonly OcrWord[];
    width: number;
  }>,
  options: ImagesToPdfOptions,
) {
  const result = await imagesToPdf(pages, options);
  const hasText = pages.some((page) => (page.words?.length ?? 0) > 0);

  if (!hasText) {
    return result;
  }

  const pdf = await PDFDocument.load(result.outputBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  pages.forEach((page, index) => {
    if (!page.words?.length) {
      return;
    }

    const pdfPage = pdf.getPage(index);
    const placement = calculateImagePlacement(page, options);

    for (const word of page.words) {
      const text = word.text.trim();

      if (!text) {
        continue;
      }

      const widthScale = placement.width / Math.max(1, page.width);
      const heightScale = placement.height / Math.max(1, page.height);
      const wordHeight = Math.max(4, (word.y1 - word.y0) * heightScale * 0.85);
      const x = placement.x + word.x0 * widthScale;
      const y = placement.y + (page.height - word.y1) * heightScale;

      pdfPage.drawText(text, {
        color: rgb(1, 1, 1),
        font,
        opacity: 0,
        size: wordHeight,
        x,
        y,
      });
    }
  });

  return {
    ...result,
    outputBytes: toArrayBuffer(await savePdf(pdf)),
  };
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
