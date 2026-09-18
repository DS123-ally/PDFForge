import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { buildDocx } from "@/lib/convert/docx";
import { buildHtml } from "@/lib/convert/html";
import {
  groupRunsIntoLines,
  ocrWordsToLines,
  type ConvertPage,
} from "@/lib/convert/layout";
import { pngSize } from "@/lib/convert/ocr-empty-pages";
import { buildPptx } from "@/lib/convert/pptx";
import { escapeXml } from "@/lib/convert/xml";
import { buildXlsx, columnName } from "@/lib/convert/xlsx";

const samplePages: ConvertPage[] = [
  {
    height: 792,
    lines: [
      { cells: ["Invoice"], text: "Invoice", y: 700 },
      { cells: ["Item", "Qty"], text: "Item Qty", y: 660 },
      { cells: ["Widget", "2"], text: "Widget 2", y: 640 },
    ],
    pageNumber: 1,
    width: 612,
  },
];

describe("convert layout", () => {
  it("splits wide horizontal gaps into cells", () => {
    const lines = groupRunsIntoLines([
      { height: 12, str: "Name", width: 40, x: 20, y: 400 },
      { height: 12, str: "Amount", width: 50, x: 220, y: 400 },
      { height: 12, str: "Ada", width: 30, x: 20, y: 370 },
      { height: 12, str: "12", width: 20, x: 220, y: 370 },
    ]);

    expect(lines[0]?.cells).toEqual(["Name", "Amount"]);
    expect(lines[1]?.cells).toEqual(["Ada", "12"]);
  });

  it("maps OCR boxes into reading-order lines", () => {
    const lines = ocrWordsToLines(
      [
        { text: "Hello", x0: 10, x1: 50, y0: 10, y1: 20 },
        { text: "world", x0: 60, x1: 110, y0: 10, y1: 20 },
      ],
      { height: 100, width: 200 },
      { height: 100, width: 200 },
    );

    expect(lines[0]?.text).toBe("Hello world");
  });
});

describe("office packages", () => {
  it("escapes XML and names Excel columns", () => {
    expect(escapeXml(`A <B> & "C"`)).toBe("A &lt;B&gt; &amp; &quot;C&quot;");
    expect(columnName(0)).toBe("A");
    expect(columnName(26)).toBe("AA");
  });

  it("embeds text in Word, Excel, PowerPoint, and HTML", async () => {
    const [docx, xlsx, pptx] = await Promise.all([
      buildDocx(samplePages, "invoice"),
      buildXlsx(samplePages, "invoice"),
      buildPptx(samplePages, "invoice"),
    ]);
    const html = buildHtml(samplePages, "invoice");
    const wordZip = await JSZip.loadAsync(docx);
    const excelZip = await JSZip.loadAsync(xlsx);
    const deckZip = await JSZip.loadAsync(pptx);
    const documentXml = await wordZip
      .file("word/document.xml")
      ?.async("string");
    const sheetXml = await excelZip
      .file("xl/worksheets/sheet2.xml")
      ?.async("string");
    const slideXml = await deckZip
      .file("ppt/slides/slide1.xml")
      ?.async("string");

    expect(documentXml).toContain("Invoice");
    expect(sheetXml).toContain("Widget");
    expect(slideXml).toContain("Invoice");
    expect(html).toContain("<td>Widget</td>");
    expect(html).not.toContain("<script");
  });

  it("reads PNG width and height from IHDR", async () => {
    const { createPngBytes } = await import("../fixtures/pdf");
    expect(pngSize(createPngBytes())).toEqual({ height: 12, width: 16 });
  });
});
