import { inflateSync } from "node:zlib";

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { buildDocx } from "@/lib/convert/docx";
import { buildPptx } from "@/lib/convert/pptx";
import { parseDocxXml, readCsv, readMarkdown } from "@/lib/convert/read-source";
import {
  convertSourceToPdf,
  sourceFidelity,
  sourceKindForTool,
} from "@/lib/convert/source-to-pdf";
import { buildXlsx } from "@/lib/convert/xlsx";
import type { ConvertPage } from "@/lib/convert/layout";

const samplePages: ConvertPage[] = [
  {
    height: 792,
    lines: [
      { cells: ["Invoice"], text: "Invoice", y: 700 },
      { cells: ["Widget", "2"], text: "Widget 2", y: 640 },
    ],
    pageNumber: 1,
    width: 612,
  },
];

describe("source to pdf", () => {
  it("labels fidelity for each local converter", () => {
    expect(sourceKindForTool("word-to-pdf")).toBe("docx");
    expect(sourceKindForTool("excel-to-pdf")).toBe("xlsx");
    expect(sourceKindForTool("powerpoint-to-pdf")).toBe("pptx");
    expect(sourceKindForTool("markdown-to-pdf")).toBe("markdown");
    expect(sourceKindForTool("csv-to-pdf")).toBe("csv");
    expect(sourceFidelity.docx.label).toBe("Page fidelity");
    expect(sourceFidelity.docx.detail).toContain("pictures");
    expect(sourceFidelity.xlsx.label).toBe("Cell fidelity");
    expect(sourceFidelity.pptx.label).toBe("Slide-text fidelity");
    expect(sourceFidelity.markdown.detail).toContain("Images are skipped");
    expect(sourceFidelity.csv.detail).toContain("first row is the header");
  });

  it("writes Word, Excel, and PowerPoint text into a PDF", async () => {
    const [docx, xlsx, pptx] = await Promise.all([
      buildDocx(samplePages, "invoice"),
      buildXlsx(samplePages, "invoice"),
      buildPptx(samplePages, "invoice"),
    ]);

    for (const [kind, bytes] of [
      ["docx", docx],
      ["xlsx", xlsx],
      ["pptx", pptx],
    ] as const) {
      const pdf = await convertSourceToPdf(bytes, kind);
      expect(pdf.pageCount).toBeGreaterThan(0);
      expect(pdfText(pdf.bytes)).toContain("Invoice");
      expect(pdfText(pdf.bytes)).toContain("Widget");
    }
  });

  it("keeps headings, lists, and pipe tables from Markdown", async () => {
    const parsed = readMarkdown(
      "# Title\n\nHello **world**.\n\n- One\n- Two\n\n| Item | Qty |\n| --- | --- |\n| Pen | 3 |\n\n![scan](scan.png)\n",
    );

    expect(parsed.blocks.map((block) => block.kind)).toEqual([
      "heading",
      "paragraph",
      "list",
      "table",
    ]);
    expect(parsed.warnings.join(" ")).toContain("skipped");

    const pdf = await convertSourceToPdf(
      new TextEncoder().encode("# Title\n\nHello\n"),
      "markdown",
    );
    expect(pdfText(pdf.bytes)).toContain("Title");
    expect(pdfText(pdf.bytes)).toContain("Hello");
  });

  it("keeps quoted CSV commas in one cell", async () => {
    const parsed = readCsv('Name,Note\nAda,"Hello, world"\n');
    const table = parsed.blocks[0];

    expect(table?.kind).toBe("table");
    if (table?.kind === "table") {
      expect(table.rows).toEqual([
        ["Name", "Note"],
        ["Ada", "Hello, world"],
      ]);
    }

    const pdf = await convertSourceToPdf(
      new TextEncoder().encode("Name,Note\nAda,Hello\n"),
      "csv",
    );
    expect(pdfText(pdf.bytes)).toContain("Ada");
  });

  it("reads shared strings and skips a formula with no cached value", async () => {
    const zip = new JSZip();
    zip.file(
      "xl/sharedStrings.xml",
      `<?xml version="1.0"?><sst><si><t>Shared name</t></si></sst>`,
    );
    zip.file(
      "xl/workbook.xml",
      `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      `<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>SUM(A1)</f></c></row></sheetData></worksheet>`,
    );
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const pdf = await convertSourceToPdf(bytes, "xlsx");
    const text = pdfText(pdf.bytes);

    expect(text).toContain("Shared name");
    expect(text).toContain("Data");
    expect(pdf.warnings.join(" ")).toContain("formula");
  });

  it("reads a Word heading and skips a picture", () => {
    const parsed = parseDocxXml(`<?xml version="1.0"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Overview</w:t></w:r></w:p>
          <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>First item</w:t></w:r></w:p>
          <w:p><w:r><w:drawing><w:t>hidden</w:t></w:drawing></w:r></w:p>
        </w:body>
      </w:document>`);

    expect(parsed.blocks[0]).toMatchObject({
      kind: "heading",
      text: "Overview",
    });
    expect(parsed.blocks[1]).toMatchObject({
      kind: "list",
      items: ["First item"],
    });
    expect(parsed.warnings.join(" ")).toContain("picture");
    expect(JSON.stringify(parsed.blocks)).not.toContain("hidden");
  });

  it("replaces a character the PDF font cannot draw", async () => {
    const pdf = await convertSourceToPdf(
      new TextEncoder().encode("Cost ₹ 10"),
      "markdown",
    );

    expect(pdf.replacedCharacters).toBeGreaterThan(0);
    expect(pdfText(pdf.bytes)).toContain("Cost");
    expect(pdfText(pdf.bytes)).toContain("?");
  });
});

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
    )
    .replace(/\\(\d{3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    )
    .replace(/\\n/g, "\n")
    .replace(/\\[()\\]/g, (token) => token.slice(1));
}
