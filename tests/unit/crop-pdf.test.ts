import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  CropPdfError,
  cropFidelity,
  cropPdf,
  normalizeCropRect,
} from "@/lib/pdf/crop-pdf";
import { createEncryptedPdfBytes } from "../fixtures/pdf";

describe("crop pdf", () => {
  it("names the two local modes", () => {
    expect(cropFidelity.boxes.label).toBe("Page boxes");
    expect(cropFidelity.pictures.label).toBe("Page pictures");
    expect(cropFidelity.boxes.detail).toContain("can remain");
    expect(cropFidelity.pictures.detail).toContain("not in the download");
  });

  it("keeps crop percents inside the page", () => {
    expect(
      normalizeCropRect({ height: 90, left: 40, top: 40, width: 90 }),
    ).toEqual({
      height: 60,
      left: 40,
      top: 40,
      width: 60,
    });
  });

  it("resizes selected pages to the crop box", async () => {
    const source = await PDFDocument.create();
    const font = await source.embedFont(StandardFonts.Helvetica);
    const first = source.addPage([320, 420]);
    first.drawText("Keep me", { font, size: 18, x: 40, y: 80 });
    source.addPage([320, 420]);
    const bytes = await source.save({
      addDefaultPage: false,
      useObjectStreams: false,
    });
    const result = await cropPdf(bytes, {
      mode: "boxes",
      rect: { height: 50, left: 25, top: 25, width: 50 },
      selection: { mode: "custom", ranges: "1" },
      sourceName: "packet.pdf",
    });
    const loaded = await PDFDocument.load(result.bytes);
    const cropped = loaded.getPage(0);
    const untouched = loaded.getPage(1);

    expect(result.pageCount).toBe(2);
    expect(result.filename).toBe("packet-cropped.pdf");
    expect(cropped.getWidth()).toBeCloseTo(160);
    expect(cropped.getHeight()).toBeCloseTo(210);
    expect(untouched.getWidth()).toBe(320);
    expect(untouched.getHeight()).toBe(420);
  });

  it("asks for an unlock before cropping a protected PDF", async () => {
    await expect(
      cropPdf(await createEncryptedPdfBytes(), {
        mode: "boxes",
        rect: { height: 80, left: 10, top: 10, width: 80 },
      }),
    ).rejects.toThrow(CropPdfError);
    await expect(
      cropPdf(await createEncryptedPdfBytes(), {
        mode: "boxes",
        rect: { height: 80, left: 10, top: 10, width: 80 },
      }),
    ).rejects.toThrow(/Unlock this PDF/);
  });

  it("rejects a crop box that is too small", async () => {
    const source = await PDFDocument.create();
    source.addPage([200, 200]);

    await expect(
      cropPdf(await source.save(), {
        mode: "boxes",
        rect: { height: 1, left: 10, top: 10, width: 1 },
      }),
    ).rejects.toThrow(/larger crop box/);
  });
});
