import { blocksToPdf } from "@/lib/convert/text-pdf";
import {
  readCsv,
  readDocx,
  readMarkdown,
  readPptx,
  readXlsx,
} from "@/lib/convert/read-source";

export const sourceKinds = ["docx", "xlsx", "pptx", "markdown", "csv"] as const;

export type SourceKind = (typeof sourceKinds)[number];

export const sourceFidelity: Record<
  SourceKind,
  { detail: string; label: string }
> = {
  csv: {
    label: "Table fidelity",
    detail:
      "Rows and columns become a PDF table. The first row is the header. Columns split on commas. A CSV file has no fonts, charts, or formulas.",
  },
  docx: {
    label: "Page fidelity",
    detail:
      "Each Word page is drawn in this browser, including pictures, headers, footers, tables, and the page size. The words stay selectable. Calibri, Cambria, Arial, Times New Roman, Courier New, and Aptos are included, and a font embedded in the Word file is used.",
  },
  markdown: {
    label: "Text fidelity",
    detail:
      "Headings, paragraphs, lists, and simple pipe tables become PDF text. Images are skipped. Raw HTML is reduced to its text.",
  },
  pptx: {
    label: "Slide-text fidelity",
    detail:
      "Each slide becomes a page of its text. Pictures, shapes, animations, and the slide design are not reconstructed.",
  },
  xlsx: {
    label: "Cell fidelity",
    detail:
      "Each sheet becomes a table of cell text. Formulas use the cached value stored in the file. Dates may appear as Excel serial numbers. Charts, styles, and print layout are not reconstructed.",
  },
};

const toolKinds = {
  "csv-to-pdf": "csv",
  "excel-to-pdf": "xlsx",
  "markdown-to-pdf": "markdown",
  "powerpoint-to-pdf": "pptx",
  "word-to-pdf": "docx",
} as const satisfies Record<string, SourceKind>;

export type SourcePdfTool = keyof typeof toolKinds;

export function sourceKindForTool(slug: string): SourceKind | null {
  if (slug in toolKinds) {
    return toolKinds[slug as SourcePdfTool];
  }

  return null;
}

export async function convertSourceToPdf(bytes: Uint8Array, kind: SourceKind) {
  const parsed =
    kind === "docx"
      ? await readDocx(bytes)
      : kind === "xlsx"
        ? await readXlsx(bytes)
        : kind === "pptx"
          ? await readPptx(bytes)
          : kind === "markdown"
            ? readMarkdown(new TextDecoder().decode(bytes))
            : readCsv(new TextDecoder().decode(bytes));
  const pdf = await blocksToPdf(parsed.blocks);

  return {
    ...pdf,
    fidelity: sourceFidelity[kind],
    warnings: parsed.warnings,
  };
}
