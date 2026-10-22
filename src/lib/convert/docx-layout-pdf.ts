import {
  PDFDocument,
  StandardFonts,
  setTextRenderingMode,
  TextRenderingMode,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import JSZip from "jszip";

import { SourceDocumentError } from "@/lib/convert/read-source";
import { savePdf } from "@/lib/pdf/save-pdf";

import "./docx-fonts.css";
import { bundledWordFamilies } from "@/lib/convert/docx-font-names";

const maxDocxPages = 120;
const jpegQuality = 0.92;
const pixelRatio = 2;

const layoutStyle = `
.docx-layout-host {
  position: fixed;
  left: 0;
  top: 0;
  opacity: 0;
  width: max-content;
  height: max-content;
  pointer-events: none;
  background: #ffffff;
  color: #111111;
}
.docx-layout-host .docx-page-wrapper {
  background: #ffffff !important;
  padding: 0 !important;
}
.docx-layout-host section.docx-page {
  overflow: visible !important;
  outline: 1px solid #111111;
}
.docx-layout-host section.docx-page > header,
.docx-layout-host section.docx-page > footer {
  overflow: visible !important;
}
.docx-layout-host img {
  max-width: none !important;
}
`;

export async function renderDocxLayoutToPdf(
  bytes: Uint8Array,
  onProgress?: (message: string) => void,
) {
  if (typeof document === "undefined") {
    throw new SourceDocumentError(
      "Word pages can only be drawn in the browser.",
    );
  }

  const [{ renderAsync }, { toCanvas }] = await Promise.all([
    import("docx-preview"),
    import("html-to-image"),
  ]);
  const host = document.createElement("div");
  const style = document.createElement("style");
  const body = document.createElement("div");
  const warnings: string[] = [];

  host.className = "docx-layout-host";
  host.setAttribute("aria-hidden", "true");
  style.textContent = layoutStyle;
  host.append(style, body);
  document.body.append(host);

  try {
    onProgress?.("Drawing the Word pages in this tab");
    const fontNames = await bundledFontNames(bytes);
    installFallbackFaces(fontNames);
    await loadBundledWordFonts(fontNames);
    const source = await preferGroupedDrawingFallbacks(bytes);
    await renderAsync(copyBytes(source), body, body, {
      breakPages: true,
      className: "docx-page",
      experimental: true,
      ignoreFonts: false,
      ignoreHeight: false,
      ignoreWidth: false,
      inWrapper: true,
      renderEndnotes: true,
      renderFooters: true,
      renderFootnotes: true,
      ignoreLastRenderedPageBreak: false,
      renderHeaders: true,
      useBase64URL: true,
    });
    await document.fonts.ready;
    await wait(700);
    await decodeImages(host);
    const banner = await headerBannerUrl(bytes);

    const pages = [...body.querySelectorAll("section.docx-page")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter(pageHasContent);

    if (pages.length === 0) {
      throw new SourceDocumentError("This Word file has no pages to draw.");
    }

    if (pages.length > maxDocxPages) {
      throw new SourceDocumentError(
        `This Word file has more than ${maxDocxPages} pages. Split it, then convert each part.`,
      );
    }

    const fontEmbedCSS = fontFaceCss(fontNames) || undefined;

    const pdf = await PDFDocument.create();
    const textFont = await pdf.embedFont(StandardFonts.Helvetica);

    for (const [index, page] of pages.entries()) {
      onProgress?.(`Drawing page ${index + 1} of ${pages.length}`);
      if (banner) {
        await placeHeaderBanner(page, banner);
      }
      await revealPageContent(page);
      const canvas = await capturePage(page, fontEmbedCSS, toCanvas, warnings);
      const jpeg = await canvasToJpeg(canvas);
      const image = await pdf.embedJpg(jpeg);
      const width = cssPoints(page.style.width, page.offsetWidth);
      const height = cssPoints(
        page.style.minHeight || page.style.height,
        page.offsetHeight,
      );
      const pdfPage = pdf.addPage([width, height]);

      pdfPage.drawImage(image, {
        height,
        width,
        x: 0,
        y: 0,
      });
      drawSelectableText(pdfPage, page, height, textFont);
      canvas.width = 0;
      canvas.height = 0;
    }

    return {
      bytes: await savePdf(pdf),
      pageCount: pdf.getPageCount(),
      replacedCharacters: 0,
      warnings,
    };
  } catch (error) {
    throw asLayoutError(error);
  } finally {
    host.remove();
  }
}

async function bundledFontNames(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const xml = (await zip.file("word/fontTable.xml")?.async("string")) ?? "";
  const names = new Set<string>();

  for (const match of xml.matchAll(/\bw:name="([^"]+)"/g)) {
    const name = match[1];

    if (name && !/wingdings|webdings|^symbol$|mt extra/i.test(name)) {
      names.add(name);
    }
  }

  if (names.size === 0) {
    names.add("Calibri");
  }

  return [...names];
}

function installFallbackFaces(names: readonly string[]) {
  const known = new Set<string>(bundledWordFamilies);
  const sans = fontFaceCss(["Noto Sans"]);
  const serif = fontFaceCss(["Noto Serif"]);
  const devanagari = fontFaceCss(["Noto Sans Devanagari"]);
  const rules: string[] = [];

  for (const name of names) {
    if (known.has(name)) {
      continue;
    }

    const source = /mangal|nirmala|kokila|devanagari|hindi/i.test(name)
      ? devanagari || sans
      : /serif|times|garamond|georgia|cambria|palatino|baskerville|caslon|constantia|antiqua|bookman/i.test(
            name,
          )
        ? serif || sans
        : sans;

    if (!source) {
      continue;
    }

    const family = name.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    rules.push(
      source
        .replaceAll(
          'font-family: "Noto Sans Devanagari"',
          `font-family: "${family}"`,
        )
        .replaceAll('font-family: "Noto Serif"', `font-family: "${family}"`)
        .replaceAll('font-family: "Noto Sans"', `font-family: "${family}"`)
        .replaceAll(
          "font-family: Noto Sans Devanagari",
          `font-family: "${family}"`,
        )
        .replaceAll("font-family: Noto Serif", `font-family: "${family}"`)
        .replaceAll("font-family: Noto Sans", `font-family: "${family}"`),
    );
  }

  if (rules.length === 0) {
    return;
  }

  const existing = document.getElementById("docx-font-aliases");
  const style =
    existing instanceof HTMLStyleElement
      ? existing
      : document.createElement("style");
  style.id = "docx-font-aliases";
  style.textContent = rules.join("\n");

  if (!existing) {
    document.head.append(style);
  }
}

function fontFaceCss(families: readonly string[]) {
  const wanted = new Set(families);
  const rules: string[] = [];

  for (const sheet of document.styleSheets) {
    let cssRules: CSSRuleList;

    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of cssRules) {
      if (!(rule instanceof CSSFontFaceRule)) {
        continue;
      }

      const family = rule.style
        .getPropertyValue("font-family")
        .replaceAll('"', "")
        .trim();

      if (wanted.has(family)) {
        rules.push(rule.cssText);
      }
    }
  }

  return rules.join("\n");
}

async function loadBundledWordFonts(families: readonly string[]) {
  await Promise.all(
    families.flatMap((family) =>
      [
        document.fonts.load(`400 16px "${family}"`),
        document.fonts.load(`italic 400 16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`),
        document.fonts.load(`italic 700 16px "${family}"`),
      ].map((pending) => pending.catch(() => undefined)),
    ),
  );
}

async function preferGroupedDrawingFallbacks(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const parts = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/i.test(name),
  );

  for (const name of parts) {
    const xml = await zip.file(name)?.async("string");

    if (!xml?.includes("<mc:AlternateContent")) {
      continue;
    }

    zip.file(name, replaceGroupedDrawings(xml));
  }

  return zip.generateAsync({ type: "uint8array" });
}

function replaceGroupedDrawings(xml: string) {
  return xml.replace(
    /<mc:AlternateContent\b[^>]*>[\s\S]*?<\/mc:AlternateContent>/g,
    (block) => {
      if (!block.includes("<wpg:") && !block.includes("<wps:")) {
        return block;
      }

      const fallback = /<mc:Fallback>([\s\S]*?)<\/mc:Fallback>/.exec(block);
      return fallback?.[1] ?? "";
    },
  );
}

function pageHasContent(section: HTMLElement) {
  const article = section.querySelector(":scope > article");
  const root = article instanceof HTMLElement ? article : section;

  if (root.querySelector("img, svg")) {
    return true;
  }

  return root.innerText.replace(/\s+/g, " ").trim().length > 30;
}

async function headerBannerUrl(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const rels = await zip.file("word/_rels/header1.xml.rels")?.async("string");
  const target = rels?.match(/Target="(media\/[^"]+\.(?:jpe?g|png))"/i)?.[1];

  if (!target) {
    return null;
  }

  const file = zip.file(`word/${target.replace(/^\//, "")}`);

  if (!file) {
    return null;
  }

  const data = await file.async("base64");
  const type = target.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return `data:image/${type};base64,${data}`;
}

function placeHeaderBanner(section: HTMLElement, src: string) {
  const shown = [...section.querySelectorAll("img")].some(
    (image) => image.offsetWidth > 280 && image.offsetHeight < 180,
  );

  if (shown) {
    return Promise.resolve();
  }

  const banner = document.createElement("img");
  banner.alt = "";
  banner.src = src;
  banner.style.display = "block";
  banner.style.height = "auto";
  banner.style.margin = "0 0 16pt";
  banner.style.width = "100%";
  const header = section.querySelector(":scope > header");

  if (header) {
    header.prepend(banner);
  } else {
    section.prepend(banner);
  }

  return banner.decode().catch(() => undefined);
}

async function revealPageContent(section: HTMLElement) {
  section.style.overflow = "visible";
  const header = section.querySelector(":scope > header");

  if (header instanceof HTMLElement) {
    header.style.height = "auto";
    header.style.marginTop = "0px";
    header.style.minHeight = "auto";
    header.style.overflow = "visible";
  }

  section.querySelectorAll("img").forEach((image) => {
    image.style.maxWidth = "none";
    let node = image.parentElement;

    while (node && node !== section) {
      const width = Number.parseFloat(node.style.width);
      const height = Number.parseFloat(node.style.height);

      if (width === 0 || height === 0) {
        node.style.overflow = "visible";
      }

      node = node.parentElement;
    }
  });

  await new Promise((resolve) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve(undefined)),
    );
  });

  if (section.scrollHeight > section.offsetHeight + 1) {
    section.style.minHeight = `${section.scrollHeight}px`;
  }
}

async function capturePage(
  page: HTMLElement,
  fontEmbedCSS: string | undefined,
  toCanvas: typeof import("html-to-image").toCanvas,
  warnings: string[],
) {
  const options = {
    backgroundColor: "#ffffff",
    cacheBust: false,
    pixelRatio,
    style: {
      boxShadow: "none",
      margin: "0px",
    },
  };

  try {
    return await toCanvas(page, {
      ...options,
      fontEmbedCSS,
      skipFonts: fontEmbedCSS === undefined,
    });
  } catch (error) {
    if (!warnings.some((warning) => warning.includes("fonts"))) {
      warnings.push(
        "Some fonts could not be copied, so this device's fonts were used.",
      );
    }

    try {
      return await toCanvas(page, {
        ...options,
        skipFonts: true,
      });
    } catch {
      throw asLayoutError(error);
    }
  }
}

function drawSelectableText(
  pdfPage: PDFPage,
  page: HTMLElement,
  pageHeight: number,
  font: PDFFont,
) {
  const pageRect = page.getBoundingClientRect();
  const scale = 72 / 96;
  const runs = collectTextRuns(page, pageRect, pageHeight, scale);

  if (runs.length === 0) {
    return;
  }

  pdfPage.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));

  for (const run of runs) {
    const text = textFontCanDraw(font, run.text);

    if (!text) {
      continue;
    }

    pdfPage.drawText(text, {
      font,
      size: run.size,
      x: run.x,
      y: run.y,
    });
  }
}

function collectTextRuns(
  page: HTMLElement,
  pageRect: DOMRect,
  pageHeight: number,
  scale: number,
) {
  const runs: { size: number; text: string; x: number; y: number }[] = [];
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const value = (node.textContent ?? "").replace(/\u00a0/g, " ");
    const parent = node.parentElement;

    if (parent && value.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter(
        (rect) => rect.width > 0 && rect.height > 0,
      );

      if (rects.length === 0) {
        const parentRect = parent.getBoundingClientRect();

        if (parentRect.width > 0 && parentRect.height > 0) {
          rects.push(parentRect);
        }
      }
      const size = Math.max(
        4,
        Number.parseFloat(getComputedStyle(parent).fontSize) * scale || 11,
      );
      const slices =
        rects.length > 1 ? splitTextAcrossRects(value, rects, parent) : [value];

      rects.forEach((rect, index) => {
        const text = (slices[index] ?? "").replace(/[\r\n\t]+/g, " ");

        if (!text.trim()) {
          return;
        }

        runs.push({
          size,
          text,
          x: (rect.left - pageRect.left) * scale,
          y: pageHeight - (rect.top - pageRect.top) * scale - size * 0.82,
        });
      });
      range.detach();
    }

    node = walker.nextNode();
  }

  if (runs.length === 0) {
    const plain = page.innerText.replace(/\s+/g, " ").trim();

    if (plain) {
      runs.push({
        size: 12,
        text: plain,
        x: 48,
        y: pageHeight - 72,
      });
    }
  }

  return runs;
}

function splitTextAcrossRects(
  value: string,
  rects: DOMRect[],
  parent: HTMLElement,
) {
  const context = document.createElement("canvas").getContext("2d");

  if (!context) {
    return [value];
  }

  const computed = getComputedStyle(parent);
  context.font = computed.font;
  const slices: string[] = [];
  let remaining = value;

  for (const [index, rect] of rects.entries()) {
    if (index === rects.length - 1) {
      slices.push(remaining);
      break;
    }

    let count = 0;

    while (
      count < remaining.length &&
      context.measureText(remaining.slice(0, count + 1)).width <= rect.width + 1
    ) {
      count += 1;
    }

    const slice = remaining.slice(0, Math.max(count, 1));
    slices.push(slice);
    remaining = remaining.slice(slice.length);
  }

  return slices;
}

function textFontCanDraw(font: PDFFont, value: string) {
  try {
    font.encodeText(value);
    return value;
  } catch {
    let text = "";

    for (const character of value) {
      try {
        font.encodeText(character);
        text += character;
      } catch {
        text += " ";
      }
    }

    return text.trim() ? text : "";
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new SourceDocumentError(
              "A Word page could not be saved as an image.",
            ),
          );
          return;
        }

        void blob.arrayBuffer().then(
          (buffer) => resolve(new Uint8Array(buffer)),
          () =>
            reject(
              new SourceDocumentError(
                "A Word page could not be saved as an image.",
              ),
            ),
        );
      },
      "image/jpeg",
      jpegQuality,
    );
  });
}

function cssPoints(value: string, fallbackPx: number) {
  const parsed = parseCssPoints(value);
  const points = parsed ?? (fallbackPx * 72) / 96;

  if (!Number.isFinite(points) || points < 36) {
    throw new SourceDocumentError("A Word page had no usable size.");
  }

  return Math.round(points * 100) / 100;
}

function parseCssPoints(value: string) {
  const match = /^([\d.]+)(pt|px|in|cm|mm)$/i.exec(value.trim());

  if (!match?.[1] || !match[2]) {
    return null;
  }

  const amount = Number(match[1]);

  switch (match[2].toLowerCase()) {
    case "pt":
      return amount;
    case "px":
      return (amount * 72) / 96;
    case "in":
      return amount * 72;
    case "cm":
      return (amount * 72) / 2.54;
    case "mm":
      return (amount * 72) / 25.4;
    default:
      return null;
  }
}

function copyBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function decodeImages(host: HTMLElement) {
  return Promise.all(
    [...host.querySelectorAll("img")].map((image) =>
      image.decode().catch(() => undefined),
    ),
  );
}

function wait(duration: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function asLayoutError(error: unknown) {
  if (error instanceof SourceDocumentError) {
    return error;
  }

  const detail = error instanceof Error ? error.message.trim() : "";
  const safe =
    detail.length > 0 && detail.length < 180 && !detail.includes("<")
      ? detail
      : "This Word file could not be drawn.";

  return new SourceDocumentError(safe);
}
