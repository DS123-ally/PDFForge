export type PdfBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string }
  | { header: boolean; kind: "table"; rows: string[][] };

export type ParsedSource = {
  blocks: PdfBlock[];
  warnings: string[];
};

export class SourceDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceDocumentError";
  }
}

const maxCharacters = 1_500_000;

export async function readDocx(bytes: Uint8Array) {
  const xml = await readZipText(bytes, "word/document.xml");

  if (!xml) {
    throw new SourceDocumentError("This Word file has no document.xml.");
  }

  return capSource(parseDocxXml(xml));
}

export async function readXlsx(bytes: Uint8Array) {
  const workbook = await readZipText(bytes, "xl/workbook.xml");

  if (!workbook) {
    throw new SourceDocumentError("This Excel file has no workbook.xml.");
  }

  const rels = await readZipText(bytes, "xl/_rels/workbook.xml.rels");
  const shared = await readZipText(bytes, "xl/sharedStrings.xml");
  const strings = shared ? readSharedStrings(shared) : [];
  const targets = readSheetTargets(workbook, rels ?? "");
  const blocks: PdfBlock[] = [];
  const warnings: string[] = [];
  let missingFormulas = 0;

  if (targets.length === 0) {
    throw new SourceDocumentError("This Excel file has no worksheets.");
  }

  for (const sheet of targets) {
    const xml = await readZipText(bytes, sheet.path);

    if (!xml) {
      warnings.push(`Sheet “${sheet.name}” could not be read.`);
      continue;
    }

    const parsed = parseSheetXml(xml, strings);
    missingFormulas += parsed.missingFormulas;
    blocks.push({
      kind: "heading",
      level: 2,
      text: sheet.name,
    });

    if (parsed.rows.length > 0) {
      blocks.push({ header: true, kind: "table", rows: parsed.rows });
    } else {
      blocks.push({
        kind: "paragraph",
        text: "This sheet has no cell values.",
      });
    }
  }

  if (missingFormulas > 0) {
    warnings.push(
      `${missingFormulas} formula${missingFormulas === 1 ? "" : "s"} had no cached value and ${missingFormulas === 1 ? "was" : "were"} left blank.`,
    );
  }

  return capSource({ blocks, warnings });
}

export async function readPptx(bytes: Uint8Array) {
  const zip = await openZip(bytes);
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((left, right) => slideNumber(left) - slideNumber(right));

  if (names.length === 0) {
    throw new SourceDocumentError("This PowerPoint file has no slides.");
  }

  const blocks: PdfBlock[] = [];
  let skippedPictures = 0;

  for (const [index, name] of names.entries()) {
    const xml = await zip.file(name)?.async("string");

    if (!xml) {
      continue;
    }

    skippedPictures += countTag(xml, "pic");
    const paragraphs = readDrawingParagraphs(xml);
    blocks.push({ kind: "heading", level: 2, text: `Slide ${index + 1}` });

    if (paragraphs.length === 0) {
      blocks.push({ kind: "paragraph", text: "This slide has no text." });
    } else {
      for (const paragraph of paragraphs) {
        blocks.push({ kind: "paragraph", text: paragraph });
      }
    }
  }

  const warnings =
    skippedPictures > 0
      ? [
          `${skippedPictures} picture${skippedPictures === 1 ? "" : "s"} ${skippedPictures === 1 ? "was" : "were"} skipped.`,
        ]
      : [];

  return capSource({ blocks, warnings });
}

export function readMarkdown(source: string): ParsedSource {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks: PdfBlock[] = [];
  const warnings: string[] = [];
  let skippedImages = 0;
  let strippedHtml = false;
  const paragraph: string[] = [];
  const list: string[] = [];
  let table: string[][] = [];

  function flushParagraph() {
    const value = paragraph.join(" ").replace(/\s+/g, " ").trim();
    paragraph.length = 0;

    if (value) {
      blocks.push({ kind: "paragraph", text: value });
    }
  }

  function flushList() {
    if (list.length > 0) {
      blocks.push({ kind: "list", items: [...list] });
      list.length = 0;
    }
  }

  function flushTable() {
    if (table.length > 0) {
      blocks.push({ header: true, kind: "table", rows: table });
      table = [];
    }
  }

  function flushAll() {
    flushParagraph();
    flushList();
    flushTable();
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    if (/^```/.test(line)) {
      flushAll();
      continue;
    }

    const imageCount = line.match(/!\[[^\]]*]\([^)]*\)/g)?.length ?? 0;
    skippedImages += imageCount;
    const withoutImages = line.replace(/!\[[^\]]*]\([^)]*\)/g, "");
    const withoutHtml = withoutImages.replace(/<[^>]+>/g, "");

    if (withoutHtml !== withoutImages) {
      strippedHtml = true;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(withoutHtml);

    if (heading?.[1] && heading[2]) {
      flushAll();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: cleanInline(heading[2]),
      });
      continue;
    }

    if (/^\|/.test(withoutHtml) && withoutHtml.includes("|")) {
      flushParagraph();
      flushList();

      if (!isMarkdownRule(withoutHtml)) {
        table.push(splitMarkdownRow(withoutHtml));
      }

      continue;
    }

    flushTable();
    const item =
      /^[-*+]\s+(.+)$/.exec(withoutHtml) ??
      /^\d+[.)]\s+(.+)$/.exec(withoutHtml);

    if (item?.[1]) {
      flushParagraph();
      list.push(cleanInline(item[1]));
      continue;
    }

    flushList();
    paragraph.push(cleanInline(withoutHtml));
  }

  flushAll();

  if (skippedImages > 0) {
    warnings.push(
      `${skippedImages} image${skippedImages === 1 ? "" : "s"} ${skippedImages === 1 ? "was" : "were"} skipped.`,
    );
  }

  if (strippedHtml) {
    warnings.push("HTML tags were removed. Their text was kept.");
  }

  if (!hasVisibleText(blocks)) {
    throw new SourceDocumentError(
      "This Markdown file has no text to place on a PDF.",
    );
  }

  return capSource({ blocks, warnings });
}

export function readCsv(source: string): ParsedSource {
  const rows = parseCsv(source.replace(/^\uFEFF/, ""));
  const filled = rows.filter((row) => row.some((cell) => cell.trim()));

  if (filled.length === 0) {
    throw new SourceDocumentError(
      "This CSV file has no rows to place on a PDF.",
    );
  }

  return capSource({
    blocks: [{ header: true, kind: "table", rows: filled }],
    warnings: [],
  });
}

export function parseDocxXml(xml: string): ParsedSource {
  const blocks: PdfBlock[] = [];
  const tables: Array<{ cell: string[]; row: string[]; rows: string[][] }> = [];
  let paragraph = "";
  let style: "body" | "h1" | "h2" | "h3" | "list" = "body";
  let inText = 0;
  let inDelete = 0;
  let inDrawing = 0;
  let skippedPictures = 0;

  walkXml(xml, (event) => {
    if (event.type === "open") {
      if (event.name === "tbl") {
        tables.push({ cell: [], row: [], rows: [] });
      } else if (event.name === "tr" && currentTable()) {
        const table = currentTable();
        if (table) {
          table.row = [];
        }
      } else if (event.name === "tc" && currentTable()) {
        const table = currentTable();
        if (table) {
          table.cell = [];
        }
      } else if (event.name === "p") {
        paragraph = "";
        style = "body";
      } else if (event.name === "t") {
        inText += 1;
      } else if (event.name === "del" || event.name === "delText") {
        inDelete += 1;
      } else if (event.name === "drawing" || event.name === "pict") {
        inDrawing += 1;
        skippedPictures += 1;
      } else if (
        event.name === "tab" ||
        event.name === "br" ||
        event.name === "cr"
      ) {
        paragraph += event.name === "tab" ? " " : "\n";
      } else if (event.name === "pStyle") {
        style = headingStyle(event.attrs) ?? style;
      } else if (event.name === "numPr") {
        if (style === "body") {
          style = "list";
        }
      }
      return;
    }

    if (
      event.type === "text" &&
      inText > 0 &&
      inDelete === 0 &&
      inDrawing === 0
    ) {
      paragraph += event.value;
      return;
    }

    if (event.type !== "close") {
      return;
    }

    if (event.name === "t") {
      inText = Math.max(0, inText - 1);
    } else if (event.name === "del" || event.name === "delText") {
      inDelete = Math.max(0, inDelete - 1);
    } else if (event.name === "drawing" || event.name === "pict") {
      inDrawing = Math.max(0, inDrawing - 1);
    } else if (event.name === "p") {
      const text = paragraph.replace(/[ \t]+\n/g, "\n").trim();
      paragraph = "";
      const table = currentTable();

      if (!text) {
        return;
      }

      if (table) {
        table.cell.push(text.replace(/\s+/g, " "));
        return;
      }

      pushStyled(blocks, text.replace(/\n+/g, " "), style);
    } else if (event.name === "tc") {
      const table = currentTable();
      table?.row.push(table.cell.join("\n"));
    } else if (event.name === "tr") {
      const table = currentTable();

      if (table && table.row.some((cell) => cell.trim())) {
        table.rows.push(table.row);
      }
    } else if (event.name === "tbl") {
      const table = tables.pop();

      if (table) {
        pushTable(blocks, table.rows, false);
      }
    }
  });

  const warnings =
    skippedPictures > 0
      ? [
          `${skippedPictures} picture${skippedPictures === 1 ? "" : "s"} ${skippedPictures === 1 ? "was" : "were"} skipped.`,
        ]
      : [];
  const coalesced = coalesceLists(blocks);

  if (!hasVisibleText(coalesced)) {
    throw new SourceDocumentError(
      "This Word file has no text to place on a PDF.",
    );
  }

  return { blocks: coalesced, warnings };

  function currentTable() {
    return tables.at(-1);
  }
}

function parseSheetXml(xml: string, shared: readonly string[]) {
  const rows: string[][] = [];
  let missingFormulas = 0;
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(xml))) {
    const body = rowMatch[2] ?? "";
    const cells: string[] = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRe.exec(body))) {
      const attrs = cellMatch[1] ?? "";
      const inner = cellMatch[2] ?? "";
      const ref = attr(attrs, "r") ?? "";
      const column = columnIndex(ref);
      const type = attr(attrs, "t") ?? "";
      const value = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      const inline = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1];
      const formula = /<f\b/.test(inner);
      let text = "";

      if (type === "s" && value !== undefined) {
        text = shared[Number(value)] ?? "";
      } else if (type === "inlineStr") {
        text = decodeXmlText(inline ?? "");
      } else if (type === "b") {
        text = value === "1" ? "TRUE" : "FALSE";
      } else if (value !== undefined) {
        text = decodeXmlText(value);
      } else if (formula) {
        missingFormulas += 1;
      }

      if (column >= 0) {
        cells[column] = text;
      }
    }

    const dense = Array.from(
      { length: cells.length },
      (_, index) => cells[index] ?? "",
    );

    if (dense.some((cell) => cell.trim())) {
      rows.push(dense);
    }
  }

  return { missingFormulas, rows };
}

function readSharedStrings(xml: string) {
  const strings: string[] = [];
  const itemRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml))) {
    const parts = [
      ...(match[1] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g),
    ].map((part) => decodeXmlText(part[1] ?? ""));
    strings.push(parts.join(""));
  }

  return strings;
}

function readSheetTargets(workbook: string, rels: string) {
  const relTargets = new Map<string, string>();
  const relRe = /<Relationship\b([^>]*)\/>/g;
  let relMatch: RegExpExecArray | null;

  while ((relMatch = relRe.exec(rels))) {
    const id = attr(relMatch[1] ?? "", "Id");
    const target = attr(relMatch[1] ?? "", "Target");

    if (id && target) {
      relTargets.set(id, target.replace(/^\//, ""));
    }
  }

  const sheets: Array<{ name: string; path: string }> = [];
  const sheetRe = /<sheet\b([^>]*)\/>/g;
  let sheetMatch: RegExpExecArray | null;
  let index = 0;

  while ((sheetMatch = sheetRe.exec(workbook))) {
    index += 1;
    const name = attr(sheetMatch[1] ?? "", "name") ?? `Sheet ${index}`;
    const relId =
      attr(sheetMatch[1] ?? "", "r:id") ?? attr(sheetMatch[1] ?? "", "id");
    const target = relId ? relTargets.get(relId) : undefined;
    const path = target
      ? target.startsWith("xl/")
        ? target
        : `xl/${target.replace(/^\.\.\//, "")}`
      : `xl/worksheets/sheet${index}.xml`;
    sheets.push({ name: decodeXmlText(name), path });
  }

  return sheets;
}

function readDrawingParagraphs(xml: string) {
  const paragraphs: string[] = [];
  const paragraphRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let match: RegExpExecArray | null;

  while ((match = paragraphRe.exec(xml))) {
    const text = [
      ...(match[1] ?? "").matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g),
    ]
      .map((part) => decodeXmlText(part[1] ?? ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

type XmlEvent =
  | { attrs: string; name: string; type: "open" }
  | { name: string; type: "close" }
  | { type: "text"; value: string };

function walkXml(xml: string, visit: (event: XmlEvent) => void) {
  const tokenRe =
    /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/)?([A-Za-z_][\w:.-]*)([^>]*?)>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(xml))) {
    if (match[1] !== undefined && match[0].startsWith("<![CDATA[")) {
      visit({ type: "text", value: match[1] });
      continue;
    }

    if (match[3]) {
      const name = localName(match[3]);
      const attrs = match[4] ?? "";
      const selfClosing = attrs.trimEnd().endsWith("/");

      if (match[2]) {
        visit({ name, type: "close" });
      } else {
        visit({
          attrs: selfClosing ? attrs.trimEnd().slice(0, -1) : attrs,
          name,
          type: "open",
        });

        if (selfClosing) {
          visit({ name, type: "close" });
        }
      }

      continue;
    }

    if (match[5]) {
      visit({ type: "text", value: decodeXmlText(match[5]) });
    }
  }
}

function localName(tag: string) {
  const index = tag.lastIndexOf(":");
  return index === -1 ? tag : tag.slice(index + 1);
}

function attr(source: string, name: string) {
  const match = source.match(
    new RegExp(`(?:^|\\s)${name.replace(":", "\\:")}="([^"]*)"`),
  );
  return match?.[1];
}

function headingStyle(attrs: string) {
  const value = attr(attrs, "w:val") ?? attr(attrs, "val") ?? "";

  if (/heading\s*1/i.test(value)) {
    return "h1" as const;
  }

  if (/heading\s*2/i.test(value)) {
    return "h2" as const;
  }

  if (/heading\s*3/i.test(value)) {
    return "h3" as const;
  }

  return null;
}

function pushStyled(
  blocks: PdfBlock[],
  text: string,
  style: "body" | "h1" | "h2" | "h3" | "list",
) {
  if (style === "h1" || style === "h2" || style === "h3") {
    blocks.push({
      kind: "heading",
      level: style === "h1" ? 1 : style === "h2" ? 2 : 3,
      text,
    });
    return;
  }

  if (style === "list") {
    blocks.push({ kind: "list", items: [text] });
    return;
  }

  blocks.push({ kind: "paragraph", text });
}

function pushTable(blocks: PdfBlock[], rows: string[][], header: boolean) {
  const cleaned = rows
    .map((row) => row.map((cell) => cell.replace(/\s+/g, " ").trim()))
    .filter((row) => row.some(Boolean));

  if (cleaned.length > 0) {
    blocks.push({ header, kind: "table", rows: cleaned });
  }
}

function coalesceLists(blocks: PdfBlock[]) {
  const next: PdfBlock[] = [];

  for (const block of blocks) {
    const previous = next.at(-1);

    if (block.kind === "list" && previous?.kind === "list") {
      previous.items.push(...block.items);
    } else {
      next.push(block);
    }
  }

  return next;
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character ?? "";
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character ?? "";
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function splitMarkdownRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cleanInline(cell.trim()));
}

function isMarkdownRule(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function cleanInline(value: string) {
  return value
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function columnIndex(ref: string) {
  const letters = /^[A-Z]+/i.exec(ref)?.[0];

  if (!letters) {
    return -1;
  }

  let index = 0;

  for (const character of letters.toUpperCase()) {
    index = index * 26 + (character.charCodeAt(0) - 64);
  }

  return index - 1;
}

function slideNumber(name: string) {
  return Number(/\d+/.exec(name)?.[0] ?? 0);
}

function countTag(xml: string, name: string) {
  return xml.match(new RegExp(`<(?:\\w+:)?${name}\\b`, "g"))?.length ?? 0;
}

function hasVisibleText(blocks: readonly PdfBlock[]) {
  return blocks.some((block) => {
    if (block.kind === "table") {
      return block.rows.some((row) => row.some((cell) => cell.trim()));
    }

    if (block.kind === "list") {
      return block.items.some((item) => item.trim());
    }

    return block.text.trim().length > 0;
  });
}

function capSource(source: ParsedSource) {
  let count = 0;

  for (const block of source.blocks) {
    if (block.kind === "table") {
      count += block.rows.reduce((sum, row) => sum + row.join("").length, 0);
    } else if (block.kind === "list") {
      count += block.items.join("").length;
    } else {
      count += block.text.length;
    }

    if (count > maxCharacters) {
      throw new SourceDocumentError(
        "This file has more text than this tool can place in one PDF.",
      );
    }
  }

  return source;
}

async function readZipText(bytes: Uint8Array, path: string) {
  const zip = await openZip(bytes);
  return zip.file(path)?.async("string") ?? null;
}

async function openZip(bytes: Uint8Array) {
  const JSZip = (await import("jszip")).default;

  try {
    return await JSZip.loadAsync(bytes);
  } catch {
    throw new SourceDocumentError("This Office file could not be opened.");
  }
}

export function decodeXmlText(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      safeCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function safeCodePoint(code: number) {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) {
    return "";
  }

  return String.fromCodePoint(code);
}
