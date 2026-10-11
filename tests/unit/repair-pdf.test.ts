import { inflateSync } from "node:zlib";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  picturePagesToPdf,
  rebuildPdf,
  RepairPdfError,
  repairFidelity,
} from "@/lib/pdf/repair-pdf";
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

describe("repair pdf", () => {
  it("names the two local modes", () => {
    expect(repairFidelity.rebuild.label).toBe("Rebuild pages");
    expect(repairFidelity.pictures.label).toBe("Recover pictures");
    expect(repairFidelity.rebuild.detail).toContain("Digital signatures");
    expect(repairFidelity.pictures.detail).toContain("Selectable text");
  });

  it("rebuilds a PDF and keeps the page text", async () => {
    const bytes = await pdfWithText("Repair me");
    const result = await rebuildPdf(bytes);
    const loaded = await PDFDocument.load(result.bytes);

    expect(result.mode).toBe("rebuild");
    expect(result.pageCount).toBe(1);
    expect(result.sourcePageCount).toBe(1);
    expect(result.skippedPages).toEqual([]);
    expect(result.warnings.join(" ")).toContain("Digital signatures");
    expect(loaded.getPageCount()).toBe(1);
    expect(pdfText(result.bytes)).toContain("Repair me");
  });

  it("drops bytes before the PDF header and still rebuilds", async () => {
    const bytes = await pdfWithText("After junk");
    const junk = new TextEncoder().encode("download-junk\n");
    const wrapped = new Uint8Array(junk.length + bytes.length);
    wrapped.set(junk);
    wrapped.set(bytes, junk.length);
    const result = await rebuildPdf(wrapped);

    expect(result.warnings).toContain(
      "Bytes before the PDF header were removed.",
    );
    expect(result.pageCount).toBe(1);
    expect(pdfText(result.bytes)).toContain("After junk");
  });

  it("adds a missing end marker before rebuilding", async () => {
    const bytes = await pdfWithText("Trimmed end");
    const eof = Buffer.from(bytes).lastIndexOf("%%EOF");
    const trimmed = bytes.subarray(0, eof);
    const result = await rebuildPdf(trimmed);

    expect(result.warnings).toContain("A missing end marker was added.");
    expect(result.pageCount).toBe(1);
    expect(pdfText(result.bytes)).toContain("Trimmed end");
  });

  it("stops when the page count is above the rebuild limit", async () => {
    const source = await PDFDocument.create();
    source.addPage();
    source.addPage();

    await expect(
      rebuildPdf(await source.save(), { maxPages: 1 }),
    ).rejects.toThrow(/up to 1 pages/);
  });

  it("rejects a file that is not a PDF", async () => {
    await expect(rebuildPdf(new TextEncoder().encode("hello"))).rejects.toThrow(
      RepairPdfError,
    );
    await expect(rebuildPdf(new TextEncoder().encode("hello"))).rejects.toThrow(
      /not a PDF/,
    );
  });

  it("rejects an empty file", async () => {
    await expect(rebuildPdf(new Uint8Array())).rejects.toThrow(/empty/);
  });

  it("asks for an unlock before repairing a protected PDF", async () => {
    await expect(rebuildPdf(await createEncryptedPdfBytes())).rejects.toThrow(
      /Unlock this PDF/,
    );
  });

  it("builds a one-page PDF from a recovered JPEG page", async () => {
    const bytes = await picturePagesToPdf([
      { height: 200, jpeg: tinyJpeg, width: 300 },
    ]);
    const loaded = await PDFDocument.load(bytes);
    const page = loaded.getPage(0);

    expect(loaded.getPageCount()).toBe(1);
    expect(page.getWidth()).toBe(300);
    expect(page.getHeight()).toBe(200);
  });
});

async function pdfWithText(text: string) {
  const source = await PDFDocument.create();
  const page = source.addPage();
  const font = await source.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { font, size: 18, x: 40, y: 80 });

  return source.save({ addDefaultPage: false, useObjectStreams: false });
}

function pdfText(bytes: Uint8Array) {
  const latin = Buffer.from(bytes).toString("latin1");
  const parts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRe.exec(latin))) {
    const raw = Buffer.from(match[1] ?? "", "latin1");
    let decoded = raw.toString("latin1");

    try {
      decoded = inflateSync(raw).toString("latin1");
    } catch {
      decoded = raw.toString("latin1");
    }

    parts.push(decoded);
  }

  return parts
    .join("\n")
    .replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex: string) =>
      Buffer.from(hex.replace(/\s+/g, ""), "hex").toString("latin1"),
    );
}
