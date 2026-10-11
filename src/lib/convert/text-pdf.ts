import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { type PdfBlock, SourceDocumentError } from "@/lib/convert/read-source";
import { savePdf } from "@/lib/pdf/save-pdf";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
const contentWidth = pageWidth - margin * 2;
const ink = rgb(0.09, 0.09, 0.11);
const muted = rgb(0.35, 0.35, 0.38);
const lineColor = rgb(0.82, 0.82, 0.85);
const maxPages = 400;

export async function blocksToPdf(blocks: readonly PdfBlock[]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let replacedCharacters = 0;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function ensure(height: number) {
    if (y - height >= margin) {
      return;
    }

    if (pdf.getPageCount() >= maxPages) {
      throw new SourceDocumentError(
        "This file would create more than 400 PDF pages.",
      );
    }

    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  function drawLines(
    lines: readonly string[],
    usedFont: PDFFont,
    size: number,
    color: ReturnType<typeof rgb>,
    indent = 0,
  ) {
    for (const line of lines) {
      ensure(size + 4);
      page.drawText(line, {
        color,
        font: usedFont,
        size,
        x: margin + indent,
        y: y - size,
      });
      y -= size + 4;
    }
  }

  function writeText(
    value: string,
    usedFont: PDFFont,
    size: number,
    color: ReturnType<typeof rgb>,
    indent = 0,
  ) {
    for (const part of value.split("\n")) {
      const safe = sanitize(usedFont, part);
      replacedCharacters += safe.replaced;
      drawLines(
        wrapText(safe.text, usedFont, size, contentWidth - indent),
        usedFont,
        size,
        color,
        indent,
      );
    }
  }

  for (const block of blocks) {
    y -= 8;

    if (block.kind === "heading") {
      const size = block.level === 1 ? 16 : block.level === 2 ? 13 : 12;
      writeText(block.text, bold, size, ink);
    } else if (block.kind === "paragraph") {
      writeText(block.text, font, 11, ink);
    } else if (block.kind === "list") {
      for (const item of block.items) {
        writeText(`- ${item}`, font, 11, ink, 8);
      }
    } else {
      drawTable(block.rows, block.header);
    }
  }

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    const label = `${index + 1} / ${pages.length}`;
    item.drawText(label, {
      color: muted,
      font,
      size: 9,
      x: pageWidth - margin - font.widthOfTextAtSize(label, 9),
      y: 28,
    });
  });

  return {
    bytes: await savePdf(pdf),
    pageCount: pdf.getPageCount(),
    replacedCharacters,
  };

  function drawTable(rows: readonly string[][], header: boolean) {
    const columnCount = Math.max(1, ...rows.map((row) => row.length));

    if (columnCount > 6) {
      for (const row of rows) {
        writeText(row.filter(Boolean).join("  |  "), font, 9, ink);
        y -= 4;
      }
      return;
    }

    const columnWidth = contentWidth / columnCount;
    const size = columnCount > 4 ? 8 : 9;

    for (const [rowIndex, row] of rows.entries()) {
      const usedFont = header && rowIndex === 0 ? bold : font;
      const cellLines = Array.from({ length: columnCount }, (_, index) => {
        const safe = sanitize(usedFont, row[index] ?? "");
        replacedCharacters += safe.replaced;
        const lines = wrapText(safe.text, usedFont, size, columnWidth - 8);
        return lines.slice(0, 3);
      });
      const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = lineCount * (size + 3) + 8;
      ensure(rowHeight);
      const top = y;

      for (let column = 0; column < columnCount; column += 1) {
        const x = margin + column * columnWidth;
        page.drawRectangle({
          borderColor: lineColor,
          borderWidth: 0.6,
          height: rowHeight,
          width: columnWidth,
          x,
          y: top - rowHeight,
        });
        cellLines[column]?.forEach((line, lineIndex) => {
          page.drawText(line, {
            color: ink,
            font: usedFont,
            size,
            x: x + 4,
            y: top - 6 - size - lineIndex * (size + 3),
          });
        });
      }

      y -= rowHeight;
    }
  }
}

function sanitize(font: PDFFont, value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  try {
    font.widthOfTextAtSize(normalized || " ", 11);
    return { replaced: 0, text: normalized };
  } catch {
    let replaced = 0;
    let text = "";

    for (const character of normalized) {
      try {
        font.widthOfTextAtSize(character, 11);
        text += character;
      } catch {
        replaced += 1;
        text += "?";
      }
    }

    return { replaced, text };
  }
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  if (!value) {
    return [""];
  }

  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const pieces = splitLongWord(word, font, size, maxWidth);

    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;

      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
        }
        current = piece;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function splitLongWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) {
    return [word];
  }

  const pieces: string[] = [];
  let current = "";

  for (const character of word) {
    const next = current + character;

    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) {
        pieces.push(current);
      }
      current = character;
    }
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}
