import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { mergePdfBuffers } from "@/lib/pdf/merge-pdf";
import { PdfPasswordProtectedError } from "@/lib/pdf/pdf-errors";
import {
  createEncryptedPdfBytes,
  createPdfBytes,
  toArrayBuffer,
} from "../fixtures/pdf";

describe("mergePdfBuffers", () => {
  it("preserves file order and every source page", async () => {
    const first = toArrayBuffer(await createPdfBytes({ pageCount: 2 }));
    const second = toArrayBuffer(await createPdfBytes({ pageCount: 3 }));

    const merged = await mergePdfBuffers([first, second]);
    const document = await PDFDocument.load(merged.outputBytes);

    expect(merged.fileCount).toBe(2);
    expect(merged.totalPages).toBe(5);
    expect(document.getPageCount()).toBe(5);
  });

  it("keeps mixed page sizes valid", async () => {
    const letter = toArrayBuffer(
      await createPdfBytes({ pageCount: 1, size: [612, 792] }),
    );
    const landscape = toArrayBuffer(
      await createPdfBytes({ pageCount: 2, size: [800, 400] }),
    );

    const merged = await mergePdfBuffers([letter, landscape]);
    const document = await PDFDocument.load(merged.outputBytes);
    const sizes = document.getPages().map((page) => page.getSize());

    expect(sizes).toEqual([
      { width: 612, height: 792 },
      { width: 800, height: 400 },
      { width: 800, height: 400 },
    ]);
  });

  it("rejects password-protected PDFs with a clear error", async () => {
    const readable = toArrayBuffer(await createPdfBytes({ pageCount: 1 }));
    const encrypted = toArrayBuffer(await createEncryptedPdfBytes());

    await expect(mergePdfBuffers([readable, encrypted])).rejects.toBeInstanceOf(
      PdfPasswordProtectedError,
    );
  });
});
