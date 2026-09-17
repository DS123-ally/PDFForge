import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { detectDocumentQuad } from "@/lib/scan/detect-quad";
import { applyHomography, computeHomography } from "@/lib/scan/homography";
import { createRaster } from "@/lib/scan/image-data";
import {
  fullFrameQuad,
  orderQuad,
  outputSizeForQuad,
  quadsAreStable,
} from "@/lib/scan/quad";
import { scannedPagesToPdf } from "@/lib/scan/searchable-pdf";
import { warpImageData } from "@/lib/scan/warp";
import { createPngBytes } from "../fixtures/pdf";

describe("scan geometry", () => {
  it("orders corners top-left, top-right, bottom-right, bottom-left", () => {
    const ordered = orderQuad([
      { x: 80, y: 90 },
      { x: 10, y: 12 },
      { x: 12, y: 88 },
      { x: 84, y: 14 },
    ]);

    expect(ordered[0]).toEqual({ x: 10, y: 12 });
    expect(ordered[1]).toEqual({ x: 84, y: 14 });
    expect(ordered[2]).toEqual({ x: 80, y: 90 });
    expect(ordered[3]).toEqual({ x: 12, y: 88 });
  });

  it("maps a square through an identity homography", () => {
    const quad = fullFrameQuad(4, 4);
    const homography = computeHomography(quad, quad);
    const mapped = applyHomography(homography, 2, 3);

    expect(mapped.x).toBeCloseTo(2, 5);
    expect(mapped.y).toBeCloseTo(3, 5);
  });

  it("detects a light rectangle on a dark background", () => {
    const image = documentRectImage();
    const quad = detectDocumentQuad(image);

    expect(quad[0].x).toBeLessThan(20);
    expect(quad[0].y).toBeLessThan(16);
    expect(quad[2].x).toBeGreaterThan(60);
    expect(quad[2].y).toBeGreaterThan(44);
  });

  it("warps a solid block without shrinking to empty", () => {
    const image = documentRectImage();
    const warped = warpImageData(image, detectDocumentQuad(image), 200);

    expect(warped.width).toBeGreaterThan(20);
    expect(warped.height).toBeGreaterThan(20);
    expect(outputSizeForQuad(fullFrameQuad(100, 200), 50).height).toBe(50);
    expect(quadsAreStable(fullFrameQuad(10, 10), fullFrameQuad(10, 10))).toBe(
      true,
    );
  });
});

describe("searchable scan PDF", () => {
  it("embeds OCR words into the image PDF", async () => {
    const image = Uint8Array.from(createPngBytes());
    const plain = await scannedPagesToPdf(
      [
        {
          bytes: image,
          height: 12,
          mimeType: "image/png",
          name: "page.png",
          width: 16,
        },
      ],
      { fit: "fit", margin: 12, orientation: "portrait", pageSize: "a4" },
    );
    const searchable = await scannedPagesToPdf(
      [
        {
          bytes: image,
          height: 12,
          mimeType: "image/png",
          name: "page.png",
          width: 16,
          words: [{ text: "HELLO", x0: 1, y0: 1, x1: 12, y1: 8 }],
        },
      ],
      { fit: "fit", margin: 12, orientation: "portrait", pageSize: "a4" },
    );
    const pdf = await PDFDocument.load(searchable.outputBytes);

    expect(pdf.getPageCount()).toBe(1);
    expect(searchable.outputBytes.byteLength).toBeGreaterThan(
      plain.outputBytes.byteLength,
    );
  });
});

function documentRectImage() {
  const width = 80;
  const height = 60;
  const raster = createRaster(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inside = x >= 12 && x <= 68 && y >= 10 && y <= 50;
      const value = inside ? 240 : 20;
      const index = (y * width + x) * 4;
      raster.data[index] = value;
      raster.data[index + 1] = value;
      raster.data[index + 2] = value;
      raster.data[index + 3] = 255;
    }
  }

  return raster;
}
