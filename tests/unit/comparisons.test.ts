import { describe, expect, it } from "vitest";

import { comparisons, pdfForgeProcessing } from "@/config/comparisons";
import { indexablePaths } from "@/config/site";

describe("upload comparisons", () => {
  it("keeps one page each for iLovePDF, Smallpdf, and Adobe", () => {
    expect(comparisons.map((page) => page.slug)).toEqual([
      "ilovepdf",
      "smallpdf",
      "adobe",
    ]);
    expect(pdfForgeProcessing).toBe("processed in the browser");

    for (const page of comparisons) {
      expect(page.rows.length).toBeGreaterThan(0);
      expect(indexablePaths).toContain(`/compare/${page.slug}`);

      for (const row of page.rows) {
        expect(row.item.length).toBeGreaterThan(0);
        expect(row.uploads.toLowerCase()).toContain("upload");
        expect(row.uploads).not.toBe(pdfForgeProcessing);
      }
    }
  });
});
