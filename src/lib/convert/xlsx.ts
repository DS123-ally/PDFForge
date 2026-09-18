import JSZip from "jszip";

import { looksLikeTable, type ConvertPage } from "@/lib/convert/layout";
import {
  appPropertiesXml,
  contentTypesXml,
  corePropertiesXml,
  escapeXml,
  relationshipsXml,
} from "@/lib/convert/xml";

const officeRel =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRel =
  "http://schemas.openxmlformats.org/package/2006/relationships";

export async function buildXlsx(pages: readonly ConvertPage[], title: string) {
  const sheets = [
    {
      name: "Lines",
      rows: [
        ["Page", "Line", "Text"],
        ...pages.flatMap((page) =>
          page.lines.length === 0
            ? [[String(page.pageNumber), "1", "(No selectable text)"]]
            : page.lines.map((line, index) => [
                String(page.pageNumber),
                String(index + 1),
                line.text,
              ]),
        ),
      ],
    },
  ];

  const tablePages = pages.filter((page) => looksLikeTable(page.lines));

  for (const page of tablePages) {
    const columnCount = Math.max(
      1,
      ...page.lines.map((line) => line.cells.length),
    );
    sheets.push({
      name: uniqueSheetName(sheets, `Page ${page.pageNumber}`),
      rows: page.lines.map((line) =>
        Array.from(
          { length: columnCount },
          (_, index) => line.cells[index] ?? "",
        ),
      ),
    });
  }

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    contentTypesXml([
      `  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
      ...sheets.map(
        (_, index) =>
          `  <Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      ),
      `  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
      `  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`,
    ]),
  );
  zip.file(
    "_rels/.rels",
    relationshipsXml([
      {
        id: "rId1",
        target: "xl/workbook.xml",
        type: `${officeRel}/officeDocument`,
      },
      {
        id: "rId2",
        target: "docProps/core.xml",
        type: `${packageRel}/metadata/core-properties`,
      },
      {
        id: "rId3",
        target: "docProps/app.xml",
        type: `${officeRel}/extended-properties`,
      },
    ]),
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    relationshipsXml(
      sheets.map((_, index) => ({
        id: `rId${index + 1}`,
        target: `worksheets/sheet${index + 1}.xml`,
        type: `${officeRel}/worksheet`,
      })),
    ),
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${officeRel}">
  <sheets>
${sheets
  .map(
    (sheet, index) =>
      `    <sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  )
  .join("\n")}
  </sheets>
</workbook>`,
  );

  sheets.forEach((sheet, index) => {
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(sheet.rows));
  });
  zip.file("docProps/core.xml", corePropertiesXml(title));
  zip.file("docProps/app.xml", appPropertiesXml("PDFForge"));

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function worksheetXml(rows: readonly string[][]) {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value.slice(0, 32767))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${body}</sheetData>
</worksheet>`;
}

export function columnName(index: number) {
  let number = index + 1;
  let name = "";

  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }

  return name;
}

function uniqueSheetName(
  sheets: readonly { name: string }[],
  candidate: string,
) {
  const base = candidate.slice(0, 31);
  const used = new Set(sheets.map((sheet) => sheet.name));

  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;
  let name = `${base.slice(0, 28)} ${suffix}`;

  while (used.has(name)) {
    suffix += 1;
    name = `${base.slice(0, 28)} ${suffix}`;
  }

  return name;
}
