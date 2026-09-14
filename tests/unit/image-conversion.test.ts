import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { calculateImagePlacement } from "@/lib/pdf/image-layout";
import { imagesToPdf } from "@/lib/pdf/images-to-pdf";
import { createPngBytes } from "../fixtures/pdf";

describe("calculateImagePlacement", () => {
  it("fits an image within margins", () => {
    const placement = calculateImagePlacement(
      { height: 800, width: 1200 },
      { fit: "fit", margin: 36, orientation: "portrait", pageSize: "letter" },
    );

    expect(placement.pageWidth).toBe(612);
    expect(placement.pageHeight).toBe(792);
    expect(placement.width).toBeLessThanOrEqual(540);
    expect(placement.height).toBeLessThanOrEqual(720);
  });

  it("uses landscape page orientation when requested", () => {
    const placement = calculateImagePlacement(
      { height: 1200, width: 800 },
      { fit: "fit", margin: 0, orientation: "landscape", pageSize: "a4" },
    );

    expect(placement.pageWidth).toBeGreaterThan(placement.pageHeight);
  });
});

describe("imagesToPdf", () => {
  it("creates one PDF page per image", async () => {
    const image = Uint8Array.from(createPngBytes());

    const result = await imagesToPdf(
      [
        {
          bytes: image,
          height: 12,
          mimeType: "image/png",
          name: "transparent.png",
          width: 16,
        },
      ],
      { fit: "fit", margin: 24, orientation: "portrait", pageSize: "a4" },
    );
    const pdf = await PDFDocument.load(result.outputBytes);

    expect(result.filename).toBe("transparent-combined.pdf");
    expect(result.totalPages).toBe(1);
    expect(pdf.getPageCount()).toBe(1);
  });
});
