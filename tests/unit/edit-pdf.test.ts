import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { editPdfBuffer } from "@/lib/pdf/edit-pdf";
import { readPdfMetadata } from "@/lib/pdf/metadata";
import { createPdfBytes, toArrayBuffer } from "../fixtures/pdf";

describe("editPdfBuffer", () => {
  it("rotates selected pages", async () => {
    const source = toArrayBuffer(await createPdfBytes({ pageCount: 3 }));

    const result = await editPdfBuffer(
      source,
      {
        degrees: 90,
        selection: { mode: "custom", ranges: "2" },
        type: "rotate",
      },
      "source.pdf",
    );
    const output = await PDFDocument.load(result.outputBytes);

    expect(result.filename).toBe("source-rotated.pdf");
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([
      0, 90, 0,
    ]);
  });

  it("removes common metadata fields", async () => {
    const source = await createPdfWithMetadata();

    const result = await editPdfBuffer(
      source,
      { type: "remove-metadata" },
      "private.pdf",
    );
    const metadata = await readPdfMetadata(result.outputBytes);

    expect(result.filename).toBe("private-metadata-cleaned.pdf");
    expect(metadata.title).toBe("");
    expect(metadata.author).toBe("");
    expect(metadata.creator).toBe("PDFForge");
  });

  it("adds visual text overlays without changing page count", async () => {
    const source = toArrayBuffer(await createPdfBytes({ pageCount: 2 }));

    const watermarked = await editPdfBuffer(source, {
      opacity: 0.2,
      position: "center",
      rotation: -35,
      text: "Draft",
      type: "watermark",
    });
    const numbered = await editPdfBuffer(watermarked.outputBytes, {
      format: "page-of-total",
      position: "bottom-right",
      startNumber: 1,
      type: "page-numbers",
    });
    const output = await PDFDocument.load(numbered.outputBytes);

    expect(output.getPageCount()).toBe(2);
  });
});

async function createPdfWithMetadata() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([320, 420]);

  page.drawText("Visible content remains.", { font, x: 32, y: 360 });
  pdf.setTitle("Private title");
  pdf.setAuthor("Private author");
  pdf.setSubject("Private subject");
  pdf.setCreator("Source app");
  pdf.setProducer("Source producer");

  return toArrayBuffer(await pdf.save());
}
