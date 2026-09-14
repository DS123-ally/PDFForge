import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { normalizeRotation, organizePdfBuffer } from "@/lib/pdf/organize-pdf";
import { createPdfBytes, toArrayBuffer } from "../fixtures/pdf";

describe("organizePdfBuffer", () => {
  it("reorders, rotates, and deletes pages in the saved PDF", async () => {
    const source = toArrayBuffer(await createPdfBytes({ pageCount: 3 }));

    const result = await organizePdfBuffer(source, {
      pages: [
        { pageNumber: 3, rotation: 90 },
        { pageNumber: 1, rotation: 180 },
      ],
      sourceName: "source.pdf",
    });
    const output = await PDFDocument.load(result.outputBytes);

    expect(result.filename).toBe("source-organized.pdf");
    expect(result.totalPages).toBe(2);
    expect(output.getPageCount()).toBe(2);
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([
      90, 180,
    ]);
  });

  it("normalizes rotations to right angles", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(Number.NaN)).toBe(0);
  });
});
