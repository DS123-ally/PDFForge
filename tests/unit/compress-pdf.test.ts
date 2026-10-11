import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  CompressPdfError,
  compressFidelity,
  picturePagesToPdf,
  rewritePdf,
} from "@/lib/pdf/compress-pdf";
import { createEncryptedPdfBytes } from "../fixtures/pdf";

const tinyJpeg = Uint8Array.from([
  255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 255,
  219, 0, 67, 0, 8, 6, 6, 7, 6, 5, 8, 7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11,
  11, 12, 25, 18, 19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39,
  32, 34, 44, 35, 28, 28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39, 57, 61,
  56, 50, 60, 46, 51, 52, 50, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255,
  196, 0, 31, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4,
  5, 6, 7, 8, 9, 10, 11, 255, 196, 0, 181, 16, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4,
  4, 0, 0, 1, 125, 1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34,
  113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193, 21, 82, 209, 240, 36, 51, 98,
  114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55,
  56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90,
  99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122,
  131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152,
  153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181,
  182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210,
  211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231,
  232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 255, 218, 0,
  8, 1, 1, 0, 0, 63, 0, 251, 213, 219, 32, 168, 241, 69, 0, 255, 217,
]);

describe("compress pdf", () => {
  it("names the two local modes", () => {
    expect(compressFidelity.rewrite.label).toBe("Lossless rewrite");
    expect(compressFidelity.pictures.label).toBe("Page pictures");
    expect(compressFidelity.pictures.detail).toContain("Selectable text");
  });

  it("rewrites a PDF and keeps the same page count", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage();
    const font = await source.embedFont(StandardFonts.Helvetica);
    page.drawText("Compress me", { font, size: 18, x: 40, y: 80 });
    const bytes = await source.save({
      addDefaultPage: false,
      useObjectStreams: false,
    });
    const result = await rewritePdf(bytes);

    expect(result.pageCount).toBe(1);
    expect(result.outputBytes).toBeLessThanOrEqual(bytes.byteLength);
    expect(result.bytes.subarray(0, 5)).toEqual(
      Uint8Array.from([37, 80, 68, 70, 45]),
    );

    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(1);
  });

  it("returns the original bytes when a second rewrite is not smaller", async () => {
    const source = await PDFDocument.create();
    source.addPage();
    const first = await rewritePdf(await source.save());
    const second = await rewritePdf(first.bytes);

    expect(second.keptOriginal).toBe(true);
    expect(second.bytes).toBe(first.bytes);
  });

  it("builds a one-page PDF from a JPEG page", async () => {
    const bytes = await picturePagesToPdf([
      { height: 200, jpeg: tinyJpeg, width: 300 },
    ]);
    const loaded = await PDFDocument.load(bytes);
    const page = loaded.getPage(0);

    expect(loaded.getPageCount()).toBe(1);
    expect(page.getWidth()).toBe(300);
    expect(page.getHeight()).toBe(200);
  });

  it("asks for an unlock before compressing a protected PDF", async () => {
    await expect(rewritePdf(await createEncryptedPdfBytes())).rejects.toThrow(
      CompressPdfError,
    );
    await expect(rewritePdf(await createEncryptedPdfBytes())).rejects.toThrow(
      /Unlock this PDF/,
    );
  });
});
