import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { splitPdfBuffer } from "@/lib/pdf/split-pdf";
import { createPdfBytes, toArrayBuffer } from "../fixtures/pdf";

describe("splitPdfBuffer", () => {
  it("extracts selected pages into one PDF", async () => {
    const source = toArrayBuffer(await createPdfBytes({ pageCount: 5 }));

    const result = await splitPdfBuffer(source, {
      mode: "extract",
      ranges: "2-4",
      sourceName: "source.pdf",
    });
    const output = await PDFDocument.load(result.outputBytes);

    expect(result.filename).toBe("source-selected-pages.pdf");
    expect(result.outputMimeType).toBe("application/pdf");
    expect(result.totalPages).toBe(3);
    expect(output.getPageCount()).toBe(3);
  });

  it("splits explicit ranges into a ZIP", async () => {
    const source = toArrayBuffer(await createPdfBytes({ pageCount: 5 }));

    const result = await splitPdfBuffer(source, {
      mode: "ranges",
      ranges: "1-2, 4",
      sourceName: "source.pdf",
    });
    const zip = await JSZip.loadAsync(result.outputBytes);

    expect(result.filename).toBe("source-split.zip");
    expect(result.outputMimeType).toBe("application/zip");
    expect(Object.keys(zip.files).sort()).toEqual([
      "source-pages-1-2.pdf",
      "source-pages-4.pdf",
    ]);
  });

  it("splits every page into a ZIP", async () => {
    const source = toArrayBuffer(await createPdfBytes({ pageCount: 3 }));

    const result = await splitPdfBuffer(source, {
      mode: "every-page",
      sourceName: "source.pdf",
    });
    const zip = await JSZip.loadAsync(result.outputBytes);

    expect(result.fileCount).toBe(3);
    expect(Object.keys(zip.files).sort()).toEqual([
      "source-pages-1.pdf",
      "source-pages-2.pdf",
      "source-pages-3.pdf",
    ]);
  });
});
