import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { flattenPdfBuffer } from "@/lib/pdf/flatten-pdf";
import { protectPdfBuffer, unlockPdfBuffer } from "@/lib/pdf/password-pdf";
import { PdfWrongPasswordError } from "@/lib/pdf/pdf-errors";
import { percentRectToPdfRegion } from "@/lib/pdf/redact-pdf";
import { createTextPdfBytes, toArrayBuffer } from "../fixtures/pdf";

describe("password PDF tools", () => {
  it("protects a PDF with AES-256 and unlocks it with the correct password", async () => {
    const source = toArrayBuffer(await createTextPdfBytes("Visible invoice"));
    const protectedPdf = await protectPdfBuffer(
      source,
      "test-pass-123",
      "invoice.pdf",
    );

    await expect(PDFDocument.load(protectedPdf.outputBytes)).rejects.toThrow(
      /encrypted/i,
    );

    const unlocked = await unlockPdfBuffer(
      protectedPdf.outputBytes,
      "test-pass-123",
      "invoice.pdf",
    );
    const readable = await PDFDocument.load(unlocked.outputBytes);

    expect(protectedPdf.encryption).toContain("AES-256");
    expect(protectedPdf.filename).toBe("invoice-protected.pdf");
    expect(unlocked.filename).toBe("invoice-unlocked.pdf");
    expect(readable.getPageCount()).toBe(1);
  });

  it("rejects the wrong password without returning document bytes", async () => {
    const source = toArrayBuffer(await createTextPdfBytes());
    const protectedPdf = await protectPdfBuffer(source, "test-pass-123");

    await expect(
      unlockPdfBuffer(protectedPdf.outputBytes, "wrong-pass-123"),
    ).rejects.toBeInstanceOf(PdfWrongPasswordError);
  });
});

describe("flattenPdfBuffer", () => {
  it("burns AcroForm field values into the page and removes the fields", async () => {
    const source = await createFormPdfBytes();
    const result = await flattenPdfBuffer(source, "form.pdf");
    const output = await PDFDocument.load(result.outputBytes);

    expect(result.flattenedFieldCount).toBe(1);
    expect(output.getForm().getFields()).toHaveLength(0);
    expect(result.filename).toBe("form-flattened.pdf");
  });
});

describe("percentRectToPdfRegion", () => {
  it("converts top-left percentages into PDF user space", () => {
    const region = percentRectToPdfRegion({ height: 420, width: 320 }, 1, {
      height: 50,
      left: 10,
      top: 0,
      width: 50,
    });

    expect(region.x).toBeCloseTo(32);
    expect(region.width).toBeCloseTo(160);
    expect(region.height).toBeCloseTo(210);
    expect(region.y).toBeCloseTo(210);
  });
});

async function createFormPdfBytes() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([320, 420]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  const field = form.createTextField("account");
  field.setText("FORM-SECRET");
  field.addToPage(page, { height: 24, width: 180, x: 40, y: 300 });
  form.updateFieldAppearances(font);
  return toArrayBuffer(await pdf.save());
}
