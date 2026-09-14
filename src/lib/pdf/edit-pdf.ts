import { degrees, rgb, StandardFonts } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import { loadPdf } from "@/lib/pdf/load-pdf";
import {
  getPageNumbersFromRanges,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";
import { savePdf } from "@/lib/pdf/save-pdf";

export type PdfPageSelection =
  { mode: "all" } | { mode: "custom"; ranges: string };

export type TextPosition =
  "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type PdfEditOptions =
  | {
      degrees: number;
      selection: PdfPageSelection;
      type: "rotate";
    }
  | {
      opacity: number;
      position: TextPosition;
      rotation: number;
      text: string;
      type: "watermark";
    }
  | {
      format: "page" | "page-of-total";
      position: TextPosition;
      startNumber: number;
      type: "page-numbers";
    }
  | {
      footerText?: string;
      headerText?: string;
      type: "header-footer";
    }
  | {
      type: "remove-metadata";
    };

export async function editPdfBuffer(
  bytes: ArrayBuffer,
  options: PdfEditOptions,
  sourceName = "document.pdf",
) {
  const pdf = await loadPdf(bytes);

  switch (options.type) {
    case "rotate":
      rotatePages(pdf, options.selection, options.degrees);
      break;
    case "watermark":
      await drawWatermark(
        pdf,
        options.text,
        options.opacity,
        options.rotation,
        options.position,
      );
      break;
    case "page-numbers":
      await drawPageNumbers(
        pdf,
        options.position,
        options.startNumber,
        options.format,
      );
      break;
    case "header-footer":
      await drawHeaderFooter(pdf, options.headerText, options.footerText);
      break;
    case "remove-metadata":
      removeMetadata(pdf);
      break;
  }

  return {
    fileCount: 1,
    filename: createOutputName(sourceName, {
      suffix: getOutputSuffix(options.type),
    }),
    outputBytes: toArrayBuffer(await savePdf(pdf)),
    totalPages: pdf.getPageCount(),
  };
}

function rotatePages(
  pdf: Awaited<ReturnType<typeof loadPdf>>,
  selection: PdfPageSelection,
  rotation: number,
) {
  const pages = getSelectedPages(selection, pdf.getPageCount());
  const normalizedRotation = normalizeRightAngle(rotation);

  for (const pageNumber of pages) {
    const page = pdf.getPage(pageNumber - 1);
    const currentRotation = page.getRotation().angle;
    page.setRotation(
      degrees(normalizeRightAngle(currentRotation + normalizedRotation)),
    );
  }
}

async function drawWatermark(
  pdf: Awaited<ReturnType<typeof loadPdf>>,
  text: string,
  opacity: number,
  rotation: number,
  position: TextPosition,
) {
  const cleanText = sanitizeText(text) || "Confidential";
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdf.getPages()) {
    const { height, width } = page.getSize();
    const fontSize = Math.max(24, Math.min(width, height) / 10);
    const textWidth = font.widthOfTextAtSize(cleanText, fontSize);

    const placement = getTextPlacement(
      page,
      cleanText,
      textWidth,
      position,
      fontSize,
    );

    page.drawText(cleanText, {
      color: rgb(0.85, 0.05, 0.05),
      opacity: clamp(opacity, 0.05, 1),
      rotate: degrees(rotation),
      size: fontSize,
      x: placement.x,
      y: placement.y,
    });
  }
}

async function drawPageNumbers(
  pdf: Awaited<ReturnType<typeof loadPdf>>,
  position: TextPosition,
  startNumber: number,
  format: "page" | "page-of-total",
) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const totalPages = pdf.getPageCount();

  pdf.getPages().forEach((page, index) => {
    const pageNumber = startNumber + index;
    const text =
      format === "page-of-total"
        ? `${pageNumber} of ${startNumber + totalPages - 1}`
        : String(pageNumber);
    const fontSize = 10;
    const placement = getTextPlacement(
      page,
      text,
      font.widthOfTextAtSize(text, fontSize),
      position,
      fontSize,
    );

    page.drawText(text, {
      color: rgb(0.18, 0.18, 0.18),
      size: fontSize,
      x: placement.x,
      y: placement.y,
    });
  });
}

async function drawHeaderFooter(
  pdf: Awaited<ReturnType<typeof loadPdf>>,
  headerText = "",
  footerText = "",
) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const cleanHeader = sanitizeText(headerText);
  const cleanFooter = sanitizeText(footerText);

  for (const page of pdf.getPages()) {
    const { height, width } = page.getSize();

    if (cleanHeader) {
      page.drawText(cleanHeader, {
        color: rgb(0.18, 0.18, 0.18),
        size: 10,
        x: 36,
        y: height - 36,
      });
    }

    if (cleanFooter) {
      const textWidth = font.widthOfTextAtSize(cleanFooter, 10);
      page.drawText(cleanFooter, {
        color: rgb(0.18, 0.18, 0.18),
        size: 10,
        x: Math.max(36, (width - textWidth) / 2),
        y: 24,
      });
    }
  }
}

function removeMetadata(pdf: Awaited<ReturnType<typeof loadPdf>>) {
  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setProducer("PDFForge");
  pdf.setCreator("PDFForge");
  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
}

function getSelectedPages(selection: PdfPageSelection, totalPages: number) {
  if (selection.mode === "all") {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  return getPageNumbersFromRanges(
    parsePageRanges(selection.ranges, totalPages),
  );
}

function getTextPlacement(
  page: ReturnType<Awaited<ReturnType<typeof loadPdf>>["getPage"]>,
  text: string,
  textWidth: number,
  position: TextPosition,
  fontSize = 10,
) {
  const { height, width } = page.getSize();
  const margin = 36;

  switch (position) {
    case "top-left":
      return { x: margin, y: height - margin - fontSize };
    case "top-right":
      return { x: width - margin - textWidth, y: height - margin - fontSize };
    case "bottom-left":
      return { x: margin, y: margin };
    case "center":
      return { x: (width - textWidth) / 2, y: height / 2 };
    case "bottom-right":
      return { x: width - margin - textWidth, y: margin };
  }
}

function normalizeRightAngle(rotation: number) {
  return (((Math.round(rotation / 90) * 90) % 360) + 360) % 360;
}

function sanitizeText(text: string) {
  return text
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, 120);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getOutputSuffix(type: PdfEditOptions["type"]) {
  switch (type) {
    case "rotate":
      return "rotated";
    case "watermark":
      return "watermarked";
    case "page-numbers":
      return "numbered";
    case "header-footer":
      return "header-footer";
    case "remove-metadata":
      return "metadata-cleaned";
  }
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
