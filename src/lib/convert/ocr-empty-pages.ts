import { ocrWordsToLines, type ConvertPage } from "@/lib/convert/layout";
import { recognizeImage, terminateOcrWorker } from "@/lib/scan/ocr";
import { toArrayBuffer } from "@/lib/pdf/password-pdf";
import { pdfToImages } from "@/lib/pdf/pdf-to-images";

export async function fillEmptyPagesWithOcr(
  file: File,
  pages: ConvertPage[],
  options: { keepImages: boolean; scale: number },
) {
  const emptyPages = pages.filter((page) => page.lines.length === 0);

  if (emptyPages.length === 0) {
    return pages;
  }

  const images = await pdfToImages(file, {
    format: "png",
    pages: emptyPages.map((page) => page.pageNumber),
    quality: 0.92,
    scale: options.scale,
    sourceName: file.name,
  });

  try {
    for (const page of emptyPages) {
      const image = images.find((item) => item.pageNumber === page.pageNumber);

      if (!image) {
        continue;
      }

      const png = new Uint8Array(await image.bytes.arrayBuffer());
      const size = pngSize(png);
      const words = await recognizeImage(
        new Blob([toArrayBuffer(png)], { type: "image/png" }),
      );
      page.lines = ocrWordsToLines(words, page, size);

      if (options.keepImages) {
        page.png = png;
      }
    }
  } finally {
    await terminateOcrWorker();
  }

  return pages;
}

export function pngSize(bytes: Uint8Array) {
  if (bytes.byteLength < 24) {
    return { height: 1, width: 1 };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    height: view.getUint32(20),
    width: view.getUint32(16),
  };
}
